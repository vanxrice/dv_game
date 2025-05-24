# DV_Game: Robot Vacuum Hell Sludge Cleaner

DV_Game is a 2D top-down arcade-style game where you control a heroic robot vacuum cleaner. Your mission is to clean up demonic sludge from the fiery pits of hell!

## Gameplay

*   **Objective:** Survive as long as possible by cleaning sludge and leveling up your vacuum.
*   **Controls:**
    *   **Movement:** Use `WASD` or `Arrow Keys` to move your robot vacuum.
    *   **Pause:** Press `P` to pause or resume the game.
    *   **Resume from Pause:** Press `P`, `Spacebar`, or `Enter` to resume.
*   **Combat:**
    *   Your vacuum is equipped with an auto-attacking sword that sweeps in the direction of your mouse cursor or your last movement direction.
    *   The sword destroys sludge particles, granting you Experience Points (XP).
*   **Sludge:**
    *   Sludge particles will actively move towards you.
    *   **Particle Combination:** Sludge particles can collide and combine with each other.
        *   When particles combine, they form a single, larger sludge particle.
        *   Larger particles are visually bigger and move slightly slower.
    *   **Damage:** If a sludge particle collides with your vacuum, you will lose health.
        *   The amount of damage taken is proportional to the size of the sludge particle – larger particles deal more damage!
    *   **XP Value:** The XP gained from destroying a sludge particle with your sword is also proportional to its size.
*   **Leveling Up:**
    *   Collect XP by destroying sludge with your sword.
    *   When you gain enough XP, you will level up, increasing the XP required for the next level.
    *   Upon leveling up, you will be presented with a choice of upgrades to enhance your vacuum's capabilities.
*   **Health:**
    *   You start with a set amount of health.
    *   If your health reaches zero, the game is over.
*   **Game Over:**
    *   When the game ends, a "GAME OVER" screen will appear, and the game will automatically restart after a short delay.

## How to Play Locally

1.  Clone or download this repository.
2.  Open the `index.html` file in a modern web browser.
    *   Alternatively, for running with the testing environment, you can use a local HTTP server. After installing development dependencies (`npm install`), you can often start one with a command like `npx http-server -p 8080` and then navigate to `http://localhost:8080/index.html`.

## How to Play Online

The game is hosted on GitHub Pages and can be played at:
[https://vanxrice.github.io/dv_game/](https://vanxrice.github.io/dv_game/)

## Development

This game was developed iteratively with the assistance of Google's AI model.

*   **AI Model:** Gemini 1.5 Pro (model `gemini-1.5-pro-001`)
*   **Core Technologies:** HTML, CSS, and vanilla JavaScript.
*   **Testing:** The project utilizes Playwright for End-to-End (E2E) testing. Testing was migrated from Cypress to Playwright.

The development process involved generating code snippets, refactoring, debugging, and implementing game mechanics based on prompts and discussions with the AI.

## Testing

This project uses Playwright for its End-to-End (E2E) testing strategy. The tests are designed to cover core game mechanics, including:
*   Player initialization and controls (pause/resume).
*   Particle behavior (collision, combination).
*   Player damage and health systems.
*   The power-up and upgrade system functionality.

### Running Tests Locally

To run the tests locally, follow these steps:

1.  **Install Dependencies:**
    Ensure you have Node.js and npm installed. Then, install the project dependencies (including Playwright, `http-server` for the test web server, and Husky):
    ```bash
    npm install
    ```

2.  **Run Tests (Headless):**
    This command will execute all Playwright tests in headless mode. The test server will be started automatically as configured in `playwright.config.js`.
    ```bash
    npm test
    ```

3.  **Run Tests (Headed):**
    To run tests in a visible browser window (headed mode), use:
    ```bash
    npm run test:headed
    ```

### Pre-commit Hook

The project uses Husky to manage pre-commit hooks. A pre-commit hook is configured to automatically run `npm test` before each commit. If the tests fail, the commit will be aborted, helping to ensure that broken code is not committed to the repository.

## Future Ideas (Potential Enhancements)

*   More varied enemy types (sludge).
*   Different weapon types or upgrades.
*   Player abilities or special moves.
*   Sound effects and music.
*   More detailed pixel art and animations.

---

Enjoy cleaning hell!
