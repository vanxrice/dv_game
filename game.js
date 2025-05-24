// Get the canvas element and its context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings (placeholders)
const TILE_SIZE = 32; // Example tile size for pixel art
// Logical game dimensions for landscape mode
const LOGICAL_GAME_WIDTH_LANDSCAPE = 800;
const LOGICAL_GAME_HEIGHT_LANDSCAPE = 600;

// Current effective game dimensions and layout state
let currentLogicalGameWidth = LOGICAL_GAME_WIDTH_LANDSCAPE;
let currentLogicalGameHeight = LOGICAL_GAME_HEIGHT_LANDSCAPE;
const LEVEL_UP_PULSE_DURATION = 30; // Frames for the visual pulse (e.g., 0.5s at 60fps)
let isPortraitLayout = false;

// UI Font Sizes
const UI_FONT_SIZE_PRIMARY = '18px';
const UI_FONT_SIZE_SECONDARY = '16px';
const UI_FONT_TITLE_MAIN = '48px';
const UI_FONT_TITLE_SUB = '30px';
const UI_FONT_INSTRUCTION = '24px';
const UI_FONT_UPGRADE_NAME = '22px';
const UI_FONT_UPGRADE_INSTRUCTION = '18px';


// Game State
let gameOver = false;
let gameRestartTimer = 0;
const GAME_RESTART_DELAY = 180;
let isPaused = false;
let isUpgradeScreenActive = false;
let mouseX = 0;
let mouseY = 0;

// Visual Effects State
let screenShakeIntensity = 0;
let screenShakeDuration = 0;
let trailParticles = [];
let hitSparks = [];

// Upgrade System
let currentUpgradeChoices = [];
let upgradeChoiceAreas = [];

// Audio State
let audioContext;
let isAudioContextUnlocked = false;
let masterVolume = 0.3;
let isMusicEnabled = true;
let musicGainNode;
let backgroundMusicOscillators = [];

// Touch State
let touchStartX = 0;
let touchStartY = 0;
let currentTouchX = 0;
let currentTouchY = 0;
let isTouchActive = false;
const TOUCH_MOVE_THRESHOLD = TILE_SIZE * 0.3;

// Pause Button Area
const PAUSE_BUTTON_SIZE = 50;
let pauseButtonArea = {
    x: currentLogicalGameWidth - PAUSE_BUTTON_SIZE - 10,
    y: 10,
    width: PAUSE_BUTTON_SIZE,
    height: PAUSE_BUTTON_SIZE
};

// Player state
let player = {
    x: currentLogicalGameWidth / 2,
    y: currentLogicalGameHeight / 2,
    width: TILE_SIZE,
    height: TILE_SIZE,
    sprite: null,
    spriteLoaded: false,
    speed: 5,
    maxHealth: 10,
    health: 10,
    level: 1,
    xp: 0,
    xpToNextLevel: 10,
    xpMultiplier: 1,

    isAttacking: false,
    attackAngleStart: 0,
    swordSweepAngle: Math.PI * 0.8,
    swordLength: TILE_SIZE * 2.5,
    attackDurationMax: 20,
    attackTimer: 0,
    attackCooldownMax: 45,
    attackCooldownTimer: 0,

    lastDx: 1,
    lastDy: 0,
    currentMoveDx: 0,
    currentMoveDy: 0,

    isLevelUpPulseActive: false,
    levelUpPulseTimer: 0
};

// Particle systems
let particles = [];
const BASE_MAX_PARTICLES = 30;
const PARTICLES_PER_LEVEL_INCREASE = 5;
const PARTICLE_SPAWN_RATE = 0.05;

function createParticle(x, y, size = 1) {
    const newRadius = (size * 2) + 3;
    const newXpValue = size;
    const newDamage = size;
    const speed = Math.max(0.25, (Math.random() * 0.75 + 0.25) / (size * 0.5));
    return {
        x: x !== undefined ? x : Math.random() * currentLogicalGameWidth,
        y: y !== undefined ? y : Math.random() * currentLogicalGameHeight,
        size: size, damage: newDamage, radius: newRadius,
        color: `hsl(${Math.random() * 40 + 70}, ${Math.random() * 30 + 40}%, ${Math.random() * 20 + (20 * size)}%)`,
        xpValue: newXpValue, speed: speed
    };
}

function createTrailParticle(x, y) {
    return {
        x: x + player.width / 2 + (Math.random() - 0.5) * (player.width / 4),
        y: y + player.height / 2 + (Math.random() - 0.5) * (player.height / 4),
        size: Math.random() * 2 + 2,
        color: 'rgba(220, 220, 255, 0.4)',
        lifespan: 15 + Math.floor(Math.random() * 10),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3
    };
}

