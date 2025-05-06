// Import Matter.js modules used in start()
const { Engine, Render, Runner, World, Bodies } = Matter;

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
        World.add(this.world, [
            // Ground (a bit thicker)
            Bodies.rectangle(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT, this.CANVAS_WIDTH, 10, { ...wallOptions, label: 'ground' }),
            // Left Wall
            Bodies.rectangle(0, this.CANVAS_HEIGHT / 2, 10, this.CANVAS_HEIGHT, { ...wallOptions, label: 'wall-left' }),
            // Right Wall
            Bodies.rectangle(this.CANVAS_WIDTH, this.CANVAS_HEIGHT / 2, 10, this.CANVAS_HEIGHT, { ...wallOptions, label: 'wall-right' }),
            // Top Boundary (Invisible, slightly above canvas top)
            Bodies.rectangle(this.CANVAS_WIDTH / 2, -5, this.CANVAS_WIDTH, 10, { ...wallOptions, isSensor: true, label: 'boundary-top', render: { visible: false } })
        ]);
        console.log("Boundaries added.");


        // --- Add the first Tetromino ---
        const firstBlock = Tetromino.createRandomTetromino(this.SPAWN_X(), this.SPAWN_Y());
        World.add(this.world, firstBlock);
        this.currentBlock = firstBlock;
        console.log("First Tetromino added:", firstBlock.label);

        // 5. Run the engine and renderer
        Render.run(this.render);
        Runner.run(this.runner, this.engine);
        console.log("Engine and Renderer running.");

        // 6. Make canvas visible
        canvasElement.style.display = 'block';

        console.log("Game Started!");
    }
};

// Make it accessible globally or via module system if you evolve the project
window.Game = Game; 