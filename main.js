//import { Application, Container, Graphics } from 'https://cdn.jsdelivr.net/npm/pixi.js@8.10.1/dist/pixi.min.mjs';
import { Application, Container, Graphics } from './js/pixi.js';
import { generateInfo } from './js/gen.js';
import { getColorsList } from './js/colorsPlain.js';
import { checkWon } from './js/checkwon.js';

// --- Configuration Constants ---
const CANVAS_SIZE = Math.max(window.innerWidth, window.innerHeight);
let GRID_SIZE = 3;
let SQUARE_SIZE2 = CANVAS_SIZE / GRID_SIZE * 0.95;
let SQUARE_SPACING = 0.025 * SQUARE_SIZE2;
let SQUARE_SIZE = SQUARE_SIZE2 - 2 * SQUARE_SPACING; // Adjusted to fit spacing
const ANIMATION_DURATION = 100; // ms for swap animation (reduced for speed)
const BORDER_THICKNESS = 4;
const BORDER_COLOR = "0xFFD700"; // Gold
let MENU_OPEN = false;
let KEYBINDS = {
    move_left: ['ArrowLeft', 'a'],
    move_right: ['ArrowRight', 'd'],
    move_up: ['ArrowUp', 'w'],
    move_down: ['ArrowDown', 's'],
    resetGame: [' '],
    toggleSettings: ['q']
}

// --- Game State ---
const gameState = {
    squares: [], // 2D array of square Graphics objects
    data: null, // Grid data from gen.js
    colors: [], // Color palette
    activeCoords: { x: 0, y: 0 }, // Grid position of the active square
    activeBorder: null, // The border graphic for the active square
    isSwapping: false, // Flag to prevent input during animation
    currentAnimation: null, // Holds details of the active animation for interruption.
    moves: 1, // Count of moves made
    startTime: Date.now(), // Start time for the game
};

// --- PIXI App Setup ---
const app = new Application();
await app.init({ background: '#121212', width: CANVAS_SIZE,
    height: CANVAS_SIZE, /*preference: 'webgpu'*/});
document.getElementById("game").appendChild(app.canvas);

const container = new Container();
app.stage.addChild(container);

/**
 * Initializes the game, creates the grid, and sets up controls.
 */
async function init() {
    //gameState.data = generateInfo(GRID_SIZE, Math.floor(Math.random() * 1000));
    gameState.data = generateInfo(GRID_SIZE); // Use a fixed seed for consistent results
    gameState.colors = getColorsList(GRID_SIZE);

    // Calculate initial active square coordinates from the 1D index
    const moveIndex = gameState.data.move;
    gameState.activeCoords.x = moveIndex % GRID_SIZE;
    gameState.activeCoords.y = Math.floor(moveIndex / GRID_SIZE);

    createGrid();
    createActiveBorder();

    // Center the grid on the screen
    container.x = app.screen.width / 2;
    container.y = app.screen.height / 2;
    container.pivot.x = container.width / 2;
    container.pivot.y = container.height / 2;

    window.addEventListener('keydown', handleKeyDown);
}

/**
 * Creates the visual grid of squares based on game state.
 */
function createGrid() {
    for (let y = 0; y < GRID_SIZE; y++) {
        gameState.squares[y] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            const colorIndex = gameState.data.data[y * GRID_SIZE + x];
            const square = new Graphics()
                .rect(0, 0, SQUARE_SIZE, SQUARE_SIZE)
                .fill(gameState.colors[colorIndex])
                .stroke({ width: 4, color: "black" });

            square.x = x * (SQUARE_SIZE + SQUARE_SPACING);
            square.y = y * (SQUARE_SIZE + SQUARE_SPACING);

            container.addChild(square);
            gameState.squares[y][x] = {object: square, color: gameState.colors[colorIndex]};
        }
    }
}

/**
 * Creates and animates the border for the active square.
 */
function createActiveBorder() {
    const border = new Graphics()
        .roundRect(
            -BORDER_THICKNESS / 2,
            -BORDER_THICKNESS / 2,
            SQUARE_SIZE + BORDER_THICKNESS,
            SQUARE_SIZE + BORDER_THICKNESS,
            8
        )
        .stroke({ width: BORDER_THICKNESS, color: BORDER_COLOR });

    // Set pivot to the center for clean scaling animation
    border.pivot.set(SQUARE_SIZE / 2, SQUARE_SIZE / 2);
    gameState.activeBorder = border;
    updateBorderPosition();
    container.addChild(border);

    // Add a more dynamic pulsing animation to the border
    app.ticker.add((time) => {
        const pulse = Math.sin(time.lastTime * 0.01);
        const alpha = 0.75 + pulse * 0.2;
        const scale = 1.0 + pulse * 0.05;
        border.alpha = alpha;
        border.scale.set(scale);
    });
}

/**
 * Moves the active border to the current active square's position.
 */
