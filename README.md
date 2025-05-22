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
*   **Health:**
    *   You start with a set amount of health.
    *   If your health reaches zero, the game is over.
*   **Game Over:**
    *   When the game ends, a "GAME OVER" screen will appear, and the game will automatically restart after a short delay.

## How to Play Locally

1.  Clone or download this repository.
2.  Open the `index.html` file in a modern web browser.

## How to Play Online

The game is hosted on GitHub Pages and can be played at:
[https://vanxrice.github.io/dv_game/](https://vanxrice.github.io/dv_game/)

## Development

This game was developed iteratively with the assistance of Google's AI model.

*   **AI Model:** Gemini 1.5 Pro (model `gemini-1.5-pro-001`)
*   **Core Technologies:** HTML, CSS, and vanilla JavaScript.

The development process involved generating code snippets, refactoring, debugging, and implementing game mechanics based on prompts and discussions with the AI.

## Future Ideas (Potential Enhancements)

*   Lootbox system at level-up (inspired by similar arcade survival games).
*   More varied enemy types (sludge).
*   Different weapon types or upgrades.
*   Player abilities or special moves.
*   Sound effects and music.
*   More detailed pixel art and animations.

---

Enjoy cleaning hell!
