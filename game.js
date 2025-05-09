// Get the canvas element and its context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings (placeholders)
const TILE_SIZE = 32; // Example tile size for pixel art
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Game State
let gameOver = false;
let gameRestartTimer = 0;
const GAME_RESTART_DELAY = 180; // 3 seconds at 60fps
let isPaused = false;
let mouseX = 0;
let mouseY = 0;

// Player state (placeholders)
let player = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    width: TILE_SIZE,
    height: TILE_SIZE,
    // color: 'blue', // No longer used for player visual
    speed: 5,
    maxHealth: 10,
    health: 10, // Will be set by resetGame
    level: 1,
    xp: 0,
    xpToNextLevel: 10, // XP needed for the first level up
    
    // Attack properties
    isAttacking: false,
    attackAngleStart: 0,       // The starting angle of the sweep
    swordSweepAngle: Math.PI * 0.8, // How wide the sweep is (e.g., 144 degrees)
    swordLength: TILE_SIZE * 2.5,   // Sword length relative to player size
    attackDurationMax: 20,     // Frames for the attack animation (e.g., 1/3 second at 60fps)
    attackTimer: 0,            // Countdown for current attack duration
    attackCooldownMax: 45,     // Frames for cooldown (e.g., 0.75 seconds)
    attackCooldownTimer: 0,    // Countdown for cooldown

    // Direction facing (for attack orientation)
    lastDx: 1, // Default facing right (normalized)
    lastDy: 0
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
        radius: Math.random() * 3 + 3, // Sludge particles can be a bit larger
        color: `hsl(${Math.random() * 40 + 70}, ${Math.random() * 30 + 40}%, ${Math.random() * 20 + 20}%)`, // Murky greens/browns
        xpValue: PARTICLE_XP_VALUE,
        speed: Math.random() * 0.75 + 0.25 // Sludge speed
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
    ArrowRight: false,
    // ' ': false, // Spacebar no longer for direct attack trigger
    'Enter': false,
    'p': false 
};

function handleKeyDown(event) {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = true;
    }

    // Toggle pause with 'P'
    if (event.key.toLowerCase() === 'p') {
        isPaused = !isPaused;
        console.log(isPaused ? "Game Paused" : "Game Resumed");
    }

    // Unpause with Space or Enter if game is paused
    if (isPaused) {
        if (event.key === ' ' || event.key === 'Enter') {
            isPaused = false;
            console.log("Game Resumed by Space/Enter");
        }
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
    canvas.addEventListener('mousemove', handleMouseMove);

    resetGame(); // Initialize game state
    gameLoop(); // Start the game loop
}

function resetGame() {
    player.x = GAME_WIDTH / 2 - player.width / 2;
    player.y = GAME_HEIGHT / 2 - player.height / 2;
    player.health = player.maxHealth;
    player.level = 1;
    player.xp = 0;
    player.xpToNextLevel = 10;
    player.isAttacking = false;
    player.attackTimer = 0;
    player.attackCooldownTimer = 0;
    player.lastDx = 1; // Default facing right
    player.lastDy = 0;

    particles = [];
    // Spawn some initial particles
    for(let i = 0; i < MAX_PARTICLES / 2; i++) {
        if (particles.length < MAX_PARTICLES) {
            particles.push(createParticle());
        }
    }

    gameOver = false;
    gameRestartTimer = 0;
    console.log("Game Reset/Started.");
}

function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
}

