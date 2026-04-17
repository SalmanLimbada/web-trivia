<template>
  <div class="question-timer" :class="{ 'is-critical': isCritical }">
    <div class="timer-label">
      Time: <strong>{{ remaining }}s</strong>
    </div>
    <div class="timer-bar-outer">
      <div class="timer-bar-inner" :style="{ width: percentage + '%' }"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'QuestionTimer',
  props: {
    duration: { type: Number, required: true }
  },
  data() {
    return { remaining: this.duration, intervalId: null }
  },
  computed: {
    percentage() { return this.duration > 0 ? (this.remaining / this.duration) * 100 : 0 },
    isCritical() { return this.remaining <= 5 }
  },
  watch: {
    duration(newVal) {
      this.remaining = newVal
      this.restart()
    }
  },
  mounted() { this.restart() },
  beforeUnmount() { this.clear() },
  methods: {
    restart() {
      this.clear()
      this.intervalId = window.setInterval(() => {
        this.remaining = Math.max(0, this.remaining - 1)
        if (this.remaining <= 0) this.clear()
      }, 1000)
    },
    clear() {
      if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null }
    }
  }
}
</script>