const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 3000
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

// Set static folder
app.use(express.static(path.join(__dirname, 'public')))

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

// Handle a socket connection request from web client
const connections = [null, null]

io.on('connection', socket => {
  // console.log('New WS connection')

  // Find an available player number
  let playerIndex = -1
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i
      break
    }
  } 

  // Tell the connecting client what player number they are
  socket.emit('player-number', playerIndex) 
  console.log(`Player ${playerIndex} has connected`)

  // Ignore player 3
  if (playerIndex === -1) return

  connections[playerIndex] = false

  // Tell everyone what player number just connected
  socket.broadcast.emit('player-connection', playerIndex)

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Player ${playerIndex} disconnected`)
    connections[playerIndex] = null

    // Tell everyone what player number just disconnected
    socket.broadcast.emit('player-connection', playerIndex)
  })

  // on Ready
  socket.on('player-ready', () => {
    socket.broadcast.emit('enemy-ready', playerIndex)
    connections[playerIndex] = true
  })

  // Check player connections
  socket.on('check-players', () => {
    const players = []
    for (const i in connections) {
      connections[i] === null ? 
        players.push({connected: false, ready: false}) :
        players.push({connected: true, ready: connections[i]})
    }
    socket.emit('check-players', players)
  })

  // On change of pseudo
  socket.on('pseudo-change', pseudo => {
    socket.broadcast.emit('enemy-pseudo', pseudo)
  })

  // On fire received
  socket.on('fire', id => {
    console.log(`Shot fired from p${parseInt(playerIndex) + 1}`, id)

    // Emit to the other player
    socket.broadcast.emit('fire', id)
  })

  // On fire reply
  socket.on('fire-reply', square => {
    // Forward the reply to other player
    socket.broadcast.emit('fire-reply', square)
  })
 
  // Timeout connection
  setTimeout(() => {
    connections[playerIndex] = null
    socket.emit('timeout')
    socket.disconnect()
  }, 900000) // 15 minutes limit per player
})