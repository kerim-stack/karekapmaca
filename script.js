let ROWS = 6;
let COLS = 9;

function getMetrics() {
    const isPortrait = window.innerWidth < window.innerHeight;
    const shortSide = Math.min(window.innerWidth, window.innerHeight);
    
    // Mobil dikey modda agresif optimizasyon
    if (isPortrait && window.innerWidth <= 500) {
         // Padding minimum, nokta boyutu biraz daha küçük, kutu boyutu dinamik kalacak
         return { DOT_SIZE: 16, BOX_SIZE: 48, PADDING: 2 }; 
    }

    if (shortSide <= 420) return { DOT_SIZE: 18, BOX_SIZE: 44, PADDING: 6 };
    if (shortSide <= 600) return { DOT_SIZE: 20, BOX_SIZE: 52, PADDING: 10 };
    return { DOT_SIZE: 20, BOX_SIZE: 60, PADDING: 20 };
}

function updateGridDimensions() {
    if (window.innerWidth < window.innerHeight) {
        ROWS = 9;
        COLS = 6;
    } else {
        ROWS = 6;
        COLS = 9;
    }
}

function scaleBoard() {
    const board = document.getElementById('game-board');
    const wrapper = document.getElementById('board-wrapper');
    if (!board) return;
    if (!wrapper) return;

    const { DOT_SIZE, BOX_SIZE, PADDING } = getMetrics();
    const BOARD_BORDER = 1;
    board.style.padding = `${PADDING}px`;
    const frame = (PADDING + BOARD_BORDER) * 2;
    const boardWidth = (COLS * (DOT_SIZE + BOX_SIZE)) + DOT_SIZE + frame;
    const boardHeight = (ROWS * (DOT_SIZE + BOX_SIZE)) + DOT_SIZE + frame;


    const rect = wrapper.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scaleX = rect.width / boardWidth;
    const scaleY = rect.height / boardHeight;
    const scale = Math.min(scaleX, scaleY, 1.2);

    board.style.transform = `scale(${Math.max(scale, 0.1).toFixed(3)})`;
}

updateGridDimensions();
let lastIsPortrait = window.innerWidth < window.innerHeight;
let resizeTimer = null;

function rotateGameState() {
    // 1. Save current state
    const oldLines = { ...state.lines };
    const oldBoxes = JSON.parse(JSON.stringify(state.boxes));
    
    // We assume updateGridDimensions() hasn't been called yet or we call it here.
    // Actually handleViewportResize removed updateGridDimensions call, so we call it here.
    
    // Get old dimensions from current state
    const oldRows = state.boxes.length;
    const oldCols = state.boxes[0].length;
    
    // Update dimensions
    updateGridDimensions();
    
    // New dimensions are now in ROWS and COLS
    
    // 2. Transform State (Transpose)
    const newLines = {};
    const newBoxes = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    
    // Transform Lines
    Object.keys(oldLines).forEach(key => {
        const parts = key.split('-');
        const type = parts[0];
        const r = parseInt(parts[1]);
        const c = parseInt(parts[2]);
        const owner = oldLines[key];
        
        // Transpose: r,c -> c,r AND h <-> v
        const newType = type === 'h' ? 'v' : 'h';
        const newR = c;
        const newC = r;
        
        // Horizontal line: h-r-c. r is row index (0..Rows), c is col index (0..Cols-1)
        // Becomes Vertical: v-newR-newC. newR=c, newC=r.
        // Vertical line logic: v-r-c. r is row index (0..Rows-1), c is col index (0..Cols)
        // Becomes Horizontal: h-newR-newC. newR=c, newC=r.

        // Valid ranges check:
        // newType 'h': newR in 0..ROWS, newC in 0..COLS-1
        // newType 'v': newR in 0..ROWS-1, newC in 0..COLS
        
        let isValid = false;
        if (newType === 'h') {
             if (newR <= ROWS && newC < COLS) isValid = true;
        } else {
             if (newR < ROWS && newC <= COLS) isValid = true;
        }

        if (isValid) {
             newLines[`${newType}-${newR}-${newC}`] = owner;
        }
    });
    
    // Transform Boxes
    for (let r = 0; r < oldRows; r++) {
        for (let c = 0; c < oldCols; c++) {
            const val = oldBoxes[r][c];
            if (val !== 0) {
                // Transpose: r,c -> c,r
                if (c < ROWS && r < COLS) {
                    newBoxes[c][r] = val;
                }
            }
        }
    }
    
    // 3. Update State
    state.lines = newLines;
    state.boxes = newBoxes;
    
    // 4. Re-render
    renderBoard();
    restoreVisuals();
}

