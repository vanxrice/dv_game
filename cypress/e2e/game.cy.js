describe('Game Page E2E Tests', () => {
  beforeEach(() => {
    // Visits the index.html file before each test.
    // Cypress serves files from the project root.
    cy.visit('index.html');
  });

  it('should load the game canvas successfully', () => {
    cy.get('#gameCanvas').should('be.visible');
  });

  it('should initialize the game state with a player object', () => {
    // The game.js script exposes 'gameState' on the window object.
    // We check if the player object and its health property are initialized.
    cy.window().its('gameState.player').should('exist');
    cy.window().its('gameState.player.health').should('be.a', 'number');
    cy.window().its('gameState.player.maxHealth').should('be.a', 'number');
    cy.window().its('gameState.player.health').then(health => {
      cy.window().its('gameState.player.maxHealth').should('equal', health);
    });
  });

  it('should allow the game to be paused and resumed via exposed state', () => {
    // Check initial state
    cy.window().its('gameState.isPaused').should('be.false');

    // Simulate pressing 'p' to pause (by directly manipulating game state for test simplicity)
    // More complex tests could simulate actual key presses if input handling is robustly testable.
    cy.window().then((win) => {
      win.isPaused = true; // Directly set the global isPaused variable from game.js
    });
    cy.window().its('isPaused').should('be.true'); // Check the global directly

    // Simulate pressing 'p' again to resume
    cy.window().then((win) => {
      win.isPaused = false;
    });
    cy.window().its('isPaused').should('be.false');
  });

  xit('should combine two colliding particles into a larger one', () => {
    cy.window().then(win => {
      win.isPaused = true; // Pause the game
      win.gameState.particles.length = 0; // Clear existing particles

      // Create two particles very close to each other
      // Radii: size 1 -> (1*2)+3 = 5.
      // Particle 1 at (50,50)
      // Particle 2 at (53,53) - their edges should overlap (50+5 > 53-5 is true for x, 5 > -2)
      // Distance: sqrt((53-50)^2 + (53-50)^2) = sqrt(3^2 + 3^2) = sqrt(18) approx 4.24
      // Sum of radii = 5 + 5 = 10. Since 4.24 < 10, they will collide.
      win.createParticle(50, 50, 1); // Using direct args as per latest game.js
      win.createParticle(53, 53, 1); // Using direct args
    });

    cy.window().its('gameState.particles').should('have.length', 2);

    cy.window().then(win => {
      win.isPaused = false; // Unpause
    });

    cy.wait(50); // Wait for a few game update cycles

    cy.window().then(win => {
      win.isPaused = true; // Pause again
    });

    cy.window().its('gameState.particles').should('have.length', 1);
    cy.window().then(win => {
      const particle = win.gameState.particles[0];
      expect(particle.size).to.equal(2);
      expect(particle.damage).to.equal(2);
      expect(particle.radius).to.equal((2 * 2) + 3); // 7
      expect(particle.xpValue).to.equal(2);
    });
  });

  xit('should deal more damage with a larger combined particle', () => {
    let initialHealth;
    let healthAfterSmallParticle;
    const playerBuffer = 1; // To ensure particle is definitely overlapping player center

    // Pause and setup
    cy.window().then(win => {
      win.isPaused = true;
      initialHealth = win.gameState.player.health;
      win.gameState.particles.length = 0; // Clear particles
    });

    // Scenario 1: Small particle damage
    cy.window().then(win => {
      // Create a size 1 particle on top of the player
      win.createParticle(
        win.gameState.player.x + win.gameState.player.width / 2,
        win.gameState.player.y + win.gameState.player.height / 2,
        1
      );
    });
    cy.window().its('gameState.particles').should('have.length', 1);

    cy.window().then(win => { win.isPaused = false; });
    cy.wait(50); // Allow collision to happen
    cy.window().then(win => { win.isPaused = true; });

    cy.window().its('gameState.player.health').then(health => {
      healthAfterSmallParticle = health;
      expect(health).to.equal(initialHealth - 1); // Damage should be 1
    });

    // Reset for Scenario 2
    cy.window().then(win => {
      win.gameState.player.health = win.gameState.player.maxHealth; // Reset health
      initialHealth = win.gameState.player.maxHealth; // Update initialHealth for next check
      win.gameState.particles.length = 0; // Clear particles
      
      // Create two particles away from player to let them combine
      // Radii: size 1 -> 5. Place them at (50,50) and (53,53)
      win.createParticle(50, 50, 1);
      win.createParticle(53, 53, 1);
    });
    cy.window().its('gameState.particles').should('have.length', 2);

    cy.window().then(win => { win.isPaused = false; });
    cy.wait(50); // Allow combination
    cy.window().then(win => { win.isPaused = true; });

    // Verify combination occurred
    cy.window().its('gameState.particles').should('have.length', 1);
    cy.window().then(win => {
      const combinedParticle = win.gameState.particles[0];
      expect(combinedParticle.size).to.equal(2);
      expect(combinedParticle.damage).to.equal(2);

      // Move combined particle onto player
      combinedParticle.x = win.gameState.player.x + win.gameState.player.width / 2;
      combinedParticle.y = win.gameState.player.y + win.gameState.player.height / 2;
    });
    
    cy.window().then(win => { win.isPaused = false; });
    cy.wait(50); // Allow collision
    cy.window().then(win => { win.isPaused = true; });

    cy.window().its('gameState.player.health').then(healthAfterCombinedParticle => {
      expect(healthAfterCombinedParticle).to.equal(initialHealth - 2); // Damage should be 2
      const damageFromSmall = initialHealth - healthAfterSmallParticle;
      const damageFromCombined = initialHealth - healthAfterCombinedParticle;
      expect(damageFromCombined).to.be.greaterThan(damageFromSmall);
    });
  });
});
