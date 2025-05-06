// Import Matter.js modules used in start()
const { Engine, Render, Runner, World, Bodies, Events, Query } = Matter;

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

        // 2. Create Renderer
        const canvasElement = document.getElementById('game-canvas');
        this.render = Render.create({
            element: document.body, // Render target element
            canvas: canvasElement,
            engine: this.engine,
            options: {
                width: this.CANVAS_WIDTH,
                height: this.CANVAS_HEIGHT,
                wireframes: false,
                background: '#fafafa'
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
        const topBoundaryY = -5; // Position of the invisible top boundary
        const topBoundaryThickness = 10;

        // Create and store the top boundary body
        this.topBoundary = Bodies.rectangle(this.CANVAS_WIDTH / 2, topBoundaryY, this.CANVAS_WIDTH, topBoundaryThickness, {
            ...wallOptions,
            isSensor: true,
            label: 'boundary-top',
            render: { visible: false }
        });

        World.add(this.world, [
            // Ground (a bit thicker)
            Bodies.rectangle(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT, this.CANVAS_WIDTH, 10, { ...wallOptions, label: 'ground' }),
            // Left Wall
            Bodies.rectangle(0, this.CANVAS_HEIGHT / 2, 10, this.CANVAS_HEIGHT, { ...wallOptions, label: 'wall-left' }),
            // Right Wall
            Bodies.rectangle(this.CANVAS_WIDTH, this.CANVAS_HEIGHT / 2, 10, this.CANVAS_HEIGHT, { ...wallOptions, label: 'wall-right' }),
            this.topBoundary // Add the stored top boundary to the world
        ]);
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
        // --- Remove the 'collisionStart' listener for game over ---
        // Events.on(this.engine, 'collisionStart', (event) => { ... }); // Removed

        // --- Spawning Next Block & Game Over Check (Modified 'afterUpdate') ---
        Events.on(this.engine, 'afterUpdate', () => {
            if (this.isGameOver) return; // Skip if game is already over

            // Check if the current block exists and is sleeping
            if (this.currentBlock && this.currentBlock.isSleeping) {
                const sleepingBlock = this.currentBlock; // Store reference before potentially nulling
                console.log(`Block ${sleepingBlock.label} is sleeping.`);

                // Check for collision with top boundary *now* that it's sleeping
                const collisions = Query.collides(sleepingBlock, [this.topBoundary]);

                if (collisions.length > 0) {
                    // It's sleeping AND touching the top boundary sensor -> Game Over
                    console.log(`Block ${sleepingBlock.label} stopped touching the top boundary. GAME OVER.`);
                    this.handleGameOver();
                } else {
                    // It's sleeping but NOT touching the top boundary -> Safe to spawn next
                    this.currentBlock = null; // Mark current block as settled
                    this.spawnNewBlock();   // Spawn the next one
                }
            }
        });
    }
};

// Make it accessible globally or via module system if you evolve the project
window.Game = Game; 