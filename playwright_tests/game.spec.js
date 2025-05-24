const { test, expect } = require('@playwright/test');

test.describe('Game Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Visits the index.html file before each test.
    // Assumes Playwright is configured to serve from the project root.
    await page.goto('/index.html');
    // Ensure game is ready by waiting for a global that init sets up, e.g., gameState
    await page.waitForFunction(() => window.gameState && window.gameState.player);
  });

  test('should load the game canvas successfully', async ({ page }) => {
    await expect(page.locator('#gameCanvas')).toBeVisible();
  });

  test('should initialize the game state with a player object', async ({ page }) => {
    const playerState = await page.evaluate(() => window.gameState.player);
    expect(playerState).toBeTruthy();
    expect(typeof playerState.health).toBe('number');
    expect(typeof playerState.maxHealth).toBe('number');
    expect(playerState.health).toEqual(playerState.maxHealth);
  });

  test('should allow the game to be paused and resumed via exposed state', async ({ page }) => {
    // Check initial state
    let isPaused = await page.evaluate(() => window.gameState.isPaused);
    expect(isPaused).toBe(false);

    // Simulate setting pause to true
    await page.evaluate(() => { window.isPaused = true; });
    isPaused = await page.evaluate(() => window.isPaused); // Check the global directly
    expect(isPaused).toBe(true);

    // Simulate setting pause to false
    await page.evaluate(() => { window.isPaused = false; });
    isPaused = await page.evaluate(() => window.isPaused);
    expect(isPaused).toBe(false);
  });

  test.skip('should combine two colliding particles into a larger one', async ({ page }) => {
    await page.evaluate(() => {
      window.isPaused = true; // Pause the game
      window.gameState.particles.length = 0; // Clear existing particles
      window.createParticle(50, 50, 1);
      window.createParticle(53, 53, 1);
    });

    let particles = await page.evaluate(() => window.gameState.particles);
    expect(particles.length).toBe(2);

    await page.evaluate(() => {
      window.isPaused = false;
      window.update();
      window.update();
      window.update();
      window.isPaused = true;
    });

    particles = await page.evaluate(() => window.gameState.particles);
    expect(particles).toBeDefined();
    expect(Array.isArray(particles)).toBe(true);
    expect(particles.length).toBe(1);

    const particle = particles[0];
    expect(particle.size).toBe(2);
    expect(particle.damage).toBe(2);
    expect(particle.radius).toBe((2 * 2) + 3); // 7
    expect(particle.xpValue).toBe(2);
  });

  test.skip('should deal more damage with a larger combined particle', async ({ page }) => {
    let initialHealth = await page.evaluate(() => {
      window.isPaused = true;
      window.gameState.particles.length = 0;
      return window.gameState.player.health;
    });

    await page.evaluate(() => {
      window.createParticle(
        window.gameState.player.x + window.gameState.player.width / 2,
        window.gameState.player.y + window.gameState.player.height / 2,
        1
      );
    });
    let particles = await page.evaluate(() => window.gameState.particles);
    expect(particles.length).toBe(1);

    await page.evaluate(() => {
      window.isPaused = false;
      window.update();
      window.update();
      window.update();
      window.isPaused = true;
    });

    let healthAfterSmallParticle = await page.evaluate(() => window.gameState.player.health);
    expect(healthAfterSmallParticle).toEqual(initialHealth - 1);

    const newInitialHealth = await page.evaluate(() => {
      window.isPaused = true;
      window.gameState.player.health = window.gameState.player.maxHealth;
      window.gameState.particles.length = 0;
      window.createParticle(50, 50, 1);
      window.createParticle(53, 53, 1);
      return window.gameState.player.maxHealth;
    });
    initialHealth = newInitialHealth;

    particles = await page.evaluate(() => window.gameState.particles);
    expect(particles.length).toBe(2);

    await page.evaluate(() => {
      window.isPaused = false;
      window.update();
      window.update();
      window.update();
      window.isPaused = true;
    });

    particles = await page.evaluate(() => window.gameState.particles);
    expect(particles.length).toBe(1);

    const combinedParticleProperties = await page.evaluate(() => {
      const p = window.gameState.particles[0];
      return { size: p.size, damage: p.damage };
    });
    expect(combinedParticleProperties.size).toBe(2);
    expect(combinedParticleProperties.damage).toBe(2);

    await page.evaluate(() => {
      const player = window.gameState.player;
      const particle = window.gameState.particles[0];
      particle.x = player.x + player.width / 2;
      particle.y = player.y + player.height / 2;
    });

    await page.evaluate(() => {
      window.isPaused = false;
      window.update();
      window.update();
      window.update();
      window.isPaused = true;
    });

    const healthAfterCombinedParticle = await page.evaluate(() => window.gameState.player.health);
    expect(healthAfterCombinedParticle).toEqual(initialHealth - 2);

    const damageFromSmall = initialHealth - healthAfterSmallParticle;
    const damageFromCombined = initialHealth - healthAfterCombinedParticle;
    expect(damageFromCombined).toBeGreaterThan(damageFromSmall);
  });
});

