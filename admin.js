import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js"
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js"
import { getDatabase, ref, set, update, onValue } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js"

const firebaseConfig = {
  apiKey: "AIzaSyA2GqNgCMhUbUA__mOQVvG0mriD9yheDAA",
  authDomain: "housie-ed8d4.firebaseapp.com",
  databaseURL: "https://housie-ed8d4-default-rtdb.firebaseio.com",
  projectId: "housie-ed8d4",
  storageBucket: "housie-ed8d4.firebasestorage.app",
  messagingSenderId: "519240389248",
  appId: "1:519240389248:web:96a80677655df1eff54c65",
  measurementId: "G-63Y7DVS2SB",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getDatabase(app)

let gameData = {}
let availableNumbers = []

// Initialize the admin panel
function initializeAdmin() {
  setupAuthListener()
  setupEventListeners()
  initializeAvailableNumbers()
}

// Setup authentication state listener
function setupAuthListener() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      showDashboard()
      setupFirebaseListeners()
    } else {
      showLogin()
    }
  })
}

// Setup event listeners
function setupEventListeners() {
  // Login form
  document.getElementById("loginForm").addEventListener("submit", handleLogin)
  document.getElementById("logoutBtn").addEventListener("click", handleLogout)

  // Game controls
  document.getElementById("startGameBtn").addEventListener("click", startGame)
  document.getElementById("endGameBtn").addEventListener("click", endGame)
  document.getElementById("resetGameBtn").addEventListener("click", resetGame)
  document.getElementById("callNumberBtn").addEventListener("click", callNextNumber)

  // Settings
  document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings)

  // Ticket booking
  document.getElementById("bookTicketBtn").addEventListener("click", bookTicket)

  // Awards
  document.getElementById("addAwardBtn").addEventListener("click", addAward)
}

// Initialize available numbers (1-90)
function initializeAvailableNumbers() {
  availableNumbers = []
  for (let i = 1; i <= 90; i++) {
    availableNumbers.push(i)
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault()

  const email = document.getElementById("email").value
  const password = document.getElementById("password").value
  const loginBtn = document.getElementById("loginBtn")
  const errorMessage = document.getElementById("errorMessage")

  console.log("[v0] Attempting login with email:", email) // Debug log

  loginBtn.disabled = true
  loginBtn.textContent = "Logging in..."
  errorMessage.style.display = "none"

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    console.log("[v0] Login successful:", userCredential.user.email) // Debug log
  } catch (error) {
    console.error("[v0] Login error:", error) // Debug log
    let errorMsg = "Login failed. Please try again."

    if (error.code === "auth/user-not-found") {
      errorMsg = "No account found with this email address."
    } else if (error.code === "auth/wrong-password") {
      errorMsg = "Incorrect password."
    } else if (error.code === "auth/invalid-email") {
      errorMsg = "Invalid email address format."
    } else if (error.code === "auth/too-many-requests") {
      errorMsg = "Too many failed attempts. Please try again later."
    } else if (error.code === "auth/network-request-failed") {
      errorMsg = "Network error. Please check your internet connection."
    }

    errorMessage.textContent = errorMsg
    errorMessage.style.display = "block"
  }

  loginBtn.disabled = false
  loginBtn.textContent = "Login"
}

// Handle logout
async function handleLogout() {
  try {
    await signOut(auth)
  } catch (error) {
    console.error("Logout error:", error)
  }
}

// Show login form
function showLogin() {
  document.getElementById("loginContainer").style.display = "flex"
  document.getElementById("adminDashboard").style.display = "none"
}

// Show dashboard
function showDashboard() {
  document.getElementById("loginContainer").style.display = "none"
  document.getElementById("adminDashboard").style.display = "block"
}

// Setup Firebase listeners
function setupFirebaseListeners() {
  const gameRef = ref(db, "game")

  onValue(
    gameRef,
    (snapshot) => {
      const data = snapshot.val()
      console.log("[v0] Admin Firebase data received:", data) // Debug log

      if (data) {
        gameData = data
        updateDashboard()
      } else {
        console.log("[v0] No game data found, initializing default data")
        initializeDefaultGameData()
      }
    },
    (error) => {
      console.error("[v0] Admin Firebase error:", error)
    },
  )
}

