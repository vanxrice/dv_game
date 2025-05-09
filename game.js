// Get the canvas element and its context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings (placeholders)
const TILE_SIZE = 32; // Example tile size for pixel art
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Player state (placeholders)
let player = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    width: TILE_SIZE,
    height: TILE_SIZE,
    color: 'blue', // Placeholder color
    speed: 5
};

// Input handling
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false
};

function handleKeyDown(event) {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = true;
    }
}

function handleKeyUp(event) {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = false;
    }
}

// Initialize game
function init() {
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    console.log("Game initialized");
    gameLoop(); // Start the game loop
}

// Update game state
function update() {
    // Player movement
    if (keys.w || keys.ArrowUp) {
        player.y -= player.speed;
    }
    if (keys.s || keys.ArrowDown) {
        player.y += player.speed;
    }
    if (keys.a || keys.ArrowLeft) {
        player.x -= player.speed;
    }
    if (keys.d || keys.ArrowRight) {
        player.x += player.speed;
    }

    // Keep player within canvas bounds (simple boundary check)
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > GAME_WIDTH) player.x = GAME_WIDTH - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > GAME_HEIGHT) player.y = GAME_HEIGHT - player.height;
}

// Render game
function render() {
    // Clear canvas
    ctx.fillStyle = '#111'; // Background color from CSS
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw player (simple rectangle for now)
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Placeholder for dynamic graphics and bright effects (to be added later)
    // Example: draw some bright particles
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 75%)`; // Bright, random color
        ctx.beginPath();
        ctx.arc(
            Math.random() * GAME_WIDTH,
            Math.random() * GAME_HEIGHT,
            Math.random() * 3 + 1, // Small radius
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

// Main game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop); // For smooth animation
}

// Start the game
init();