function restoreVisuals() {
    // Restore Lines
    Object.keys(state.lines).forEach(key => {
        const owner = state.lines[key];
        const lineEl = document.getElementById(key);
        if (lineEl) {
            lineEl.classList.add('taken');
            lineEl.classList.add(owner === 1 ? 'p1' : 'p2');
        }
    });

    // Restore Boxes
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const owner = state.boxes[r][c];
            if (owner !== 0) {
                const boxEl = document.getElementById(`box-${r}-${c}`);
                if (boxEl) {
                    boxEl.classList.add(owner === 1 ? 'p1' : 'p2');
                }
            }
        }
    }
    
    // Scale board to fit
    requestAnimationFrame(scaleBoard);
}

function handleViewportResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const isPortraitNow = window.innerWidth < window.innerHeight;
        if (isPortraitNow !== lastIsPortrait) {
            lastIsPortrait = isPortraitNow;
            rotateGameState();
        } else {
            scaleBoard();
        }
    }, 60);
}

const boardEl = document.getElementById('game-board');
const p1ScoreEl = document.getElementById('p1-score');
const p2ScoreEl = document.getElementById('p2-score');
const currentPlayerNameEl = document.getElementById('current-player-name');
const turnIndicator = document.getElementById('turn-indicator');
const newGameBtn = document.getElementById('new-game-btn');
const gameOverModal = document.getElementById('game-over-modal');
const winnerText = document.getElementById('winner-text');
const playAgainBtn = document.getElementById('play-again-btn');
const finalP1Name = document.getElementById('final-p1-name');
const finalP1Score = document.getElementById('final-p1-score');
const finalP2Name = document.getElementById('final-p2-name');
const finalP2Score = document.getElementById('final-p2-score');
const introModal = document.getElementById('intro-modal');
const startGameBtn = document.getElementById('start-game-btn');
const p1Input = document.getElementById('p1-input');
const p2Input = document.getElementById('p2-input');
const p2InputGroup = document.getElementById('p2-input-group');
const modalGameMode = document.getElementById('modal-game-mode');
const modalDifficulty = document.getElementById('modal-difficulty');
const modalDifficultyGroup = document.getElementById('modal-difficulty-group');
const audioToggleEl = document.getElementById('audio-toggle');

const audio = {
    bgm: new Audio('3.wav'),
    line: new Audio('1.wav'),
    box: new Audio('2.wav'),
    ui: new Audio('2.mp3')
};

audio.bgm.loop = true;
audio.bgm.volume = 0.2;
audio.line.volume = 1;
audio.box.volume = 1;
audio.ui.volume = 1;

function tryPlayAudio(a) {
    if (!a) return;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
}

function ensureBgmPlaying() {
    if (!audio.bgm) return;
    audio.bgm.muted = state.isMuted;
    if (state.isMuted) return;
    if (!audio.bgm.loop) audio.bgm.loop = true;
    if (audio.bgm.volume !== 0.2) audio.bgm.volume = 0.2;
    if (audio.bgm.paused) tryPlayAudio(audio.bgm);
}

function playSfx(src) {
    if (!src) return;
    if (state.isMuted) return;
    const a = src.cloneNode(true);
    a.volume = src.volume;
    a.muted = state.isMuted;
    tryPlayAudio(a);
}