async function initializeDefaultGameData() {
  try {
    const defaultData = {
      status: "ended",
      calledNumbers: [],
      tickets: {},
      awards: {
        fullhouse: { name: "Full House", wonBy: null },
        firstline: { name: "First Line", wonBy: null },
        secondline: { name: "Second Line", wonBy: null },
        thirdline: { name: "Third Line", wonBy: null },
      },
      ticketCount: 100,
      nextGame: null,
    }

    await set(ref(db, "game"), defaultData)
    console.log("[v0] Default game data initialized")
    gameData = defaultData
    updateDashboard()
  } catch (error) {
    console.error("[v0] Error initializing default data:", error)
  }
}

// Update dashboard with current game data
function updateDashboard() {
  updateGameStatus()
  updateNextNumber()
  updateCalledNumbers()
  updateTicketsList()
  updateAwardsList()
  updateAvailableNumbers()
}

// Update game status display
function updateGameStatus() {
  const statusElement = document.getElementById("gameStatus")

  if (gameData.status === "running") {
    statusElement.textContent = "Running"
    statusElement.className = "status-indicator status-running"
  } else {
    statusElement.textContent = "Ended"
    statusElement.className = "status-indicator status-ended"
  }
}

// Update next number to call
function updateNextNumber() {
  const currentNumberElement = document.getElementById("currentNumber")
  const callBtn = document.getElementById("callNumberBtn")

  if (gameData.status !== "running") {
    currentNumberElement.textContent = "-"
    callBtn.disabled = true
    return
  }

  const calledNumbers = gameData.calledNumbers || []
  const remaining = availableNumbers.filter((num) => !calledNumbers.includes(num))

  if (remaining.length > 0) {
    const nextNumber = remaining[Math.floor(Math.random() * remaining.length)]
    currentNumberElement.textContent = nextNumber
    callBtn.disabled = false
  } else {
    currentNumberElement.textContent = "All Called"
    callBtn.disabled = true
  }
}

// Update called numbers display
function updateCalledNumbers() {
  const calledList = document.getElementById("calledNumbersList")
  calledList.innerHTML = ""

  if (gameData.calledNumbers) {
    gameData.calledNumbers.forEach((number) => {
      const span = document.createElement("span")
      span.className = "called-number-tag"
      span.textContent = number
      calledList.appendChild(span)
    })
  }
}

// Update tickets list
function updateTicketsList() {
  const ticketsList = document.getElementById("ticketsList")
  ticketsList.innerHTML = ""

  const ticketCount = gameData.ticketCount || 100

  for (let i = 1; i <= ticketCount; i++) {
    const ticketData = gameData.tickets && gameData.tickets[i]
    const ticketItem = document.createElement("div")

    if (ticketData && ticketData.booked) {
      ticketItem.className = "ticket-item booked"
      ticketItem.innerHTML = `
                <span><strong>Ticket #${i}</strong> - ${ticketData.name}</span>
                <span class="status-indicator" style="background: #dc3545; color: white;">Booked</span>
            `
    } else {
      ticketItem.className = "ticket-item"
      ticketItem.innerHTML = `
                <span><strong>Ticket #${i}</strong></span>
                <span class="status-indicator" style="background: #28a745; color: white;">Available</span>
            `
    }

    ticketsList.appendChild(ticketItem)
  }
}

// Update awards list
function updateAwardsList() {
  const awardsList = document.getElementById("awardsList")
  awardsList.innerHTML = ""

  if (gameData.awards) {
    Object.entries(gameData.awards).forEach(([awardName, awardData]) => {
      const awardItem = document.createElement("div")
      awardItem.className = awardData.wonBy ? "award-item won" : "award-item"

      awardItem.innerHTML = `
                <span><strong>${awardName}</strong></span>
                <span>${awardData.wonBy ? `Won by ${awardData.wonBy}` : "Not won"}</span>
            `

      awardsList.appendChild(awardItem)
    })
  }
}

// Update available numbers based on called numbers
function updateAvailableNumbers() {
  const calledNumbers = gameData.calledNumbers || []
  availableNumbers = []

  for (let i = 1; i <= 90; i++) {
    if (!calledNumbers.includes(i)) {
      availableNumbers.push(i)
    }
  }
}

// Start game
async function startGame() {
  try {
    await update(ref(db, "game"), {
      status: "running",
      calledNumbers: [],
    })
    alert("Game started successfully!")
  } catch (error) {
    alert("Error starting game: " + error.message)
  }
}

