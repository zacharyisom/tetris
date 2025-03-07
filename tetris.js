const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');

// FIX: Add references to hold and next
const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

// FIX: Separate modals
const pauseModal = document.getElementById('pause');
const gameOverModal = document.getElementById('gameover');

const BLOCK_SIZE = 30;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const COLORS = [
    '#000',
    '#EE2C2C', // I
    '#2EAFEC', // O
    '#39DB76', // T
    '#9B5FE3', // S
    '#F37C21', // Z
    '#FFD93D', // L
    '#4B75E8'  // J
];

let board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
let score = 0;
let level = 1;

// FIX: Add a lines variable
let lines = 0;

/* --- Add these global variables at the top with your other globals --- */
let aiEnabled = false;
let aiProcessing = false;

let gameLoop;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let paused = false;
let gameOver = false;
let holdPiece = null;
let canHold = true;
let bag = [];

// ADD: Variable to track ghost piece visibility
let showGhost = true;

const PIECES = [
    [[1,1,1,1]],      // I
    [[2,2],[2,2]],    // O
    [[0,3,0],[3,3,3]],// T
    [[0,4,4],[4,4,0]],// S
    [[5,5,0],[0,5,5]],// Z
    [[6,0,0],[6,6,6]],// L
    [[0,0,7],[7,7,7]] // J
];

let currentPiece = {
    pos: {x: 0, y: 0},
    matrix: null
};

function resetGame() {
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    score = 0;
    level = 1;
    lines = 0; // FIX: reset lines
    gameOver = false;
    holdPiece = null;
    canHold = true;
    bag = [];
    dropInterval = 1000;
    document.getElementById('score').textContent = '0';
    document.getElementById('level').textContent = '1';
    document.getElementById('lines').textContent = '0';

    // FIX: Hide both modals
    pauseModal.style.display = 'none';
    gameOverModal.style.display = 'none';

    currentPiece.matrix = getRandomPiece();
    currentPiece.pos.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(currentPiece.matrix[0].length / 2);
    currentPiece.pos.y = 0;
    nextPiece = getRandomPiece();
    lastTime = performance.now();
    update();
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getRandomPiece() {
    // If the bag is empty, create a new one with all 7 pieces
    if (bag.length === 0) {
        // Create array with indices 0-6 (one for each piece type)
        bag = [0, 1, 2, 3, 4, 5, 6];
        // Shuffle the bag
        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }
    }
    
    // Take one piece from the bag
    const pieceIndex = bag.pop();
    return PIECES[pieceIndex];
}

let nextPiece = getRandomPiece();

function getGhostPosition() {
    const ghost = {
        pos: { x: currentPiece.pos.x, y: currentPiece.pos.y },
        matrix: currentPiece.matrix
    };

    while (!collide(board, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;
    return ghost;
}

function rotate(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = Array(cols).fill().map(() => Array(rows).fill(0));
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            result[c][rows - 1 - r] = matrix[r][c];
        }
    }
    return result;
}