let state = {
    currentPlayer: 1, // 1 or 2
    scores: { 1: 0, 2: 0 },
    lines: {}, // 'h-r-c' or 'v-r-c': true
    boxes: [], // 2D array [row][col] -> 0 (none), 1, 2
    gameMode: 'pvp', // 'pvp' or 'pvc'
    difficulty: 'easy', // 'easy', 'medium', 'hard'
    isGameOver: false,
    isComputerTurn: false,
    isInputLocked: false, // Prevent ghost clicks
    isMuted: false,
    playerNames: { 1: 'Oyuncu 1', 2: 'Oyuncu 2' },
    modalGridInterval: null
};

function setAudioMuted(muted) {
    state.isMuted = muted;
    if (audio.bgm) audio.bgm.muted = muted;
    if (audio.line) audio.line.muted = muted;
    if (audio.box) audio.box.muted = muted;
    if (audio.ui) audio.ui.muted = muted;
    if (!muted) ensureBgmPlaying();
}

function createToggleRipple(isOn) {
    if (!audioToggleEl) return;
    const rect = audioToggleEl.getBoundingClientRect();
    const r = document.createElement('div');
    const togglePadding = 3;
    const toggleHeight = 44;
    const thumbSize = 32;
    const size = 38;
    const x = isOn ? (rect.width - togglePadding - thumbSize / 2) : (togglePadding + thumbSize / 2);
    r.className = 'ripple';
    r.style.cssText = `
      width:${size}px; height:${size}px;
      left:${x - size / 2}px; top:${(toggleHeight - size) / 2}px;
      border: 2px solid ${isOn ? '#00f5ff' : '#ff00cc'};
      box-shadow: 0 0 8px ${isOn ? '#00f5ff' : '#ff00cc'};
    `;
    audioToggleEl.appendChild(r);
    setTimeout(() => r.remove(), 600);
}

function setToggleState(isOn, withRipple) {
    if (!audioToggleEl) return;
    audioToggleEl.classList.toggle('on', isOn);
    audioToggleEl.classList.toggle('off', !isOn);
    if (withRipple) createToggleRipple(isOn);
}

// Modal Grid Animation
function startModalGridAnimation() {
    const overlay = document.getElementById('modal-grid-overlay');
    if (!overlay) return;

    if (state.modalGridInterval) clearInterval(state.modalGridInterval);

    state.modalGridInterval = setInterval(() => {
        if (introModal.style.display === 'none') {
            stopModalGridAnimation();
            return;
        }

        const square = document.createElement('div');
        square.classList.add('modal-blink-square');

        // Randomly pick color
        const isCyan = Math.random() > 0.5;
        square.style.backgroundColor = isCyan ? 'var(--primary-neon)' : 'var(--secondary-neon)';
        
        // Randomly pick grid position relative to center
        // Grid is 64x64, centered.
        // We want to cover visible area.
        const cols = Math.ceil(window.innerWidth / 64) + 2;
        const rows = Math.ceil(window.innerHeight / 64) + 2;
        
        const c = Math.floor(Math.random() * cols) - Math.floor(cols / 2);
        const r = Math.floor(Math.random() * rows) - Math.floor(rows / 2);
        
        square.style.left = `calc(50% + ${c * 64}px)`;
        square.style.top = `calc(50% + ${r * 64}px)`;
        
        // Random animation duration
        square.style.animationDuration = `${3 + Math.random() * 2}s`;
        
        overlay.appendChild(square);
        
        // Remove after animation
        setTimeout(() => {
            square.remove();
        }, 6000);
        
    }, 600); // New square every 600ms
}

function stopModalGridAnimation() {
    if (state.modalGridInterval) {
        clearInterval(state.modalGridInterval);
        state.modalGridInterval = null;
    }
    const overlay = document.getElementById('modal-grid-overlay');
    if (overlay) overlay.innerHTML = '';
}

