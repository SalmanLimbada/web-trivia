<template>
  <div class="container mt-6">
    <div class="box">
      <div class="level">
        <div class="level-left">
          <p class="subtitle">Room: <strong>{{ code }}</strong></p>
        </div>
        <div class="level-right">
          <p class="subtitle">Players: {{ players.length }}</p>
        </div>
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
            @click="submitAnswer(answer)"
            v-html="answer"
          ></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client'
const socket = io('http://localhost:3000')

export default {
  data() {
    return {
      code: this.$route.query.code,
      isHost: this.$route.query.host === 'true',
      players: [],
      gameStarted: false,
      question: null,
      answers: []
    }
  },
  methods: {
    startGame() {
      socket.emit('start-game', this.code)
    },
    submitAnswer(answer) {
      socket.emit('submit-answer', { code: this.code, answer })
    },
    shuffleAnswers(q) {
      return [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5)
    }
  },
  mounted() {
    socket.on('player-joined', (players) => {
      this.players = players
    })
    socket.on('game-started', (question) => {
      this.gameStarted = true
      this.question = question
      this.answers = this.shuffleAnswers(question)
    })
    socket.on('score-update', (players) => {
      this.players = players
      this.$router.push({ path: '/results', query: { players: JSON.stringify(players) } })
    })
  }
}
</script>