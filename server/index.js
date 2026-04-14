const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../client/dist')))

app.get('/api/test', (req, res) => {
  res.json({ message: 'server is running' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