function createHitSpark(x, y, baseColor) {
    const sparkCount = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < sparkCount; i++) {
        hitSparks.push({
            x: x, y: y, size: Math.random() * 2.5 + 1,
            color: baseColor.replace(/hsl\(([^,]+),([^,]+),([^%]+)%\)/, (match, h, s, l) => `hsla(${h}, ${s}, ${Math.min(100, parseFloat(l) + 30)}%, ${0.6 + Math.random() * 0.4})`),
            lifespan: 20 + Math.floor(Math.random() * 10),
            vx: (Math.random() - 0.5) * 3.5,
            vy: (Math.random() - 0.5) * 3.5
        });
    }
}

// Input handling
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    'Enter': false, 'p': false
};

function handleKeyDown(event) {
    if (keys.hasOwnProperty(event.key)) keys[event.key] = true;
    if (typeof audioManager !== 'undefined' && !isAudioContextUnlocked && audioManager.unlockAudio) audioManager.unlockAudio();
    if (isUpgradeScreenActive) {
        if (currentUpgradeChoices && currentUpgradeChoices.length > 0) {
            if (event.key === '1') applySelectedUpgrade(0);
            else if (event.key === '2' && currentUpgradeChoices.length > 1) applySelectedUpgrade(1);
            else if (event.key === '3' && currentUpgradeChoices.length > 2) applySelectedUpgrade(2);
        }
        return;
    }
    if (event.key.toLowerCase() === 'p') { isPaused = !isPaused; console.log(isPaused ? "Game Paused" : "Game Resumed"); }
    if (event.key.toLowerCase() === 'm' && typeof audioManager !== 'undefined' && audioManager.startBackgroundMusic && audioManager.stopBackgroundMusic) {
        if (typeof isMusicEnabled !== 'undefined' && typeof audioContext !== 'undefined' && typeof isAudioContextUnlocked !== 'undefined') {
            isMusicEnabled = !isMusicEnabled;
            if (isMusicEnabled && audioContext && isAudioContextUnlocked) audioManager.startBackgroundMusic();
            else audioManager.stopBackgroundMusic();
            console.log(isMusicEnabled ? "Background Music ON" : "Background Music OFF");
        }
    }
    if (isPaused && (event.key === ' ' || event.key === 'Enter')) { isPaused = false; console.log("Game Resumed by Space/Enter"); }
}

function handleKeyUp(event) { if (keys.hasOwnProperty(event.key)) keys[event.key] = false; }

function init() {
    resizeCanvasAndGameLayout();
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    window.addEventListener('resize', resizeCanvasAndGameLayout);

    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        if (typeof audioContext === 'undefined' || !audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext && (typeof musicGainNode === 'undefined' || !musicGainNode) && audioContext.createGain) {
            musicGainNode = audioContext.createGain();
            if (musicGainNode && audioContext.destination) {
                musicGainNode.connect(audioContext.destination);
                musicGainNode.gain.setValueAtTime(0, audioContext.currentTime);
            }
        }
    } else {
        console.warn("Web Audio API is not supported by this browser (AudioContext not found).");
    }

    resetGame();
    player.sprite = new Image();
    player.sprite.onload = () => { player.spriteLoaded = true; console.log("Player sprite loaded."); };
    player.sprite.onerror = () => { console.error("Error loading player sprite."); };
    player.sprite.src = 'player_sprite.png';
    gameLoop();
}

function resizeCanvasAndGameLayout() {
    const newWindowWidth = window.innerWidth; const newWindowHeight = window.innerHeight;
    isPortraitLayout = newWindowHeight > newWindowWidth;
    currentLogicalGameWidth = isPortraitLayout ? LOGICAL_GAME_HEIGHT_LANDSCAPE : LOGICAL_GAME_WIDTH_LANDSCAPE;
    currentLogicalGameHeight = isPortraitLayout ? LOGICAL_GAME_WIDTH_LANDSCAPE : LOGICAL_GAME_HEIGHT_LANDSCAPE;
    canvas.width = currentLogicalGameWidth; canvas.height = currentLogicalGameHeight;
    pauseButtonArea.width = PAUSE_BUTTON_SIZE; pauseButtonArea.height = PAUSE_BUTTON_SIZE;
    if (isPortraitLayout) {
        pauseButtonArea.x = currentLogicalGameWidth - PAUSE_BUTTON_SIZE - 10;
        pauseButtonArea.y = currentLogicalGameHeight - PAUSE_BUTTON_SIZE - 10;
    } else {
        pauseButtonArea.x = currentLogicalGameWidth - PAUSE_BUTTON_SIZE - 10;
        pauseButtonArea.y = 10;
    }
    console.log(`Resized. Portrait: ${isPortraitLayout}, Logical: ${currentLogicalGameWidth}x${currentLogicalGameHeight}, Canvas: ${canvas.width}x${canvas.height}`);
}

