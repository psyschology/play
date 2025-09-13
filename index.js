import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2GqNgCMhUbUA__mOQVvG0mriD9yheDAA",
  authDomain: "housie-ed8d4.firebaseapp.com",
  databaseURL: "https://housie-ed8d4-default-rtdb.firebaseio.com",
  projectId: "housie-ed8d4",
  storageBucket: "housie-ed8d4.firebasestorage.app",
  messagingSenderId: "519240389248",
  appId: "1:519240389248:web:96a80677655df1eff54c65",
  measurementId: "G-63Y7DVS2SB",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let gameData = {};
let lastCalledNumber = null;

// Initialize the game
function initializeGame() {
  createNumberBoard();
  setupFirebaseListeners();
}

// Create the 90-number board
function createNumberBoard() {
  const board = document.getElementById("numberBoard");
  board.innerHTML = "";

  for (let i = 1; i <= 90; i++) {
    const cell = document.createElement("div");
    cell.className = "number-cell";
    cell.textContent = i;
    cell.id = `number-${i}`;
    board.appendChild(cell);
  }
}

// Setup Firebase real-time listeners
function setupFirebaseListeners() {
  const gameRef = ref(db, "game");

  onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      gameData = data;
    } else {
      gameData = {
        status: "not_started",
        calledNumbers: [],
        tickets: {},
        awards: {},
        ticketCount: 100,
      };
    }
    updateGameStatus();
    updateNumberBoard();
    updateCalledNumbers();
    updateTickets();
    updateAwards();
    checkForWinners();
  });
}

// Update game status display
function updateGameStatus() {
  const statusDiv = document.getElementById("gameStatus");
  const gameBoard = document.getElementById("gameBoard");

  if (gameData.status === "running") {
    statusDiv.innerHTML =
      '<h2 style="color: #28a745;">🔴 Game is LIVE!</h2><p>Watch the numbers being called</p>';
    statusDiv.className = "game-status";
    gameBoard.style.display = "block";
  } else if (gameData.status === "ended") {
    const nextGame = gameData.nextGame
      ? new Date(gameData.nextGame).toLocaleString()
      : "TBA";
    statusDiv.innerHTML = `<h2 style="color: #dc3545;">Game Ended</h2><p>Next game starts at: <strong>${nextGame}</strong></p>`;
    statusDiv.className = "game-status game-ended";
    gameBoard.style.display = "none";
  } else {
    statusDiv.innerHTML =
      "<h2>Game Not Started</h2><p>Please wait for the admin to start the game</p>";
    statusDiv.className = "game-status";
    gameBoard.style.display = "none";
  }
}

// Update number board with called numbers
function updateNumberBoard() {
  if (!gameData.calledNumbers) return;

  for (let i = 1; i <= 90; i++) {
    const cell = document.getElementById(`number-${i}`);
    if (cell) {
      cell.classList.remove("called");
    }
  }

  gameData.calledNumbers.forEach((number) => {
    const cell = document.getElementById(`number-${number}`);
    if (cell) {
      cell.classList.add("called");
    }
  });

  if (gameData.calledNumbers.length > 0) {
    const latestNumber = gameData.calledNumbers[gameData.calledNumbers.length - 1];
    if (latestNumber !== lastCalledNumber) {
      announceNumber(latestNumber);
      lastCalledNumber = latestNumber;
    }
  }
}

// Update called numbers list
function updateCalledNumbers() {
  const calledList = document.getElementById("calledList");
  calledList.innerHTML = "";

  if (gameData.calledNumbers) {
    gameData.calledNumbers.forEach((number) => {
      const span = document.createElement("span");
      span.className = "called-number";
      span.textContent = number;
      calledList.appendChild(span);
    });
  }
}

