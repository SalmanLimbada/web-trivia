<template>
  <div class="container mt-6">
    <h1 class="title has-text-centered">Web Trivia</h1>
    <div class="box" style="max-width: 400px; margin: auto">
      <div class="field">
        <label class="label">Your Name</label>
        <input class="input" type="text" v-model="playerName" placeholder="Enter your name" />
      </div>
      <div class="field">
        <label class="label">Number of Questions</label>
        <div class="select is-fullwidth">
          <select v-model="questionCount">
            <option value="5">5</option>
            <option value="10" selected>10</option>
            <option value="15">15</option>
            <option value="20">20</option>
          </select>
        </div>
      </div>
      <div class="field">
        <button class="button is-primary is-fullwidth mb-2" @click="createRoom">Create Room</button>
      </div>
      <div class="field has-addons">
        <div class="control is-expanded">
          <input class="input" type="text" v-model="roomCode" placeholder="Enter room code" />
        </div>
        <div class="control">
          <button class="button is-info" @click="joinRoom">Join</button>
        </div>
      </div>
      <p v-if="error" class="has-text-danger">{{ error }}</p>
    </div>
  </div>
</template>

<script>
import { getSocket } from '../socket'
const socket = getSocket()

export default {
  data() {
    return {
      playerName: '',
      roomCode: '',
      questionCount: 10,
      error: ''
    }
  },
  methods: {
    createRoom() {
      if (!this.playerName) return this.error = 'Enter your name'
      socket.emit('create-room', { playerName: this.playerName, questionCount: parseInt(this.questionCount) })
    },
    joinRoom() {
      if (!this.playerName) return this.error = 'Enter your name'
      if (!this.roomCode) return this.error = 'Enter a room code'
      socket.emit('join-room', { code: this.roomCode.toUpperCase(), playerName: this.playerName })
    }
  },
  mounted() {
    socket.on('room-created', (code) => {
      this.$router.push({ path: '/game', query: { code, name: this.playerName, host: 'true' } })
    })
    socket.on('player-joined', () => {
      this.$router.push({ path: '/game', query: { code: this.roomCode.toUpperCase(), name: this.playerName } })
    })
    socket.on('error', (msg) => {
      this.error = msg
    })
  }
}
</script>