function resetGame() {
    player.x = currentLogicalGameWidth / 2 - player.width / 2;
    player.y = currentLogicalGameHeight / 2 - player.height / 2;
    player.health = player.maxHealth; player.level = 1; player.xp = 0;
    player.xpToNextLevel = 10; player.xpMultiplier = 1;
    player.isAttacking = false; player.attackTimer = 0; player.attackCooldownTimer = 0;
    player.lastDx = 1; player.lastDy = 0; player.currentMoveDx = 0; player.currentMoveDy = 0;
    player.isLevelUpPulseActive = false; player.levelUpPulseTimer = 0;
    particles = []; trailParticles = []; hitSparks = [];
    screenShakeIntensity = 0; screenShakeDuration = 0;
    const initialMaxParticles = BASE_MAX_PARTICLES;
    for (let i = 0; i < initialMaxParticles / 2; i++) {
        if (particles.length < initialMaxParticles) particles.push(createParticle());
    }
    gameOver = false; gameRestartTimer = 0;
    isUpgradeScreenActive = false;
    currentUpgradeChoices = []; upgradeChoiceAreas = [];
    console.log("Game Reset/Started.");
}

function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
}

function getTouchPos(canvasDOM, touchEvent) {
    const rect = canvasDOM.getBoundingClientRect(); const touch = touchEvent.touches[0];
    return { x: (touch.clientX - rect.left) * (canvasDOM.width / rect.width), y: (touch.clientY - rect.top) * (canvasDOM.height / rect.height) };
}

function handleTouchStart(event) {
    event.preventDefault(); const pos = getTouchPos(canvas, event);
    if (typeof audioManager !== 'undefined' && !isAudioContextUnlocked && audioManager.unlockAudio) audioManager.unlockAudio();
    if (isUpgradeScreenActive) {
        if (upgradeChoiceAreas && upgradeChoiceAreas.length > 0) {
            for (let i = 0; i < upgradeChoiceAreas.length; i++) {
                const area = upgradeChoiceAreas[i];
                if (pos.x >= area.x && pos.x <= area.x + area.width && pos.y >= area.y && pos.y <= area.y + area.height) {
                    applySelectedUpgrade(i); isTouchActive = false; return;
                }
            }
        }
        isTouchActive = false; return;
    }
    if (pos.x >= pauseButtonArea.x && pos.x <= pauseButtonArea.x + pauseButtonArea.width && pos.y >= pauseButtonArea.y && pos.y <= pauseButtonArea.y + pauseButtonArea.height) {
        isPaused = !isPaused; console.log(isPaused ? "Game Paused (Touch)" : "Game Resumed (Touch)"); isTouchActive = false; return;
    }
    if (isPaused) { isPaused = false; console.log("Game Resumed by tap"); isTouchActive = false; return; }
    if (gameOver) return;
    isTouchActive = true; touchStartX = pos.x; touchStartY = pos.y; currentTouchX = pos.x; currentTouchY = pos.y;
    mouseX = pos.x; mouseY = pos.y;
}

function handleTouchMove(event) {
    event.preventDefault(); if (!isTouchActive || isPaused || gameOver || isUpgradeScreenActive) return;
    const pos = getTouchPos(canvas, event); currentTouchX = pos.x; currentTouchY = pos.y; mouseX = pos.x;
}

function handleTouchEnd(event) { event.preventDefault(); isTouchActive = false; }

