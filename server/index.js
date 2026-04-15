const express = require('express')
const cors = require('cors')
const path = require('path')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })
const PORT = 3000
const DEFAULT_QUESTION_COUNT = 10
const MAX_QUESTION_COUNT = 50

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../client/dist')))

function parseQuestionCount(rawCount) {
  const count = Number.parseInt(rawCount, 10)

  if (Number.isNaN(count)) return DEFAULT_QUESTION_COUNT
  if (count < 1) return 1
  if (count > MAX_QUESTION_COUNT) return MAX_QUESTION_COUNT

  return count
}

function parseCategoryId(rawCategoryId) {
  const categoryId = Number.parseInt(rawCategoryId, 10)
  return Number.isNaN(categoryId) ? null : categoryId
}

function normalizeSettings({ questionCount, categoryId }) {
  return {
    questionCount: parseQuestionCount(questionCount),
    categoryId: parseCategoryId(categoryId)
  }
}

function getQuestionApiUrl({ amount, categoryId = null }) {
  const params = new URLSearchParams({
    amount: String(amount),
    type: 'multiple'
  })

  if (categoryId) {
    params.set('category', String(categoryId))
  }

  return `https://opentdb.com/api.php?${params.toString()}`
}

async function fetchQuestions({ amount, categoryId = null }) {
  const response = await fetch(getQuestionApiUrl({ amount, categoryId }))
  const data = await response.json()

  if (!data.results || data.results.length === 0) {
    throw new Error('No questions returned')
  }

  return data.results
}

async function fetchCategories() {
  const response = await fetch('https://opentdb.com/api_category.php')
  const data = await response.json()
  return data.trivia_categories || []
}

app.get('/api/questions', async (req, res) => {
  try {
    const amount = parseQuestionCount(req.query.amount)
    const categoryId = parseCategoryId(req.query.category)
    const questions = await fetchQuestions({ amount, categoryId })
    res.json(questions)
  } catch (error) {
    res.status(500).json({ error: 'Failed to load questions' })
  }
})

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await fetchCategories()
    res.json(categories)
  } catch (error) {
    res.status(500).json({ error: 'Failed to load categories' })
  }
})

const rooms = {}

function getRoomPublicState(code) {
  const room = rooms[code]

  if (!room) return null

  return {
    code,
    players: room.players,
    settings: room.settings,
    phase: room.phase,
    hostId: room.hostId,
    finalPlayers: room.finalPlayers || room.players
  }
}

function emitRoomPlayers(code) {
  const room = rooms[code]
  if (!room) return

  io.to(code).emit('player-joined', room.players)
}

function emitRoomState(code) {
  const roomState = getRoomPublicState(code)
  if (!roomState) return

  io.to(code).emit('room-state', roomState)
}

function emitAnswerProgress(code) {
  const room = rooms[code]
  if (!room) return

  io.to(code).emit('answer-progress', {
    answeredPlayers: room.answeredPlayers.length,
    totalPlayers: room.players.length
  })
}

function emitCurrentQuestion(code) {
  const room = rooms[code]
  if (!room || room.questions.length === 0) return

  io.to(code).emit('question-updated', {
    question: room.questions[room.currentQuestion],
    current: room.currentQuestion + 1,
    total: room.questions.length,
    answeredPlayers: room.answeredPlayers.length
  })
  io.to(code).emit('score-update', room.players)
}

function resetRoomToLobby(code, nextSettings = null) {
  const room = rooms[code]
  if (!room) return

  if (nextSettings) {
    room.settings = normalizeSettings(nextSettings)
  }

  room.phase = 'lobby'
  room.questions = []
  room.currentQuestion = 0
  room.answeredPlayers = []
  room.finalPlayers = room.players.map((player) => ({
    ...player,
    score: 0
  }))
  room.players = room.players.map((player) => ({
    ...player,
    score: 0
  }))

  emitRoomState(code)
  io.to(code).emit('return-to-lobby', getRoomPublicState(code))
}

function finishGame(code) {
  const room = rooms[code]
  if (!room) return

  room.phase = 'results'
  room.finalPlayers = room.players.map((player) => ({ ...player }))
  room.questions = []
  room.currentQuestion = 0
  room.answeredPlayers = []
  emitRoomState(code)
  io.to(code).emit('game-over', room.players)
}

function advanceQuestion(code) {
  const room = rooms[code]
  if (!room) return

  room.currentQuestion += 1
  room.answeredPlayers = []

  if (room.currentQuestion >= room.questions.length) {
    finishGame(code)
    return
  }

  emitCurrentQuestion(code)
  emitAnswerProgress(code)
}

function assignNextHost(room) {
  room.hostId = room.players.length > 0 ? room.players[0].id : null
}

function removePlayerFromRoom(code, socketId) {
  const room = rooms[code]
  if (!room) return

  const wasHost = room.hostId === socketId

  room.players = room.players.filter((player) => player.id !== socketId)
  room.answeredPlayers = room.answeredPlayers.filter((id) => id !== socketId)

  if (room.players.length === 0) {
    delete rooms[code]
    return
  }

  if (wasHost) {
    assignNextHost(room)
  }

  if (room.phase === 'game' && room.answeredPlayers.length >= room.players.length) {
    advanceQuestion(code)
    return
  }

  emitRoomPlayers(code)
  emitRoomState(code)
  emitAnswerProgress(code)
}

