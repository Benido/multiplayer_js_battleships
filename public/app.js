document.addEventListener('DOMContentLoaded', () => {
  const userGrid = document.querySelector('.grid-user')
  const computerGrid = document.querySelector('.grid-computer')
  const displayGrid = document.querySelector('.grid-display')
  const ships = document.querySelectorAll('.ship')
  const destroyer = document.querySelector('.destroyer-container')
  const submarine = document.querySelector('.submarine-container')
  const cruiser = document.querySelector('.cruiser-container')
  const battleship = document.querySelector('.battleship-container')
  const carrier = document.querySelector('.carrier-container')
  const startButton = document.querySelector('#start')
  const rotateButton = document.querySelector('#rotate')
  const turnDisplay = document.querySelector('#whose-go')
  const infoDisplay = document.querySelector('#info')
  const setupButtons = document.querySelector('.setup-buttons')
  const newGameButton = document.getElementById('new-game')
  const pseudoInput = document.getElementById('pseudo')
  const pseudoButton = document.getElementById('send-pseudo')
  const userSquares = []
  const computerSquares = []
  let isHorizontal = true
  let isGameOver = false
  let currentPlayer = 'user'
  const width = 10
  let playerNum = 0
  let ready = false
  let enemyReady = false
  let allShipPlaced = false
  let shotFired = -1
  let playerPseudo = 'Joueur 1'
  let enemyPseudo = 'Joueur 2'

    //Ships
  const shipArray = [
    {
      name: 'destroyer',
      directions: [
        [0, 1],
        [0, width]
      ]
    },
    {
      name: 'submarine',
      directions: [
        [0, 1, 2],
        [0, width, width*2]
      ]
    },
    {
      name: 'cruiser',
      directions: [
        [0, 1, 2],
        [0, width, width*2]
      ]
    },
    {
      name: 'battleship',
      directions: [
        [0, 1, 2, 3],
        [0, width, width*2, width*3]
      ]
    },
    {
      name: 'carrier',
      directions: [
        [0, 1, 2, 3, 4],
        [0, width, width*2, width*3, width*4]
      ]
    },
  ]
    
  createBoard(userGrid, userSquares)
  createBoard(computerGrid, computerSquares)

  // Select player mode  
  if (gameMode === 'singlePlayer')  startSinglePlayer()
  else startMultiPlayer()
   
  // Multiplayer
  function startMultiPlayer() {
    const socket = io()

    // Get your player number
    socket.on('player-number', num => {
      if (num === -1) {
        infoDisplay.innerHTML = 'Désolé, le serveur est rempli'
      } else {
        playerNum = parseInt(num)
        if (playerNum === 1) currentPlayer = 'enemy'

        console.log(playerNum)

        // Get other player status
        socket.emit('check-players')
      }

    })

    // Another player has connected or disconnected
    socket.on('player-connection', num => {
      console.log(`Player number ${num} has connected or disconnected`)
      playerConnectedOrDisconnected(num)
    })

    // On enemy Ready
    socket.on('enemy-ready', num => {
      enemyReady = true
      playerReady(num)
      if (ready) {
        playGameMulti(socket)
      }
    })

    // Check player status
    socket.on('check-players', players => {
      console.log(players)
      players.forEach((p, i) => {
        if (p.connected) playerConnectedOrDisconnected(i)
        if (p.ready) {
          playerReady[i]
          if (i !== playerReady) enemyReady = true
        }
      })
    })

    // Change pseudo  
    pseudoButton.addEventListener('click', (e) => {
      let player = `.p${parseInt(playerNum) + 1}`
      let pseudo = pseudoInput.value.trim().replace(/[<>]/g, '')
      document.querySelector(player + ' .pseudo').innerHTML = pseudo      
      playerPseudo = pseudo
      socket.emit('pseudo-change', pseudo)
      e.target.blur()

    })

    // Change enemy pseudo
    socket.on('enemy-pseudo', pseudo => {
      let enemy = `.p${parseInt(playerNum === 0 ? 1 : 0 ) + 1}`
      enemyPseudo = pseudo
      document.querySelector(enemy + ' .pseudo').innerHTML = pseudo
    })

    // On timeout
    socket.on('timeout', () => {
      infoDisplay.innerHTML = 'Vous avez atteint la limite de 15 minutes'
    })

    // Ready button click
    startButton.addEventListener('click', () => {
      if (allShipPlaced) {
        playGameMulti(socket)
        turnDisplay.style.display = 'block'
      }
      else infoDisplay.innerHTML = 'Merci de placer tous vos bateaux' 
    })  

    // Setup event listener for firing
    function addFireEvent() {
      if (currentPlayer === 'user' && ready && enemyReady) {
        shotFired = this.dataset.id
        socket.emit('fire', shotFired)
        this.removeEventListener('click', addFireEvent)  //Prevents firing twice in the same square
      }
    }

    computerSquares.forEach(square => {
      square.addEventListener('click', addFireEvent)
    })

    // On fire received
    socket.on('fire', id => {
      
      const square = userSquares[id]
      socket.emit('fire-reply', square.classList)
      enemyGo(id)
      playGameMulti(socket)
    })

    // On fire reply received
    socket.on('fire-reply', classList => {
      revealSquare(classList)
      playGameMulti(socket)
    })

    function playerConnectedOrDisconnected(num) {
      let player = `.p${parseInt(num) + 1}`
      document.querySelector(`${player} .connected`).classList.toggle('active')
      if(parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold'
    }
  }

  // Single Player
  function startSinglePlayer() {
    generate(shipArray[0], computerSquares)
    generate(shipArray[1], computerSquares)
    generate(shipArray[2], computerSquares)
    generate(shipArray[3], computerSquares)
    generate(shipArray[4], computerSquares)

    startButton.addEventListener('click', () => {
      if (allShipPlaced) {
        setupButtons.style.display = 'none'
        turnDisplay.style.display = 'block'
        playGameSingle()
      } else {
        turnDisplay.innerHTML = 'Veuillez placer tous vos bateaux'
      }
    })
  }

    // Create Board
  function createBoard(grid, squares) {
    for (let i = 0; i < width*width; i++) {
      const square = document.createElement('div')
      square.dataset.id = i
      grid.appendChild(square)
      squares.push(square)
    }
  }
  // Draw the computers ships in random locations
  function generate(ship, squares) {
    let randomDirection = Math.floor(Math.random() * ship.directions.length)
    let current = ship.directions[randomDirection]
    if (randomDirection === 0) direction = 1
    if (randomDirection === 1) direction = 10
    let randomStart = Math.abs(Math.floor(Math.random() * squares.length - (ship.directions[0].length * direction)))

    const isTaken = current.some(index => squares[randomStart + index].classList.contains('taken'))
    const isAtRightEdge = current.some(index => (randomStart + index) % width === width - 1)
    const isAtLeftEdge = current.some(index => (randomStart + index) % width === 0)

    if (!isTaken && !isAtRightEdge && !isAtLeftEdge) { 
      current.forEach(index => {      
        squares[randomStart + index].classList.add(
          'taken', 
          ship.name, 
          randomDirection === 0 ? 'horizontal' : 'vertical',
          index === 0 ? 'start' : 
            index === current[current.length - 1] ? 'end' : 'middle',          
        )
      })
}
    else generate(ship, squares)
  }
  
  //Random ship placement for user
  const randomButton = document.getElementById('random')
  randomButton.addEventListener('click', (e) => {
    userSquares.forEach(square => square.classList.remove(...square.classList))  //clear the grid of previous boats

    generate(shipArray[0], userSquares)
    generate(shipArray[1], userSquares)
    generate(shipArray[2], userSquares)
    generate(shipArray[3], userSquares)
    generate(shipArray[4], userSquares)

    displayGrid.style.display = 'none'
    rotateButton.style.display = 'none'
    allShipPlaced = true

    e.target.blur() //reset focus

  })

  // Rotate the ships
  function rotate() {
    if (isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleship.classList.toggle('battleship-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = false
      return
    }
    if (!isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleship.classList.toggle('battleship-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = true
      return
    }
  }
  rotateButton.addEventListener('click', rotate)

  // Move around user ship

  ships.forEach(ship => ship.addEventListener('dragstart', dragStart)) 
  userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragover', dragOver))
  userSquares.forEach(square => square.addEventListener('dragenter', dragEnter))
  userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
  userSquares.forEach(square => square.addEventListener('drop', dragDrop))
  userSquares.forEach(square => square.addEventListener('dragend', dragEnd))

  let selectedShipNameWithIndex
  let draggedShip
  let draggedShipLength

  ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id
  }))

  function dragStart(e) {
    draggedShip = this
    draggedShipLength = this.childNodes.length    
  }

  function dragOver(e) {
    //necessary for allowing the drop
    e.preventDefault()
  }

  function dragEnter(e) {
    //necessary for allowing the drop
    e.preventDefault()
  }

  function dragLeave() {
  }

  function dragDrop() {  //TODO Refactoriser
    let shipNameWithLastId = draggedShip.lastChild.id
    let shipClass = shipNameWithLastId.slice(0, -2)
    let lastShipIndex = parseInt(shipNameWithLastId.slice(-1))
    let selectedShipIndex = parseInt(selectedShipNameWithIndex.slice(-1))
    isHorizontal ? 
      shipLastId = parseInt(this.dataset.id) + lastShipIndex - selectedShipIndex :
      shipLastId = parseInt(this.dataset.id) + width * (lastShipIndex - selectedShipIndex )
    
    const notAllowedHorizontal = [0,10,20,30,40,50,60,70,80,90,1,11,21,31,41,51,61,71,81,91,2,22,32,42,52,62,72,82,92,3,13,23,33,43,53,63,73,83,93]       
      
    /* console.log('this', this)
    console.log('shipLastId' , shipLastId)
    console.log('lastShipIndex', lastShipIndex)
    console.log('selectedShipIndex', selectedShipIndex) */

    let newNotAllowedHorizontal = notAllowedHorizontal.splice(0, width * lastShipIndex)    
    
    // Checks if the horizontal ship fits into the grid
    if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {
      for (let i=0; i < draggedShipLength; i++) {
        //Checks if one of the square is already taken
        if (userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.contains('taken')) return
      }

      for (let i=0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', 'horizontal', directionClass, shipClass)
      }
    // Checks if the vertical ship fits into the grid
    } else if (!isHorizontal && shipLastId < width * width) {
      for (let i=0; i < draggedShipLength; i++) {
        
        //Checks if one of the square is already taken
        if (userSquares[parseInt(this.dataset.id) + width * (i - selectedShipIndex)].classList.contains('taken')) return
      }

      for (let i=0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'

        userSquares[parseInt(this.dataset.id) + width * (i - selectedShipIndex)].classList.add('taken', 'vertical', directionClass, shipClass)
      }
    } else return

    displayGrid.removeChild(draggedShip)
    if (!displayGrid.querySelector('.ship')) allShipPlaced = true
  }

  function dragEnd() {
  }

  // Game logic for multi player
  function playGameMulti(socket) {    
    setupButtons.style.display = 'none'
    if (isGameOver) return
    if (!ready) {
      socket.emit('player-ready')
      ready = true
      playerReady(playerNum)
    }

    if(enemyReady) {
      if (currentPlayer === 'user') {
        turnDisplay.innerHTML = 'Votre tour'
      }
      if (currentPlayer === 'enemy') {
        turnDisplay.innerHTML = 'Tour de l&apos;adversaire'
      }
    }
  }

  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`
    console.log(player)
    document.querySelector(`${player} .ready`).classList.toggle('active')
  }

  // Game logic for single player
  function addFireEventSingle() {    
    shotFired = this.dataset.id
    revealSquare(this.classList)
    this.removeEventListener('click', addFireEventSingle) // Prevents firing twice in the same square
  }

  function playGameSingle() {
    if (isGameOver) return
    if (currentPlayer === 'user') {
      turnDisplay.innerHTML = 'Votre tour'
      computerSquares.forEach(square => square.addEventListener('click', addFireEventSingle))
    }
    if (currentPlayer === 'enemy') {
      turnDisplay.innerHTML = 'Ordinateur, Go'
      setTimeout(enemyGo, 1000)
    }
  }

  let destroyerCount = 0
  let submarineCount = 0
  let cruiserCount = 0
  let battleshipCount = 0
  let carrierCount = 0


  function revealSquare(classList) {
    const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
    const obj = Object.values(classList)
    if (gameMode === 'multiPlayer') enemySquare.classList.add(...obj)
    if (!enemySquare.classList.contains('boom') && currentPlayer === 'user' && !isGameOver) {
      if (obj.includes('destroyer')) destroyerCount++
      if (obj.includes('submarine')) submarineCount++
      if (obj.includes('cruiser')) cruiserCount++
      if (obj.includes('battleship')) battleshipCount++
      if (obj.includes('carrier')) carrierCount++
    }
    if (obj.includes('taken')) {
      enemySquare.classList.add('boom')
      infoDisplay.innerHTML = 'Vous touchez un navire ennemi'
    } else {
      enemySquare.classList.add('miss')
      infoDisplay.innerHTML = 'Votre tir tombe à l&apos;eau'
    }
    checkForWins()
    currentPlayer = 'enemy'
    if (gameMode === 'singlePlayer') playGameSingle()
  }

  let cpuDestroyerCount = 0
  let cpuSubmarineCount = 0
  let cpuCruiserCount = 0
  let cpuBattleshipCount = 0
  let cpuCarrierCount = 0


  function enemyGo(square) {
    if (gameMode === 'singlePlayer') square = Math.floor(Math.random() * userSquares.length)
    if (!userSquares[square].classList.contains('boom')) {
      const hit = userSquares[square].classList.contains('taken')
      userSquares[square].classList.add(hit ? 'boom' : 'miss')
      infoDisplay.innerHTML = !hit ? 'Le tir ennemi tombe à l&apos;eau' : ''
      if (userSquares[square].classList.contains('destroyer')) {
        cpuDestroyerCount++
        infoDisplay.innerHTML = 'Votre destroyer est touché'
      }
      if (userSquares[square].classList.contains('submarine')) {
        cpuSubmarineCount++
        infoDisplay.innerHTML = 'Votre sous-marin est touché'
      }
      if (userSquares[square].classList.contains('cruiser')) {
        cpuCruiserCount++
        infoDisplay.innerHTML = 'Votre croiseur est touché'
      }
      if (userSquares[square].classList.contains('battleship')) {
        cpuBattleshipCount++
        infoDisplay.innerHTML = 'Votre cuirassé est touché'
      }
      if (userSquares[square].classList.contains('carrier')) {
        cpuCarrierCount++
        infoDisplay.innerHTML = 'Votre porte-avion est touché'
      }
      checkForWins()
    } else if (gameMode === 'singlePlayer') enemyGo()
    currentPlayer = 'user'
    turnDisplay.innerHTML = 'Votre tour'
  }

  function checkForWins() {
    let enemy = 'l&apos;ordinateur'
    if (gameMode === 'multiPlayer') enemy = enemyPseudo

    if (destroyerCount === 2) {
      infoDisplay.innerHTML = `Vous avez coulé le destroyer de ${enemy}`
      sunkenShip('destroyer')
      destroyerCount = 10
    }
    if (submarineCount === 3) {
      infoDisplay.innerHTML = `Vous avez coulé le sous-marin de ${enemy}`
      sunkenShip('submarine')
      submarineCount = 10
    }
    if (cruiserCount === 3) {
      infoDisplay.innerHTML = `Vous avez coulé le croiseur de ${enemy}`
      sunkenShip('cruiser')
      cruiserCount = 10
    }
    if (battleshipCount === 4) {
      infoDisplay.innerHTML = `Vous avez coulé le cuirassé de ${enemy}`
      sunkenShip('battleship')
      battleshipCount = 10
    }
    if (carrierCount === 5) {
      infoDisplay.innerHTML = `Vous avez coulé le porte-avion de ${enemy}`
      sunkenShip('carrier')
      carrierCount = 10
    }
    if (cpuDestroyerCount === 2) {
      infoDisplay.innerHTML = `${enemy} a coulé votre destroyer`
      cpuDestroyerCount = 10
    }
    if (cpuSubmarineCount === 3) {
      infoDisplay.innerHTML = `${enemy} a coulé votre sous-marin`
      cpuSubmarineCount = 10
    }
    if (cpuCruiserCount === 3) {
      infoDisplay.innerHTML = `${enemy} a coulé votre croiseur`
      cpuCruiserCount = 10
    }
    if (cpuBattleshipCount === 4) {
      infoDisplay.innerHTML = `${enemy} a coulé votre cuirassé`
      cpuBattleshipCount = 10
    }
    if (cpuCarrierCount === 5) {
      infoDisplay.innerHTML = `${enemy} a coulé votre porte-avion`
      cpuCarrierCount = 10
    }
    if ((destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount) === 50) {
      infoDisplay.innerHTML = 'VOUS AVEZ GAGNÉ !'        
      gameOver()
    }
    if ((cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleshipCount + cpuCarrierCount) === 50) {
      infoDisplay.innerHTML = `L&apos;${enemy.toUpperCase()} A GAGNÉ !`      
      gameOver()
    }
  }

  function sunkenShip(shipClass) {
    const shipSquares = computerGrid.querySelectorAll('.' + shipClass)
    shipSquares.forEach((square) => {
      square.classList.add('sunken')      
    })
  }  

  function gameOver() {
    isGameOver = true
    //startButton.removeEventListener('click', playGameSingle)
    turnDisplay.innerHTML = ''
    newGameButton.style.display = 'block'
    newGameButton.addEventListener('click', () => location.reload())
  }
})