function update() {
    if (isUpgradeScreenActive) return;
    if (isPaused) return;
    if (gameOver) { gameRestartTimer--; if (gameRestartTimer <= 0) resetGame(); return; }

    player.currentMoveDx = 0; player.currentMoveDy = 0;
    let dx = 0, dy = 0;
    if (keys.w || keys.ArrowUp) dy = -1; else if (keys.s || keys.ArrowDown) dy = 1;
    if (keys.a || keys.ArrowLeft) dx = -1; else if (keys.d || keys.ArrowRight) dx = 1;
    if (isTouchActive) {
        const deltaX = currentTouchX - touchStartX, deltaY = currentTouchY - touchStartY;
        let touchDx = 0, touchDy = 0;
        if (Math.abs(deltaX) > TOUCH_MOVE_THRESHOLD) touchDx = (deltaX > 0 ? 1 : -1);
        if (Math.abs(deltaY) > TOUCH_MOVE_THRESHOLD) touchDy = (deltaY > 0 ? 1 : -1);
        if (touchDx !== 0 || touchDy !== 0) { dx = touchDx; dy = touchDy; } else { dx = 0; dy = 0; }
    }
    player.currentMoveDx = dx; player.currentMoveDy = dy;
    if (dx !== 0 || dy !== 0) {
        let finalMoveX = dx * player.speed, finalMoveY = dy * player.speed;
        if (dx !== 0 && dy !== 0) { finalMoveX /= Math.SQRT2; finalMoveY /= Math.SQRT2; }
        player.x += finalMoveX; player.y += finalMoveY;
        const magnitude = Math.hypot(dx, dy);
        if (magnitude > 0) { player.lastDx = dx / magnitude; player.lastDy = dy / magnitude; }
        if (Math.random() < 0.6) { trailParticles.push(createTrailParticle(player.x - finalMoveX, player.y - finalMoveY)); }
        while (trailParticles.length > 20) trailParticles.shift();
    }

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > currentLogicalGameWidth) player.x = currentLogicalGameWidth - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > currentLogicalGameHeight) player.y = currentLogicalGameHeight - player.height;

    const currentMaxParticles = BASE_MAX_PARTICLES + (player.level - 1) * PARTICLES_PER_LEVEL_INCREASE;
    if (particles.length < currentMaxParticles && Math.random() < PARTICLE_SPAWN_RATE) particles.push(createParticle());

    const playerCenterXForSludge = player.x + player.width / 2; const playerCenterYForSludge = player.y + player.height / 2;
    for (const particle of particles) {
        const p_dx = playerCenterXForSludge - particle.x, p_dy = playerCenterYForSludge - particle.y;
        const dist = Math.hypot(p_dx, p_dy);
        if (dist > particle.radius) { particle.x += (p_dx / dist) * particle.speed; particle.y += (p_dy / dist) * particle.speed; }
    }
    const MAX_PARTICLE_SIZE = 4;
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i], p2 = particles[j];
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            if (dist < p1.radius + p2.radius) {
                const combinedSize = Math.min(MAX_PARTICLE_SIZE, p1.size + p2.size);
                const newParticle = createParticle((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, combinedSize);
                particles.splice(j, 1); particles.splice(i, 1); particles.push(newParticle);
                i = -1; break;
            }
        }
    }

    if (player.attackCooldownTimer > 0) player.attackCooldownTimer--;
    if (!player.isAttacking && player.attackCooldownTimer <= 0) {
        player.isAttacking = true; player.attackTimer = player.attackDurationMax; player.attackCooldownTimer = player.attackCooldownMax;
        const playerCenterX = player.x + player.width / 2; const playerCenterY = player.y + player.height / 2;
        let targetDx = player.lastDx, targetDy = player.lastDy;
        const dxToMouse = mouseX - playerCenterX, dyToMouse = mouseY - playerCenterY;
        if (Math.hypot(dxToMouse, dyToMouse) > 0) {
            const dist = Math.hypot(dxToMouse, dyToMouse); targetDx = dxToMouse / dist; targetDy = dyToMouse / dist;
        }
        player.attackAngleStart = Math.atan2(targetDy, targetDx) - player.swordSweepAngle / 2;
        if (typeof audioManager !== 'undefined' && audioManager.playSound) audioManager.playSound('player_attack');
    }
    if (player.isAttacking) {
        player.attackTimer--;
        const playerCenterX = player.x + player.width / 2; const playerCenterY = player.y + player.height / 2;
        const attackProgress = 1 - (player.attackTimer / player.attackDurationMax);
        const currentSweepPortion = Math.min(attackProgress, 1) * player.swordSweepAngle;
        const currentSweepEndAngle = player.attackAngleStart + currentSweepPortion;
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const dx_p = particle.x - playerCenterX, dy_p = particle.y - playerCenterY;
            const distToPlayer = Math.hypot(dx_p, dy_p);
            if (distToPlayer <= player.swordLength && distToPlayer > player.width / 2) {
                let particleAngle = (Math.atan2(dy_p, dx_p) + 2 * Math.PI) % (2 * Math.PI);
                let normAttackAngleStart = (player.attackAngleStart + 2 * Math.PI) % (2 * Math.PI);
                let normCurrentSweepEndAngle = (currentSweepEndAngle + 2 * Math.PI) % (2 * Math.PI);
                let isHit = false;
                if (normAttackAngleStart <= normCurrentSweepEndAngle) { if (particleAngle >= normAttackAngleStart && particleAngle <= normCurrentSweepEndAngle) isHit = true; }
                else { if (particleAngle >= normAttackAngleStart || particleAngle <= normCurrentSweepEndAngle) isHit = true; }
                if (isHit) {
                    player.xp += Math.floor(Number(particle.xpValue || 1) * player.xpMultiplier);
                    const hitParticleColor = particle.color;
                    particles.splice(i, 1);
                    createHitSpark(particle.x, particle.y, hitParticleColor);
                    if (typeof audioManager !== 'undefined' && audioManager.playSound) audioManager.playSound('particle_hit_sword');
                    if (player.xp >= player.xpToNextLevel) {
                        player.level++; const excessXp = player.xp - player.xpToNextLevel;
                        player.xp = Math.max(0, excessXp); player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.5);
                        isUpgradeScreenActive = true; generateUpgradeChoices(); return;
                    }
                }
            }
        }
        if (player.attackTimer <= 0) player.isAttacking = false;
    }
    if (player.isLevelUpPulseActive) { player.levelUpPulseTimer--; if (player.levelUpPulseTimer <= 0) player.isLevelUpPulseActive = false; }

    if (screenShakeDuration > 0) {
        screenShakeDuration--;
        if (screenShakeDuration === 0) screenShakeIntensity = 0;
    }
    for (let i = trailParticles.length - 1; i >= 0; i--) {
        const p = trailParticles[i]; p.x += p.vx; p.y += p.vy; p.lifespan--;
        if (p.lifespan <= 0) trailParticles.splice(i, 1);
    }
    for (let i = hitSparks.length - 1; i >= 0; i--) {
        const s = hitSparks[i]; s.x += s.vx; s.y += s.vy; s.vx *= 0.92; s.vy *= 0.92; s.size *= 0.96;
        s.lifespan--; if (s.lifespan <= 0 || s.size < 0.5) hitSparks.splice(i, 1);
    }

    const playerBodyCenterX = player.x + player.width / 2; const playerBodyCenterY = player.y + player.height / 2;
    const playerBodyRadius = player.width / 2;
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        const dist = Math.hypot(particle.x - playerBodyCenterX, particle.y - playerBodyCenterY);
        if (dist < playerBodyRadius + particle.radius) {
            player.health -= particle.damage; particles.splice(i, 1);
            screenShakeIntensity = 8; screenShakeDuration = 20;
            if (typeof audioManager !== 'undefined' && audioManager.playSound) audioManager.playSound('player_take_damage');
            console.log(`Player hit by sludge! Damage: ${particle.damage}, Health: ${player.health}`);
            if (player.health <= 0) {
                player.health = 0; gameOver = true; gameRestartTimer = GAME_RESTART_DELAY;
                if (typeof audioManager !== 'undefined' && audioManager.playSound) audioManager.playSound('game_over');
                console.log("Game Over!");
            }
        }
    }
    window.gameState.player = player; window.gameState.gameOver = gameOver; window.gameState.isPaused = isPaused;
    window.gameState.isUpgradeScreenActive = isUpgradeScreenActive; window.gameState.particles = particles;
    window.gameState.currentLogicalGameWidth = currentLogicalGameWidth; window.gameState.currentLogicalGameHeight = currentLogicalGameHeight;
    window.gameState.keys = keys;
}

