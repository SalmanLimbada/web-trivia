<template>
  <div class="view-wrap">
    <div class="box game-card">
      <div class="game-header">
        <div class="level-left">
          <div>
            <p class="room-chip">Room: {{ code }}</p>
            <p class="is-size-7 subtle-text mt-2">
              {{ settings.questionCount }} questions
              <span v-if="categoryName"> | {{ categoryName }}</span>
              <span v-if="settings.difficulty"> | {{ capitalize(settings.difficulty) }}</span>
            </p>
          </div>
        </div>
        <div class="level-right game-header-right">
          <div class="has-text-right">
            <p class="subtitle game-progress mb-2">Question {{ current }} of {{ total }}</p>
            <button class="button is-small is-light" @click="leaveRoom">
              <SvgIcon name="exit" size="sm" aria-label="Exit game" />
              <span>Exit Game</span>
            </button>
          </div>
        </div>
      </div>

      <Transition name="notice-slide">
        <div v-if="error" class="notification is-danger is-light" key="err">
          {{ error }}
        </div>
      </Transition>

      <Transition name="phase-fade" mode="out-in">
        <!-- Lobby -->
        <div v-if="roomPhase === 'lobby'" key="lobby">
          <p class="status-note has-text-centered mb-4">Waiting in the lobby...</p>

          <div v-if="isHost" class="mb-5">
            <div class="card-section mb-4">
              <p class="section-title">Room Settings</p>
              <p class="section-copy">
                Choose question count, category, and difficulty before you start the round.
              </p>
            </div>

            <SettingsForm
              v-model:questionMode="questionMode"
              v-model:customQuestionCount="customQuestionCount"
              v-model:selectedCategory="selectedCategory"
              v-model:selectedDifficulty="selectedDifficulty"
              :categories="categories"
            />

            <div class="buttons">
              <button class="button is-link is-light" @click="saveSettings">Save Settings</button>
              <button class="button is-success" @click="startGame">Start Game</button>
            </div>
          </div>

          <p v-else class="settings-note has-text-centered mb-4">
            Waiting for the host to choose settings and start the game.
          </p>

          <PlayerList :players="players" :host-id="hostId" title="Players:" />
        </div>

        <div
          v-else-if="roomPhase === 'game' && summaryData"
          key="summary"
          class="summary-panel"
        >
          <div class="question-panel">
            <p class="label control-label mb-2">
              <SvgIcon name="question" size="sm" aria-label="Question results" />
              Answer Breakdown
            </p>
            <p class="question-text mb-4" v-html="summaryData.question"></p>
            <p ref="answerCallout" class="answer-callout mb-4">
              Correct answer:
              <strong v-html="summaryData.correctAnswer"></strong>
            </p>
            <SummaryChart :options="summaryData.options" />
          </div>
        </div>

        <div
          v-else-if="roomPhase === 'game' && question"
          key="question"
        >
          <QuestionTimer
            v-if="questionTimeLimit > 0"
            :key="current"
            :duration="questionTimeLimit"
          />

          <QuestionPanel
            :key="current"
            :question="question.question"
            kicker="Current Question"
          />

          <div class="buttons">
            <AnswerButton
              v-for="answer in answers"
              :key="answer"
              :answer="answer"
              :disabled="hasAnsweredCurrentQuestion"
              @select="submitAnswer"
            />
          </div>

          <p v-if="hasAnsweredCurrentQuestion" class="has-text-centered has-text-grey mt-3">
            Answer locked in. Waiting for the other players...
          </p>
          <p v-else class="has-text-centered subtle-text mt-3">
            {{ answeredPlayers }} of {{ players.length }} players have answered
          </p>
        </div>
      </Transition>

      <div v-if="roomPhase === 'game'" class="mt-4">
        <PlayerList :players="players" variant="scores" title="Scores:" />
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'pinia'
import { useGameStore } from '../stores/game'
import { getSocket } from '../socket'
import SettingsForm from '../components/SettingsForm.vue'
import PlayerList from '../components/PlayerList.vue'
import QuestionPanel from '../components/QuestionPanel.vue'
import AnswerButton from '../components/AnswerButton.vue'
import SummaryChart from '../components/SummaryChart.vue'
import QuestionTimer from '../components/QuestionTimer.vue'
import SvgIcon from '../components/SvgIcon.vue'

const socket = getSocket()

