const express = require('express')
const cors = require('cors')
const path = require('path')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })
const PORT = 3000

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../client/dist')))

app.get('/api/questions', async (req, res) => {
  const response = await fetch('https://opentdb.com/api.php?amount=10&type=multiple')
  const data = await response.json()
  res.json(data.results)
})

const rooms = {}

io.on('connection', (socket) => {
  socket.on('create-room', (playerName) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase()
    rooms[code] = { players: [{ id: socket.id, name: playerName, score: 0 }], questions: [], currentQuestion: 0 }
    socket.join(code)
    socket.emit('room-created', code)
  })

  socket.on('join-room', ({ code, playerName }) => {
    if (!rooms[code]) return socket.emit('error', 'Room not found')
    rooms[code].players.push({ id: socket.id, name: playerName, score: 0 })
    socket.join(code)
    io.to(code).emit('player-joined', rooms[code].players)
  })

  socket.on('start-game', async (code) => {
    const response = await fetch('https://opentdb.com/api.php?amount=10&type=multiple')
    const data = await response.json()
    rooms[code].questions = data.results
    rooms[code].currentQuestion = 0
    io.to(code).emit('game-started', rooms[code].questions[0])
  })

  socket.on('submit-answer', ({ code, answer }) => {
    const room = rooms[code]
    const current = room.questions[room.currentQuestion]
    const player = room.players.find(p => p.id === socket.id)
    if (answer === current.correct_answer) player.score += 10
    io.to(code).emit('score-update', room.players)
  })

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})