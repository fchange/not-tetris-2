// Depends on Matter.js (Bodies, Body, Composite) and Game.js (BLOCK_SIZE, COLORS, SPAWN_X, SPAWN_Y)

const Tetromino = (() => {
    const { Bodies, Body, Composite } = Matter; // Destructure Matter.js modules
    const { BLOCK_SIZE, COLORS, friction, restitution, SPAWN_X, SPAWN_Y } = Game; // Get constants from Game

    // Define block positions relative to a central point (0, 0)
    // Each shape is composed of 4 blocks of size BLOCK_SIZE
    const shapes = {
        // I: 水平四个方块 ████
        I: [
            { x: -BLOCK_SIZE * 1.5, y: 0 },
            { x: -BLOCK_SIZE * 0.5, y: 0 },
            { x: BLOCK_SIZE * 0.5, y: 0 },
            { x: BLOCK_SIZE * 1.5, y: 0 }
        ],
        // O: 2x2方块 ██
        //           ██
        O: [
            { x: -BLOCK_SIZE * 0.5, y: -BLOCK_SIZE * 0.5 },
            { x: BLOCK_SIZE * 0.5, y: -BLOCK_SIZE * 0.5 },
            { x: -BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 0.5 },
            { x: BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 0.5 }
        ],
        // T: T形方块  █
        //           ███
        T: [
            { x: 0, y: -BLOCK_SIZE },
            { x: -BLOCK_SIZE, y: 0 },
            { x: 0, y: 0 },
            { x: BLOCK_SIZE, y: 0 }
        ],
        // S: S形方块  ██
        //           ██
        S: [
            { x: 0, y: -BLOCK_SIZE },
            { x: BLOCK_SIZE, y: -BLOCK_SIZE },
            { x: -BLOCK_SIZE, y: 0 },
            { x: 0, y: 0 }
        ],
        // Z: Z形方块 ██
        //            ██
        Z: [
            { x: -BLOCK_SIZE, y: -BLOCK_SIZE },
            { x: 0, y: -BLOCK_SIZE },
            { x: 0, y: 0 },
            { x: BLOCK_SIZE, y: 0 }
        ],
        // J: J形方块   █
        //           ███
        J: [
            { x: BLOCK_SIZE, y: -BLOCK_SIZE },
            { x: -BLOCK_SIZE, y: 0 },
            { x: 0, y: 0 },
            { x: BLOCK_SIZE, y: 0 }
        ],
        // L: L形方块 █
        //           ███
        L: [
            { x: -BLOCK_SIZE, y: -BLOCK_SIZE },
            { x: -BLOCK_SIZE, y: 0 },
            { x: 0, y: 0 },
            { x: BLOCK_SIZE, y: 0 }
        ]
    };

    const shapeTypes = Object.keys(shapes); // ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

    // Function to create a single block
    function createBlock(x, y, color, options = {}) {
        // 提取特殊效果选项
        const blockEffects = options.blockEffects || {};
        const index = options.index || 0;
        
        // 添加亮色边缘，增强视觉效果
        const lighterColor = getLighterColor(color, 40); // 获取更亮的颜色变体
        
        // 应用渲染选项
        const renderOptions = {
            fillStyle: color,
            strokeStyle: lighterColor, // 使用亮色作为边框
            lineWidth: 2
        };
        
        // 根据特殊效果修改渲染选项
        if (blockEffects.useGradient) {
            // 对 I 型方块使用渐变色 - 从左到右或从上到下
            const darkerColor = getDarkerColor(color, 30);
            renderOptions.fillStyle = darkerColor;
            // 对不同位置的方块使用不同的颜色深度
            renderOptions.strokeStyle = index % 2 === 0 ? lighterColor : color;
        }
        
        // 构建方块选项
        const blockOptions = {
            ...options,
            render: renderOptions
        };
        
        // 应用特殊形状效果
        if (blockEffects.chamfer) {
            blockOptions.chamfer = blockEffects.chamfer;
        }
        
        // 创建基本方块
        const block = Bodies.rectangle(x, y, BLOCK_SIZE, BLOCK_SIZE, blockOptions);
        
        // 应用后期效果
        if (blockEffects.internalPattern) {
            // 为 T 型方块添加特殊属性，可以在渲染周期中使用
            block.hasInternalPattern = true;
        }
        
        return block;
    }
    
    // 辅助函数：根据基础颜色生成更亮的颜色变体
    function getLighterColor(hexColor, percent) {
        // 解析十六进制颜色
        let r = parseInt(hexColor.substring(1, 3), 16);
        let g = parseInt(hexColor.substring(3, 5), 16);
        let b = parseInt(hexColor.substring(5, 7), 16);
        
        // 增加每个颜色通道的值
        r = Math.min(255, r + percent);
        g = Math.min(255, g + percent);
        b = Math.min(255, b + percent);
        
        // 将颜色转换回十六进制格式
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    // 辅助函数：根据基础颜色生成更暗的颜色变体
    function getDarkerColor(hexColor, percent) {
        // 解析十六进制颜色
        let r = parseInt(hexColor.substring(1, 3), 16);
        let g = parseInt(hexColor.substring(3, 5), 16);
        let b = parseInt(hexColor.substring(5, 7), 16);
        
        // 减少每个颜色通道的值
        r = Math.max(0, r - percent);
        g = Math.max(0, g - percent);
        b = Math.max(0, b - percent);
        
        // 将颜色转换回十六进制格式
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // Function to create a random Tetromino using compound bodies
    function createRandomTetromino(x = SPAWN_X, y = SPAWN_Y) {
        // 1. Select a random shape type
        const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];

        // 2. Get block positions and color
        const blockPositions = shapes[type];
        const color = COLORS[type];

        // 3. Define common body options
        const options = {
            friction: friction,
            restitution: restitution,
            label: `tetromino-${type}` // Add a label for easier identification
        };

        // 4. 特殊样式效果：根据方块类型定制
        let blockEffects = {};
        switch(type) {
            case 'I':
                // I型方块 - 给每个方块添加渐变填充
                blockEffects = { useGradient: true };
                break;
            case 'O':
                // O型方块 - 圆角矩形效果
                blockEffects = { chamfer: { radius: BLOCK_SIZE * 0.2 } };
                break;
            case 'T':
                // T型方块 - 添加内部图案
                blockEffects = { internalPattern: true };
                break;
            // 其他方块类型保持默认样式
        }

        // 5. Create individual blocks
        const blocks = blockPositions.map((pos, index) => {
            // Calculate absolute position
            const blockX = x + pos.x;
            const blockY = y + pos.y;
            
            // 创建方块时应用特殊效果
            return createBlock(blockX, blockY, color, { 
                ...options,
                blockEffects: blockEffects,
                index: index // 传递索引以便在方块创建中使用
            });
        });

        // 6. Create a compound body from the individual blocks
        // The first block is used as the "parent" body
        const mainBody = blocks[0];
        
        // Make a compound body by combining all blocks
        const compoundBody = Body.create({
            parts: blocks,
            friction: friction,
            restitution: restitution,
        });
        
        // Ensure the compound body has the proper label
        compoundBody.label = `tetromino-${type}`;
        // 存储方块类型以便后续使用
        compoundBody.tetrominoType = type;

        return compoundBody;
    }

    // Expose the creation function
    return {
        createRandomTetromino: createRandomTetromino
    };
})();

// Make it accessible globally
window.Tetromino = Tetromino; 