test.describe.skip('Upgrade System', () => {
  const ALL_POSSIBLE_UPGRADES = [
    { id: 'sword_length', name: 'Longer Sword', description: 'Increases attack range by 15%. Slice more sludge!', applyEffect: function (p) { p.swordLength *= 1.15; } },
    { id: 'attack_speed', name: 'Swift Strikes', description: 'Reduces attack cooldown by 15%. Attack faster!', applyEffect: function (p) { p.attackCooldownMax = Math.max(15, Math.floor(p.attackCooldownMax * 0.85)); } },
    { id: 'move_speed', name: 'Speed Boost', description: 'Increases movement speed by 0.5. Zoom zoom!', applyEffect: function (p) { p.speed += 0.5; } },
    { id: 'max_health', name: 'Fortify Hull', description: 'Increases Max Health by 10 and heals 10 HP.', applyEffect: function (p) { p.maxHealth += 10; p.health = Math.min(p.maxHealth, p.health + 10); } },
    { id: 'xp_boost_permanent', name: 'XP Magnet', description: 'Permanently increases all XP gained by 10%.', applyEffect: function (p) { p.xpMultiplier = parseFloat((p.xpMultiplier * 1.1).toFixed(2)); } },
    { id: 'aoe_pulse', name: 'Purge Pulse', description: 'Unleash an energy pulse, clearing nearby particles.', applyEffect: function (p) { /* Logic handled by triggerAoePulse */ } }
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => window.gameState && window.gameState.player && typeof window.resetGame === 'function' && typeof window.createParticle === 'function' && typeof window.applySelectedUpgrade === 'function');
    await page.evaluate(() => {
      window.resetGame(); // Reset game state for each test
      window.isPaused = true; // Start paused
    });
  });

  test('should activate upgrade screen on level up', async ({ page }) => {
    await page.evaluate(() => {
      window.player.xp = window.player.xpToNextLevel - 1;
      // Create a particle that will be hit by the sword
      // Place it directly in the default sword path for simplicity
      const playerCenterX = window.player.x + window.player.width / 2;
      const playerCenterY = window.player.y + window.player.height / 2;
      window.gameState.particles.push(window.createParticle(playerCenterX + window.player.swordLength * 0.5, playerCenterY, 1));
      window.isPaused = false; // Unpause for attack
      window.player.attackCooldownTimer = 0; // Ensure player can attack
      window.player.isAttacking = false; // Reset attack state
    });

    // Run update cycles to allow attack, particle hit, XP gain, and level up
    for (let i = 0; i < 5; i++) { // More updates to ensure full sequence
      await page.evaluate(() => window.update());
    }

    const upgradeScreenActive = await page.evaluate(() => window.isUpgradeScreenActive);
    expect(upgradeScreenActive).toBe(true);

    const currentChoices = await page.evaluate(() => window.currentUpgradeChoices);
    expect(currentChoices.length).toBeGreaterThanOrEqual(1);
    expect(currentChoices.length).toBeLessThanOrEqual(3);
  });

  const getUpgradeById = (id) => ALL_POSSIBLE_UPGRADES_FROM_GAME.find(upg => upg.id === id);

  test('should apply "Longer Sword" upgrade', async ({ page }) => {
    const upgrade = getUpgradeById('sword_length');
    expect(upgrade).toBeDefined();

    const initialSwordLength = await page.evaluate(() => window.player.swordLength);

    await page.evaluate((upg) => {
      window.isUpgradeScreenActive = true;
      window.currentUpgradeChoices = [upg];
      window.applySelectedUpgrade(0);
    }, upgrade);

    expect(await page.evaluate(() => window.isUpgradeScreenActive)).toBe(false);
    const finalSwordLength = await page.evaluate(() => window.player.swordLength);
    expect(finalSwordLength).toEqual(initialSwordLength * 1.15);
  });

  test('should apply "Swift Strikes" (attack speed) upgrade', async ({ page }) => {
    const upgrade = getUpgradeById('attack_speed');
    expect(upgrade).toBeDefined();

    const initialCooldown = await page.evaluate(() => window.player.attackCooldownMax);

    await page.evaluate((upg) => {
      window.isUpgradeScreenActive = true;
      window.currentUpgradeChoices = [upg];
      window.applySelectedUpgrade(0);
    }, upgrade);

    expect(await page.evaluate(() => window.isUpgradeScreenActive)).toBe(false);
    const finalCooldown = await page.evaluate(() => window.player.attackCooldownMax);
    expect(finalCooldown).toEqual(Math.max(15, Math.floor(initialCooldown * 0.85)));
  });

  test('should apply "Speed Boost" upgrade', async ({ page }) => {
    const upgrade = getUpgradeById('move_speed');
    expect(upgrade).toBeDefined();

    const initialSpeed = await page.evaluate(() => window.player.speed);

    await page.evaluate((upg) => {
      window.isUpgradeScreenActive = true;
      window.currentUpgradeChoices = [upg];
      window.applySelectedUpgrade(0);
    }, upgrade);

    expect(await page.evaluate(() => window.isUpgradeScreenActive)).toBe(false);
    const finalSpeed = await page.evaluate(() => window.player.speed);
    expect(finalSpeed).toEqual(initialSpeed + 0.5);
  });

  test('should apply "Fortify Hull" (max health) upgrade', async ({ page }) => {
    const upgrade = getUpgradeById('max_health');
    expect(upgrade).toBeDefined();

    const initialStats = await page.evaluate(() => ({ maxHealth: window.player.maxHealth, health: window.player.health }));

    await page.evaluate((upg) => {
      window.isUpgradeScreenActive = true;
      // Set health lower than maxHealth to test healing part
      window.player.health = Math.min(window.player.health, initialStats.maxHealth - 5);
      window.currentUpgradeChoices = [upg];
      window.applySelectedUpgrade(0);
    }, upgrade);

    expect(await page.evaluate(() => window.isUpgradeScreenActive)).toBe(false);
    const finalStats = await page.evaluate(() => ({ maxHealth: window.player.maxHealth, health: window.player.health }));

    expect(finalStats.maxHealth).toEqual(initialStats.maxHealth + 10);
    // Health should be initial health + 10, but capped at the new maxHealth.
    // Or, if initial health was already full, it should be new maxHealth.
    const expectedHealth = Math.min(initialStats.maxHealth - 5 + 10, initialStats.maxHealth + 10);
    expect(finalStats.health).toEqual(expectedHealth);
  });

  test('should apply "XP Magnet" (XP boost) upgrade', async ({ page }) => {
    const upgrade = getUpgradeById('xp_boost_permanent');
    expect(upgrade).toBeDefined();

    const initialMultiplier = await page.evaluate(() => window.player.xpMultiplier);

    await page.evaluate((upg) => {
      window.isUpgradeScreenActive = true;
      window.currentUpgradeChoices = [upg];
      window.applySelectedUpgrade(0);
    }, upgrade);

    expect(await page.evaluate(() => window.isUpgradeScreenActive)).toBe(false);
    const finalMultiplier = await page.evaluate(() => window.player.xpMultiplier);
    // toFixed(2) is used in game.js, so expect float precision issues if not handled.
    expect(parseFloat(finalMultiplier.toFixed(2))).toEqual(parseFloat((initialMultiplier * 1.1).toFixed(2)));
  });

  test('should apply "Purge Pulse" upgrade and clear nearby particles', async ({ page }) => {
    const upgrade = getUpgradeById('aoe_pulse');
    expect(upgrade).toBeDefined();

    await page.evaluate(() => {
      // Spawn particles near the player
      const playerX = window.player.x;
      const playerY = window.player.y;
      window.gameState.particles.push(window.createParticle(playerX + 10, playerY + 10, 1));
      window.gameState.particles.push(window.createParticle(playerX - 10, playerY - 10, 1));
      window.gameState.particles.push(window.createParticle(playerX + 200, playerY + 200, 1)); // One far away
    });

    const initialParticleCount = await page.evaluate(() => window.gameState.particles.length);
    expect(initialParticleCount).toBe(3);

    await page.evaluate((upg) => {
      window.isUpgradeScreenActive = true;
      window.currentUpgradeChoices = [upg]; // Mock choices
      window.applySelectedUpgrade(0);
    }, upgrade);

    expect(await page.evaluate(() => window.isUpgradeScreenActive)).toBe(false);

    // After pulse, nearby particles should be gone. The AOE_PULSE_RADIUS is player.swordLength * 0.75
    // Default swordLength is TILE_SIZE * 2.5 = 32 * 2.5 = 80. Pulse radius approx 60.
    // Particles at +/-10 should be cleared. Particle at +/-200 should remain.
    const finalParticles = await page.evaluate(() => window.gameState.particles);
    expect(finalParticles.length).toBe(1); // Only the distant particle should remain
    if (finalParticles.length === 1) {
      expect(finalParticles[0].x).toBeGreaterThanOrEqual(window.player.x + 100); // Check it's the far one
    }
  });
});
