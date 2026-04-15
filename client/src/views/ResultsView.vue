<template>
  <div class="container mt-6">
    <h1 class="title has-text-centered">Results</h1>
    <div class="box">
      <table class="table is-fullwidth">
        <thead>
          <tr>
            <th>Player</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in players" :key="player.id">
            <td>{{ player.name }}</td>
            <td>{{ player.score }}</td>
          </tr>
        </tbody>
      </table>
      <button class="button is-primary is-fullwidth mt-4" @click="$router.push('/')">Play Again</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      players: JSON.parse(this.$route.query.players || '[]')
    }
  }
}
</script>