// In script.js - Update the drawBlock function
function drawBlock(context, x, y, color, size = BLOCK_SIZE, alpha = 1) {
    context.globalAlpha = alpha;
    
    // Calculate position with a small offset to prevent edge clipping
    const xPos = x * size + 0.5;
    const yPos = y * size + 0.5;
    const blockSize = size - 1;
    
    // Draw main block with rounded corners
    context.fillStyle = color;
    const radius = 3;
    
    context.beginPath();
    context.moveTo(xPos + radius, yPos);
    context.lineTo(xPos + blockSize - radius, yPos);
    context.arcTo(xPos + blockSize, yPos, xPos + blockSize, yPos + radius, radius);
    context.lineTo(xPos + blockSize, yPos + blockSize - radius);
    context.arcTo(xPos + blockSize, yPos + blockSize, xPos + blockSize - radius, yPos + blockSize, radius);
    context.lineTo(xPos + radius, yPos + blockSize);
    context.arcTo(xPos, yPos + blockSize, xPos, yPos + blockSize - radius, radius);
    context.lineTo(xPos, yPos + radius);
    context.arcTo(xPos, yPos, xPos + radius, yPos, radius);
    context.fill();
    
    // Add a subtle gradient and highlight
    const gradient = context.createLinearGradient(
        x * size, y * size, 
        x * size + blockSize, y * size + blockSize
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}88`);
    
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(x * size + radius + 2, y * size + 2);
    context.lineTo(x * size + blockSize - radius - 2, y * size + 2);
    context.arcTo(x * size + blockSize - 2, y * size + 2, x * size + blockSize - 2, y * size + radius + 2, radius - 1);
    context.lineTo(x * size + blockSize - 2, y * size + blockSize - radius - 2);
    context.arcTo(x * size + blockSize - 2, y * size + blockSize - 2, x * size + blockSize - radius - 2, y * size + blockSize - 2, radius - 1);
    context.lineTo(x * size + radius + 2, y * size + blockSize - 2);
    context.arcTo(x * size + 2, y * size + blockSize - 2, x * size + 2, y * size + blockSize - radius - 2, radius - 1);
    context.lineTo(x * size + 2, y * size + radius + 2);
    context.arcTo(x * size + 2, y * size + 2, x * size + radius + 2, y * size + 2, radius - 1);
    context.fill();
    
    context.globalAlpha = 1;
}

function drawMatrix(matrix, offset, context, blockSize = BLOCK_SIZE, alpha = 1) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(context, x + offset.x, y + offset.y, COLORS[value], blockSize, alpha);
            }
        });
    });
}

// In script.js - Update the draw function to properly center the preview pieces
function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add a small offset (padding) to all pieces to prevent them from touching the edges
    const boardOffset = { x: 0, y: 0 };
    
    // MODIFY: Only draw ghost piece if showGhost is true
    if (showGhost) {
        const ghost = getGhostPosition();
        drawMatrix(ghost.matrix, ghost.pos, ctx, BLOCK_SIZE, 0.2);
    }
    
    drawMatrix(board, boardOffset, ctx);
    if (currentPiece.matrix) {
        drawMatrix(currentPiece.matrix, currentPiece.pos, ctx);
    }
    
    // Draw next piece - Improved centering
    nextCtx.fillStyle = '#0f172a';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    // Calculate proper centering offsets for next piece
    const nextOffsetX = (5 - nextPiece[0].length) / 2;
    const nextOffsetY = (5 - nextPiece.length) / 2;
    drawMatrix(nextPiece, {x: nextOffsetX, y: nextOffsetY}, nextCtx, 20);

    // Draw hold piece - Improved centering
    holdCtx.fillStyle = '#0f172a';
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (holdPiece) {
        // Calculate proper centering offsets for hold piece
        const holdOffsetX = (5 - holdPiece[0].length) / 2;
        const holdOffsetY = (5 - holdPiece.length) / 2;
        drawMatrix(holdPiece, {x: holdOffsetX, y: holdOffsetY}, holdCtx, 20);
    }
}

function collide(board, piece) {
    const [m, o] = [piece.matrix, piece.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (board[y + o.y] &&
                board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(board, piece) {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + piece.pos.y][x + piece.pos.x] = value;
            }
        });
    });
}

function playerDrop() {
    currentPiece.pos.y++;
    if (collide(board, currentPiece)) {
        currentPiece.pos.y--;
        merge(board, currentPiece);
        pieceReset();
        sweepLines();
    }
    dropCounter = 0;
}

function hardDrop() {
    while (!collide(board, currentPiece)) {
        currentPiece.pos.y++;
    }
    currentPiece.pos.y--;
    merge(board, currentPiece);
    pieceReset();
    sweepLines();
}

function playerMove(dir) {
    currentPiece.pos.x += dir;
    if (collide(board, currentPiece)) {
        currentPiece.pos.x -= dir;
    }
}

function playerRotate() {
    const pos = currentPiece.pos.x;
    let offset = 1;
    const matrix = rotate(currentPiece.matrix);
    currentPiece.matrix = matrix;
    
    while (collide(board, currentPiece)) {
        currentPiece.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > matrix[0].length) {
            // Rotate back
            currentPiece.matrix = rotate(rotate(rotate(matrix)));
            currentPiece.pos.x = pos;
            return;
        }
    }
}

function pieceReset() {
    currentPiece.matrix = nextPiece;
    nextPiece = getRandomPiece();
    currentPiece.pos.y = 0;
    currentPiece.pos.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(currentPiece.matrix[0].length / 2);
    
    if (collide(board, currentPiece)) {
        gameOver = true;
        cancelAnimationFrame(gameLoop);
        // FIX: Show final score in gameOver modal
        document.getElementById('final-score').textContent = 'Score: ' + score;
        gameOverModal.style.display = 'block';
    }
    canHold = true;
}

function holdPieceSwap() {
    if (!canHold) return;
    
    if (holdPiece === null) {
        holdPiece = currentPiece.matrix;
        pieceReset();
    } else {
        const temp = currentPiece.matrix;
        currentPiece.matrix = holdPiece;
        currentPiece.pos.y = 0;
        currentPiece.pos.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(currentPiece.matrix[0].length / 2);
        holdPiece = temp;
    }
    canHold = false;
}

function sweepLines() {
    let linesCleared = 0;
    outer: for (let y = board.length - 1; y >= 0; y--) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        y++;
        linesCleared++;
    }
    
    if (linesCleared > 0) {
        // FIX: update total lines
        lines += linesCleared;
        document.getElementById('lines').textContent = lines;

        // Keep scoring & level logic
        score += [40, 100, 300, 1200][linesCleared - 1] * level;
        document.getElementById('score').textContent = score;
        level = Math.floor(lines / 10) + 1;
        document.getElementById('level').textContent = level;
        // dropInterval = 1000 * Math.pow(0.85, level - 1);
        if (!aiEnabled) {dropInterval = 1000 * Math.pow(0.85, level - 1);}
    }
}

/* --- Insert these functions (for AI integration) somewhere after your helper functions --- */
async function processAIMove() {
    // Only process if AI mode is enabled, and only when game is not over or paused
    if (!aiEnabled || aiProcessing || gameOver || paused) return;
    aiProcessing = true;

    // Construct the game state to send to the AI.
    // This includes the board, the current piece, next piece, hold piece, score, level, and lines.
    const gameState = {
        board: board,
        currentPiece: {
            matrix: currentPiece.matrix,
            pos: { ...currentPiece.pos }
        },
        nextPiece: nextPiece,
        holdPiece: holdPiece,
        score: score,
        level: level,
        lines: lines
    };

    // Ensure that ai.js is loaded and has provided the getAIMove function.
    if (typeof getAIMove === 'function') {
        try {
            // Await the AI's decision (expected to return an object, e.g., {action: 'moveLeft'})
            const decision = await getAIMove(gameState);
            applyAIMove(decision);
        } catch (error) {
            console.error("Error in AI decision:", error);
        }
    } else {
        console.warn("AI function getAIMove not found. Please ensure ai.js is loaded.");
    }

    aiProcessing = false;
}

function applyAIMove(decision) {
    // The AI decision is expected to be an object with an "action" property.
    // Map the decision to the appropriate game function.
    switch (decision.action) {
        case 'moveLeft':
            playerMove(-1);
            break;
        case 'moveRight':
            playerMove(1);
            break;
        case 'rotate':
            playerRotate();
            break;
        case 'softDrop':
            playerDrop();
            break;
        case 'hardDrop':
            hardDrop();
            break;
        case 'hold':
            holdPieceSwap();
            break;
        default:
            console.warn("Unknown AI action:", decision.action);
    }
}

/* --- Modify the update function to include AI processing --- */
function update(time = 0) {
    if (gameOver || paused) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();

    // NEW: Process an AI move if AI mode is enabled.
    if (aiEnabled) {
        processAIMove();
    }

    gameLoop = requestAnimationFrame(update);
}


/* --- Modify the keydown event listener to add AI toggle functionality --- */
document.addEventListener('keydown', event => {
    // FIX: If game is over, press SPACE to reset
    if (gameOver) {
        if (event.code === 'Space') {
            resetGame();
        }
        return;
    }

    if (event.key === 'p') {
        paused = !paused;
        if (!paused) {
            lastTime = performance.now();
            update();
        }
        // Show/hide the pause modal
        pauseModal.style.display = paused ? 'block' : 'none';
        return;
    }

    if (paused) return;

    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
            playerMove(-1);
            break;
        case 'ArrowRight':
        case 'd':
            playerMove(1);
            break;
        case 'ArrowDown':
        case 's':
            playerDrop();
            break;
        case 'ArrowUp':
        case 'w':
            playerRotate();
            break;
        case ' ':
            hardDrop();
            break;
        case 'c':
            holdPieceSwap();
            break;
        case 'g':
            showGhost = !showGhost;
            break;
        case 't': // NEW: Toggle AI mode with the "T" key (supports both lowercase and uppercase)
        case 'T':
            aiEnabled = !aiEnabled;
            console.log("AI mode: " + (aiEnabled ? "Enabled" : "Disabled"));
            break;
        default:
            break;
    }
});

// Start the first piece & begin the loop
currentPiece.matrix = getRandomPiece();
currentPiece.pos.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(currentPiece.matrix[0].length / 2);
update();
