<template>
  <div class="view-wrap">
    <h1 class="title has-text-centered page-title">Results</h1>
    <div class="box results-card">
      <table class="table is-fullwidth results-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in sortedPlayers" :key="player.id">
            <td>{{ player.name }}<span v-if="player.id === hostId"> (host)</span></td>
            <td>{{ player.score }}</td>
          </tr>
        </tbody>
      </table>

      <p v-if="message" class="status-note has-text-centered mb-4">{{ message }}</p>

      <div class="buttons">
        <button
          v-if="isHost"
          class="button is-primary is-fullwidth"
          :disabled="isRestarting"
          @click="restartSameSettings"
        >
          {{ isRestarting ? 'Restarting...' : 'Restart Same Settings' }}
        </button>
        <button
          v-if="isHost"
          class="button is-link is-light is-fullwidth"
          :disabled="isRestarting"
          @click="restartGame"
        >
          Return To Lobby
        </button>
        <button class="button is-light is-fullwidth" @click="goHome">Back to Home</button>
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
      code: this.$route.query.code || '',
      playerName: this.$route.query.name || '',
      playerId: socket.id || '',
      hostId: '',
      players: [],
      phase: 'results',
      isRestarting: false,
      message: 'Waiting in the same room for the next round.'
    }
  },
  computed: {
    isHost() {
      return this.playerId !== '' && this.playerId === this.hostId
    },
    sortedPlayers() {
      return [...this.players].sort((a, b) => b.score - a.score)
    }
  },
  methods: {
    restartGame() {
      if (!this.isHost || !this.code) return

      this.isRestarting = true
      this.message = 'Sending everyone back to the lobby...'
      socket.emit('restart-game', { code: this.code })
    },
    restartSameSettings() {
      if (!this.isHost || !this.code) return

      this.isRestarting = true
      this.message = 'Restarting the game with the same settings...'
      socket.emit('restart-same-settings', this.code)
    },
    goHome() {
      if (this.code) {
        socket.emit('leave-room', this.code)
      }

      this.$router.push('/')
    },
    handleRoomState(room) {
      if (room.code !== this.code) return

      this.players = room.phase === 'results' ? (room.finalPlayers || room.players) : room.players
      this.hostId = room.hostId
      this.phase = room.phase
      this.playerId = socket.id || this.playerId

      if (room.phase === 'lobby' || room.phase === 'game') {
        this.$router.push({
          path: '/game',
          query: {
            code: this.code,
            name: this.playerName
          }
        })
      }
    },
    handleReturnToLobby(room) {
      if (room.code !== this.code) return

      this.$router.push({
        path: '/game',
        query: {
          code: this.code,
          name: this.playerName
        }
      })
    },
    handlePlayersJoined(players) {
      this.players = players
    },
    handleGameOver(players) {
      this.players = players
      this.isRestarting = false
      this.message = this.isHost
        ? 'You can restart immediately with the same settings, or return everyone to the lobby and change them.'
        : 'Waiting for the host to restart the room or go back home.'
    },
    handleError(msg) {
      this.isRestarting = false
      this.message = msg
    }
  },
  mounted() {
    socket.on('room-state', this.handleRoomState)
    socket.on('return-to-lobby', this.handleReturnToLobby)
    socket.on('player-joined', this.handlePlayersJoined)
    socket.on('game-over', this.handleGameOver)
    socket.on('error', this.handleError)

    if (this.code) {
      socket.emit('request-room-state', this.code)
    }
  },
  beforeUnmount() {
    socket.off('room-state', this.handleRoomState)
    socket.off('return-to-lobby', this.handleReturnToLobby)
    socket.off('player-joined', this.handlePlayersJoined)
    socket.off('game-over', this.handleGameOver)
    socket.off('error', this.handleError)
  }
}
</script>