export default {
  components: {
    SettingsForm,
    PlayerList,
    QuestionPanel,
    AnswerButton,
    SummaryChart,
    QuestionTimer,
    SvgIcon
  },
  data() {
    return {
      questionMode: '10',
      customQuestionCount: '10',
      selectedCategory: '',
      selectedDifficulty: ''
    }
  },
  computed: {
    ...mapState(useGameStore, {
      code: 'code',
      playerName: 'playerName',
      players: 'players',
      hostId: 'hostId',
      roomPhase: 'phase',
      question: 'question',
      answers: 'answers',
      current: 'current',
      total: 'total',
      answeredPlayers: 'answeredPlayers',
      hasAnsweredCurrentQuestion: 'hasAnswered',
      summaryData: 'summaryData',
      error: 'error',
      settings: 'settings',
      categories: 'categories',
      questionTimeLimit: 'questionTimeLimit',
      isHost: 'isHost',
      categoryName: 'categoryName'
    })
  },
  methods: {
    ...mapActions(useGameStore, [
      'setCode',
      'setPlayerName',
      'applyRoomState',
      'applyQuestion',
      'applySummary',
      'applyScores',
      'applyProgress',
      'setError',
      'clearError',
      'setCategories',
      'markAnswered',
      'reset'
    ]),
    capitalize(str) {
      if (!str) return ''
      return str.charAt(0).toUpperCase() + str.slice(1)
    },
    syncSettingsForm() {
      const count = this.settings.questionCount
      const presetCounts = ['5', '10', '15', '20']
      const countAsText = String(count)
      this.questionMode = presetCounts.includes(countAsText) ? countAsText : 'custom'
      this.customQuestionCount = countAsText
      this.selectedCategory = this.settings.categoryId ? String(this.settings.categoryId) : ''
      this.selectedDifficulty = this.settings.difficulty || ''
    },
    async loadCategories() {
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()
        this.setCategories(Array.isArray(data) ? data : [])
      } catch (error) {
        this.setError('Could not load categories right now')
      }
    },
    getQuestionCount() {
      const rawValue = this.questionMode === 'custom' ? this.customQuestionCount : this.questionMode
      const count = Number.parseInt(rawValue, 10)

      if (Number.isNaN(count) || count < 1 || count > 50) {
        this.setError('Choose a question count from 1 to 50')
        return null
      }

      return count
    },
    saveSettings() {
      this.clearError()
      const questionCount = this.getQuestionCount()
      if (!questionCount) return

      socket.emit('update-room-settings', {
        code: this.code,
        questionCount,
        categoryId: this.selectedCategory || null,
        difficulty: this.selectedDifficulty || null
      })
    },
    startGame() {
      this.saveSettings()
      if (this.error) return
      socket.emit('start-game', this.code)
    },
    submitAnswer(answer) {
      if (this.hasAnsweredCurrentQuestion || this.summaryData) return
      this.markAnswered()
      socket.emit('submit-answer', { code: this.code, answer })
    },
    leaveRoom() {
      socket.emit('leave-room', this.code)
      this.reset()
      this.$router.push('/')
    },
    handleRoomState(room) {
      if (room.code !== this.code) return

      this.applyRoomState(room)
      this.syncSettingsForm()

      if (room.phase === 'results') {
        this.$router.push({
          path: '/results',
          query: { code: this.code, name: this.playerName }
        })
      }

      if (room.phase === 'lobby') {
        this.reset()
      }
    },
    handlePlayersJoined(players) {
      useGameStore().$patch({ players })
    },
    handleReturnToLobby(room) {
      if (room.code !== this.code) return
      this.handleRoomState(room)
    },
    handleQuestionUpdated(payload) {
      this.applyQuestion(payload)
    },
    handleQuestionSummary(summary) {
      this.applySummary(summary)
    },
    handleAnswerProgress(progress) {
      this.applyProgress(progress)
    },
    handleScoreUpdate(players) {
      this.applyScores(players)
    },
    handleGameOver() {
      this.$router.push({
        path: '/results',
        query: { code: this.code, name: this.playerName }
      })
    },
    handleError(msg) {
      this.setError(msg)
    }
  },
  created() {
    this.setCode(this.$route.query.code || '')
    this.setPlayerName(this.$route.query.name || '')
  },
  mounted() {
    const applyId = () => {
      useGameStore().$patch({ playerId: socket.id || '' })
    }
    if (socket.connected) applyId()
    else socket.on('connect', applyId)

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