// Initialize
function init() {
    renderBoard();
    updateScoreboard();
    
    // Show intro modal
    introModal.style.display = 'flex';
    
    // Start modal grid animation
    startModalGridAnimation();

    // Set up grid layout
    // Use fixed sizes for stability
    const { DOT_SIZE, BOX_SIZE, PADDING } = getMetrics();
    
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, ${DOT_SIZE}px ${BOX_SIZE}px) ${DOT_SIZE}px`;
    boardEl.style.gridTemplateRows = `repeat(${ROWS}, ${DOT_SIZE}px ${BOX_SIZE}px) ${DOT_SIZE}px`;
    boardEl.style.padding = `${PADDING}px`;

    setToggleState(!state.isMuted, false);
    if (audioToggleEl) {
        audioToggleEl.addEventListener('click', (e) => {
            e.preventDefault?.();
            const isOn = audioToggleEl.classList.contains('on');
            const nextOn = !isOn;
            setToggleState(nextOn, true);
            setAudioMuted(!nextOn);
        });
    }

    // Add event listeners
    window.addEventListener('resize', handleViewportResize);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    let lastStartTs = 0;
    const handleStartGame = (e) => {
        const now = Date.now();
        if (now - lastStartTs < 350) return;
        lastStartTs = now;
        if (e) {
            e.preventDefault?.();
            e.stopPropagation?.();
        }
        playSfx(audio.ui);
        ensureBgmPlaying();
        state.gameMode = modalGameMode.value;
        state.difficulty = modalDifficulty.value;
        
        state.playerNames[1] = p1Input.value || 'Oyuncu 1';
        if (state.gameMode === 'pvp') {
            state.playerNames[2] = p2Input.value || 'Oyuncu 2';
        } else {
            state.playerNames[2] = 'Bilgisayar';
        }
        
        introModal.style.display = 'none';
        stopModalGridAnimation();
        
        // Prevent ghost clicks
        state.isInputLocked = true;
        setTimeout(() => { state.isInputLocked = false; }, 400);

        startNewGame();
    };

    if (startGameBtn) {
        startGameBtn.addEventListener('click', handleStartGame);
        startGameBtn.addEventListener('pointerup', handleStartGame);
    }
    document.addEventListener('click', (e) => {
        const btn = e.target?.closest?.('#start-game-btn');
        if (btn) handleStartGame(e);
    }, true);

    newGameBtn.addEventListener('click', () => {
        playSfx(audio.ui);
        introModal.style.display = 'flex';
    });
    
    playAgainBtn.addEventListener('click', () => {
        playSfx(audio.ui);
        gameOverModal.style.display = 'none';
        introModal.style.display = 'flex';
    });
    
    modalGameMode.addEventListener('change', (e) => {
        const mode = e.target.value;
        if (mode === 'pvc') {
            modalDifficultyGroup.style.display = 'flex';
            p2InputGroup.style.display = 'none';
        } else {
            modalDifficultyGroup.style.display = 'none';
            p2InputGroup.style.display = 'flex';
        }
    });

    startNewGame();
}

function startNewGame() {
    // Reset State
    // Preserve game settings
    const currentMode = state.gameMode;
    const currentDifficulty = state.difficulty;
    const currentNames = { ...state.playerNames };

    state.currentPlayer = 1;
    state.scores = { 1: 0, 2: 0 };
    state.lines = {};
    state.boxes = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    state.isGameOver = false;
    state.isComputerTurn = false;
    
    // Restore settings
    state.gameMode = currentMode;
    state.difficulty = currentDifficulty;
    state.playerNames = currentNames;

    // Update UI
    p1ScoreEl.textContent = '0';
    p2ScoreEl.textContent = '0';
    
    // Set names in UI
    document.getElementById('p1-name').textContent = state.playerNames[1];
    document.getElementById('p2-name').textContent = state.playerNames[2];
    
    document.querySelector('.player1').classList.add('active');
    document.querySelector('.player2').classList.remove('active');
    currentPlayerNameEl.textContent = state.playerNames[1];
    gameOverModal.style.display = 'none';

    renderBoard();
}

function renderBoard() {
    // Clear board
    boardEl.innerHTML = '';
    
    // Create grid
    // Grid template: (ROWS+1) rows, (COLS+1) columns
    // We need to place dots, horizontal lines, vertical lines, and boxes
    
    // Set up grid layout
    // Use fixed sizes for stability
    const { DOT_SIZE, BOX_SIZE, PADDING } = getMetrics();
    
    // Clear existing content
    boardEl.innerHTML = '';
    
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, ${DOT_SIZE}px ${BOX_SIZE}px) ${DOT_SIZE}px`;
    boardEl.style.gridTemplateRows = `repeat(${ROWS}, ${DOT_SIZE}px ${BOX_SIZE}px) ${DOT_SIZE}px`;
    boardEl.style.padding = `${PADDING}px`;

    // Generate grid items
    for (let r = 0; r <= ROWS; r++) {
        for (let c = 0; c <= COLS; c++) {
            // Dot
            const dot = document.createElement('div');
            dot.classList.add('dot');
            dot.style.gridRow = r * 2 + 1;
            dot.style.gridColumn = c * 2 + 1;
            boardEl.appendChild(dot);
            
            // Horizontal Line (right of dot, except last col)
            if (c < COLS) {
                const lineH = document.createElement('div');
                lineH.classList.add('line-h');
                lineH.id = `h-${r}-${c}`;
                lineH.dataset.r = r;
                lineH.dataset.c = c;
                lineH.dataset.type = 'h';
                lineH.style.gridRow = r * 2 + 1;
                lineH.style.gridColumn = c * 2 + 2;
                lineH.addEventListener('click', handleLineClick);
                boardEl.appendChild(lineH);
            }
            
            // Vertical Line (below dot, except last row)
            if (r < ROWS) {
                const lineV = document.createElement('div');
                lineV.classList.add('line-v');
                lineV.id = `v-${r}-${c}`;
                lineV.dataset.r = r;
                lineV.dataset.c = c;
                lineV.dataset.type = 'v';
                lineV.style.gridRow = r * 2 + 2;
                lineV.style.gridColumn = c * 2 + 1;
                lineV.addEventListener('click', handleLineClick);
                boardEl.appendChild(lineV);
            }
            
            // Box (below and right of dot, except last row/col)
            if (r < ROWS && c < COLS) {
                const box = document.createElement('div');
                box.classList.add('box');
                box.id = `box-${r}-${c}`;
                box.style.gridRow = r * 2 + 2;
                box.style.gridColumn = c * 2 + 2;
                boardEl.appendChild(box);
            }
        }
    }

    requestAnimationFrame(scaleBoard);
}

