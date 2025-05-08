// Depends on Matter.js (Body) and Game.js (currentBlock)

const Controls = (() => {
    const { Body } = Matter; // Destructure Matter.js module

    // --- Control Parameters ---
    const TORQUE_MAGNITUDE = 1.5; // 旋转力矩大小
    const DOWN_FORCE_MAGNITUDE = 0.1; // 下落加速力大小
    const MOVE_FORCE_MAGNITUDE = 0.01; // 水平移动力大小，从0.05减小到0.01

    function setupControls() {
        document.addEventListener('keydown', (event) => {
            // Ensure there's a current controllable block and the game isn't over
            if (!Game.currentBlock || Game.currentBlock.isSleeping || Game.isGameOver) {
                return; // Don't control settled blocks or when game is over
            }

            switch (event.key) {
                case 'ArrowLeft':
                case 'a': // 左方向键和a键功能相同
                    // 添加水平力向左移动方块
                    Body.applyForce(Game.currentBlock, Game.currentBlock.position, {
                        x: -MOVE_FORCE_MAGNITUDE * Game.currentBlock.mass,
                        y: 0
                    });
                    
                    // 同时施加逆时针扭矩（左旋转）
                    Game.currentBlock.torque = -TORQUE_MAGNITUDE;
                    break;

                case 'ArrowRight':
                case 'd': // 右方向键和d键功能相同
                    // 添加水平力向右移动方块
                    Body.applyForce(Game.currentBlock, Game.currentBlock.position, {
                        x: MOVE_FORCE_MAGNITUDE * Game.currentBlock.mass,
                        y: 0
                    });
                    
                    // 同时施加顺时针扭矩（右旋转）
                    Game.currentBlock.torque = TORQUE_MAGNITUDE;
                    break;

                case 'ArrowDown':
                case 's': // 下方向键和s键功能相同
                    // 施加向下的力加速下落
                    Body.applyForce(Game.currentBlock, Game.currentBlock.position, {
                        x: 0,
                        y: DOWN_FORCE_MAGNITUDE * Game.currentBlock.mass
                    });
                    break;

                // 移除q和e专门的旋转控制
            }
        });

        // 按键释放处理
        document.addEventListener('keyup', (event) => {
            if (!Game.currentBlock || Game.isGameOver) {
                return;
            }
            // 左右方向键/ad键释放时停止旋转
            if ((event.key === 'ArrowLeft' || event.key === 'a') && Game.currentBlock.torque < 0) {
                Game.currentBlock.torque = 0;
            }
            if ((event.key === 'ArrowRight' || event.key === 'd') && Game.currentBlock.torque > 0) {
                Game.currentBlock.torque = 0;
            }
            // 移除q和e键的处理
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