io.on('connection', (socket) => {
  console.log('user connected:', socket.id)

  socket.on('create-room', ({ playerName, questionCount, categoryId }) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase()
    const settings = normalizeSettings({ questionCount, categoryId })

    rooms[code] = {
      players: [{ id: socket.id, name: playerName, score: 0 }],
      questions: [],
      currentQuestion: 0,
      answeredPlayers: [],
      finalPlayers: [],
      settings,
      phase: 'lobby',
      hostId: socket.id
    }

    socket.data.roomCode = code
    socket.join(code)
    socket.emit('room-created', getRoomPublicState(code))
    emitRoomPlayers(code)
    emitRoomState(code)
    console.log('room created:', code)
  })

  socket.on('join-room', ({ code, playerName }) => {
    const room = rooms[code]

    if (!room) {
      return socket.emit('error', 'Room not found')
    }

    room.players.push({ id: socket.id, name: playerName, score: 0 })
    socket.data.roomCode = code
    socket.join(code)
    emitRoomPlayers(code)
    emitRoomState(code)
    emitAnswerProgress(code)
  })

  socket.on('update-room-settings', ({ code, questionCount, categoryId }) => {
    const room = rooms[code]

    if (!room) {
      return socket.emit('error', 'Room not found')
    }

    if (room.hostId !== socket.id) {
      return socket.emit('error', 'Only the host can change room settings')
    }

    if (room.phase !== 'lobby' && room.phase !== 'results') {
      return socket.emit('error', 'Room settings can only be changed before the game starts')
    }

    room.settings = normalizeSettings({ questionCount, categoryId })
    emitRoomState(code)
  })

  socket.on('start-game', async (code) => {
    try {
      const room = rooms[code]

      if (!room) {
        return socket.emit('error', 'Room not found')
      }

      if (room.hostId !== socket.id) {
        return socket.emit('error', 'Only the host can start the game')
      }

      const questions = await fetchQuestions({
        amount: room.settings.questionCount,
        categoryId: room.settings.categoryId
      })

      room.questions = questions
      room.currentQuestion = 0
      room.answeredPlayers = []
      room.finalPlayers = []
      room.phase = 'game'
      room.players = room.players.map((player) => ({
        ...player,
        score: 0
      }))

      emitRoomState(code)
      emitCurrentQuestion(code)
      emitAnswerProgress(code)
      console.log('game started in room:', code)
    } catch (error) {
      socket.emit('error', 'Failed to load questions')
    }
  })

  socket.on('restart-game', ({ code, questionCount, categoryId }) => {
    const room = rooms[code]

    if (!room) {
      return socket.emit('error', 'Room not found')
    }

    if (room.hostId !== socket.id) {
      return socket.emit('error', 'Only the host can restart the room')
    }

    resetRoomToLobby(code, { questionCount, categoryId })
  })

  socket.on('restart-same-settings', async (code) => {
    try {
      const room = rooms[code]

      if (!room) {
        return socket.emit('error', 'Room not found')
      }

      if (room.hostId !== socket.id) {
        return socket.emit('error', 'Only the host can restart the room')
      }

      const questions = await fetchQuestions({
        amount: room.settings.questionCount,
        categoryId: room.settings.categoryId
      })

      room.questions = questions
      room.currentQuestion = 0
      room.answeredPlayers = []
      room.finalPlayers = []
      room.phase = 'game'
      room.players = room.players.map((player) => ({
        ...player,
        score: 0
      }))

      emitRoomState(code)
      emitCurrentQuestion(code)
      emitAnswerProgress(code)
    } catch (error) {
      socket.emit('error', 'Failed to restart game')
    }
  })

  socket.on('request-room-state', (code) => {
    const room = rooms[code]
    if (!room) return

    socket.emit('room-state', getRoomPublicState(code))

    if (room.phase === 'game' && room.questions.length > 0) {
      socket.emit('question-updated', {
        question: room.questions[room.currentQuestion],
        current: room.currentQuestion + 1,
        total: room.questions.length,
        answeredPlayers: room.answeredPlayers.length
      })
      socket.emit('answer-progress', {
        answeredPlayers: room.answeredPlayers.length,
        totalPlayers: room.players.length
      })
    }
  })

  socket.on('submit-answer', ({ code, answer }) => {
    const room = rooms[code]

    if (!room || room.phase !== 'game') return

    const current = room.questions[room.currentQuestion]
    const player = room.players.find((entry) => entry.id === socket.id)

    if (!current || !player) return
    if (room.answeredPlayers.includes(socket.id)) return

    if (answer === current.correct_answer) {
      player.score += 10
    }

    room.answeredPlayers.push(socket.id)
    io.to(code).emit('score-update', room.players)
    emitAnswerProgress(code)

    if (room.answeredPlayers.length >= room.players.length) {
      advanceQuestion(code)
    }
  })

  socket.on('leave-room', (code) => {
    if (!code || !rooms[code]) return

    socket.leave(code)
    removePlayerFromRoom(code, socket.id)
    socket.data.roomCode = null
  })

  socket.on('disconnect', () => {
    const { roomCode } = socket.data

    if (roomCode && rooms[roomCode]) {
      removePlayerFromRoom(roomCode, socket.id)
    }

    console.log('user disconnected:', socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