function handleLineClick(e) {
    if (state.isGameOver || state.isInputLocked || (state.gameMode === 'pvc' && state.isComputerTurn && e.isTrusted)) {
        return; // Prevent clicks during computer turn, game over, or input lock
    }

    const line = e.target;
    const lineId = line.id;

    processMove(lineId);
}

function processMove(lineId) {
    if (state.lines[lineId]) return; // Already taken

    // Mark line as taken
    state.lines[lineId] = state.currentPlayer;
    const lineEl = document.getElementById(lineId);
    lineEl.classList.add('taken');
    lineEl.classList.add(state.currentPlayer === 1 ? 'p1' : 'p2');

    // Handle last computer move highlight
    if (state.gameMode === 'pvc') {
        // If it's computer's turn, add highlight
        if (state.currentPlayer === 2) {
            // Remove previous highlight
            const prev = document.querySelector('.last-computer-move');
            if (prev) prev.classList.remove('last-computer-move');
            
            // Add new highlight
            lineEl.classList.add('last-computer-move');
            
            // Trigger sparkle effect
            createSparkles(lineEl);
        } 
        // If player moves, we can either clear it or keep it until next computer move.
        // User asked for "Computer's last line", implies it should stay visible as "last move made by computer"
        // regardless of player's subsequent moves, until computer moves again.
        // So we do nothing here for player 1.
    } else {
        // In PvP, maybe we don't need this, or we could highlight last move generally.
        // But request was specific to computer.
    }

    // Check for completed boxes
    const completedBoxes = checkCompletedBoxes(lineId);

    if (completedBoxes.length > 0) {
        playSfx(audio.box);
        // Player gets points and keeps turn
        completedBoxes.forEach(box => {
            const { r, c } = box;
            state.boxes[r][c] = state.currentPlayer;
            const boxEl = document.getElementById(`box-${r}-${c}`);
            boxEl.classList.add(state.currentPlayer === 1 ? 'p1' : 'p2');
            state.scores[state.currentPlayer]++;
        });

        updateScoreboard();
        checkGameOver();

        // If PvC and it's computer's turn, it continues playing
        if (!state.isGameOver && state.gameMode === 'pvc' && state.currentPlayer === 2) {
             setTimeout(computerMove, 500);
        }
    } else {
        playSfx(audio.line);
        // Switch turn
        switchTurn();
    }
}

