// Import Matter.js modules used in start()
const { Engine, Render, Runner, World, Bodies, Events, Query, Composite } = Matter;

const Game = {
    // --- Constants ---
    BLOCK_SIZE: 30, // Size of a single square unit in pixels
    GRID_WIDTH_BLOCKS: 10, // Width of the play area in blocks
    GRID_HEIGHT_BLOCKS: 20, // Height of the play area in blocks
    CANVAS_EXTRA_HEIGHT_BLOCKS: 2, // Extra space at the top for spawning
    DETECTION_ZONES_COUNT: 10, // Number of horizontal detection zones

    // Calculated Dimensions (in pixels)
    get PLAY_AREA_WIDTH() { return this.GRID_WIDTH_BLOCKS * this.BLOCK_SIZE; }, // e.g., 300
    get PLAY_AREA_HEIGHT() { return this.GRID_HEIGHT_BLOCKS * this.BLOCK_SIZE; }, // e.g., 600
    get PLAY_AREA_Y_OFFSET() { return this.CANVAS_EXTRA_HEIGHT_BLOCKS * this.BLOCK_SIZE; }, // Y offset where play area starts
    get CANVAS_WIDTH() { return this.PLAY_AREA_WIDTH; }, // Canvas width matches play area width
    get CANVAS_HEIGHT() { return (this.GRID_HEIGHT_BLOCKS + this.CANVAS_EXTRA_HEIGHT_BLOCKS) * this.BLOCK_SIZE; }, // e.g., 660
    get DETECTION_ZONE_HEIGHT() { return this.PLAY_AREA_HEIGHT / this.DETECTION_ZONES_COUNT; }, // e.g., 60

    // Spawning Coordinates (center horizontally, near top vertically)
    SPAWN_X: function() { return this.PLAY_AREA_WIDTH / 2; }, // Centered X
    SPAWN_Y: function() { return this.BLOCK_SIZE; },    // Spawn closer to the top edge (1 block down)

    // Tetromino Colors (example palette)
    COLORS: {
        I: '#00FFFF', // Cyan
        O: '#FFFF00', // Yellow
        T: '#800080', // Purple
        S: '#00FF00', // Green
        Z: '#FF0000', // Red
        J: '#0000FF', // Blue
        L: '#FFA500'  // Orange
    },

    // Background Stripe Colors (Slightly adjusted for visibility)
    STRIPE_COLOR_1: '#e8e8e8', // Lighter gray
    STRIPE_COLOR_2: '#d8d8d8', // Darker gray

    // --- Game State (will be expanded later) ---
    currentBlock: null,
    score: 0,
    difficulty: 1,
    isGameOver: false,
    topBoundary: null, // Added property to store the top boundary

    // --- Physics Engine Instances ---
    engine: null,
    render: null,
    runner: null,
    world: null,

    // --- Physics Settings (can be adjusted) ---
    gravity: { x: 0, y: 1 }, // Standard gravity
    friction: 0.1,
    restitution: 0.1, // Bounciness
    timeScale: 1, // Controls speed of simulation

    // --- Initialization Function ---
    start: function() {
        console.log("Starting Game Initialization...");

        // 1. Create Engine
        this.engine = Engine.create();
        this.world = this.engine.world;

        // Set gravity
        this.world.gravity.x = this.gravity.x;
        this.world.gravity.y = this.gravity.y;
        this.engine.timing.timeScale = this.timeScale;

        // Enable sleeping
        this.engine.enableSleeping = true; // Important for isSleeping detection

        // 2. Create Renderer (Modified options.background)
        const canvasElement = document.getElementById('game-canvas');
        this.render = Render.create({
            element: document.body,
            canvas: canvasElement,
            engine: this.engine,
            options: {
                width: this.CANVAS_WIDTH,
                height: this.CANVAS_HEIGHT,
                wireframes: false,
                background: 'transparent', // Set to transparent
                // hasBounds: true, // Optional: ensure renderer covers canvas if scaled
            }
        });

        // --- Setup Background Rendering (Zebra Stripes) --- (Modified clearRect)
        Events.on(this.render, 'beforeRender', (event) => {
            const context = this.render.context;
            const canvas = this.render.canvas;

            // Clear the ENTIRE canvas before drawing stripes
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Draw stripes only within the play area
            for (let i = 0; i < this.DETECTION_ZONES_COUNT; i++) {
                const zoneY = this.PLAY_AREA_Y_OFFSET + i * this.DETECTION_ZONE_HEIGHT;
                context.fillStyle = (i % 2 === 0) ? this.STRIPE_COLOR_1 : this.STRIPE_COLOR_2;
                context.fillRect(
                    0,                      // x start
                    zoneY,                  // y start
                    this.CANVAS_WIDTH,      // width
                    this.DETECTION_ZONE_HEIGHT // height
                );
            }
        });

        // --- 添加自定义方块渲染效果 ---
        Events.on(this.render, 'afterRender', (event) => {
            const context = this.render.context;
            const bodies = Composite.allBodies(this.world);
            
            // 遍历所有物体
            for (let i = 0; i < bodies.length; i++) {
                const body = bodies[i];
                
                // 检查是否为 T 型方块的一部分并且有内部图案标记
                if (body.hasInternalPattern) {
                    const pos = body.position;
                    const halfSize = this.BLOCK_SIZE / 2;
                    
                    // 绘制 T 型方块的内部花纹
                    context.save();
                    context.translate(pos.x, pos.y);
                    context.rotate(body.angle);
                    
                    // 绘制内部图案 (例如: 简单的 "T" 字母)
                    context.fillStyle = '#ffffff80'; // 半透明白色
                    context.font = `${this.BLOCK_SIZE * 0.7}px Arial`;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText('T', 0, 0);
                    
                    context.restore();
                }
            }
        });

        // 3. Create Runner
        this.runner = Runner.create();

        // 4. Initial Game Objects (Boundaries, first block, etc.)
        // --- Add Boundaries (Step 3 from roadmap) ---
        const wallOptions = {
            isStatic: true,
            render: { fillStyle: '#333' } // Dark grey walls
        };
        const topBoundaryY = 0; // 将位置调整到画布顶部可见位置
        const topBoundaryThickness = 4; // 稍微加粗边框

        // Create and store the top boundary body
        this.topBoundary = Bodies.rectangle(this.CANVAS_WIDTH / 2, topBoundaryY, this.CANVAS_WIDTH, topBoundaryThickness, {
            ...wallOptions,
            isSensor: true, // 仍然是传感器，不参与实际碰撞
            label: 'boundary-top',
            render: { 
                fillStyle: '#ff5500', // 醒目的橙色
                visible: true // 使边界可见
            }
        });

        // 先添加其他墙壁
        World.add(this.world, [
            // Ground (a bit thicker)
            Bodies.rectangle(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT, this.CANVAS_WIDTH, 10, { ...wallOptions, label: 'ground' }),
            // Left Wall
            Bodies.rectangle(0, this.CANVAS_HEIGHT / 2, 10, this.CANVAS_HEIGHT, { ...wallOptions, label: 'wall-left' }),
            // Right Wall
            Bodies.rectangle(this.CANVAS_WIDTH, this.CANVAS_HEIGHT / 2, 10, this.CANVAS_HEIGHT, { ...wallOptions, label: 'wall-right' }),
        ]);
        
        // 最后添加顶部边界，确保它在最上层显示
        World.add(this.world, this.topBoundary);
        
        console.log("Boundaries added.");

        // --- Add the first Tetromino ---
        this.spawnNewBlock(); // Use a dedicated function

        // 5. Run the engine and renderer -> Move this later
        // Render.run(this.render);
        // Runner.run(this.runner, this.engine);
        // console.log("Engine and Renderer running.");

        // 6. Setup Event Listeners (Collision for Game Over, Update for Spawning)
        this.setupEventListeners(); // New function call

        // 7. Run the engine and renderer (Moved here)
        Render.run(this.render);
        Runner.run(this.runner, this.engine);
        console.log("Engine and Renderer running.");

        // 8. Make canvas visible
        canvasElement.style.display = 'block';

        // 9. Setup Controls
        Controls.setupControls();

        console.log("Game Started!");
    },

    // Function to spawn a new block
    spawnNewBlock: function() {
        if (this.isGameOver) return; // Don't spawn if game is over

        console.log("Attempting to spawn new block...");
        const newBlock = Tetromino.createRandomTetromino(this.SPAWN_X(), this.SPAWN_Y());
        World.add(this.world, newBlock);
        this.currentBlock = newBlock;
        console.log("New Tetromino added:", newBlock.label);

        // Optional: Slightly wake up the block if sleeping is too aggressive initially
        // Matter.Sleeping.set(newBlock, false);
    },

    // Function to handle game over
    handleGameOver: function() {
        console.log("GAME OVER!");
        this.isGameOver = true;
        Runner.stop(this.runner); // Stop the physics simulation
        // Optional: Display game over message on screen
        // You could draw text on the canvas or update an HTML element
        const ctx = this.render.context;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, this.CANVAS_HEIGHT / 3, this.CANVAS_WIDTH, this.CANVAS_HEIGHT / 3);
        ctx.font = '48px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
    },

    // Setup Matter.js event listeners
    setupEventListeners: function() {
        // --- Spawning Next Block & Game Over Check (Modified 'afterUpdate') ---
        Events.on(this.engine, 'afterUpdate', () => {
            if (this.isGameOver) return; // Skip if game is already over

            // Check if the current block exists and is sleeping
            if (this.currentBlock && this.currentBlock.isSleeping) {
                const sleepingBlock = this.currentBlock; // Store reference before potentially nulling
                console.log(`Block ${sleepingBlock.label} is sleeping.`);

                // 检查是否与顶部边界碰撞（考虑到边界现在是可见的）
                // 注意：我们改变了顶部边界的位置，所以这里的检测逻辑可能需要微调
                const collisions = Query.collides(sleepingBlock, [this.topBoundary]);

                // 检查碰撞的严重程度 - 确保方块不仅仅是轻微接触顶部边界
                if (collisions.length > 0) {
                    // 检查碰撞深度
                    const collision = collisions[0];
                    const blockY = sleepingBlock.position.y;
                    
                    // 如果方块的中心非常接近顶部边界，则游戏结束
                    // 这可能需要根据实际游戏效果进行调整
                    if (blockY < this.BLOCK_SIZE * 2) {
                        console.log(`Block ${sleepingBlock.label} 在顶部停止. GAME OVER.`);
                        this.handleGameOver();
                    } else {
                        // 方块睡眠但没有危险地接近顶部 -> 安全生成下一个
                        this.currentBlock = null; // 标记当前方块已定居
                        this.spawnNewBlock();   // 生成下一个
                    }
                } else {
                    // 方块睡眠但没有触及顶部边界 -> 安全生成下一个
                    this.currentBlock = null; // 标记当前方块已定居
                    this.spawnNewBlock();   // 生成下一个
                }
            }
        });
    }
};

// Make it accessible globally or via module system if you evolve the project
window.Game = Game; 