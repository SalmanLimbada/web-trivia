<template>
  <main class="app-shell">
    <div class="app-controls" role="group" aria-label="App display and music controls">
      <button class="control-pill" type="button" @click="toggleTheme">
        {{ theme === 'dark' ? 'Light Mode' : 'Dark Mode' }}
      </button>
      <div class="music-control" aria-label="Background music volume">
        <label class="music-label" for="music-volume">Music {{ Math.round(musicVolume * 100) }}%</label>
        <input
          id="music-volume"
          class="music-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          :value="Math.round(musicVolume * 100)"
          @input="handleVolumeChange"
        />
      </div>
    </div>
    <RouterView />
  </main>
</template>

<script>
export default {
  data() {
    const savedVolume = Number.parseInt(localStorage.getItem('web-trivia-music-volume') || '18', 10)
    const normalizedVolume = Number.isNaN(savedVolume) ? 0.18 : Math.min(Math.max(savedVolume, 0), 100) / 100

    return {
      theme: localStorage.getItem('web-trivia-theme') || 'light',
      isMusicEnabled: false,
      musicVolume: normalizedVolume,
      audioContext: null,
      masterGain: null,
      musicIntervalId: null,
      progressionIndex: 0,
      unlockHandler: null
    }
  },
  methods: {
    applyTheme() {
      document.documentElement.setAttribute('data-theme', this.theme)
      localStorage.setItem('web-trivia-theme', this.theme)
    },
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      this.applyTheme()
    },
    ensureAudioContext() {
      if (this.audioContext) return true

      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return false

      this.audioContext = new AudioContextClass()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = this.musicVolume * 0.3
      this.masterGain.connect(this.audioContext.destination)
      return true
    },
    applyMusicVolume() {
      if (!this.masterGain || !this.audioContext) return

      const gainValue = this.musicVolume * 0.3
      this.masterGain.gain.setTargetAtTime(gainValue, this.audioContext.currentTime, 0.04)
    },
    handleVolumeChange(event) {
      const nextVolume = Number.parseInt(event.target.value, 10)
      if (Number.isNaN(nextVolume)) return

      this.musicVolume = Math.min(Math.max(nextVolume, 0), 100) / 100
      localStorage.setItem('web-trivia-music-volume', String(Math.round(this.musicVolume * 100)))
      this.applyMusicVolume()

      if (!this.isMusicEnabled && this.musicVolume > 0) {
        this.startMusic().catch(() => {
          this.setupAutoplayFallback()
        })
      }
    },
    playTone(frequency, startAt, duration, type = 'sine', gain = 0.07) {
      if (!this.audioContext || !this.masterGain) return

      const oscillator = this.audioContext.createOscillator()
      const noteGain = this.audioContext.createGain()

      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, startAt)

      noteGain.gain.setValueAtTime(0, startAt)
      noteGain.gain.linearRampToValueAtTime(gain, startAt + 0.1)
      noteGain.gain.linearRampToValueAtTime(0.001, startAt + duration)

      oscillator.connect(noteGain)
      noteGain.connect(this.masterGain)

      oscillator.start(startAt)
      oscillator.stop(startAt + duration + 0.06)
    },
    playElevatorPhrase() {
      if (!this.audioContext) return

      const now = this.audioContext.currentTime + 0.03
      const base = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0]
      const progressions = [
        [0, 2, 4],
        [1, 3, 5],
        [0, 3, 4],
        [1, 2, 5]
      ]
      const notes = progressions[this.progressionIndex % progressions.length]

      notes.forEach((index, chordToneIndex) => {
        const frequency = base[index]
        this.playTone(frequency, now + chordToneIndex * 0.16, 0.6, 'triangle', 0.05)
        this.playTone(frequency / 2, now + chordToneIndex * 0.16, 0.65, 'sine', 0.03)
      })

      this.progressionIndex += 1
    },
    async startMusic() {
      const canPlay = this.ensureAudioContext()
      if (!canPlay) return false

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      this.applyMusicVolume()

      if (!this.musicIntervalId) {
        this.playElevatorPhrase()
        this.musicIntervalId = window.setInterval(() => {
          this.playElevatorPhrase()
        }, 1800)
      }

      this.isMusicEnabled = true
      return true
    },
    stopMusic() {
      if (this.musicIntervalId) {
        window.clearInterval(this.musicIntervalId)
        this.musicIntervalId = null
      }

      this.isMusicEnabled = false
    },
    setupAutoplayFallback() {
      if (this.unlockHandler) return

      this.unlockHandler = () => {
        this.removeUnlockListeners()
        this.startMusic().catch(() => {})
      }

      window.addEventListener('pointerdown', this.unlockHandler)
      window.addEventListener('keydown', this.unlockHandler)
    },
    removeUnlockListeners() {
      if (!this.unlockHandler) return

      window.removeEventListener('pointerdown', this.unlockHandler)
      window.removeEventListener('keydown', this.unlockHandler)
      this.unlockHandler = null
    },
    async attemptAutoPlayMusic() {
      if (this.musicVolume <= 0) {
        return
      }

      try {
        await this.startMusic()
      } catch (error) {
        this.setupAutoplayFallback()
      }
    }
  },
  mounted() {
    this.applyTheme()
    this.attemptAutoPlayMusic()
  },
  beforeUnmount() {
    this.stopMusic()
    this.removeUnlockListeners()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}
</script>