function checkCompletedBoxes(lineId) {
    // lineId is like 'h-r-c' or 'v-r-c'
    const parts = lineId.split('-');
    const type = parts[0];
    const r = parseInt(parts[1]);
    const c = parseInt(parts[2]);
    
    const completed = [];

    // Helper to check if a specific box is completed
    const isBoxCompleted = (br, bc) => {
        if (br < 0 || bc < 0 || br >= ROWS || bc >= COLS) return false;
        // Box needs: h-br-bc, h-(br+1)-bc, v-br-bc, v-br-(bc+1)
        const top = state.lines[`h-${br}-${bc}`];
        const bottom = state.lines[`h-${br+1}-${bc}`];
        const left = state.lines[`v-${br}-${bc}`];
        const right = state.lines[`v-${br}-${bc+1}`];
        return top && bottom && left && right;
    };

    if (type === 'h') {
        // Horizontal line affects box above (r-1, c) and box below (r, c)
        if (isBoxCompleted(r - 1, c)) completed.push({ r: r - 1, c });
        if (isBoxCompleted(r, c)) completed.push({ r, c });
    } else {
        // Vertical line affects box left (r, c-1) and box right (r, c)
        if (isBoxCompleted(r, c - 1)) completed.push({ r, c: c - 1 });
        if (isBoxCompleted(r, c)) completed.push({ r, c });
    }

    return completed;
}

function switchTurn() {
    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
    
    // Update UI
    document.querySelector('.player1').classList.toggle('active');
    document.querySelector('.player2').classList.toggle('active');
    
    if (state.gameMode === 'pvc') {
        currentPlayerNameEl.textContent = state.currentPlayer === 1 ? state.playerNames[1] : 'Bilgisayar';
        if (state.currentPlayer === 2) {
            state.isComputerTurn = true;
            setTimeout(computerMove, 500);
        } else {
            state.isComputerTurn = false;
        }
    } else {
        currentPlayerNameEl.textContent = state.playerNames[state.currentPlayer];
    }
}

function updateScoreboard() {
    p1ScoreEl.textContent = state.scores[1];
    p2ScoreEl.textContent = state.scores[2];
}

function checkGameOver() {
    const totalBoxes = ROWS * COLS;
    const takenBoxes = state.scores[1] + state.scores[2];
    
    if (takenBoxes === totalBoxes) {
        state.isGameOver = true;
        let message = '';
        if (state.scores[1] > state.scores[2]) {
            message = `${state.playerNames[1]} Kazandı!`;
        } else if (state.scores[2] > state.scores[1]) {
            message = `${state.playerNames[2]} Kazandı!`;
        } else {
            message = 'Berabere!';
        }
        winnerText.textContent = message;
        
        // Show final scores
        finalP1Name.textContent = state.playerNames[1];
        finalP1Score.textContent = state.scores[1];
        finalP2Name.textContent = state.playerNames[2];
        finalP2Score.textContent = state.scores[2];
        
        gameOverModal.style.display = 'flex';
    }
}