// --- UPGRADE SYSTEM ---
const ALL_POSSIBLE_UPGRADES = [
    { id: 'sword_length', name: 'Longer Sword', description: 'Increases attack range by 15%. Slice more sludge!', applyEffect: function (p) { p.swordLength *= 1.15; } },
    { id: 'attack_speed', name: 'Swift Strikes', description: 'Reduces attack cooldown by 15%. Attack faster!', applyEffect: function (p) { p.attackCooldownMax = Math.max(15, Math.floor(p.attackCooldownMax * 0.85)); } },
    { id: 'move_speed', name: 'Speed Boost', description: 'Increases movement speed by 0.5. Zoom zoom!', applyEffect: function (p) { p.speed += 0.5; } },
    { id: 'max_health', name: 'Fortify Hull', description: 'Increases Max Health by 10 and heals 10 HP.', applyEffect: function (p) { p.maxHealth += 10; p.health = Math.min(p.maxHealth, p.health + 10); } },
    { id: 'xp_boost_permanent', name: 'XP Magnet', description: 'Permanently increases all XP gained by 10%.', applyEffect: function (p) { p.xpMultiplier = parseFloat((p.xpMultiplier * 1.1).toFixed(2)); } },
    { id: 'aoe_pulse', name: 'Purge Pulse', description: 'Unleash an energy pulse, clearing nearby particles.', applyEffect: function (p) { /* Logic handled by triggerAoePulse */ } }
];
function generateUpgradeChoices() {
    currentUpgradeChoices = []; const availableUpgrades = [...ALL_POSSIBLE_UPGRADES];
    const numChoices = Math.min(availableUpgrades.length, 3);
    for (let i = 0; i < numChoices; i++) {
        if (availableUpgrades.length === 0) break;
        const randomIndex = Math.floor(Math.random() * availableUpgrades.length);
        currentUpgradeChoices.push(availableUpgrades[randomIndex]); availableUpgrades.splice(randomIndex, 1);
    }
}
function triggerAoePulse() {
    const playerCenterX = player.x + player.width / 2; const playerCenterY = player.y + player.height / 2;
    const AOE_PULSE_RADIUS = player.swordLength * 0.75;
    for (let k = particles.length - 1; k >= 0; k--) {
        const p = particles[k];
        if (Math.hypot(p.x - playerCenterX, p.y - playerCenterY) <= AOE_PULSE_RADIUS) particles.splice(k, 1);
    }
    if (typeof audioManager !== 'undefined' && audioManager.playSound) audioManager.playSound('particle_combine');
}
function applySelectedUpgrade(choiceIndex) {
    if (choiceIndex < 0 || !currentUpgradeChoices || choiceIndex >= currentUpgradeChoices.length) return;
    const selectedUpgrade = currentUpgradeChoices[choiceIndex]; selectedUpgrade.applyEffect(player);
    if (selectedUpgrade.id === 'aoe_pulse') triggerAoePulse();
    isUpgradeScreenActive = false; currentUpgradeChoices = []; upgradeChoiceAreas = [];
    if (typeof audioManager !== 'undefined' && audioManager.playSound) audioManager.playSound('level_up');
    player.isLevelUpPulseActive = true; player.levelUpPulseTimer = LEVEL_UP_PULSE_DURATION;
}
// --- END UPGRADE SYSTEM ---

