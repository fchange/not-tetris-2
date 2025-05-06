// Depends on Matter.js (Body) and Game.js (currentBlock)

const Controls = (() => {
    const { Body } = Matter; // Destructure Matter.js module

    // --- Control Parameters ---
    const TORQUE_MAGNITUDE = 3;
    const DOWN_FORCE_MAGNITUDE = 0.1;

    function setupControls() {
        document.addEventListener('keydown', (event) => {
            // Ensure there's a current controllable block and the game isn't over
            if (!Game.currentBlock || Game.currentBlock.isSleeping || Game.isGameOver) {
                return; // Don't control settled blocks or when game is over
            }

            switch (event.key) {
                case 'ArrowLeft':
                case 'a': // Add WASD alternative
                    // Apply counter-clockwise torque
                    // Matter.js Body.setAngularVelocity might be simpler if direct velocity control is desired
                    // Using torque feels more physics-based
                    Game.currentBlock.torque = -TORQUE_MAGNITUDE;
                    // console.log('Left Torque Applied');
                    break;

                case 'ArrowRight':
                case 'd': // Add WASD alternative
                    // Apply clockwise torque
                    Game.currentBlock.torque = TORQUE_MAGNITUDE;
                    // console.log('Right Torque Applied');
                    break;

                case 'ArrowDown':
                case 's': // Add WASD alternative
                    // Apply a downward force for faster drop
                    Body.applyForce(Game.currentBlock, Game.currentBlock.position, {
                        x: 0,
                        y: DOWN_FORCE_MAGNITUDE * Game.currentBlock.mass // Scale force by mass
                    });
                    // console.log('Down Force Applied');
                    break;

                // Add other controls later if needed (e.g., hard drop 'ArrowUp' or 'w')
            }
        });

        // Optional: Reset torque on keyup to prevent continuous spin after release
        document.addEventListener('keyup', (event) => {
             if (!Game.currentBlock || Game.isGameOver) {
                return;
            }
            // Reset torque when left/right keys are released
            if ((event.key === 'ArrowLeft' || event.key === 'a') && Game.currentBlock.torque < 0) {
                 Game.currentBlock.torque = 0;
            }
            if ((event.key === 'ArrowRight' || event.key === 'd') && Game.currentBlock.torque > 0) {
                 Game.currentBlock.torque = 0;
            }
        });

        console.log("Controls Setup Complete.");
    }

    // Expose the setup function
    return {
        setupControls: setupControls
    };
})();

// Make accessible globally
window.Controls = Controls; 