// Generate Tambola ticket
function generateTambolaTicket() {
  const ticket = Array(3)
    .fill()
    .map(() => Array(9).fill(null));

  const columnNumbers = [];
  for (let col = 0; col < 9; col++) {
    const min = col === 0 ? 1 : col * 10;
    const max = col === 8 ? 90 : (col + 1) * 10 - 1;
    const colNums = [];
    for (let i = min; i <= max; i++) {
      colNums.push(i);
    }
    columnNumbers[col] = colNums.sort(() => Math.random() - 0.5);
  }

  const numbersPerColumn = Array(9).fill(0);
  const numbersPerRow = Array(3).fill(0);

  for (let col = 0; col < 9; col++) {
    const availableRows = [0, 1, 2].filter((row) => numbersPerRow[row] < 5);
    if (availableRows.length > 0) {
      const row = availableRows[Math.floor(Math.random() * availableRows.length)];
      ticket[row][col] = columnNumbers[col][numbersPerColumn[col]];
      numbersPerColumn[col]++;
      numbersPerRow[row]++;
    }
  }

  let totalNumbers = numbersPerRow.reduce((sum, count) => sum + count, 0);

  while (totalNumbers < 15) {
    const col = Math.floor(Math.random() * 9);
    const availableRows = [0, 1, 2].filter(
      (row) =>
        numbersPerRow[row] < 5 &&
        ticket[row][col] === null &&
        numbersPerColumn[col] < columnNumbers[col].length
    );
    if (availableRows.length > 0) {
      const row = availableRows[Math.floor(Math.random() * availableRows.length)];
      ticket[row][col] = columnNumbers[col][numbersPerColumn[col]];
      numbersPerColumn[col]++;
      numbersPerRow[row]++;
      totalNumbers++;
    } else {
      break;
    }
  }

  for (let col = 0; col < 9; col++) {
    const colNumbers = [];
    for (let row = 0; row < 3; row++) {
      if (ticket[row][col] !== null) {
        colNumbers.push({ number: ticket[row][col], row });
      }
    }
    colNumbers.sort((a, b) => a.number - b.number);
    for (let row = 0; row < 3; row++) {
      ticket[row][col] = null;
    }
    colNumbers.forEach(({ number, row }) => {
      ticket[row][col] = number;
    });
  }

  return ticket;
}

// Update tickets and reflect frozen state
function updateTickets() {
  const ticketsGrid = document.getElementById("ticketsGrid");
  ticketsGrid.innerHTML = "";

  const ticketCount = gameData.ticketCount || 100;

  for (let i = 1; i <= ticketCount; i++) {
    const ticket = document.createElement("div");
    const ticketData = gameData.tickets && gameData.tickets[i];
    if (ticketData && ticketData.booked) {
      const isFrozen = ticketData.frozen || false;
      const ticketNumbers = ticketData.numbers || generateTambolaTicket();

      ticket.className = "ticket booked";
      ticket.innerHTML = `
        <div class="ticket-header">
          <div class="ticket-number">#${i}</div>
          <div class="ticket-status">${isFrozen ? 'Frozen' : `Booked by ${ticketData.name}`}</div>
        </div>
        <div class="ticket-grid">
          ${ticketNumbers
            .map(
              (row) => `
                <div class="ticket-row">
                  ${row
                    .map((num) => {
                      if (!num) {
                        return `<div class="ticket-cell empty"></div>`;
                      }
                      const isCalled = gameData.calledNumbers?.includes(num) && !isFrozen;
                      return `<div class="ticket-cell has-number ${isCalled ? "marked" : ""}">${isCalled ? "" : num}</div>`;
                    })
                    .join("")}
                </div>
              `
            )
            .join("")}
        </div>
      `;
    } else {
      const sampleTicket = generateTambolaTicket();
      ticket.className = "ticket available";
      ticket.innerHTML = `
        <div class="ticket-header">
          <div class="ticket-number">#${i}</div>
          <div class="ticket-status">Available</div>
        </div>
        <div class="ticket-grid">
          ${sampleTicket
            .map(
              (row) => `
                <div class="ticket-row">
                  ${row
                    .map(
                      (num) => `<div class="ticket-cell ${num ? "has-number" : "empty"}">${num || ""}</div>`
                    )
                    .join("")}
                </div>
              `
            )
            .join("")}
        </div>
        <div class="book-now-btn" onclick="bookTicket(${i})">
          📱 Book Now via WhatsApp
        </div>
      `;
    }
    ticketsGrid.appendChild(ticket);
  }
}

// Update awards
function updateAwards() {
  const awardsGrid = document.getElementById("awardsGrid");
  awardsGrid.innerHTML = "";

  if (gameData.awards) {
    Object.entries(gameData.awards).forEach(([awardName, awardData]) => {
      const awardCard = document.createElement("div");
      awardCard.className = awardData.wonBy ? "award-card won" : "award-card";
      awardCard.innerHTML = `
        <div class="award-name">${awardName
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())}</div>
        <div class="award-winner">${awardData.wonBy ? `Won by ${awardData.wonBy}` : "Not won yet"}</div>
      `;
      awardsGrid.appendChild(awardCard);

      if (awardData.wonBy && !awardData.announced) {
        showWinnerPopup(awardName, awardData.wonBy);
      }
    });
  }
}