// End game
async function endGame() {
  if (confirm("Are you sure you want to end the game?")) {
    try {
      await update(ref(db, "game"), {
        status: "ended",
      })
      alert("Game ended successfully!")
    } catch (error) {
      alert("Error ending game: " + error.message)
    }
  }
}

// Reset game
async function resetGame() {
  if (confirm("Are you sure you want to reset the game? This will clear all called numbers and awards.")) {
    try {
      await set(ref(db, "game"), {
        status: "ended",
        calledNumbers: [],
        tickets: {},
        awards: {},
        ticketCount: 100,
        nextGame: null,
      })
      alert("Game reset successfully!")
    } catch (error) {
      alert("Error resetting game: " + error.message)
    }
  }
}

// Call next number
async function callNextNumber() {
  const currentNumber = document.getElementById("currentNumber").textContent

  if (currentNumber === "-" || currentNumber === "All Called") {
    alert("No number to call!")
    return
  }

  const number = Number.parseInt(currentNumber)
  const calledNumbers = gameData.calledNumbers || []

  if (!calledNumbers.includes(number)) {
    try {
      const newCalledNumbers = [...calledNumbers, number]
      await update(ref(db, "game"), {
        calledNumbers: newCalledNumbers,
      })

      // Check for winners after calling number
      checkForWinners()
    } catch (error) {
      alert("Error calling number: " + error.message)
    }
  }
}

// Save settings
async function saveSettings() {
  const nextGameDate = document.getElementById("nextGameDate").value
  const ticketLimit = Number.parseInt(document.getElementById("ticketLimit").value)

  try {
    const updates = {}

    if (nextGameDate) {
      updates.nextGame = nextGameDate
    }

    if (ticketLimit && ticketLimit > 0) {
      updates.ticketCount = ticketLimit
    }

    await update(ref(db, "game"), updates)
    alert("Settings saved successfully!")
  } catch (error) {
    alert("Error saving settings: " + error.message)
  }
}

// Book ticket
async function bookTicket() {
  const ticketNumber = Number.parseInt(document.getElementById("ticketNumber").value)
  const playerName = document.getElementById("playerName").value.trim()

  if (!ticketNumber || !playerName) {
    alert("Please enter both ticket number and player name")
    return
  }

  const ticketCount = gameData.ticketCount || 100

  if (ticketNumber < 1 || ticketNumber > ticketCount) {
    alert(`Ticket number must be between 1 and ${ticketCount}`)
    return
  }

  // Check if ticket is already booked
  if (gameData.tickets && gameData.tickets[ticketNumber] && gameData.tickets[ticketNumber].booked) {
    alert("This ticket is already booked!")
    return
  }

  try {
    await update(ref(db, `game/tickets/${ticketNumber}`), {
      booked: true,
      name: playerName,
    })

    alert(`Ticket #${ticketNumber} booked for ${playerName}`)

    // Clear form
    document.getElementById("ticketNumber").value = ""
    document.getElementById("playerName").value = ""
  } catch (error) {
    alert("Error booking ticket: " + error.message)
  }
}

// Add award
async function addAward() {
  const awardName = document.getElementById("awardName").value.trim()

  if (!awardName) {
    alert("Please enter award name")
    return
  }

  try {
    const awardKey = awardName.toLowerCase().replace(/\s+/g, "")
    await update(ref(db, `game/awards/${awardKey}`), {
      name: awardName,
      wonBy: null,
    })

    alert(`Award "${awardName}" added successfully!`)
    document.getElementById("awardName").value = ""
  } catch (error) {
    alert("Error adding award: " + error.message)
  }
}

// Check for winners (simplified logic)
async function checkForWinners() {
  // This is a simplified winner detection
  // In a real implementation, you would check actual ticket patterns
  const calledNumbers = gameData.calledNumbers || []

  // Example: Full House after 15 numbers
  if (calledNumbers.length >= 15 && gameData.awards && gameData.awards.fullhouse && !gameData.awards.fullhouse.wonBy) {
    const bookedTickets = Object.entries(gameData.tickets || {}).filter(([_, data]) => data.booked)
    if (bookedTickets.length > 0) {
      const randomWinner = bookedTickets[Math.floor(Math.random() * bookedTickets.length)]
      await update(ref(db, "game/awards/fullhouse"), {
        wonBy: `Ticket #${randomWinner[0]} (${randomWinner[1].name})`,
      })
    }
  }
}

// Initialize admin panel when page loads
document.addEventListener("DOMContentLoaded", initializeAdmin)
        