// Update game state
function update() {
    if (isPaused) {
        return; // Skip all game logic if paused
    }

    if (gameOver) {
        gameRestartTimer--;
        if (gameRestartTimer <= 0) {
            resetGame(); // This will set gameOver to false
        }
        return; // Skip game logic updates while game over screen is shown
    }

    // Player movement
    let moveX = 0;
    let moveY = 0;
    if (keys.w || keys.ArrowUp) {
        moveY -= player.speed;
    }
    if (keys.s || keys.ArrowDown) {
        moveY += player.speed;
    }
    if (keys.a || keys.ArrowLeft) {
        moveX -= player.speed;
    }
    if (keys.d || keys.ArrowRight) {
        moveX += player.speed;
    }

    player.x += moveX;
    player.y += moveY;

    if (moveX !== 0 || moveY !== 0) {
        // Normalize last direction vector for consistent attack orientation
        const magnitude = Math.hypot(moveX, moveY);
        // Update lastDx, lastDy only if there was actual movement, 
        // and normalize it for consistent direction vector.
        if (magnitude > 0) { 
            player.lastDx = moveX / magnitude;
            player.lastDy = moveY / magnitude;
        }
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

    // Sludge Particle Movement (Attraction to Player)
    const playerCenterXForSludge = player.x + player.width / 2;
    const playerCenterYForSludge = player.y + player.height / 2;
    for (const particle of particles) {
        const dx = playerCenterXForSludge - particle.x;
        const dy = playerCenterYForSludge - particle.y;
        const dist = Math.hypot(dx, dy);
        if (dist > particle.radius) { // Move if not already on top / very close
            particle.x += (dx / dist) * particle.speed;
            particle.y += (dy / dist) * particle.speed;
        }
    }

    // Attack Cooldown
    if (player.attackCooldownTimer > 0) {
        player.attackCooldownTimer--;
    }

    // Attack Cooldown
    if (player.attackCooldownTimer > 0) {
        player.attackCooldownTimer--;
    }

    // Auto Attack Initiation
    if (!player.isAttacking && player.attackCooldownTimer <= 0) {
        player.isAttacking = true;
        player.attackTimer = player.attackDurationMax;
        player.attackCooldownTimer = player.attackCooldownMax;

        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        
        let targetDx = player.lastDx; // Default to last movement direction
        let targetDy = player.lastDy;

        // Prioritize mouse direction
        const dxToMouse = mouseX - playerCenterX;
        const dyToMouse = mouseY - playerCenterY;
        const distToMouse = Math.hypot(dxToMouse, dyToMouse);

        if (distToMouse > 0) { // Use mouse if it provides a valid direction
            targetDx = dxToMouse / distToMouse;
            targetDy = dyToMouse / distToMouse;
        }
        
        const baseAngle = Math.atan2(targetDy, targetDx);
        player.attackAngleStart = baseAngle - player.swordSweepAngle / 2;
    }

    // Update Active Attack & Sword Collision
    if (player.isAttacking) {
        player.attackTimer--;

        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        
        const attackProgress = 1 - (player.attackTimer / player.attackDurationMax);
        // Ensure attackProgress doesn't exceed 1 due to floating point, cap at full sweep
        const currentSweepPortion = Math.min(attackProgress, 1) * player.swordSweepAngle;
        const currentSweepEndAngle = player.attackAngleStart + currentSweepPortion;

        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const dx_particle = particle.x - playerCenterX;
            const dy_particle = particle.y - playerCenterY;
            const distToPlayer = Math.hypot(dx_particle, dy_particle);

            // Check if particle is within sword's reach and outside player's immediate body
            if (distToPlayer <= player.swordLength && distToPlayer > player.width / 2) {
                let particleAngle = Math.atan2(dy_particle, dx_particle);

                // Normalize angles to be in [0, 2*PI) for consistent comparison
                let normAttackAngleStart = (player.attackAngleStart % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
                let normCurrentSweepEndAngle = (currentSweepEndAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
                let normParticleAngle = (particleAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
                
                let isHit = false;
                if (normAttackAngleStart <= normCurrentSweepEndAngle) { // Normal sweep (doesn't cross the 0 radian line)
                    if (normParticleAngle >= normAttackAngleStart && normParticleAngle <= normCurrentSweepEndAngle) {
                        isHit = true;
                    }
                } else { // Sweep crosses 0 (e.g., from 350deg to 10deg)
                    if (normParticleAngle >= normAttackAngleStart || normParticleAngle <= normCurrentSweepEndAngle) {
                        isHit = true;
                    }
                }
                
                if (isHit) {
                    player.xp += particle.xpValue;
                    particles.splice(i, 1); 

                    if (player.xp >= player.xpToNextLevel) {
                        player.level++;
                        player.xp -= player.xpToNextLevel;
                        player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.5);
                        console.log(`Level Up! Reached level ${player.level}. Next level at ${player.xpToNextLevel} XP.`);
                    }
                }
            }
        }

        if (player.attackTimer <= 0) {
            player.isAttacking = false;
        }
    }

    // Collision detection: player (vacuum body) vs particles
    const playerBodyCenterX = player.x + player.width / 2;
    const playerBodyCenterY = player.y + player.height / 2;
    const playerBodyRadius = player.width / 2;

    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        const distToParticleX = particle.x - playerBodyCenterX;
        const distToParticleY = particle.y - playerBodyCenterY;
        const distanceToParticle = Math.hypot(distToParticleX, distToParticleY);

        // Check for collision between player (circle) and particle (circle)
        if (distanceToParticle < playerBodyRadius + particle.radius) {
            player.health -= 1; // Sludge deals 1 damage
            particles.splice(i, 1); // Remove collided particle

            console.log(`Player hit by sludge! Health: ${player.health}`);

            if (player.health <= 0) {
                player.health = 0; // Prevent health from displaying as negative
                gameOver = true;
                gameRestartTimer = GAME_RESTART_DELAY;
                console.log("Game Over!");
                // The game over state will be handled at the start of the next update()
                // and render() will show the game over message.
                // No need to return here, let the frame finish.
            }
            // Note: XP is gained via sword, not direct collision that causes damage.
        }
    }
}

// Render game
function render() {
    // Clear canvas
    ctx.fillStyle = '#111'; // Background color from CSS
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (isPaused && !gameOver) { // Show pause screen, but not if game over is also active
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.font = '48px "Courier New", Courier, monospace';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);
        ctx.font = '24px "Courier New", Courier, monospace';
        ctx.fillText('Press P, Space, or Enter to Resume', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
        return; // Don't render the game scene if paused
    }

    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; // Dark overlay
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.font = '48px "Courier New", Courier, monospace';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);
        
        ctx.font = '24px "Courier New", Courier, monospace';
        ctx.fillStyle = 'white';
        ctx.fillText(`Restarting in ${Math.ceil(gameRestartTimer / 60)}s...`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
    } else {
        // Draw particles
        for (const particle of particles) {
            ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw player (Robot Vacuum)
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    const radius = player.width / 2; // Assuming player.width and player.height are similar for a round vacuum

    // Main body of the vacuum (dark grey)
    ctx.fillStyle = '#444444'; // Dark grey
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Top "sensor" or "lid" detail (slightly lighter grey)
    ctx.fillStyle = '#666666'; // Lighter grey
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // A small "light" or "indicator" (optional, bright color)
    ctx.fillStyle = '#FFD700'; // Gold/Yellow light
    ctx.beginPath();
    ctx.arc(centerX, centerY - radius * 0.3, radius * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Draw Sword Attack
    if (player.isAttacking) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        const attackProgress = 1 - (player.attackTimer / player.attackDurationMax);
        // Ensure attackProgress doesn't exceed 1, cap at full sweep for rendering
        const currentSweepPortion = Math.min(attackProgress, 1) * player.swordSweepAngle;
        const animatedSweepEndAngle = player.attackAngleStart + currentSweepPortion;

        ctx.beginPath();
        ctx.moveTo(playerCenterX, playerCenterY);
        ctx.arc(playerCenterX, playerCenterY, player.swordLength, player.attackAngleStart, animatedSweepEndAngle);
        ctx.closePath(); // Creates a pie slice shape

        ctx.fillStyle = 'rgba(0, 220, 220, 0.5)'; // Bright cyan, semi-transparent
        ctx.fill();
    }

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

    // Draw Health Bar & Text
    const healthBarWidth = 200;
    const healthBarHeight = 10;
    const healthBarX = 10;
    const healthBarY = xpBarY + xpBarHeight + 20 + 15; // Position below XP info text
    const currentHealthProgress = (player.health / player.maxHealth) * healthBarWidth;

    ctx.strokeStyle = '#888'; // Border for health bar
    ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    
    ctx.fillStyle = '#f00'; // Red fill for health progress
    ctx.fillRect(healthBarX, healthBarY, Math.max(0, currentHealthProgress), healthBarHeight); // Use Math.max to prevent negative width if health < 0
    
    ctx.fillStyle = 'white';
    ctx.fillText(`Health: ${player.health} / ${player.maxHealth}`, 10, healthBarY + healthBarHeight + 15);
    } // End of the "else" block for non-gameOver rendering
}

// Main game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop); // For smooth animation
}

// Start the game
init();
