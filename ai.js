/**
 * Advanced Tetris AI with Comprehensive Heuristics
 */

// Enhanced evaluation parameters
const AI_PARAMETERS = {
    // Height-related parameters
    HEIGHT_PENALTY: -0.550,        // Slightly increased penalty to discourage higher stacks
    MAX_HEIGHT_PENALTY: -1.000,      // More severe penalty as the board nears the top
    HEIGHT_VARIANCE_PENALTY: -0.400, // Increased penalty to promote a more even surface

    // Line clearing parameters
    LINE_CLEAR_BONUS: 1.100,         // Slightly reduced bonus for general line clears
    TETRIS_CLEAR_BONUS: 4.000,       // Boosted bonus to favor setups for 4-line clears

    // Structure-related parameters
    HOLE_PENALTY: -1.300,            // Increased penalty for holes to further discourage them
    BLOCKED_HOLE_PENALTY: -1.800,     // Even higher penalty for holes that are difficult to clear

    // Surface smoothness parameters
    BUMPINESS_PENALTY: -0.500,       // Increased penalty to further promote a smooth surface
    WELL_DEPTH_PENALTY: -0.750,      // Higher penalty to avoid excessively deep wells

    // Strategic parameters
    PIECE_PLACEMENT_BONUS: 0.300,    // Slightly higher bonus to reward strategic placements
    LANDING_HEIGHT_PENALTY: -0.450,   // Increased penalty for high landing positions

    // Advanced heuristics
    FUTURE_MOVE_LOOKAHEAD: 4,        // Expanded lookahead for improved strategic planning
    EXPLORATION_DEPTH: 5             // Deeper move exploration to assess more possibilities
};


/**
 * Advanced move evaluation for Tetris AI
 * @param {Object} gameState - Current game state
 * @returns {Object} - Best move to make
 */
function getAIMove(gameState) {
    return new Promise(resolve => {
        // Enhanced move selection with deeper analysis
        const bestMove = findBestMove(gameState);
        resolve(bestMove);
    });
}

/**
 * Find the optimal move using multi-dimensional evaluation
 * @param {Object} gameState - Current game state
 * @returns {Object} - Best move
 */
function findBestMove(gameState) {
    const { board, currentPiece, nextPieces } = gameState;
    
    let bestScore = -Infinity;
    let bestMove = { action: 'moveLeft' };
    
    // Generate all possible moves with enhanced exploration
    const possibleMoves = generateComprehensiveMoves(board, currentPiece, nextPieces);
    
    // Evaluate moves with multi-dimensional scoring
    possibleMoves.forEach(move => {
        const moveScore = evaluateMoveComprehensively(board, move, gameState);
        
        if (moveScore > bestScore) {
            bestScore = moveScore;
            bestMove = { 
                action: move.actions[0],  // First action in sequence
                fullActionSequence: move.actions
            };
        }
    });
    
    // Consider hold piece if beneficial
    const holdScore = evaluateHoldStrategy(gameState);
    if (holdScore > bestScore) {
        return { action: 'hold' };
    }
    
    return bestMove;
}

/**
 * Generate comprehensive set of possible moves
 * @param {Array} board - Current board state
 * @param {Object} currentPiece - Current piece
 * @param {Array} nextPieces - Upcoming pieces
 * @returns {Array} - Possible moves with detailed information
 */
function generateComprehensiveMoves(board, currentPiece, nextPieces) {
    const moves = [];
    const boardWidth = board[0].length;
    
    // Explore all rotations and positions
    for (let rotation = 0; rotation < 4; rotation++) {
        const rotatedPiece = simulateRotations(currentPiece.matrix, rotation);
        const pieceWidth = rotatedPiece[0].length;
        
        // Try all possible x positions
        for (let x = 0; x <= boardWidth - pieceWidth; x++) {
            // Generate action sequence
            const actions = generateAdvancedActionSequence(
                currentPiece.pos.x, 
                x, 
                rotation
            );
            
            // Simulate drop and board state
            const dropResult = simulateDropWithContext(
                board, 
                rotatedPiece, 
                x, 
                nextPieces
            );
            
            if (dropResult) {
                moves.push({
                    board: dropResult.board,
                    linesCleared: dropResult.linesCleared,
                    actions: [...actions, 'hardDrop'],
                    matrix: rotatedPiece,
                    x: x
                });
            }
        }
    }
    
    // Sort moves by initial broad criteria
    return moves.sort((a, b) => b.linesCleared - a.linesCleared);
}

