const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const timerDisplay = document.getElementById("timer");
const modal = document.getElementById("modal");
const modalText = document.getElementById("modalText");
const closeModalBtn = document.getElementById("closeModal");

const rows = 16;
const columns = 16;
const cellWidth = 40;
const cellHeight = 40;
const difficulty = 0.3;

let grid = [];
let playerX = 10;
let playerY = 10;
let prizeX = Math.floor(Math.random() * columns);
let prizeY = Math.floor(Math.random() * rows);
let prizeVisible = true;
let timer = 60
let intervalId = null;
let gameOver = false;

const playerImage = new Image();
const obstacleImage = new Image();
const prizeImage = new Image();
playerImage.src = "asset/player.png";
obstacleImage.src = "asset/obstacle.jpeg";
prizeImage.src = "asset/prize.png";

playerImage.onerror = () => console.error("Failed to load player image");
obstacleImage.onerror = () => console.error("Failed to load obstacle image");
prizeImage.onerror = () => console.error("Failed to load prize image");

function initGame() {
    randomizeObstacles();
    ensurePlayerNotOnObstacle();
    ensurePrizeNotOnObstacle();
    drawGrid();
    document.addEventListener("keydown", handleKeyPress);
    setInterval(() => {
        prizeVisible = !prizeVisible;
        drawGrid();
    }, 500);
    startTimer();
}

function startTimer() {
    intervalId = setInterval(() => {
        timer--;
        updateTimerDisplay();
        if (timer <= 0) {
            stopTimer();
            gameOver = true;
            showModal("Game Over");
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(intervalId);
}

function updateTimerDisplay() {
    timerDisplay.textContent = `Time Left: ${timer} seconds`;
    timerDisplay.classList.toggle("warning", timer <= 10);
}

function addBonusTime(seconds) {
    timer += seconds;
    updateTimerDisplay();
}

function randomizeObstacles() {
    do {
        grid = Array.from({ length: rows }, () => Array(columns).fill(false));
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                if (Math.random() < difficulty) {
                    grid[row][col] = true;
                }
            }
        }
    } while (!isPathAvailable());
}

function isPathAvailable() {
    const start = { x: playerX, y: playerY };
    const goal = { x: prizeX, y: prizeY };
    const openSet = [start];
    const cameFrom = {};
    const gScore = {};
    const fScore = {};
    const key = (x, y) => `${x},${y}`;
    gScore[key(start.x, start.y)] = 0;
    fScore[key(start.x, start.y)] = heuristic(start, goal);

    while (openSet.length > 0) {
        openSet.sort((a, b) => fScore[key(a.x, a.y)] - fScore[key(b.x, b.y)]);
        const current = openSet.shift();
        if (current.x === goal.x && current.y === goal.y) return true;

        for (const neighbor of getNeighbors(current)) {
            const tentativeG = gScore[key(current.x, current.y)] + 1;
            if (tentativeG < (gScore[key(neighbor.x, neighbor.y)] ?? Infinity)) {
                cameFrom[key(neighbor.x, neighbor.y)] = current;
                gScore[key(neighbor.x, neighbor.y)] = tentativeG;
                fScore[key(neighbor.x, neighbor.y)] = tentativeG + heuristic(neighbor, goal);
                if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                    openSet.push(neighbor);
                }
            }
        }
    }
    return false;
}

function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors({ x, y }) {
    const directions = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
    ];
    return directions
        .map(d => ({ x: x + d.x, y: y + d.y }))
        .filter(n => n.x >= 0 && n.x < columns && n.y >= 0 && n.y < rows && !grid[n.y][n.x]);
}

function ensurePlayerNotOnObstacle() {
    while (grid[playerY][playerX]) {
        playerX = Math.floor(Math.random() * columns);
        playerY = Math.floor(Math.random() * rows);
    }
}

function ensurePrizeNotOnObstacle() {
    while (grid[prizeY][prizeX] || (prizeX === playerX && prizeY === playerY)) {
        prizeX = Math.floor(Math.random() * columns);
        prizeY = Math.floor(Math.random() * rows);
    }
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const x = col * cellWidth;
            const y = row * cellHeight;
            if (row === prizeY && col === prizeX && prizeVisible) {
                ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
                ctx.fillRect(x, y, cellWidth, cellHeight);
            } else if (grid[row][col]) {
                ctx.drawImage(obstacleImage, x, y, cellWidth, cellHeight);
            } else {
                ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                ctx.fillRect(x, y, cellWidth, cellHeight);
                ctx.strokeRect(x, y, cellWidth, cellHeight);
            }
        }
    }
    drawPlayer();
    drawPrize();
}

function drawPlayer() {
    ctx.drawImage(playerImage, playerX * cellWidth, playerY * cellHeight, cellWidth, cellHeight);
}

function drawPrize() {
    ctx.drawImage(prizeImage, prizeX * cellWidth, prizeY * cellHeight, cellWidth, cellHeight);
    ctx.strokeStyle = "gold";
    ctx.lineWidth = 3;
    ctx.strokeRect(prizeX * cellWidth, prizeY * cellHeight, cellWidth, cellHeight);
}

function handleKeyPress(event) {
    if (gameOver) return;
    switch (event.key) {
        case "ArrowUp":
            if (playerY > 0 && !grid[playerY - 1][playerX]) playerY--;
            break;
        case "ArrowDown":
            if (playerY < rows - 1 && !grid[playerY + 1][playerX]) playerY++;
            break;
        case "ArrowLeft":
            if (playerX > 0 && !grid[playerY][playerX - 1]) playerX--;
            break;
        case "ArrowRight":
            if (playerX < columns - 1 && !grid[playerY][playerX + 1]) playerX++;
            break;
    }
    drawGrid();
    checkWin();
}

function checkWin() {
    if (playerX === prizeX && playerY === prizeY) {
        stopTimer();
        showModal("You Win!!");
    }
}

function showModal(message) {
  modalText.textContent = message + "\n💎 Buy gems to get more time!";
  modal.classList.add("show");

  const paypalContainer = document.getElementById("paypal-button-container");
  paypalContainer.innerHTML = "";

  paypal.Buttons({
    createOrder: function(data, actions) {
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: '1.00'
          }
        }]
      });
    },
    onApprove: function(data, actions) {
      return actions.order.capture().then(function(details) {
        alert('Pagamento completato da ' + details.payer.name.given_name);
        addBonusTime(30);
        modal.classList.remove("show");
        gameOver = false;
        startTimer();
      });
    }
  }).render('#paypal-button-container');
}

// Listener per il pulsante di chiusura
document.querySelector(".close-button").addEventListener("click", () => {
  modal.classList.remove("show");
});

function resetGame() {
    gameOver = false;
    let timer = 60;
    modal.classList.remove("show");
    randomizeObstacles();
    playerX = 10;
    playerY = 10;
    ensurePlayerNotOnObstacle();
    ensurePrizeNotOnObstacle();
    drawGrid();
    startTimer();
}

function move(direction) {
    handleKeyPress({ key: direction });
}

closeModalBtn.addEventListener("click", resetGame);

window.onload = () => {
    playerImage.onload = drawGrid;
    obstacleImage.onload = drawGrid;
    prizeImage.onload = drawGrid;
    initGame();

};