// AI Logic
function computerMove() {
    if (state.isGameOver || state.gameMode !== 'pvc' || state.currentPlayer !== 2) return;

    let move = null;
    const availableMoves = getAvailableMoves();

    if (availableMoves.length === 0) return;

    if (state.difficulty === 'easy') {
        // 1. Take box if available (Opportunistic but not strategic defense)
        move = findMoveToCompleteBox();

        if (!move) {
            // Random move if no box to take
            move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        }
    } else if (state.difficulty === 'medium') {
        // 1. Take box if available
        // 2. Try to avoid giving boxes (unlike Easy) but without complex lookahead (unlike Hard)
        move = findMoveToCompleteBox();
        
        if (!move) {
            // Find safe moves
            const safeMoves = availableMoves.filter(m => !doesMoveGiveBox(m));
            if (safeMoves.length > 0) {
                // Pick a random safe move
                move = safeMoves[Math.floor(Math.random() * safeMoves.length)];
            } else {
                // If no safe moves, forced to give a box. Just pick random (don't minimize damage like Hard).
                move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            }
        }
    } else if (state.difficulty === 'hard') {
        // 1. Take box if available (Greedy)
        move = findMoveToCompleteBox();
        
        if (!move) {
            // 2. Find safe moves (moves that don't let opponent complete a box)
            const safeMoves = availableMoves.filter(m => !doesMoveGiveBox(m));
            
            if (safeMoves.length > 0) {
                // Pick a random safe move
                move = safeMoves[Math.floor(Math.random() * safeMoves.length)];
            } else {
                // 3. Forced to give a box. Try to minimize damage.
                // Find a move that gives the FEWEST boxes.
                // Simple heuristic: pick random. Advanced: lookahead.
                // For now, let's just pick random as "forced error".
                // Improvement: Prioritize moves that give only 1 box vs 2 boxes?
                // Or maybe specific pattern avoidance.
                
                // Let's implement "Least Bad Move":
                // Count how many boxes each move gives.
                let bestBadMove = null;
                let minGiven = 999;
                
                for (const m of availableMoves) {
                    const given = countGivenBoxes(m);
                    if (given < minGiven) {
                        minGiven = given;
                        bestBadMove = m;
                    }
                }
                move = bestBadMove || availableMoves[Math.floor(Math.random() * availableMoves.length)];
            }
        }
    }

    if (move) {
        processMove(move);
    }
}

function countGivenBoxes(move) {
    // Simulate move
    state.lines[move] = state.currentPlayer;
    
    let count = 0;
    const parts = move.split('-');
    const type = parts[0];
    const r = parseInt(parts[1]);
    const c = parseInt(parts[2]);

    const boxesToCheck = [];
    if (type === 'h') {
        if (r > 0) boxesToCheck.push({ r: r - 1, c });
        if (r < ROWS) boxesToCheck.push({ r, c });
    } else {
        if (c > 0) boxesToCheck.push({ r, c: c - 1 });
        if (c < COLS) boxesToCheck.push({ r, c });
    }

    for (const box of boxesToCheck) {
        if (countLinesInBox(box.r, box.c) === 4) { // Becomes 4 (complete) for opponent?
             // Wait, doesMoveGiveBox checks if it becomes 3 (so opponent can take).
             // If we take a line, and a box becomes 3 lines, opponent takes it.
             // If it becomes 4 lines, WE took it (handled by findMoveToCompleteBox).
             // So here we only care about 3.
        }
        if (countLinesInBox(box.r, box.c) === 3) {
            count++;
        }
    }
    
    delete state.lines[move];
    return count;
}