// Book ticket via WhatsApp
function bookTicket(ticketNumber) {
  const message = `Hi! I would like to book Ticket #${ticketNumber} for the Tambola game.`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
}

// Announce number
function announceNumber(number) {
  if ("speechSynthesis" in window) {
    let announcement = "";
    if (number <= 9) {
      const names = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
      announcement = `Number ${names[number]}, ${number}`;
    } else if (number <= 90) {
      const tens = Math.floor(number / 10);
      const units = number % 10;
      const tensNames = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
      const unitsNames = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
      announcement = units === 0 ? `${tensNames[tens]}, ${number}` : `${tensNames[tens]} ${unitsNames[units]}, ${number}`;
    }
    const utterance = new SpeechSynthesisUtterance(announcement);
    utterance.rate = 0.7;
    utterance.pitch = 1.2;
    utterance.volume = 0.9;
    speechSynthesis.speak(utterance);
  }
  playNotificationSound();
}

// Play notification sound
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log("Audio not supported");
  }
}

// Show winner popup
function showWinnerPopup(awardName, winner) {
  const popup = document.getElementById("winnerPopup");
  const overlay = document.getElementById("popupOverlay");
  const winnerText = document.getElementById("winnerText");
  winnerText.textContent = `${awardName.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} won by ${winner}!`;
  overlay.style.display = "block";
  popup.style.display = "block";
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(`Congratulations! ${awardName} won by ${winner}!`);
    utterance.rate = 0.9;
    utterance.pitch = 1.3;
    speechSynthesis.speak(utterance);
  }
  setTimeout(() => {
    overlay.style.display = "none";
    popup.style.display = "none";
  }, 5000);
  overlay.onclick = () => {
    overlay.style.display = "none";
    popup.style.display = "none";
  };
}

// ✅ Freeze ticket in database
function freezeTicket(ticketId) {
  const gameRef = ref(db, "game");
  update(gameRef, {
    [`tickets/${ticketId}/frozen`]: true,
  });
}

// ✅ Check for winners and freeze tickets after pattern match
function checkForWinners() {
  if (!gameData.tickets || !gameData.calledNumbers) return;
  const calledSet = new Set(gameData.calledNumbers);
  const awards = gameData.awards || {};
  const gameRef = ref(db, "game");

  for (const [ticketId, ticketData] of Object.entries(gameData.tickets)) {
    if (!ticketData.booked || !ticketData.numbers || ticketData.frozen) continue;

    const ticketNumbers = ticketData.numbers;
    const allNumbers = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 9; col++) {
        if (ticketNumbers[row][col] !== null) {
          allNumbers.push(ticketNumbers[row][col]);
        }
      }
    }
    const markedCount = allNumbers.filter((num) => calledSet.has(num)).length;

    const rowsCompleted = ticketNumbers.map((row) => row.every((num) => num === null || calledSet.has(num)));

    if (markedCount >= 5 && !awards.EarlyFive?.wonBy) {
      announceWinner("EarlyFive", ticketData.name || `Ticket #${ticketId}`);
      freezeTicket(ticketId);
    }

    if (rowsCompleted.some((completed) => completed) && !awards.OneLine?.wonBy) {
      announceWinner("OneLine", ticketData.name || `Ticket #${ticketId}`);
      freezeTicket(ticketId);
    }

    if (rowsCompleted.filter((completed) => completed).length >= 2 && !awards.TwoLines?.wonBy) {
      announceWinner("TwoLines", ticketData.name || `Ticket #${ticketId}`);
      freezeTicket(ticketId);
    }

    if (markedCount === allNumbers.length && !awards.FullHouse?.wonBy) {
      announceWinner("FullHouse", ticketData.name || `Ticket #${ticketId}`);
      freezeTicket(ticketId);
      update(gameRef, {
        status: "ended",
      });
    }
  }
  update(gameRef, {
    awards: awards,
  });
}

// ✅ Announce winner and mark it in database
function announceWinner(awardName, winner) {
  const gameRef = ref(db, "game");
  const awards = gameData.awards || {};
  if (!awards[awardName]) {
    awards[awardName] = { wonBy: winner };
  }
  update(gameRef, {
    awards: awards,
  });
}

// Initialize game on page load
window.onload = () => {
  initializeGame();
};
