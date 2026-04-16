<template>
  <div class="view-wrap">
    <div class="box game-card">
      <div class="game-header">
        <div class="level-left">
          <div>
            <p class="room-chip">Room: {{ code }}</p>
            <p class="is-size-7 subtle-text mt-2">
              {{ roomSettings.questionCount }} questions
              <span v-if="categoryName"> | {{ categoryName }}</span>
            </p>
          </div>
        </div>
        <div class="level-right game-header-right">
          <div class="has-text-right">
            <p class="subtitle game-progress mb-2">Question {{ current }} of {{ total }}</p>
            <button class="button is-small is-light" @click="leaveRoom">Exit Game</button>
          </div>
        </div>
      </div>

      <div v-if="error" class="notification is-danger is-light">
        {{ error }}
      </div>

      <div v-if="roomPhase === 'lobby'">
        <p class="status-note has-text-centered mb-4">Waiting in the lobby...</p>

        <div v-if="isHost" class="mb-5">
          <div class="card-section mb-4">
            <p class="section-title">Room Settings</p>
            <p class="section-copy">Choose the number of questions and category before you start the round.</p>
          </div>

          <div class="field">
            <label class="label control-label">Question Count</label>
            <div class="select is-fullwidth">
              <select v-model="questionMode">
                <option value="5">5 questions</option>
                <option value="10">10 questions</option>
                <option value="15">15 questions</option>
                <option value="20">20 questions</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div v-if="questionMode === 'custom'" class="field">
            <label class="label control-label">Custom Question Count</label>
            <input
              class="input"
              type="number"
              min="1"
              max="50"
              v-model="customQuestionCount"
              placeholder="Enter a number from 1 to 50"
            />
          </div>

          <div class="field">
            <label class="label control-label">Category</label>
            <div class="select is-fullwidth">
              <select v-model="selectedCategory">
                <option value="">Any Category</option>
                <option v-for="category in categories" :key="category.id" :value="String(category.id)">
                  {{ category.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="buttons">
            <button class="button is-link is-light" @click="saveSettings">Save Settings</button>
            <button class="button is-success" @click="startGame">Start Game</button>
          </div>
        </div>

        <p v-else class="settings-note has-text-centered mb-4">
          Waiting for the host to choose settings and start the game.
        </p>

        <div class="players-panel">
          <p class="label control-label">Players:</p>
          <ul class="player-list mb-0">
            <li v-for="player in players" :key="player.id">
              {{ player.name }}<span v-if="player.id === hostId"> (host)</span>
            </li>
          </ul>
        </div>
      </div>

      <div v-if="roomPhase === 'game' && summaryData" class="summary-panel">
        <div class="question-panel">
          <p class="label control-label mb-2">Answer Breakdown</p>
          <p class="question-text mb-4" v-html="summaryData.question"></p>
          <p ref="answerCallout" class="answer-callout mb-4">
            Correct answer:
            <strong v-html="summaryData.correctAnswer"></strong>
          </p>
          <div ref="summaryChartContainer" class="results-chart"></div>
        </div>
      </div>

      <div v-if="roomPhase === 'game' && question && !summaryData">
        <div ref="currentQuestionPanel" class="question-panel">
          <p class="question-kicker">Current Question</p>
          <p class="question-text mb-4" v-html="question.question"></p>
        </div>
        <div class="buttons">
          <button
            v-for="(answer, index) in answers"
            :key="answer"
            class="button is-info is-fullwidth mb-2 trivia-answer-button has-jquery-pulse"
            :data-answer-index="index + 1"
            :disabled="hasAnsweredCurrentQuestion"
            @click="submitAnswer(answer, $event)"
            v-html="answer"
          ></button>
        </div>

        <p v-if="hasAnsweredCurrentQuestion" class="has-text-centered has-text-grey mt-3">
          Answer locked in. Waiting for the other players...
        </p>
        <p v-else class="has-text-centered subtle-text mt-3">
          {{ answeredPlayers }} of {{ players.length }} players have answered
        </p>
      </div>

      <div v-if="roomPhase === 'game'" class="mt-4">
        <div class="scores-panel">
          <p class="label control-label">Scores:</p>
          <ul class="score-list mb-0">
            <li v-for="player in players" :key="player.id">{{ player.name }}: {{ player.score }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3'
import { getSocket } from '../socket'

const socket = getSocket()

export default {
  data() {
    return {
      code: this.$route.query.code,
      playerName: this.$route.query.name || '',
      playerId: '',
      hostId: '',
      players: [],
      roomPhase: 'lobby',
      question: null,
      answers: [],
      current: 0,
      total: 0,
      answeredPlayers: 0,
      hasAnsweredCurrentQuestion: false,
      error: '',
      categories: [],
      roomSettings: {
        questionCount: 10,
        categoryId: null
      },
      questionMode: '10',
      customQuestionCount: '10',
      selectedCategory: '',
      categoryName: 'Any Category',
      summaryData: null
    }
  },
  computed: {
    isHost() {
      return this.playerId !== '' && this.playerId === this.hostId
    }
  },
  methods: {
    animateQuestionPanel() {
      this.$nextTick(() => {
        const $ = window.jQuery
        if (!$) return
        const panel = this.$refs.currentQuestionPanel
        if (!panel) return

        $(panel).stop(true, true).hide().slideDown(260).addClass('jq-flash')
        window.setTimeout(() => {
          $(panel).removeClass('jq-flash')
        }, 700)
      })
    },
    animateAnswerSelection(buttonElement) {
      if (!buttonElement) return
      const $ = window.jQuery
      if (!$) return

      const button = $(buttonElement)
      button.removeClass('jq-active')
      void button[0].offsetWidth
      button.addClass('jq-active')
      window.setTimeout(() => button.removeClass('jq-active'), 900)
    },
    animateSummaryCallout() {
      this.$nextTick(() => {
        const $ = window.jQuery
        if (!$) return
        const callout = this.$refs.answerCallout
        if (!callout) return

        $(callout).stop(true, true).hide().fadeIn(220).addClass('jq-flash')
        window.setTimeout(() => {
          $(callout).removeClass('jq-flash')
        }, 700)
      })
    },
    getQuestionCount() {
      const rawValue = this.questionMode === 'custom' ? this.customQuestionCount : this.questionMode
      const count = Number.parseInt(rawValue, 10)

      if (Number.isNaN(count) || count < 1 || count > 50) {
        this.error = 'Choose a question count from 1 to 50'
        return null
      }

      return count
    },
    syncSettingsForm() {
      const count = this.roomSettings.questionCount
      const presetCounts = ['5', '10', '15', '20']
      const countAsText = String(count)

      this.questionMode = presetCounts.includes(countAsText) ? countAsText : 'custom'
      this.customQuestionCount = countAsText
      this.selectedCategory = this.roomSettings.categoryId ? String(this.roomSettings.categoryId) : ''
    },
    async loadCategories() {
      try {
        const response = await fetch('http://localhost:3000/api/categories')
        const data = await response.json()
        this.categories = Array.isArray(data) ? data : []
        this.updateCategoryName()
      } catch (error) {
        this.error = 'Could not load categories right now'
      }
    },
    updateCategoryName() {
      if (!this.roomSettings.categoryId) {
        this.categoryName = 'Any Category'
        return
      }

      const match = this.categories.find((category) => category.id === this.roomSettings.categoryId)
      this.categoryName = match ? match.name : 'Selected Category'
    },
    saveSettings() {
      this.error = ''

      const questionCount = this.getQuestionCount()
      if (!questionCount) return

      socket.emit('update-room-settings', {
        code: this.code,
        questionCount,
        categoryId: this.selectedCategory || null
      })
    },
    startGame() {
      this.saveSettings()
      if (this.error) return

      socket.emit('start-game', this.code)
    },
    submitAnswer(answer, event) {
      if (this.hasAnsweredCurrentQuestion || this.summaryData) return

      this.hasAnsweredCurrentQuestion = true
      this.animateAnswerSelection(event?.currentTarget)
      socket.emit('submit-answer', { code: this.code, answer })
    },
    shuffleAnswers(question) {
      return [...question.incorrect_answers, question.correct_answer].sort(() => Math.random() - 0.5)
    },
    leaveRoom() {
      socket.emit('leave-room', this.code)
      this.$router.push('/')
    },
    renderSummaryChart() {
      const container = this.$refs.summaryChartContainer
      if (!container || !this.summaryData) return

      d3.select(container).selectAll('*').remove()

      const data = this.summaryData.options.map((option) => ({
        answer: option.answer,
        count: option.count,
        isCorrect: option.isCorrect
      }))

      const width = Math.max(container.clientWidth || 520, 320)
      const height = 360
      const margin = { top: 24, right: 24, bottom: 90, left: 52 }

      const svg = d3
        .select(container)
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('class', 'results-chart-svg')
        .attr('role', 'img')
        .attr('aria-label', 'Answer breakdown chart for the current question')

      const x = d3
        .scaleBand()
        .domain(data.map((option) => option.answer))
        .range([margin.left, width - margin.right])
        .padding(0.28)

      const y = d3
        .scaleLinear()
        .domain([0, Math.max(d3.max(data, (option) => option.count) || 0, 1)])
        .nice()
        .range([height - margin.bottom, margin.top])

      svg
        .append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickSize(0))
        .call((group) => group.selectAll('path, line').attr('stroke', '#cbd5e1'))
        .call((group) => group.selectAll('text').attr('fill', '#64748b').style('font-size', '12px'))
        .call((group) =>
          group
            .selectAll('text')
            .attr('transform', 'rotate(-18)')
            .style('text-anchor', 'end')
        )

      svg
        .append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(4).tickSizeOuter(0))
        .call((group) => group.selectAll('path, line').attr('stroke', '#cbd5e1'))
        .call((group) => group.selectAll('text').attr('fill', '#64748b').style('font-size', '12px'))

      svg
        .append('g')
        .selectAll('rect')
        .data(data)
        .join('rect')
        .attr('x', (option) => x(option.answer))
        .attr('y', height - margin.bottom)
        .attr('rx', 10)
        .attr('ry', 10)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', (option) => (option.isCorrect ? '#16a34a' : '#dc2626'))
        .transition()
        .duration(700)
        .attr('y', (option) => y(option.count))
        .attr('height', (option) => height - margin.bottom - y(option.count))

      svg
        .append('g')
        .selectAll('text')
        .data(data)
        .join('text')
        .attr('x', (option) => (x(option.answer) || 0) + x.bandwidth() / 2)
        .attr('y', (option) => y(option.count) - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#1f2937')
        .style('font-size', '13px')
        .style('font-weight', '700')
        .text((option) => `${option.count} player${option.count === 1 ? '' : 's'}`)
    },
    handleRoomState(room) {
      if (room.code !== this.code) return

      this.players = room.players
      this.hostId = room.hostId
      this.roomPhase = room.phase
      this.roomSettings = room.settings
      this.syncSettingsForm()
      this.updateCategoryName()

      const me = room.players.find((player) => player.name === this.playerName && player.id === socket.id)
      if (me) {
        this.playerId = me.id
      }

      if (room.phase === 'results') {
        this.$router.push({
          path: '/results',
          query: {
            code: this.code,
            name: this.playerName
          }
        })
      }

      if (room.phase === 'lobby') {
        this.question = null
        this.answers = []
        this.current = 0
        this.total = 0
        this.answeredPlayers = 0
        this.hasAnsweredCurrentQuestion = false
        this.summaryData = null
      }

      if (room.phase === 'game' && !this.question) {
        this.current = 0
        this.total = 0
        this.answeredPlayers = 0
        this.hasAnsweredCurrentQuestion = false
      }
    },
    handlePlayersJoined(players) {
      this.players = players
    },
    handleReturnToLobby(room) {
      if (room.code !== this.code) return

      this.handleRoomState(room)
    },
    handleQuestionUpdated({ question, current, total, answeredPlayers }) {
      this.roomPhase = 'game'
      this.question = question
      this.answers = this.shuffleAnswers(question)
      this.current = current
      this.total = total
      this.answeredPlayers = answeredPlayers
      this.hasAnsweredCurrentQuestion = false
      this.summaryData = null
      if (this.$refs.summaryChartContainer) {
        d3.select(this.$refs.summaryChartContainer).selectAll('*').remove()
      }
      this.animateQuestionPanel()
    },
    handleQuestionSummary(summary) {
      this.summaryData = summary
      this.$nextTick(() => {
        this.renderSummaryChart()
        this.animateSummaryCallout()
      })
    },
    handleAnswerProgress({ answeredPlayers }) {
      this.answeredPlayers = answeredPlayers
    },
    handleScoreUpdate(players) {
      this.players = players
    },
    handleGameOver() {
      this.$router.push({
        path: '/results',
        query: {
          code: this.code,
          name: this.playerName
        }
      })
    },
    handleError(msg) {
      this.error = msg
    }
  },
  mounted() {
    this.playerId = socket.id || ''
    this.loadCategories()
    socket.on('player-joined', this.handlePlayersJoined)
    socket.on('room-state', this.handleRoomState)
    socket.on('return-to-lobby', this.handleReturnToLobby)
    socket.on('question-updated', this.handleQuestionUpdated)
    socket.on('question-summary', this.handleQuestionSummary)
    socket.on('answer-progress', this.handleAnswerProgress)
    socket.on('score-update', this.handleScoreUpdate)
    socket.on('game-over', this.handleGameOver)
    socket.on('error', this.handleError)

    socket.emit('request-room-state', this.code)
  },
  beforeUnmount() {
    socket.off('player-joined', this.handlePlayersJoined)
    socket.off('room-state', this.handleRoomState)
    socket.off('return-to-lobby', this.handleReturnToLobby)
    socket.off('question-updated', this.handleQuestionUpdated)
    socket.off('question-summary', this.handleQuestionSummary)
    socket.off('answer-progress', this.handleAnswerProgress)
    socket.off('score-update', this.handleScoreUpdate)
    socket.off('game-over', this.handleGameOver)
    socket.off('error', this.handleError)
  }
}
</script>
