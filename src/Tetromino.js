// Depends on Matter.js (Bodies, Vertices, Body) and Game.js (BLOCK_SIZE, COLORS, SPAWN_X, SPAWN_Y)

const Tetromino = (() => {
    const { Bodies, Vertices, Body } = Matter; // Destructure Matter.js modules
    const { BLOCK_SIZE, COLORS, friction, restitution, SPAWN_X, SPAWN_Y } = Game; // Get constants from Game

    // Define vertices relative to a central point (0, 0)
    // Each shape is composed of 4 blocks of size BLOCK_SIZE
    const shapes = {
        I: [
            { x: -BLOCK_SIZE * 1.5, y: -BLOCK_SIZE * 0.5 }, { x: BLOCK_SIZE * 1.5, y: -BLOCK_SIZE * 0.5 },
            { x: BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 0.5 }, { x: -BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 0.5 }
        ],
        O: [
            { x: -BLOCK_SIZE, y: -BLOCK_SIZE }, { x: BLOCK_SIZE, y: -BLOCK_SIZE },
            { x: BLOCK_SIZE, y: BLOCK_SIZE }, { x: -BLOCK_SIZE, y: BLOCK_SIZE }
        ],
        T: [
            { x: -BLOCK_SIZE * 1.5, y: -BLOCK_SIZE * 0.5 }, { x: BLOCK_SIZE * 1.5, y: -BLOCK_SIZE * 0.5 },
            { x: BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 0.5 },  { x: BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 0.5 },
            { x: BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 1.5 }, { x: -BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 1.5 },
            { x: -BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 0.5 }, { x: -BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 0.5 },
        ],
        S: [
            { x: -BLOCK_SIZE * 0.5, y: -BLOCK_SIZE * 0.5 }, { x: BLOCK_SIZE * 1.5, y: -BLOCK_SIZE * 0.5 },
            { x: BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 0.5 }, { x: BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 0.5 },
            { x: BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 1.5 }, { x: -BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 1.5 },
            { x: -BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 0.5 }, { x: -BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 0.5 },
        ],
        Z: [
            { x: -BLOCK_SIZE * 1.5, y: -BLOCK_SIZE * 0.5 }, { x: BLOCK_SIZE * 0.5, y: -BLOCK_SIZE * 0.5 },
            { x: BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 0.5 }, { x: BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 0.5 },
            { x: BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 1.5 }, { x: -BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 1.5 },
            { x: -BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 0.5 }, { x: -BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 0.5 },
        ],
        J: [
            { x: -BLOCK_SIZE * 1.5, y: -BLOCK_SIZE * 1.5 }, { x: BLOCK_SIZE * 0.5, y: -BLOCK_SIZE * 1.5 },
            { x: BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 0.5 }, { x: -BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 0.5 },
            { x: -BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 1.5 }, { x: -BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 1.5 },
        ],
        L: [
            { x: -BLOCK_SIZE * 0.5, y: -BLOCK_SIZE * 1.5 }, { x: BLOCK_SIZE * 1.5, y: -BLOCK_SIZE * 1.5 },
            { x: BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 1.5 }, { x: BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 1.5 },
            { x: BLOCK_SIZE * 0.5, y: BLOCK_SIZE * 0.5 }, { x: -BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 0.5 },
            { x: -BLOCK_SIZE * 1.5, y: -BLOCK_SIZE * 0.5 }, { x: -BLOCK_SIZE * 0.5, y: -BLOCK_SIZE * 0.5 },
        ]
    };

    const shapeTypes = Object.keys(shapes); // ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

    // Function to create a random Tetromino body
    function createRandomTetromino(x = SPAWN_X, y = SPAWN_Y) {
        // 1. Select a random shape type
        const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];

        // 2. Get vertices and color
        const vertices = shapes[type];
        const color = COLORS[type];

        // 3. Define common body options
        const options = {
            friction: friction,
            restitution: restitution,
            render: {
                fillStyle: color,
                strokeStyle: '#000', // Black outline
                lineWidth: 1
            },
            label: `tetromino-${type}` // Add a label for easier identification
        };

        // 4. Create the body using vertices
        // Note: Matter.js will automatically calculate the center of mass from vertices
        const body = Bodies.fromVertices(x, y, [vertices], options); // Vertices need to be in a nested array

        // Optional: Adjust mass or density if needed, though default usually works well
        // Body.setMass(body, someValue);

        return body;
    }

    // Expose the creation function
    return {
        createRandomTetromino: createRandomTetromino
    };
})();

// Make it accessible globally
window.Tetromino = Tetromino; 