function updateBorderPosition() {
    const activeSquare = gameState.squares[gameState.activeCoords.y][gameState.activeCoords.x].object;
    // Adjust position to account for the center pivot
    gameState.activeBorder.x = activeSquare.x + SQUARE_SIZE / 2;
    gameState.activeBorder.y = activeSquare.y + SQUARE_SIZE / 2;
}

/**
 * Instantly completes the currently running swap animation.
 */
function completeCurrentAnimation() {
    if (!gameState.currentAnimation) return;

    const anim = gameState.currentAnimation;

    // 1. Stop the animation loop
    app.ticker.remove(anim.ticker);

    // 2. Snap the squares to their final visual positions
    anim.sq1.x = anim.pos2.x;
    anim.sq1.y = anim.pos2.y;
    anim.sq2.x = anim.pos1.x;
    anim.sq2.y = anim.pos1.y;

    // 3. Reset state and snap border to its final position
    updateBorderPosition();
    gameState.isSwapping = false;
    gameState.currentAnimation = null;
}

/**
 * Handles keyboard input for moving the active square.
 * @param {KeyboardEvent} e The keyboard event.
 */
function handleKeyDown(e) {
    for (const [action, keys] of Object.entries(KEYBINDS)) { for (const key of keys) {
        if (e.key.toLowerCase() === key.toLowerCase()) {
            if (action == 'move_left' || action == 'move_right' || action == 'move_up' || action == 'move_down') {
                if (MENU_OPEN) return;
                // If an animation is in progress, complete it instantly before starting the next one.
                if (gameState.isSwapping) {
                    completeCurrentAnimation();
                }

                const { x, y } = gameState.activeCoords;
                let targetX = x;
                let targetY = y;

                switch (action) {
                    case 'move_up':
                        targetY -= 1;
                        break;
                    case 'move_left':
                        targetX -= 1;
                        break;
                    case 'move_down':
                        targetY += 1;
                        break;
                    case 'move_right':
                        targetX += 1;
                        break;
                    default:
                        return; // Exit if it's not a movement key
                }
                handleAction('move', [targetX, targetY]);
                break;
            }
            handleAction(action);
            e.preventDefault();
            break;
        } else if (e.ctrlKey && e.key == 'r') {
            e.preventDefault();
            handleAction('resetGame');
            break;
        }
    }}
}

/**
 * Swaps two squares, updating both the data model and visual positions with animation.
 * @param {number} x1 Grid X of the first square (the active one).
 * @param {number} y1 Grid Y of the first square (the active one).
 * @param {number} x2 Grid X of the second square.
 * @param {number} y2 Grid Y of the second square.
 */
