// ZoneDetection.js
// Contains functionality for detecting filled zones and creating sliced bodies

// Assuming Matter.js is loaded globally or imported appropriately in the project
// const { Bodies, World, Composite } = Matter;

const ZoneDetection = {
    // Constants
    BLOCK_SIZE: 30, // Size of a single square unit in pixels
    GRID_WIDTH_BLOCKS: 10, // Width of the play area in blocks
    GRID_HEIGHT_BLOCKS: 20, // Height of the play area in blocks
    CANVAS_EXTRA_HEIGHT_BLOCKS: 0, // Extra space at the top for spawning
    DETECTION_ZONES_COUNT: 20, // Number of horizontal detection zones
    DETECTION_ZONE_FILL_THRESHOLD: 0.8, // fill threshold for clearing

    // Background Stripe Colors
    STRIPE_COLOR_1: '#e8e8e8', // Lighter gray
    STRIPE_COLOR_2: '#d8d8d8', // Darker gray

    // Internal state
    progressBars: [], // Array to store progress bar elements
    zoneFillRatios: [], // Array to store fill ratios for each zone
    stripeZones: [], // Array to store the stripe zone bodies

    // Calculated Dimensions (in pixels)
    get PLAY_AREA_WIDTH() { return this.GRID_WIDTH_BLOCKS * this.BLOCK_SIZE; }, // e.g., 300
    get PLAY_AREA_HEIGHT() { return this.GRID_HEIGHT_BLOCKS * this.BLOCK_SIZE; }, // e.g., 600
    get PLAY_AREA_Y_OFFSET() { return this.CANVAS_EXTRA_HEIGHT_BLOCKS * this.BLOCK_SIZE; }, // Y offset where play area starts
    get DETECTION_ZONE_HEIGHT() { return this.PLAY_AREA_HEIGHT / this.DETECTION_ZONES_COUNT; }, // e.g., 60

    // Initialize the zone detection environment
    initEnvironment: function(world, canvasWidth, canvasHeight) {
        console.log("Initializing zone detection environment...");
        
        // Create background stripes and progress bars
        this.createBackgroundStripes(world, canvasWidth);
        this.createProgressBars(canvasHeight);
    },

    // Create background stripes as physical bodies
    createBackgroundStripes: function(world, canvasWidth) {
        console.log("Creating background stripes as physical bodies...");
        
        // Clear existing stripes
        this.stripeZones = [];
        
        // Create detection zones as physical bodies
        for (let i = 0; i < this.DETECTION_ZONES_COUNT; i++) {
            const zoneY = this.PLAY_AREA_Y_OFFSET + i * this.DETECTION_ZONE_HEIGHT;
            // Position is at center of zone
            const zoneCenterY = zoneY + (this.DETECTION_ZONE_HEIGHT / 2);
            
            const stripeOptions = {
                isStatic: true,
                isSensor: true, // Don't interact with other bodies
                collisionFilter: {
                    category: 0x0002, // Custom category for background
                    mask: 0x0000 // Don't collide with anything
                },
                render: {
                    fillStyle: (i % 2 === 0) ? this.STRIPE_COLOR_1 : this.STRIPE_COLOR_2,
                    opacity: 1.0
                },
                label: `stripe-zone-${i}`
            };
            
            // Create a rectangle body for the stripe
            const stripe = Bodies.rectangle(
                canvasWidth / 2, // center x
                zoneCenterY,     // center y
                canvasWidth,     // width
                this.DETECTION_ZONE_HEIGHT, // height
                stripeOptions
            );
            
            // Add to the world
            World.add(world, stripe);
            
            // Store reference to stripe
            this.stripeZones.push(stripe);
        }
        
        console.log(`Created ${this.stripeZones.length} background stripe bodies`);
    },

    // Create progress bars for each detection zone
    createProgressBars: function(canvasHeight) {
        console.log("Creating progress bars for detection zones...");
        
        // Clear existing progress bars if any
        this.progressBars = [];
        this.zoneFillRatios = new Array(this.DETECTION_ZONES_COUNT).fill(0);
        
        // Get the container for progress bars
        const container = document.getElementById('progress-bars-container');
        container.innerHTML = ''; // Clear container
        
        // Set container height to match canvas height
        container.style.height = canvasHeight + 'px';
        
        // Create a progress bar for each detection zone
        for (let i = 0; i < this.DETECTION_ZONES_COUNT; i++) {
            // Create progress bar container
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.style.height = this.DETECTION_ZONE_HEIGHT + 'px';
            
            // Create progress indicator (the part that fills)
            const progressIndicator = document.createElement('div');
            progressIndicator.className = 'progress-indicator';
            progressIndicator.style.width = '0%'; // Start with 0% fill
            
            // Add indicator to progress bar
            progressBar.appendChild(progressIndicator);
            
            // Add progress bar to container
            container.appendChild(progressBar);
            
            // Store reference to progress bar element
            this.progressBars.push(progressIndicator);
        }
        
        console.log(`Created ${this.progressBars.length} progress bars`);
    },

    // Update progress bar for a specific zone
    updateProgressBar: function(zoneIndex, fillRatio) {
        if (zoneIndex < 0 || zoneIndex >= this.progressBars.length) return;
        
        // Store the fill ratio
        this.zoneFillRatios[zoneIndex] = fillRatio;
        
        // Update the progress bar width
        const percentage = Math.min(Math.max(fillRatio * 100, 0), 100); // Ensure between 0-100%
        this.progressBars[zoneIndex].style.width = percentage + '%';
    },

    // Add visual effect for zone clearing
    addClearingVisualEffect: function(zoneIndex) {
        // Get the stripe object for this zone
        const stripe = this.stripeZones[zoneIndex];
        if (!stripe) return;
        
        // Store original color and create flash animation
        const originalColor = stripe.render.fillStyle;
        let opacity = 1.0;
        let flashing = true;
        
        // Flash the zone by changing the stripe's color
        const flashInterval = setInterval(() => {
            if (!flashing) return;
            
            // Alternate between white and original color with fading opacity
            if (opacity > 0.5) {
                stripe.render.fillStyle = '#ffffff'; // White flash
            } else {
                stripe.render.fillStyle = originalColor; // Return to original
            }
            
            // Reduce opacity
            opacity -= 0.1;
            if (opacity <= 0) {
                clearInterval(flashInterval);
                flashing = false;
                stripe.render.fillStyle = originalColor; // Ensure we end on original color
            }
        }, 50);
        
        // Also flash the progress bar
        const progressBar = this.progressBars[zoneIndex];
        if (progressBar) {
            progressBar.style.backgroundColor = '#ffffff'; // Flash white
            setTimeout(() => {
                progressBar.style.backgroundColor = '#000000'; // Return to black
            }, 200);
        }
    },

    // Check detection zones for area coverage
    checkDetectionZones: function(world, currentBlock, updateProgressBar, clearZoneCallback) {
        // Process from bottom to top (more logical for Tetris)
        for (let zoneIndex = this.DETECTION_ZONES_COUNT - 1; zoneIndex >= 0; zoneIndex--) {
            const zoneY = this.PLAY_AREA_Y_OFFSET + zoneIndex * this.DETECTION_ZONE_HEIGHT;
            const zoneTop = zoneY;
            const zoneBottom = zoneY + this.DETECTION_ZONE_HEIGHT;
            const zoneWidth = this.PLAY_AREA_WIDTH;
            const zoneArea = zoneWidth * this.DETECTION_ZONE_HEIGHT;
            
            // Get all bodies (excluding walls/boundaries)
            const bodies = Composite.allBodies(world).filter(body => 
                !body.isStatic && 
                !body.isSensor
            );
            
            // Calculate covered area in this zone
            let coveredArea = 0;
            let bodiesInZone = [];
            
            for (let i = 0; i < bodies.length; i++) {
                const body = bodies[i];
                
                // Skip the current active block when calculating fill ratios
                if (body === currentBlock) continue;
                
                // Check if body is in this zone
                if (this.isBodyInZone(body, zoneTop, zoneBottom)) {
                    // Calculate area of body that's in this zone
                    const areaInZone = this.calculateBodyAreaInZone(body, zoneTop, zoneBottom);
                    coveredArea += areaInZone;
                    
                    // If any part of body is in this zone, add to list
                    if (areaInZone > 0) {
                        bodiesInZone.push(body);
                    }
                }
            }
            
            // Check if zone is filled enough to clear
            const fillRatio = coveredArea / zoneArea;
            
            // Update progress bar for this zone if a callback is provided
            if (typeof updateProgressBar === 'function') {
                updateProgressBar(zoneIndex, fillRatio);
            }
            
            // Only clear zones if fill ratio exceeds threshold
            if (fillRatio >= this.DETECTION_ZONE_FILL_THRESHOLD) {
                console.log(`Zone ${zoneIndex} is full enough for clearing!`);
                
                // Call the clearZone callback if provided
                if (typeof clearZoneCallback === 'function') {
                    clearZoneCallback(zoneIndex, bodiesInZone);
                }
            }
        }
    },
    
    // Check if a body is in a specific zone
    isBodyInZone: function(body, zoneTop, zoneBottom) {
        // Using vertices to check if any part of the body is in the zone
        for (const vertex of body.vertices) {
            if (vertex.y >= zoneTop && vertex.y <= zoneBottom) {
                return true;
            }
        }
        
        // Also check if a body completely covers the zone (no vertices in zone)
        const highestY = Math.min(...body.vertices.map(v => v.y));
        const lowestY = Math.max(...body.vertices.map(v => v.y));
        
        if (highestY < zoneTop && lowestY > zoneBottom) {
            return true;
        }
        
        return false;
    },
    
    // Calculate the area of a body that's in a specific zone
    calculateBodyAreaInZone: function(body, zoneTop, zoneBottom) {
        // This is a simplified calculation - for more accuracy you might need
        // a more complex polygon intersection algorithm
        
        // First, check if body is completely in the zone
        const highestY = Math.min(...body.vertices.map(v => v.y));
        const lowestY = Math.max(...body.vertices.map(v => v.y));
        
        if (highestY >= zoneTop && lowestY <= zoneBottom) {
            // Body is completely in the zone - return its full area
            return body.area;
        }
        
        // For partly overlapping bodies, estimate the overlap area
        // This is a rough approximation - could be improved
        if (lowestY > zoneTop && highestY < zoneBottom) {
            const totalHeight = lowestY - highestY;
            const overlapTop = Math.max(zoneTop, highestY);
            const overlapBottom = Math.min(zoneBottom, lowestY);
            const overlapHeight = overlapBottom - overlapTop;
            
            // Approximate the area by height ratio
            return body.area * (overlapHeight / totalHeight);
        }
        
        return 0;
    },
    
    // Clear a zone by removing bodies in it and creating new bodies as needed
    clearZone: function(world, zoneIndex, bodiesInZone) {
        const zoneY = this.PLAY_AREA_Y_OFFSET + zoneIndex * this.DETECTION_ZONE_HEIGHT;
        const zoneTop = zoneY;
        const zoneBottom = zoneY + this.DETECTION_ZONE_HEIGHT;
        
        // Bodies to add after removing the originals
        const newBodies = [];
        
        // Process each body in the zone
        for (const body of bodiesInZone) {
            // Check if body extends above or below the zone
            const highestY = Math.min(...body.vertices.map(v => v.y));
            const lowestY = Math.max(...body.vertices.map(v => v.y));
            
            // Remove the original body
            World.remove(world, body);
            
            // If body extends above zone, create new body for top part
            if (highestY < zoneTop) {
                const topPart = this.createBodySlice(body, highestY, zoneTop);
                if (topPart) newBodies.push(topPart);
            }
            
            // If body extends below zone, create new body for bottom part
            if (lowestY > zoneBottom) {
                const bottomPart = this.createBodySlice(body, zoneBottom, lowestY);
                if (bottomPart) newBodies.push(bottomPart);
            }
        }
        
        // Add new bodies (sliced parts) back to the world
        if (newBodies.length > 0) {
            World.add(world, newBodies);
        }
        
        return newBodies;
    },
    
    // Create a slice of a body between two y-coordinates
    createBodySlice: function(originalBody, topY, bottomY) {
        // This is a simplified approach - in a real game you'd need more accurate geometry
        
        // For now, we'll create a rectangle with similar properties to the original
        const width = Math.max(...originalBody.vertices.map(v => v.x)) - 
                      Math.min(...originalBody.vertices.map(v => v.x));
        const height = bottomY - topY;
        const x = originalBody.position.x;
        const y = topY + height/2;
        
        // Create new body with same properties
        const slicedBody = Bodies.rectangle(x, y, width, height, {
            render: { 
                fillStyle: originalBody.render.fillStyle,
                strokeStyle: originalBody.render.strokeStyle,
                lineWidth: originalBody.render.lineWidth
            },
            // Preserve any custom properties from original body
            label: originalBody.label,
            hasInternalPattern: originalBody.hasInternalPattern
        });
        
        return slicedBody;
    }
};

// Make it accessible globally or via module system
window.ZoneDetection = ZoneDetection; 