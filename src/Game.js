const Game = {
    // --- Constants ---
    BLOCK_SIZE: 30, // Size of a single square unit in pixels
    SPAWN_X: 200,   // Default X coordinate for spawning new blocks (center of canvas)
    SPAWN_Y: 50,    // Default Y coordinate for spawning new blocks (near top)

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

    // --- Physics Settings (can be adjusted) ---
    gravity: { x: 0, y: 1 }, // Standard gravity
    friction: 0.1,
    restitution: 0.1, // Bounciness
    timeScale: 1 // Controls speed of simulation
};

// Make it accessible globally or via module system if you evolve the project
window.Game = Game; 