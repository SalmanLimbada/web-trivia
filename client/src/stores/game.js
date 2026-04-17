import { defineStore } from 'pinia'
import { getSocket } from '../socket'

export const useGameStore = defineStore('game', {
    state: () => ({
        code: '',
        playerName: '',
        playerId: '',
        hostId: '',
        players: [],
        phase: 'lobby',
        question: null,
        answers: [],
        current: 0,
        total: 0,
        answeredPlayers: 0,
        hasAnswered: false,
        summaryData: null,
        error: '',
        settings: { questionCount: 10, categoryId: null, difficulty: null },
        categories: [],
        timeRemaining: 0,
        questionTimeLimit: 0
    }),
    getters: {
        isHost: (state) => state.playerId !== '' && state.playerId === state.hostId,
        sortedPlayers: (state) => [...state.players].sort((a, b) => b.score - a.score),
        categoryName: (state) => {
            if (!state.settings.categoryId) return 'Any Category'
            const match = state.categories.find((c) => c.id === state.settings.categoryId)
            return match ? match.name : 'Selected Category'
        }
    },
    actions: {
        setCode(code) { this.code = code },
        setPlayerName(name) { this.playerName = name },
        applyRoomState(room) {
            this.players = room.phase === 'results'
                ? (room.finalPlayers || room.players)
                : room.players
            this.hostId = room.hostId
            this.phase = room.phase
            this.settings = room.settings
            const socket = getSocket()
            const me = room.players.find((p) => p.id === socket.id)
            if (me) this.playerId = me.id
        },
        applyQuestion({ question, current, total, answeredPlayers, timeLimitSeconds }) {
            this.phase = 'game'
            this.question = question
            this.current = current
            this.total = total
            this.answeredPlayers = answeredPlayers
            this.hasAnswered = false
            this.summaryData = null
            this.questionTimeLimit = timeLimitSeconds || 0
            this.timeRemaining = timeLimitSeconds || 0
            this.answers = this.shuffle([...question.incorrect_answers, question.correct_answer])
        },
        applySummary(summary) { this.summaryData = summary },
        applyScores(players) { this.players = players },
        applyProgress({ answeredPlayers }) { this.answeredPlayers = answeredPlayers },
        setError(msg) { this.error = msg },
        clearError() { this.error = '' },
        setCategories(list) { this.categories = list },
        tickTimer() {
            if (this.timeRemaining > 0) this.timeRemaining -= 1
        },
        markAnswered() { this.hasAnswered = true },
        reset() {
            this.question = null
            this.answers = []
            this.current = 0
            this.total = 0
            this.answeredPlayers = 0
            this.hasAnswered = false
            this.summaryData = null
            this.timeRemaining = 0
        },
        shuffle(pool) {
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                    ;[pool[i], pool[j]] = [pool[j], pool[i]]
            }
            return pool
        }
    }
})