// Render game
function render() {
    ctx.save();
    if (screenShakeIntensity > 0 && !isUpgradeScreenActive && !isPaused && !gameOver) {
        const offsetX = (Math.random() - 0.5) * 2 * screenShakeIntensity;
        const offsetY = (Math.random() - 0.5) * 2 * screenShakeIntensity;
        ctx.translate(offsetX, offsetY);
    }

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, currentLogicalGameWidth, currentLogicalGameHeight);

    if (isUpgradeScreenActive) {
        renderGameWorld();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, currentLogicalGameWidth, currentLogicalGameHeight);
        ctx.font = UI_FONT_TITLE_SUB + ' "Courier New", Courier, monospace';
        ctx.fillStyle = 'white'; ctx.textAlign = 'center';
        ctx.fillText('LEVEL UP! CHOOSE AN UPGRADE:', currentLogicalGameWidth / 2, currentLogicalGameHeight / 2 - 170);
        upgradeChoiceAreas = [];
        const choiceBoxWidth = Math.min(currentLogicalGameWidth * 0.8, 500);
        const choiceBoxHeight = 85;
        const startY = currentLogicalGameHeight / 2 - 120;
        const spacingY = choiceBoxHeight + 15;
        const choiceNameYOffset = 25;
        const choiceDescLineHeight = 18; // For UI_FONT_SIZE_SECONDARY (16px) + small buffer

        for (let i = 0; i < currentUpgradeChoices.length; i++) {
            const choice = currentUpgradeChoices[i];
            const boxY = startY + i * spacingY; const boxX = (currentLogicalGameWidth - choiceBoxWidth) / 2;
            upgradeChoiceAreas.push({ x: boxX, y: boxY, width: choiceBoxWidth, height: choiceBoxHeight, index: i });
            ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2; ctx.strokeRect(boxX, boxY, choiceBoxWidth, choiceBoxHeight);

            ctx.font = UI_FONT_UPGRADE_NAME + ' "Courier New", Courier, monospace'; ctx.fillStyle = 'lime';
            ctx.fillText(`(${i + 1}) ${choice.name}`, currentLogicalGameWidth / 2, boxY + choiceNameYOffset);

            ctx.font = UI_FONT_SIZE_SECONDARY + ' "Courier New", Courier, monospace'; ctx.fillStyle = 'white';
            const words = choice.description.split(' ');
            let line = '';
            let lines = [];
            const padding = 25;
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > choiceBoxWidth - padding * 2 && n > 0) {
                    lines.push(line.trim());
                    line = words[n] + ' ';
                } else { line = testLine; }
            }
            lines.push(line.trim());

            const totalDescHeight = lines.length * choiceDescLineHeight;
            // Start rendering description text to be roughly centered in the space below the name
            let descRenderStartY = boxY + choiceNameYOffset + 10 + ((choiceBoxHeight - choiceNameYOffset - 10 - totalDescHeight) / 2) + (choiceDescLineHeight / 2);


            for (let k = 0; k < lines.length; k++) {
                ctx.fillText(lines[k], currentLogicalGameWidth / 2, descRenderStartY + k * choiceDescLineHeight);
            }
        }
        ctx.font = UI_FONT_UPGRADE_INSTRUCTION + ' "Courier New", Courier, monospace'; ctx.fillStyle = '#ccc';
        ctx.fillText('Click or Press Number (1-3) to Select', currentLogicalGameWidth / 2, startY + currentUpgradeChoices.length * spacingY + 15);
        ctx.restore();
        return;
    }

    if (isPaused && !gameOver) {
        renderGameWorld();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, currentLogicalGameWidth, currentLogicalGameHeight);
        ctx.font = UI_FONT_TITLE_MAIN + ' "Courier New", Courier, monospace'; ctx.fillStyle = 'white'; ctx.textAlign = 'center';
        ctx.fillText('PAUSED', currentLogicalGameWidth / 2, currentLogicalGameHeight / 2 - 30);
        ctx.font = UI_FONT_INSTRUCTION + ' "Courier New", Courier, monospace';
        ctx.fillText('Tap screen or Press P, Space, or Enter to Resume', currentLogicalGameWidth / 2, currentLogicalGameHeight / 2 + 20);
        ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
        ctx.strokeRect(pauseButtonArea.x, pauseButtonArea.y, pauseButtonArea.width, pauseButtonArea.height);
        ctx.font = UI_FONT_TITLE_SUB + ' "Courier New", Courier, monospace';
        ctx.fillText('II', pauseButtonArea.x + pauseButtonArea.width / 2, pauseButtonArea.y + pauseButtonArea.height / 2 + 10);
        ctx.restore();
        return;
    }
    renderGameWorld();
    ctx.restore();
}