function swapSquares(x1, y1, x2, y2) {
    gameState.isSwapping = true;

    const sq1 = gameState.squares[y1][x1].object; // The active square being moved
    const sq2 = gameState.squares[y2][x2].object;

    const pos1 = { x: sq1.x, y: sq1.y };
    const pos2 = { x: sq2.x, y: sq2.y };

    // 1. Update the data array
    const idx1 = y1 * GRID_SIZE + x1;
    const idx2 = y2 * GRID_SIZE + x2;
    [gameState.data.data[idx1], gameState.data.data[idx2]] = [gameState.data.data[idx2], gameState.data.data[idx1]];

    // 2. Update the 2D squares array
    gameState.squares[y1][x1].object = sq2;
    gameState.squares[y2][x2].object = sq1;

    [gameState.squares[y1][x1].color, gameState.squares[y2][x2].color] = [gameState.squares[y2][x2].color, gameState.squares[y1][x1].color];

    // 3. Animate the visual swap
    let elapsed = 0;
    const tickerCallback = (ticker) => {
        elapsed += ticker.deltaMS;
        const t = Math.min(1, elapsed / ANIMATION_DURATION);
        const easedT = 1 - Math.pow(1 - t, 3); // easeOutCubic for a snappy feel

        // Interpolate positions
        sq1.x = pos1.x * (1 - easedT) + pos2.x * easedT;
        sq1.y = pos1.y * (1 - easedT) + pos2.y * easedT;
        sq2.x = pos2.x * (1 - easedT) + pos1.x * easedT;
        sq2.y = pos2.y * (1 - easedT) + pos1.y * easedT;

        // Move the border along with the active square (sq1)
        gameState.activeBorder.x = sq1.x + SQUARE_SIZE / 2;
        gameState.activeBorder.y = sq1.y + SQUARE_SIZE / 2;

        if (t >= 1) {
            app.ticker.remove(tickerCallback);
            updateBorderPosition(); // Snap border to final position
            gameState.isSwapping = false;
            gameState.currentAnimation = null; // Clear animation details on normal completion
        }
    };

    // Store animation details for potential interruption
    gameState.currentAnimation = {
        ticker: tickerCallback,
        sq1: sq1,
        sq2: sq2,
        pos1: pos1,
        pos2: pos2,
    };

    app.ticker.add(tickerCallback);
    if (checkWon(GRID_SIZE, gameState)) {
        let highScore = localStorage.getItem(`highscore-${GRID_SIZE}`) || Infinity;
        if (gameState.moves < highScore) {
            localStorage.setItem(`highscore-${GRID_SIZE}`, gameState.moves);
        }
        openMenu('win', 'Congratulations!');
        // use canvas confetti
        var end = Date.now() + (5 * 1000);
        function toHex(color) {
            const ctx = document.createElement('canvas').getContext('2d');
            ctx.fillStyle = color;
            return ctx.fillStyle;
        }
        let colors = gameState.colors.slice(0, GRID_SIZE).map(color => toHex(color));

        (function frame() {
            confetti({
                particleCount: 4,
                angle: -60,
                spread: 110,
                origin: { x: 0, y: 0 },
                shapes: ['square'],
                colors: [colors[Math.floor(Math.random() * colors.length)], colors[Math.floor(Math.random() * colors.length)]]
            });
            confetti({
                particleCount: 4,
                angle: -120,
                spread: 110,
                origin: { x: 1, y: 0 },
                shapes: ['square'],
                colors: [colors[Math.floor(Math.random() * colors.length)], colors[Math.floor(Math.random() * colors.length)]]
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
        dialog.querySelector('#win-details').innerHTML = `
            <p>You took <strong id="score">${gameState.moves}</strong> moves in <strong id="time">${(Date.now() - gameState.startTime) / 1000}</strong>.</p>
            <p>High Score: <strong id="hs">${localStorage.getItem(`highscore-${GRID_SIZE}`)}</strong></p>
            `
    }
}

// --- Start the game ---
init();

const dialog = document.getElementById('menu-dialog');
const menuTitle = dialog.querySelector('.menu-title');
const menuContent = dialog.querySelector('.menu-content');

function openMenu(type, title) {
    const template = document.getElementById(`template-${type}`);
    if (!template) return;

    // Clear previous content
    menuContent.innerHTML = '';
    // Set new title
    menuTitle.textContent = title;
    // Clone and append new content
    menuContent.append(template.content.cloneNode(true));

    // Show the dialog
    dialog.showModal();
    dialog.dataset.menu = type;
    MENU_OPEN = true;

    menuContent.querySelectorAll('[data-action]').forEach(button => {
        const action = button.getAttribute('data-action');
        button.addEventListener('click', () => handleAction(action, button));
    });
    menuContent.querySelectorAll('input[type="range"][data-action]').forEach(input => {
        const action = input.getAttribute('data-action');
        input.addEventListener('input', () => handleAction(action, input));
    });
}

function closeMenu() {
    dialog.close();
    MENU_OPEN = false;
}

document.querySelectorAll('[data-action]').forEach(button => {
        const action = button.getAttribute('data-action');
        button.addEventListener('click', () => handleAction(action, button));
});

function handleAction (action, data) {
    switch (action) {
        case 'move':
            let [targetX, targetY] = data;
            let { x, y } = gameState.activeCoords;

            // Boundary check
            if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE) {
                const currentActiveCoords = { x, y };
                gameState.activeCoords = { x: targetX, y: targetY }; // Update coords for the new move
                swapSquares(currentActiveCoords.x, currentActiveCoords.y, targetX, targetY);
                gameState.moves++; // Increment move count
            }
            break;
        case 'openMenu':
            const type = data.getAttribute('data-menu');
            const title = type.charAt(0).toUpperCase() + type.slice(1);
            openMenu(type, title);
            break;
        case 'closeMenu':
            closeMenu();
            break;
        case 'toggleSettings':
            if (MENU_OPEN) {
                if (dialog.dataset.menu === 'settings') {
                    closeMenu();
                }
            } else {
                openMenu('settings', 'Settings');
            }
            break;
        case 'resetGame':
            resetGame();
            break;
        case 'editSize':
            const newSize = parseInt(data.value, 10);
            if (newSize >= 3 && newSize <= 50) {
                GRID_SIZE = newSize;
                document.getElementById('board-size').textContent = `(${GRID_SIZE})`;
                resetGame();
            } else {
                console.warn(`Invalid grid size: ${newSize}. Must be between 3 and 50.`);
            }
            break;
        default:
            console.warn(`Unknown action: ${action}`);
    }
}

self.resetGame = function() {
    SQUARE_SIZE2 = CANVAS_SIZE / GRID_SIZE * 0.95;
    SQUARE_SPACING = 0.025 * SQUARE_SIZE2;
    SQUARE_SIZE = SQUARE_SIZE2 - 2 * SQUARE_SPACING;
    gameState.squares = [];
    gameState.data = generateInfo(GRID_SIZE);
    gameState.colors = getColorsList(GRID_SIZE);
    gameState.activeCoords = { x: 0, y: 0 };
    gameState.isSwapping = false;
    gameState.currentAnimation = null;
    gameState.moves = 1;
    gameState.startTime = Date.now();

    // Hide the win dialog if it's open
    if (MENU_OPEN && dialog.dataset.menu === 'win') {
        closeMenu();
    }

    // Recreate the grid and active border
    container.removeChildren();
    init();
}