function createSparkles(element) {
    // element is the line div inside the board
    // We need the center position relative to the board's coordinate system (unscaled)
    // Since board has position: relative, offsetLeft/Top gives position relative to board's padding box
    
    const centerX = element.offsetLeft + element.offsetWidth / 2;
    const centerY = element.offsetTop + element.offsetHeight / 2;
    
    // Create particles
    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
        const sparkle = document.createElement('div');
        sparkle.classList.add('sparkle');
        
        // Random position near center
        // Center the 4px sparkle
        sparkle.style.left = `${centerX - 2}px`;
        sparkle.style.top = `${centerY - 2}px`;
        sparkle.style.pointerEvents = 'none';
        
        // Random direction and distance
        const angle = Math.random() * Math.PI * 2;
        const velocity = 20 + Math.random() * 40; // distance to fly
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        sparkle.style.setProperty('--tx', `${tx}px`);
        sparkle.style.setProperty('--ty', `${ty}px`);
        
        // Random color variation (white to magenta)
        if (Math.random() > 0.5) {
            sparkle.style.backgroundColor = 'var(--secondary-neon)';
            sparkle.style.boxShadow = '0 0 10px var(--secondary-neon)';
        }
        
        boardEl.appendChild(sparkle);
        
        // Cleanup
        setTimeout(() => {
            sparkle.remove();
        }, 800);
    }
}

function getAvailableMoves() {
    const moves = [];
    // Horizontal
    for (let r = 0; r <= ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!state.lines[`h-${r}-${c}`]) moves.push(`h-${r}-${c}`);
        }
    }
    // Vertical
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= COLS; c++) {
            if (!state.lines[`v-${r}-${c}`]) moves.push(`v-${r}-${c}`);
        }
    }
    return moves;
}

function findMoveToCompleteBox() {
    const moves = getAvailableMoves();
    for (const move of moves) {
        // Temporarily mark the line to simulate the move
        state.lines[move] = state.currentPlayer;
        
        const completed = checkCompletedBoxes(move).length > 0;
        
        // Revert the simulation
        delete state.lines[move];
        
        if (completed) {
            return move;
        }
    }
    return null;
}

function doesMoveGiveBox(move) {
    // Simulate move: if we take this line, does any adjacent box become 3-sided?
    // Meaning, after our move, does any box have 3 lines?
    // If a box has 3 lines, the opponent can take it.
    
    // Note: This function checks if making 'move' creates a situation where a box has 3 lines.
    // BUT, we must be careful. If 'move' completes a box for US, that's good (handled by findMoveToCompleteBox).
    // Here we assume 'move' does NOT complete a box for us (since we checked that first).
    // We want to know if it sets up the opponent.
    
    // Temporarily mark the line
    state.lines[move] = true;

    let givesBox = false;
    
    // Check adjacent boxes to this line
    const parts = move.split('-');
    const type = parts[0];
    const r = parseInt(parts[1]);
    const c = parseInt(parts[2]);

    const boxesToCheck = [];
    if (type === 'h') {
        if (r > 0) boxesToCheck.push({ r: r - 1, c });
        if (r < ROWS) boxesToCheck.push({ r, c });
    } else {
        if (c > 0) boxesToCheck.push({ r, c: c - 1 });
        if (c < COLS) boxesToCheck.push({ r, c });
    }

    for (const box of boxesToCheck) {
        if (countLinesInBox(box.r, box.c) === 3) { // If it becomes 3, opponent can take it
            givesBox = true;
            break;
        }
    }

    // Unmark
    delete state.lines[move];
    
    return givesBox;
}

function countLinesInBox(r, c) {
    let count = 0;
    if (state.lines[`h-${r}-${c}`]) count++;
    if (state.lines[`h-${r+1}-${c}`]) count++;
    if (state.lines[`v-${r}-${c}`]) count++;
    if (state.lines[`v-${r}-${c+1}`]) count++;
    return count;
}

// Start
init();
