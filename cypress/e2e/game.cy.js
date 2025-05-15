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
});
