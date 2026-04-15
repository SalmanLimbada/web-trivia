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

function emitRoomPlayers(code) {
  const room = rooms[code]
  if (!room) return

  io.to(code).emit('player-joined', room.players)
}

function getRoomPublicState(code) {
  const room = rooms[code]

  if (!room) return null

  return {
    code,
    players: room.players,
    settings: room.settings,
    gameStarted: room.gameStarted
  }
}

function emitRoomState(code) {
  const roomState = getRoomPublicState(code)
  if (!roomState) return

  io.to(code).emit('room-state', roomState)
}

function emitCurrentQuestion(code) {
  const room = rooms[code]
  if (!room) return

  io.to(code).emit('question-updated', {
    question: room.questions[room.currentQuestion],
    current: room.currentQuestion + 1,
    total: room.questions.length,
    answeredPlayers: room.answeredPlayers.length
  })
  io.to(code).emit('score-update', room.players)
}

function emitAnswerProgress(code) {
  const room = rooms[code]
  if (!room) return

  io.to(code).emit('answer-progress', {
    answeredPlayers: room.answeredPlayers.length,
    totalPlayers: room.players.length
  })
}

function finishGame(code) {
  const room = rooms[code]
  if (!room) return

  room.gameStarted = false
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
}

io.on('connection', (socket) => {
  console.log('user connected:', socket.id)

  socket.on('create-room', ({ playerName, questionCount, categoryId }) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase()
    const settings = {
      questionCount: parseQuestionCount(questionCount),
      categoryId: parseCategoryId(categoryId)
    }

    rooms[code] = {
      players: [{ id: socket.id, name: playerName, score: 0 }],
      questions: [],
      currentQuestion: 0,
      answeredPlayers: [],
      gameStarted: false,
      settings
    }

    socket.data.roomCode = code
    socket.join(code)
    socket.emit('room-created', getRoomPublicState(code))
    emitRoomPlayers(code)
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
  })

  socket.on('start-game', async (code) => {
    try {
      const room = rooms[code]

      if (!room) {
        return socket.emit('error', 'Room not found')
      }

      const questions = await fetchQuestions({
        amount: room.settings.questionCount,
        categoryId: room.settings.categoryId
      })

      room.questions = questions
      room.currentQuestion = 0
      room.answeredPlayers = []
      room.gameStarted = true

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

  socket.on('request-room-state', (code) => {
    const roomState = getRoomPublicState(code)
    if (!roomState) return

    socket.emit('room-state', roomState)

    if (rooms[code].gameStarted && rooms[code].questions.length > 0) {
      socket.emit('question-updated', {
        question: rooms[code].questions[rooms[code].currentQuestion],
        current: rooms[code].currentQuestion + 1,
        total: rooms[code].questions.length,
        answeredPlayers: rooms[code].answeredPlayers.length
      })
      socket.emit('answer-progress', {
        answeredPlayers: rooms[code].answeredPlayers.length,
        totalPlayers: rooms[code].players.length
      })
    }
  })

  socket.on('submit-answer', ({ code, answer }) => {
    const room = rooms[code]

    if (!room || !room.gameStarted) return

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

  socket.on('disconnect', () => {
    const { roomCode } = socket.data

    if (roomCode && rooms[roomCode]) {
      const room = rooms[roomCode]

      room.players = room.players.filter((player) => player.id !== socket.id)
      room.answeredPlayers = room.answeredPlayers.filter((id) => id !== socket.id)

      if (room.players.length === 0) {
        delete rooms[roomCode]
      } else {
        emitRoomPlayers(roomCode)
        emitRoomState(roomCode)
      }
    }

    console.log('user disconnected:', socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