/**
 * Advanced move evaluation with multiple heuristics
 * @param {Array} originalBoard - Original board state
 * @param {Object} move - Proposed move
 * @param {Object} gameState - Full game state
 * @returns {number} - Comprehensive move score
 */
function evaluateMoveComprehensively(originalBoard, move, gameState) {
    const { board, linesCleared } = move;
    
    // Calculate advanced heuristics
    const heights = calculateHeights(board);
    const aggregateHeight = heights.reduce((sum, h) => sum + h, 0);
    const maxHeight = Math.max(...heights);
    const heightVariance = calculateHeightVariance(heights);
    
    const holes = calculateAdvancedHoles(board, heights);
    const blockedHoles = calculateBlockedHoles(board, heights);
    const bumpiness = calculateBumpiness(heights);
    const wellDepth = calculateWellDepth(heights);
    
    // Line clearing bonus with exponential reward
    const lineClearBonus = calculateLineClearBonus(linesCleared);
    
    // Comprehensive scoring
    return (
        // Height-related penalties
        AI_PARAMETERS.HEIGHT_PENALTY * aggregateHeight +
        AI_PARAMETERS.MAX_HEIGHT_PENALTY * (maxHeight > 15 ? maxHeight : 0) +
        AI_PARAMETERS.HEIGHT_VARIANCE_PENALTY * heightVariance +
        
        // Line clearing bonuses
        lineClearBonus +
        
        // Structure penalties
        AI_PARAMETERS.HOLE_PENALTY * holes +
        AI_PARAMETERS.BLOCKED_HOLE_PENALTY * blockedHoles +
        
        // Surface and structure penalties
        AI_PARAMETERS.BUMPINESS_PENALTY * bumpiness +
        AI_PARAMETERS.WELL_DEPTH_PENALTY * wellDepth +
        
        // Placement strategic bonus
        AI_PARAMETERS.PIECE_PLACEMENT_BONUS * calculateStrategicPlacementBonus(board)
    );
}

/**
 * Calculate advanced line clear bonus with exponential rewards
 * @param {number} linesCleared - Number of lines cleared
 * @returns {number} - Bonus score
 */
function calculateLineClearBonus(linesCleared) {
    switch(linesCleared) {
        case 1: return AI_PARAMETERS.LINE_CLEAR_BONUS;
        case 2: return AI_PARAMETERS.LINE_CLEAR_BONUS * 2.5;
        case 3: return AI_PARAMETERS.LINE_CLEAR_BONUS * 5;
        case 4: return AI_PARAMETERS.TETRIS_CLEAR_BONUS;
        default: return 0;
    }
}

/**
 * Calculate height variance between columns
 * @param {Array} heights - Column heights
 * @returns {number} - Height variance
 */
function calculateHeightVariance(heights) {
    const mean = heights.reduce((a, b) => a + b, 0) / heights.length;
    return heights.reduce((sum, height) => sum + Math.pow(height - mean, 2), 0) / heights.length;
}

/**
 * Calculate advanced hole detection
 * @param {Array} board - Board state
 * @param {Array} heights - Column heights
 * @returns {number} - Number of holes
 */
function calculateAdvancedHoles(board, heights) {
    let holes = 0;
    
    for (let c = 0; c < board[0].length; c++) {
        const height = heights[c];
        
        for (let r = board.length - height; r < board.length; r++) {
            if (board[r][c] === 0) {
                holes++;
            }
        }
    }
    
    return holes;
}

/**
 * Calculate blocked holes that are harder to clear
 * @param {Array} board - Board state
 * @param {Array} heights - Column heights
 * @returns {number} - Number of blocked holes
 */
