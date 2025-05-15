const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // baseUrl is not set as we are visiting 'index.html' directly from the file system.
    // Cypress will serve project files.
    supportFile: false, // We don't need a custom support file for this basic setup.
    specPattern: 'cypress/e2e/**/*.cy.js', // Tells Cypress where to find the test files.
    video: false, // Disable video recording to save space and time for local runs.
    screenshotOnRunFailure: false, // Disable screenshots on failure for local runs.
    setupNodeEvents(on, config) {
      // implement node event listeners here if needed in the future
    },
  },
});
