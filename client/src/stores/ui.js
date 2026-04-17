import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
    state: () => {
        const savedVolume = Number.parseInt(localStorage.getItem('web-trivia-music-volume') || '18', 10)
        const normalized = Number.isNaN(savedVolume) ? 0.18 : Math.min(Math.max(savedVolume, 0), 100) / 100
        return {
            theme: localStorage.getItem('web-trivia-theme') || 'light',
            musicVolume: normalized
        }
    },
    actions: {
        toggleTheme() {
            this.theme = this.theme === 'dark' ? 'light' : 'dark'
            document.documentElement.setAttribute('data-theme', this.theme)
            localStorage.setItem('web-trivia-theme', this.theme)
        },
        applyTheme() {
            document.documentElement.setAttribute('data-theme', this.theme)
        },
        setVolume(value) {
            this.musicVolume = Math.min(Math.max(value, 0), 1)
            localStorage.setItem('web-trivia-music-volume', String(Math.round(this.musicVolume * 100)))
        }
    }
})