function renderGameWorld() {
    if (gameOver && !isUpgradeScreenActive) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; ctx.fillRect(0, 0, currentLogicalGameWidth, currentLogicalGameHeight);
        ctx.font = UI_FONT_TITLE_MAIN + ' "Courier New", Courier, monospace'; ctx.fillStyle = 'red'; ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', currentLogicalGameWidth / 2, currentLogicalGameHeight / 2 - 30);
        ctx.font = UI_FONT_INSTRUCTION + ' "Courier New", Courier, monospace'; ctx.fillStyle = 'white';
        ctx.fillText(`Restarting in ${Math.ceil(gameRestartTimer / 60)}s...`, currentLogicalGameWidth / 2, currentLogicalGameHeight / 2 + 20);
    } else if (!isUpgradeScreenActive) {
        for (const p of trailParticles) {
            ctx.globalAlpha = Math.max(0, p.lifespan / 20);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        for (const particle of particles) {
            ctx.fillStyle = particle.color;
            ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2); ctx.fill();
        }
        for (const s of hitSparks) {
            ctx.fillStyle = s.color;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        }

        if (player.spriteLoaded) {
            ctx.save();
            const playerCenterX = player.x + player.width / 2; const playerCenterY = player.y + player.height / 2;
            ctx.translate(playerCenterX, playerCenterY);
            if (player.lastDx > 0) ctx.scale(-1, 1);
            if (player.currentMoveDx !== 0 && player.currentMoveDy !== 0) {
                const TILT_AMOUNT = Math.PI / 12; ctx.rotate(player.currentMoveDx * TILT_AMOUNT);
            }
            ctx.drawImage(player.sprite, -player.width / 2, -player.height / 2, player.width, player.height);
            ctx.restore();
        } else {
            ctx.fillStyle = 'blue'; ctx.fillRect(player.x, player.y, player.width, player.height);
            ctx.fillStyle = 'white'; ctx.textAlign = 'center';
            ctx.fillText("?", player.x + player.width / 2, player.y + player.height / 2 + 5);
        }
        if (player.isLevelUpPulseActive) {
            const pulseProgress = (LEVEL_UP_PULSE_DURATION - player.levelUpPulseTimer) / LEVEL_UP_PULSE_DURATION;
            const pulseMaxRadius = player.swordLength * 1.5;
            const currentRadius = pulseProgress * pulseMaxRadius;
            const currentAlpha = Math.max(0, 1 - pulseProgress * pulseProgress);
            ctx.beginPath(); ctx.arc(player.x + player.width / 2, player.y + player.height / 2, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 100, ${currentAlpha * 0.7})`; ctx.fill();
            if (player.spriteLoaded) {
                ctx.save();
                const playerCenterX = player.x + player.width / 2; const playerCenterY = player.y + player.height / 2;
                ctx.translate(playerCenterX, playerCenterY);
                const sinProgress = Math.sin(pulseProgress * Math.PI);
                const pulseScale = 1 + sinProgress * 0.2;
                ctx.globalAlpha = 0.6 + sinProgress * 0.4;
                if (player.lastDx > 0) ctx.scale(-1 * pulseScale, pulseScale); else ctx.scale(pulseScale, pulseScale);
                ctx.drawImage(player.sprite, -player.width / 2, -player.height / 2, player.width, player.height);
                ctx.restore();
            }
        }
        if (player.isAttacking) {
            const playerCenterX = player.x + player.width / 2; const playerCenterY = player.y + player.height / 2;
            const attackProgress = 1 - (player.attackTimer / player.attackDurationMax);
            const currentSweepPortion = Math.min(attackProgress, 1) * player.swordSweepAngle;
            const animatedSweepEndAngle = player.attackAngleStart + currentSweepPortion;
            ctx.beginPath(); ctx.moveTo(playerCenterX, playerCenterY);
            ctx.arc(playerCenterX, playerCenterY, player.swordLength, player.attackAngleStart, animatedSweepEndAngle);
            ctx.closePath(); ctx.fillStyle = 'rgba(0, 220, 220, 0.5)'; ctx.fill();
        }
        ctx.fillStyle = 'white'; ctx.font = UI_FONT_SIZE_PRIMARY + ' "Courier New", Courier, monospace'; ctx.textAlign = 'left';
        ctx.fillText(`Level: ${player.level}`, 10, 25);
        const barWidth = Math.min(200, currentLogicalGameWidth - 20);
        const xpBarWidth = barWidth; const xpBarHeight = 10; const xpBarX = 10; const xpBarY = 30 + (parseInt(UI_FONT_SIZE_PRIMARY) / 2); // Adjusted Y
        const currentXpProgress = (player.xpToNextLevel > 0 ? (player.xp / player.xpToNextLevel) : 0) * xpBarWidth;
        ctx.strokeStyle = '#888'; ctx.strokeRect(xpBarX, xpBarY, xpBarWidth, xpBarHeight);
        ctx.fillStyle = '#0f0'; ctx.fillRect(xpBarX, xpBarY, currentXpProgress, xpBarHeight);
        ctx.fillStyle = 'white'; ctx.fillText(`XP: ${player.xp} / ${player.xpToNextLevel}`, 10, xpBarY + xpBarHeight + parseInt(UI_FONT_SIZE_PRIMARY)); // Adjusted Y

        const healthBarWidth = barWidth; const healthBarHeight = 10; const healthBarX = 10;
        const healthBarY = xpBarY + xpBarHeight + parseInt(UI_FONT_SIZE_PRIMARY) + 10; // Adjusted Y for spacing
        const currentHealthProgress = (player.maxHealth > 0 ? (player.health / player.maxHealth) : 0) * healthBarWidth;
        ctx.strokeStyle = '#888'; ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        ctx.fillStyle = '#f00'; ctx.fillRect(healthBarX, healthBarY, Math.max(0, currentHealthProgress), healthBarHeight);
        ctx.fillStyle = 'white'; ctx.fillText(`Health: ${player.health} / ${player.maxHealth}`, 10, healthBarY + healthBarHeight + parseInt(UI_FONT_SIZE_PRIMARY)); // Adjusted Y

        ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
        ctx.strokeRect(pauseButtonArea.x, pauseButtonArea.y, pauseButtonArea.width, pauseButtonArea.height);
        ctx.font = UI_FONT_TITLE_SUB + ' "Courier New", Courier, monospace'; ctx.fillStyle = '#888'; ctx.textAlign = 'center';
        ctx.fillText('II', pauseButtonArea.x + pauseButtonArea.width / 2, pauseButtonArea.y + pauseButtonArea.height / 2 + 10);
    }
}

// Main game loop
function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }
window.gameState = {};
if (document.getElementById('gameCanvas')) {
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        if (typeof audioContext === 'undefined' || !audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext && (typeof musicGainNode === 'undefined' || !musicGainNode) && audioContext.createGain) {
            musicGainNode = audioContext.createGain();
            if (musicGainNode && audioContext.destination) {
                musicGainNode.connect(audioContext.destination);
                musicGainNode.gain.setValueAtTime(0, audioContext.currentTime);
            }
        }
    } else console.warn("Web Audio API is not supported by this browser (AudioContext not found).");
    init();
}
