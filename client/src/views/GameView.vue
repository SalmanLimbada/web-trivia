<template>
  <div class="container mt-6">
    <div class="box">
      <div class="level">
        <div class="level-left">
          <div>
            <p class="subtitle mb-1">Room: <strong>{{ code }}</strong></p>
            <p class="is-size-7 has-text-grey">
              {{ roomSettings.questionCount }} questions
              <span v-if="categoryName"> | {{ categoryName }}</span>
            </p>
          </div>
        </div>
        <div class="level-right">
          <div class="has-text-right">
            <p class="subtitle mb-2">Question {{ current }} of {{ total }}</p>
            <button class="button is-small is-light" @click="leaveRoom">Exit Game</button>
          </div>
        </div>
      </div>

      <div v-if="error" class="notification is-danger is-light">
        {{ error }}
      </div>

      <div v-if="roomPhase === 'lobby'">
        <p class="has-text-centered mb-4">Waiting in the lobby...</p>

        <div v-if="isHost" class="mb-5">
          <div class="field">
            <label class="label">Question Count</label>
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
            <label class="label">Custom Question Count</label>
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
            <label class="label">Category</label>
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

        <p v-else class="has-text-centered has-text-grey mb-4">
          Waiting for the host to choose settings and start the game.
        </p>

        <p class="label">Players:</p>
        <ul class="mb-4">
          <li v-for="player in players" :key="player.id">
            {{ player.name }}<span v-if="player.id === hostId"> (host)</span>
          </li>
        </ul>
      </div>

      <div v-if="roomPhase === 'game' && question">
        <p class="label mb-4" v-html="question.question"></p>
        <div class="buttons">
          <button
            v-for="answer in answers"
            :key="answer"
            class="button is-info is-fullwidth mb-2"
            :disabled="hasAnsweredCurrentQuestion"
            @click="submitAnswer(answer)"
            v-html="answer"
          ></button>
        </div>

        <p v-if="hasAnsweredCurrentQuestion" class="has-text-centered has-text-grey mt-3">
          Answer locked in. Waiting for the other players...
        </p>
        <p v-else class="has-text-centered has-text-grey mt-3">
          {{ answeredPlayers }} of {{ players.length }} players have answered
        </p>
      </div>

      <div v-if="roomPhase === 'game'" class="mt-4">
        <p class="label">Scores:</p>
        <ul>
          <li v-for="player in players" :key="player.id">{{ player.name }}: {{ player.score }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
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
      categoryName: 'Any Category'
    }
  },
  computed: {
    isHost() {
      return this.playerId !== '' && this.playerId === this.hostId
    }
  },
  methods: {
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
    submitAnswer(answer) {
      if (this.hasAnsweredCurrentQuestion) return

      this.hasAnsweredCurrentQuestion = true
      socket.emit('submit-answer', { code: this.code, answer })
    },
    shuffleAnswers(question) {
      return [...question.incorrect_answers, question.correct_answer].sort(() => Math.random() - 0.5)
    },
    leaveRoom() {
      socket.emit('leave-room', this.code)
      this.$router.push('/')
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
    socket.off('answer-progress', this.handleAnswerProgress)
    socket.off('score-update', this.handleScoreUpdate)
    socket.off('game-over', this.handleGameOver)
    socket.off('error', this.handleError)
  }
}
</script>
