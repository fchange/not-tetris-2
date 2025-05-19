// Import Matter.js modules used in start()
const { Engine, Render, Runner, World, Bodies, Events, Query, Composite, Body, Vector } = Matter;

const Game = {
    // --- Constants ---
    BLOCK_SIZE: 30, // Size of a single square unit in pixels
    GRID_WIDTH_BLOCKS: 10, // Width of the play area in blocks
    GRID_HEIGHT_BLOCKS: 20, // Height of the play area in blocks
    CANVAS_EXTRA_HEIGHT_BLOCKS: 0, // Extra space at the top for spawning
    DETECTION_ZONES_COUNT: 20, // Number of horizontal detection zones
    DETECTION_ZONE_FILL_THRESHOLD: 0.6, // 60% fill threshold for clearing

    // Scoring Constants
    BASE_SCORE_PER_CLEAR: 100, // Base points for clearing a zone
    DIFFICULTY_MULTIPLIER_STEP: 0.1, // How much the difficulty increases per level
    FIBONACCI_SEQUENCE: [1, 1, 2, 3, 5, 8, 13, 21], // For combo multipliers
    HEIGHT_BONUS_FACTOR: 0.05, // 5% bonus per height unit above the bottom
    COMBO_TIME_WINDOW_MS: 5000, // Time window for maintaining combos (5 seconds)

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
    highScore: 0,
    difficulty: 1,
    isGameOver: false,
    topBoundary: null, // Added property to store the top boundary
    blocksSettled: false, // Flag to track when all blocks have settled
    stripeZones: [], // Array to store the stripe zone bodies
    
    // Score tracking
    comboCount: 0, // Number of consecutive zone clears
    lastComboTime: 0, // Time of the last combo
    zonesCleared: 0, // Total zones cleared
    currentClearEvent: [], // Zones cleared in the current pass
    
    // Progress bars for detection zones
    progressBars: [], // Array to store progress bar elements
    zoneFillRatios: [], // Array to store fill ratios for each zone

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
            element: document.getElementById('game-canvas').parentNode,
            canvas: canvasElement,
            engine: this.engine,
            options: {
                width: this.CANVAS_WIDTH,
                height: this.CANVAS_HEIGHT,
                wireframes: false,
                background: 'transparent', // Set to transparent
                showSleeping: false, // 禁用睡眠状态透明效果
                // hasBounds: true, // Optional: ensure renderer covers canvas if scaled
            }
        });

        // 3. Create Runner
        this.runner = Runner.create();

        // 4. Prepare game environment (boundaries and background)
        this.prepareEnvironment();
        
        // 5. Initialize zone detection environment
        ZoneDetection.initEnvironment(this.world, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

        // 6. Initialize score display
        this.initializeScoreDisplay();

        // 7. Add the first Tetromino
        this.spawnNewBlock();

        // 8. Setup Event Listeners (Collision for Game Over, Update for Spawning)
        this.setupEventListeners();

        // 9. Run the engine and renderer
        Render.run(this.render);
        Runner.run(this.runner, this.engine);
        console.log("Engine and Renderer running.");

        // 10. Make canvas visible
        canvasElement.style.display = 'block';

        // 11. Setup Controls
        Controls.setupControls();

        console.log("Game Started!");
    },

    // Function to prepare game environment (boundaries and detection zone background)
    prepareEnvironment: function() {
        // --- Setup boundaries ---
        const wallOptions = {
            isStatic: true,
            render: { fillStyle: '#333' } // Dark grey walls
        };
        const topBoundaryY = 0; // 位于画布顶部
        const topBoundaryThickness = 4; // 稍微加粗边框

        // Create and store the top boundary body
        this.topBoundary = Bodies.rectangle(this.CANVAS_WIDTH / 2, topBoundaryY, this.CANVAS_WIDTH, topBoundaryThickness, {
            ...wallOptions,
            isSensor: true, // 仍然是传感器，不参与实际碰撞
            label: 'boundary-top',
            render: { 
                fillStyle: '#ff5500', // 醒目的橙色
                visible: false // 使边界可见
            }
        });

        // 先添加其他墙壁
        World.add(this.world, [
            // Ground (a bit thicker)
            Bodies.rectangle(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT + 5, this.CANVAS_WIDTH, 10, { ...wallOptions, label: 'ground' }),
            // Left Wall
            Bodies.rectangle(-5, this.CANVAS_HEIGHT / 2, 10, this.CANVAS_HEIGHT, { ...wallOptions, label: 'wall-left' }),
            // Right Wall
            Bodies.rectangle(this.CANVAS_WIDTH + 5, this.CANVAS_HEIGHT / 2, 10, this.CANVAS_HEIGHT, { ...wallOptions, label: 'wall-right' }),
        ]);
        
        // 最后添加顶部边界，确保它在最上层显示
        World.add(this.world, this.topBoundary);
        
        console.log("Boundaries added.");
    },

    // Function to spawn a new block
    spawnNewBlock: function() {
        if (this.isGameOver) return; // Don't spawn if game is over

        console.log("Attempting to spawn new block...");
        const newBlock = Tetromino.createRandomTetromino(this.SPAWN_X(), this.SPAWN_Y());
        World.add(this.world, newBlock);
        this.currentBlock = newBlock;
        console.log("New Tetromino added:", newBlock.label);
    },

    // Function to handle game over
    handleGameOver: function() {
        console.log("GAME OVER!");
        this.isGameOver = true;
        Runner.stop(this.runner); // Stop the physics simulation
        
        // Check for high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('tetrisHighScore', this.highScore);
            console.log(`New high score: ${this.highScore}!`);
        }
        
        // Display game over message on screen
        const ctx = this.render.context;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, this.CANVAS_HEIGHT / 3, this.CANVAS_WIDTH, this.CANVAS_HEIGHT / 3);
        ctx.font = '48px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2 - 24);
        
        // Show final score
        ctx.font = '24px sans-serif';
        ctx.fillText(`Final Score: ${this.score}`, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2 + 24);
        
        // Show high score
        ctx.fillText(`High Score: ${this.highScore}`, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2 + 60);
    },

    // Clear a zone (with help from ZoneDetection module)
    clearZone: function(zoneIndex, bodiesInZone) {
        const zoneY = this.PLAY_AREA_Y_OFFSET + zoneIndex * this.DETECTION_ZONE_HEIGHT;
        
        // Use ZoneDetection module to handle the physics part
        const newBodies = ZoneDetection.clearZone(
            this.world, 
            zoneIndex, 
            bodiesInZone, 
            zoneY, 
            this.DETECTION_ZONE_HEIGHT
        );
        
        // Add visual effect for zone clearing
        ZoneDetection.addClearingVisualEffect(zoneIndex);
        
        // Track this zone in the current clear event
        this.currentClearEvent.push(zoneIndex);
        
        // Increment total zones cleared count
        this.zonesCleared++;
        
        // Update difficulty based on zones cleared
        this.updateDifficulty();
        
        // Add point for this zone with height bonus
        this.scoreZoneClear(zoneIndex);
        
        // Reset the progress bar for this zone
        ZoneDetection.updateProgressBar(zoneIndex, 0);
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

                // Mark the current block as settled (no longer player controlled)
                this.currentBlock = null;
                
                // Check if any block touches top boundary
                const collisions = Query.collides(sleepingBlock, [this.topBoundary]);
                if (collisions.length > 0) {
                    const blockY = sleepingBlock.position.y;
                    
                    // If block's center is very close to top, game over
                    if (blockY < this.BLOCK_SIZE * 2) {
                        console.log(`Block ${sleepingBlock.label} 在顶部停止. GAME OVER.`);
                        this.handleGameOver();
                        return;
                    }
                }
                
                // Reset current clear event
                this.currentClearEvent = [];
                
                // Check for zone clearing using ZoneDetection module
                ZoneDetection.checkDetectionZones(
                    this.world,
                    null, // Current block is already null at this point
                    ZoneDetection.updateProgressBar.bind(ZoneDetection),
                    this.clearZone.bind(this)
                );
                
                // If we cleared any zones in this pass, log the event
                if (this.currentClearEvent.length > 0) {
                    console.log(`Cleared ${this.currentClearEvent.length} zones in one pass!`);
                }
                
                // Spawn next block if game continues
                if (!this.isGameOver) {
                    this.spawnNewBlock();
                }
            }
            
            // Continuously update progress bars and check zones while game is running
            if (!this.isGameOver) {
                ZoneDetection.checkDetectionZones(
                    this.world,
                    this.currentBlock,
                    ZoneDetection.updateProgressBar.bind(ZoneDetection),
                    null // No clearing during continuous updates
                );
            }
        });
    },

    // Initialize the score display
    initializeScoreDisplay: function() {
        // Reset all score-related values
        this.score = 0;
        this.comboCount = 0;
        this.zonesCleared = 0;
        this.difficulty = 1;
        this.currentClearEvent = [];
        
        // Load high score from localStorage if available
        const savedHighScore = localStorage.getItem('tetrisHighScore');
        if (savedHighScore) {
            this.highScore = parseInt(savedHighScore);
        } else {
            this.highScore = 0;
        }
        
        // Update all UI elements
        this.updateScoreDisplay();
    },
    
    // Score a zone clear with appropriate bonuses
    scoreZoneClear: function(zoneIndex) {
        // Increment combo (consecutive clears)
        this.incrementCombo();
        
        // Get base score with difficulty multiplier
        const baseScore = this.BASE_SCORE_PER_CLEAR * this.difficulty;
        
        // Apply height bonus (higher zones = more points)
        const heightBonus = this.getHeightBonus(zoneIndex);
        
        // Apply combo multiplier
        const comboMultiplier = this.getComboMultiplier();
        
        // Calculate total score for this clear
        const totalPoints = Math.floor(baseScore * heightBonus * comboMultiplier);
        
        // Add points to the score
        this.addPoints(totalPoints);
        
        console.log(`Zone ${zoneIndex} cleared! +${totalPoints} points (base:${baseScore}, height:x${heightBonus.toFixed(2)}, combo:x${comboMultiplier})`);
    },
    
    // Update all score-related UI elements
    updateScoreDisplay: function() {
        // Update score
        const scoreElement = document.getElementById('score-value');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
        
        // Update combo
        const comboElement = document.getElementById('combo-counter');
        if (comboElement) {
            comboElement.textContent = `x${this.comboCount + 1}`;
            
            // Apply animation only for combos higher than 1
            if (this.comboCount > 0) {
                comboElement.classList.add('score-change');
                setTimeout(() => {
                    comboElement.classList.remove('score-change');
                }, 300);
            }
        }
        
        // Update difficulty/level
        const difficultyElement = document.getElementById('difficulty-level');
        if (difficultyElement) {
            difficultyElement.textContent = Math.floor(this.difficulty);
        }
        
        // Update high score
        const highScoreElement = document.getElementById('high-score');
        if (highScoreElement) {
            highScoreElement.textContent = this.highScore;
        }
    },
    
    // Calculate combo multiplier using Fibonacci sequence
    getComboMultiplier: function() {
        // Limit combo index to the length of the Fibonacci sequence array
        const comboIndex = Math.min(this.comboCount, this.FIBONACCI_SEQUENCE.length - 1);
        return this.FIBONACCI_SEQUENCE[comboIndex];
    },
    
    // Calculate height bonus based on zone position
    getHeightBonus: function(zoneIndex) {
        // Calculate relative height from bottom (0 = bottom, 1 = top)
        const heightFromBottom = 1 - (zoneIndex / this.DETECTION_ZONES_COUNT); 
        // Apply bonus factor (higher zones get higher bonus)
        return 1 + (heightFromBottom * this.HEIGHT_BONUS_FACTOR * this.DETECTION_ZONES_COUNT);
    },
    
    // Add points to the score with animations
    addPoints: function(points) {
        const oldScore = this.score;
        this.score += points;
        
        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('tetrisHighScore', this.highScore);
        }
        
        // Animate the score change
        const scoreElement = document.getElementById('score-value');
        if (scoreElement) {
            scoreElement.classList.add('score-change');
            setTimeout(() => {
                scoreElement.classList.remove('score-change');
            }, 300);
        }
        
        // Update all score displays
        this.updateScoreDisplay();
        
        console.log(`Score increased by ${points} points. New score: ${this.score}`);
    },
    
    // Increment combo count and manage combo timing
    incrementCombo: function() {
        const now = Date.now();
        
        // If this is not the first clear in a series of clears
        if (this.currentClearEvent.length > 0) {
            this.comboCount++;
        } else {
            // Check if we're within the combo time window
            if (now - this.lastComboTime <= this.COMBO_TIME_WINDOW_MS) {
                this.comboCount++;
            } else {
                // Combo expired, reset to 0
                this.comboCount = 0;
            }
        }
        
        // Update the last combo time
        this.lastComboTime = now;
        
        // Update combo display
        this.updateScoreDisplay();
        
        console.log(`Combo increased to x${this.comboCount + 1}`);
    },
    
    // Increase difficulty based on zones cleared
    updateDifficulty: function() {
        // Increase difficulty every 10 zones cleared
        this.difficulty = 1 + Math.floor(this.zonesCleared / 10) * this.DIFFICULTY_MULTIPLIER_STEP;
        
        // Update visuals for difficulty
        this.updateScoreDisplay();
        
        // Adjust game physics based on difficulty (optional)
        // this.engine.timing.timeScale = 1 + (this.difficulty - 1) * 0.1;
        
        console.log(`Difficulty updated to ${this.difficulty.toFixed(1)}`);
    },
};

// Make it accessible globally or via module system if you evolve the project
window.Game = Game; 