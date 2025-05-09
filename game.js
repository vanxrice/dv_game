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
    speed: 5,
    level: 1,
    xp: 0,
    xpToNextLevel: 10 // XP needed for the first level up
};

// Particle system
let particles = [];
const MAX_PARTICLES = 30;
const PARTICLE_SPAWN_RATE = 0.05; // Chance to spawn a particle each frame
const PARTICLE_XP_VALUE = 1;

function createParticle() {
    return {
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        radius: Math.random() * 2 + 2, // Random size between 2 and 4
        color: `hsl(${Math.random() * 60 + 180}, 100%, 75%)`, // Shades of blue/cyan/purple for "bright"
        xpValue: PARTICLE_XP_VALUE
    };
}

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

    // Particle spawning
    if (particles.length < MAX_PARTICLES && Math.random() < PARTICLE_SPAWN_RATE) {
        particles.push(createParticle());
    }

    // Collision detection: player vs particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        // Simple AABB collision for player (rect) and particle (circle treated as point for simplicity)
        // A more accurate circle-rect collision would be better but this is a start
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        
        // Check if particle center is within player bounds
        if (particle.x > player.x && particle.x < player.x + player.width &&
            particle.y > player.y && particle.y < player.y + player.height) {
            
            player.xp += particle.xpValue;
            particles.splice(i, 1); // Remove collected particle

            // Check for level up
            if (player.xp >= player.xpToNextLevel) {
                player.level++;
                player.xp -= player.xpToNextLevel; // Or player.xp = 0 for no carry-over
                player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.5); // Increase XP needed for next level
                console.log(`Level Up! Reached level ${player.level}. Next level at ${player.xpToNextLevel} XP.`);
                // You could add a visual effect for level up here
            }
        }
    }
}

// Render game
function render() {
    // Clear canvas
    ctx.fillStyle = '#111'; // Background color from CSS
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw particles
    for (const particle of particles) {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw player (Mega Man-inspired basic sprite)
    const headHeight = player.height * 0.4;
    const bodyHeight = player.height * 0.6;
    const helmetWidth = player.width * 0.8;
    const helmetXOffset = (player.width - helmetWidth) / 2;

    // Body (darker blue)
    ctx.fillStyle = '#0077CC'; // A darker blue for the body
    ctx.fillRect(player.x, player.y + headHeight, player.width, bodyHeight);

    // Helmet/Head (lighter blue/cyan)
    ctx.fillStyle = '#00AADD'; // A lighter cyan/blue for the helmet
    ctx.fillRect(player.x + helmetXOffset, player.y, helmetWidth, headHeight);

    // Small detail for "face" area or visor (optional, very simple)
    ctx.fillStyle = '#FFFFFF'; // White for a small visor-like detail
    ctx.fillRect(player.x + helmetXOffset + helmetWidth * 0.2, player.y + headHeight * 0.2, helmetWidth * 0.6, headHeight * 0.3);


    // Draw UI (Level and XP)
    ctx.fillStyle = 'white';
    ctx.font = '16px "Courier New", Courier, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Level: ${player.level}`, 10, 25);
    
    // XP Bar
    const xpBarWidth = 200;
    const xpBarHeight = 10;
    const xpBarX = 10;
    const xpBarY = 35;
    const currentXpProgress = (player.xp / player.xpToNextLevel) * xpBarWidth;

    ctx.strokeStyle = '#888'; // Border for XP bar
    ctx.strokeRect(xpBarX, xpBarY, xpBarWidth, xpBarHeight);
    
    ctx.fillStyle = '#0f0'; // Fill for XP progress
    ctx.fillRect(xpBarX, xpBarY, currentXpProgress, xpBarHeight);
    
    ctx.fillStyle = 'white';
    ctx.fillText(`XP: ${player.xp} / ${player.xpToNextLevel}`, 10, xpBarY + xpBarHeight + 15);
}

// Main game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop); // For smooth animation
}

// Start the game
init();
