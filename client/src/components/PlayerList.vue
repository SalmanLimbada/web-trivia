<template>
  <div :class="variant === 'scores' ? 'scores-panel' : 'players-panel'">
    <p class="label control-label">{{ title }}</p>
    <ul :class="variant === 'scores' ? 'score-list mb-0' : 'player-list mb-0'">
      <li v-for="player in displayedPlayers" :key="player.id">
        <template v-if="variant === 'scores'">
          {{ player.name }}: {{ player.score }}
        </template>
        <template v-else>
          {{ player.name }}<span v-if="player.id === hostId"> (host)</span>
        </template>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'PlayerList',
  props: {
    players: { type: Array, required: true },
    hostId: { type: String, default: '' },
    variant: { type: String, default: 'players' },
    title: { type: String, default: 'Players:' },
    sortByScore: { type: Boolean, default: false }
  },
  computed: {
    displayedPlayers() {
      if (!this.sortByScore) return this.players
      return [...this.players].sort((a, b) => b.score - a.score)
    }
  }
}
</script>