function calculateBlockedHoles(board, heights) {
    let blockedHoles = 0;
    
    for (let c = 0; c < board[0].length; c++) {
        const height = heights[c];
        let foundHole = false;
        
        for (let r = board.length - height; r < board.length; r++) {
            if (board[r][c] === 0) {
                foundHole = true;
                
                // Check if hole is blocked on multiple sides
                const blockedSides = 
                    (c > 0 && board[r][c-1] !== 0 ? 1 : 0) +
                    (c < board[0].length - 1 && board[r][c+1] !== 0 ? 1 : 0);
                
                if (blockedSides > 1) {
                    blockedHoles++;
                }
            }
        }
    }
    
    return blockedHoles;
}

/**
 * Calculate well depth (columns with lower height than neighbors)
 * @param {Array} heights - Column heights
 * @returns {number} - Well depth score
 */
function calculateWellDepth(heights) {
    let wellDepth = 0;
    
    for (let i = 0; i < heights.length; i++) {
        const leftHeight = i > 0 ? heights[i-1] : Infinity;
        const rightHeight = i < heights.length - 1 ? heights[i+1] : Infinity;
        
        if (heights[i] < leftHeight && heights[i] < rightHeight) {
            wellDepth += Math.min(leftHeight, rightHeight) - heights[i];
        }
    }
    
    return wellDepth;
}

/**
 * Calculate strategic placement bonus
 * @param {Array} board - Board state
 * @returns {number} - Placement bonus
 */
function calculateStrategicPlacementBonus(board) {
    // Reward for creating opportunities for future line clears
    let bonus = 0;
    
    // Check for potential line clear opportunities
    for (let r = board.length - 1; r >= 0; r--) {
        const emptySpaces = board[r].filter(cell => cell === 0).length;
        
        // More bonus for rows close to being cleared
        if (emptySpaces <= 2) {
            bonus += (2 - emptySpaces) * 0.5;
        }
    }
    
    return bonus;
}

/**
 * Evaluate hold piece strategy
 * @param {Object} gameState - Current game state
 * @returns {number} - Score for holding piece
 */
function evaluateHoldStrategy(gameState) {
    if (!gameState.holdPiece) return -Infinity;
    
    const holdPieceState = {
        ...gameState,
        currentPiece: {
            matrix: gameState.holdPiece,
            pos: { x: 4, y: 0 }
        }
    };
    
    const moves = generateComprehensiveMoves(
        gameState.board, 
        holdPieceState.currentPiece, 
        gameState.nextPieces
    );
    
    if (moves.length === 0) return -Infinity;
    
    // Return the score of the best move with the hold piece
    return Math.max(...moves.map(move => 
        evaluateMoveComprehensively(gameState.board, move, gameState)
    ));
}

// Utility functions from previous implementation
function simulateRotations(matrix, times) {
    let result = cloneMatrix(matrix);
    for (let i = 0; i < times; i++) {
        result = rotateMatrix(result);
    }
    return result;
}

