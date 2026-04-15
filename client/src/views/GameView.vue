<template>
  <div class="container mt-6">
    <div class="box">
      <div class="level">
        <div class="level-left">
          <div>
            <p class="subtitle mb-1">Room: <strong>{{ code }}</strong></p>
            <p class="is-size-7 has-text-grey">
              {{ settings.questionCount }} questions
              <span v-if="categoryName"> | {{ categoryName }}</span>
            </p>
          </div>
        </div>
        <div class="level-right">
          <p class="subtitle">Question {{ current }} of {{ total }}</p>
        </div>
      </div>

      <div v-if="error" class="notification is-danger is-light">
        {{ error }}
      </div>

      <div v-if="!gameStarted">
        <p class="has-text-centered mb-4">Waiting for players...</p>
        <ul class="mb-4">
          <li v-for="player in players" :key="player.id">{{ player.name }}</li>
        </ul>
        <button v-if="isHost" class="button is-success is-fullwidth" @click="startGame">Start Game</button>
      </div>

      <div v-if="gameStarted && question">
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

      <div v-if="gameStarted" class="mt-4">
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
      isHost: this.$route.query.host === 'true',
      playerName: this.$route.query.name || '',
      players: [],
      gameStarted: false,
      question: null,
      answers: [],
      current: 0,
      total: 0,
      answeredPlayers: 0,
      hasAnsweredCurrentQuestion: false,
      error: '',
      settings: {
        questionCount: 10,
        categoryId: null
      },
      categoryName: ''
    }
  },
  methods: {
    startGame() {
      this.error = ''
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
    async loadCategoryName(categoryId) {
      if (!categoryId) {
        this.categoryName = 'Any Category'
        return
      }

      try {
        const response = await fetch('http://localhost:3000/api/categories')
        const categories = await response.json()
        const match = Array.isArray(categories)
          ? categories.find((category) => category.id === categoryId)
          : null

        this.categoryName = match ? match.name : 'Custom Category'
      } catch (error) {
        this.categoryName = 'Selected Category'
      }
    }
  },
  mounted() {
    socket.on('player-joined', (players) => {
      this.players = players
    })

    socket.on('room-state', (room) => {
      if (room.code !== this.code) return

      this.players = room.players
      this.settings = room.settings
      this.gameStarted = room.gameStarted
      this.loadCategoryName(room.settings.categoryId)
    })

    socket.on('question-updated', ({ question, current, total, answeredPlayers }) => {
      this.gameStarted = true
      this.question = question
      this.answers = this.shuffleAnswers(question)
      this.current = current
      this.total = total
      this.answeredPlayers = answeredPlayers
      this.hasAnsweredCurrentQuestion = false
    })

    socket.on('answer-progress', ({ answeredPlayers }) => {
      this.answeredPlayers = answeredPlayers
    })

    socket.on('score-update', (players) => {
      this.players = players
    })

    socket.on('game-over', (players) => {
      this.$router.push({
        path: '/results',
        query: {
          players: JSON.stringify(players)
        }
      })
    })

    socket.on('error', (msg) => {
      this.error = msg
    })

    socket.emit('request-room-state', this.code)
  }
}
</script>
