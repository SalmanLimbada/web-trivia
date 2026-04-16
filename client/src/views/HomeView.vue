<template>
  <div class="view-wrap">
    <h1 class="title has-text-centered page-title">Web Trivia</h1>
    <div class="box hero-card">
      <div class="field">
        <label class="label control-label">Your Name</label>
        <input class="input" type="text" v-model.trim="playerName" placeholder="Enter your name" />
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
        <p class="help field-help">OpenTDB supports up to 50 questions per request.</p>
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

      <div class="field">
        <button class="button is-primary is-fullwidth mb-2" @click="createRoom">Create Room</button>
      </div>

      <div class="field has-addons">
        <div class="control is-expanded">
          <input class="input" type="text" v-model.trim="roomCode" placeholder="Enter room code" />
        </div>
        <div class="control">
          <button class="button is-info" @click="joinRoom">Join</button>
        </div>
      </div>

      <p v-if="loadingCategories" class="subtle-text mb-2">Loading categories...</p>
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
      questionMode: '10',
      customQuestionCount: '10',
      selectedCategory: '',
      categories: [],
      loadingCategories: false,
      error: ''
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
    createRoom() {
      this.error = ''

      if (!this.playerName) {
        this.error = 'Enter your name'
        return
      }

      const questionCount = this.getQuestionCount()
      if (!questionCount) return

      socket.emit('create-room', {
        playerName: this.playerName,
        questionCount,
        categoryId: this.selectedCategory || null
      })
    },
    joinRoom() {
      this.error = ''

      if (!this.playerName) {
        this.error = 'Enter your name'
        return
      }

      if (!this.roomCode) {
        this.error = 'Enter a room code'
        return
      }

      socket.emit('join-room', {
        code: this.roomCode.toUpperCase(),
        playerName: this.playerName
      })
    },
    async loadCategories() {
      this.loadingCategories = true

      try {
        const response = await fetch('http://localhost:3000/api/categories')
        const data = await response.json()
        this.categories = Array.isArray(data) ? data : []
      } catch (error) {
        this.error = 'Could not load categories right now'
      } finally {
        this.loadingCategories = false
      }
    },
    handleRoomCreated(room) {
      this.$router.push({
        path: '/game',
        query: {
          code: room.code,
          name: this.playerName,
          host: 'true'
        }
      })
    },
    handleRoomState(room) {
      if (!this.roomCode) return
      if (room.code !== this.roomCode.toUpperCase()) return

      this.$router.push({
        path: '/game',
        query: {
          code: room.code,
          name: this.playerName
        }
      })
    },
    handleError(msg) {
      this.error = msg
    }
  },
  mounted() {
    this.loadCategories()
    socket.on('room-created', this.handleRoomCreated)
    socket.on('room-state', this.handleRoomState)
    socket.on('error', this.handleError)
  },
  beforeUnmount() {
    socket.off('room-created', this.handleRoomCreated)
    socket.off('room-state', this.handleRoomState)
    socket.off('error', this.handleError)
  }
}
</script>