function rotateMatrix(matrix) {
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

function cloneMatrix(matrix) {
    return matrix.map(row => [...row]);
}

function generateAdvancedActionSequence(currentX, targetX, rotations) {
    const actions = [];
    
    // Add rotation actions
    for (let i = 0; i < rotations; i++) {
        actions.push('rotate');
    }
    
    // Add horizontal movement actions
    const diff = targetX - currentX;
    const moveAction = diff < 0 ? 'moveLeft' : 'moveRight';
    for (let i = 0; i < Math.abs(diff); i++) {
        actions.push(moveAction);
    }
    
    return actions;
}

function simulateDropWithContext(board, piece, x, nextPieces) {
    const boardHeight = board.length;
    const pieceHeight = piece.length;
    const pieceWidth = piece[0].length;
    
    // Find the y position where the piece would come to rest
    let y = 0;
    while (y < boardHeight) {
        if (wouldCollide(board, piece, x, y + 1)) {
            break;
        }
        y++;
    }
    
    // Check if the piece fits at this position
    if (y < 0 || y + pieceHeight > boardHeight || wouldCollide(board, piece, x, y)) {
        return null;
    }
    
    // Clone the board and merge the piece
    const resultBoard = board.map(row => [...row]);
    
    // Merge the piece into the board
    for (let r = 0; r < pieceHeight; r++) {
        for (let c = 0; c < pieceWidth; c++) {
            if (piece[r][c] !== 0) {
                resultBoard[y + r][x + c] = piece[r][c];
            }
        }
    }
    
    // Clear any complete lines
    return clearLines(resultBoard);
}

function wouldCollide(board, piece, x, y) {
    const boardHeight = board.length;
    const boardWidth = board[0].length;
    
    for (let r = 0; r < piece.length; r++) {
        for (let c = 0; c < piece[r].length; c++) {
            if (piece[r][c] !== 0) {
                const boardY = y + r;
                const boardX = x + c;
                
                // Check board boundaries
                if (boardY < 0 || boardY >= boardHeight || 
                    boardX < 0 || boardX >= boardWidth) {
                    return true;
                }
                
                // Check collision with other pieces
                if (board[boardY][boardX] !== 0) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

function clearLines(board) {
    const result = board.map(row => [...row]);
    let linesCleared = 0;
    
    for (let y = board.length - 1; y >= 0; y--) {
        if (isLineFull(board[y])) {
            // Remove this line and add a new empty line at the top
            result.splice(y, 1);
            result.unshift(Array(board[0].length).fill(0));
            linesCleared++;
        }
    }
    
    return { board: result, linesCleared };
}

function isLineFull(line) {
    return line.every(cell => cell !== 0);
}

function calculateHeights(board) {
    const heights = Array(board[0].length).fill(0);
    
    for (let c = 0; c < board[0].length; c++) {
        for (let r = 0; r < board.length; r++) {
            if (board[r][c] !== 0) {
                heights[c] = board.length - r;
                break;
            }
        }
    }
    
    return heights;
}

function calculateBumpiness(heights) {
    let bumpiness = 0;
    
    for (let i = 0; i < heights.length - 1; i++) {
        bumpiness += Math.abs(heights[i] - heights[i + 1]);
    }
    
    return bumpiness;
}

// Piece templates for reference
const PIECE_TEMPLATES = [
    { // I-piece
        matrix: [[1,1,1,1]],
        color: 'cyan'
    },
    { // O-piece (square)
        matrix: [[2,2],[2,2]],
        color: 'yellow'
    },
    { // T-piece
        matrix: [[0,3,0],[3,3,3]],
        color: 'purple'
    },
    { // S-piece
        matrix: [[0,4,4],[4,4,0]],
        color: 'green'
    },
    { // Z-piece
        matrix: [[5,5,0],[0,5,5]],
        color: 'red'
    },
    { // J-piece
        matrix: [[6,0,0],[6,6,6]],
        color: 'blue'
    },
    { // L-piece
        matrix: [[0,0,7],[7,7,7]],
        color: 'orange'
    }
];

/**
 * Debug and logging utility
 * @param {Object} gameState - Current game state
 * @param {Object} bestMove - Recommended move
 */
function logAIDecision(gameState, bestMove) {
    console.log('AI Decision Analysis:');
    console.log('Current Piece:', gameState.currentPiece);
    console.log('Recommended Move:', bestMove);
    
    // Additional advanced logging could be added here
}

// Expose functions to global scope or module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAIMove,
        AI_PARAMETERS
    };
} else {
    window.TetrisAI = {
        getAIMove,
        AI_PARAMETERS
    };
}

/** Optional: Add configuration method to adjust AI parameters
function configureAI(customParams) {
    Object.keys(customParams).forEach(key => {
        if (AI_PARAMETERS.hasOwnProperty(key)) {
            AI_PARAMETERS[key] = customParams[key];
        }
    });
}

// Return the configured module
export default {
    getAIMove,
    configureAI,
    AI_PARAMETERS
};
*/

