// enemy.js - Enhanced with Warcraft 3-style movement and pathfinding

class EnemySystem {
  constructor(noteSystem) {
    this.enemies = [];
    this.enemyProjectiles = [];
    this.aoeDamageZones = [];  // New for tracking AoE damage zones
    this.spawnTimer = 0;
    this.spawnRate = 950; // ms
    this.maxEnemies = 50;
    this.enemySize = 25;
    this.enemySpeed = 2;
    this.difficultyMultiplier = 1.0;
    this.noteSystem = noteSystem;
    this.baseMaxEnemies = 35;    // Starting value (level 1)
    this.enemiesPerLevel = 1.5;  // Additional enemies per level
    this.absoluteMaxEnemies = 99; // Hard cap for performance
    this.shouldSpawn = true;
    // Movement and pathfinding - Warcraft 3 style
    this.gridSize = 40; // Size of each grid cell for spatial indexing
    this.grid = {}; // Sparse grid for tracking occupied cells
    this.lastGridUpdate = 0;
    this.gridUpdateInterval = 100; // ms - how often to update spatial grid
    
    // Define enemy types
    this.ENEMY_TYPES = {
      BASIC: {
        name: "Beat Walker",
        size: 25,
        speed: 1.65,
        health: 1,
        color: "rgb(255, 68, 68)",
        dropMin: 1,
        dropMax: 1,
        unlockLevel: 1,
        symbol: "🐔",
        pathfindInterval: 800
      },
      SPEEDY: {
        name: "Sprinter",
        size: 25,
        speed: 3,
        health: 2,
        color: "rgba(255, 170, 34, 0.5)",
        dropMin: 1,
        dropMax: 3,
        unlockLevel: 5,
        symbol: "🐺",
        pathfindInterval: 500
      },
      TANK: {
        name: "Mute Titan",
        size: 40,
        speed: 1.3,
        health: 6,
        color: "rgb(136, 68, 255)",
        dropMin: 2,
        dropMax: 4,
        unlockLevel: 4,
        symbol: "🗿",
        pathfindInterval: 1200
      },
      RANGED: {
        name: "Dissonance Archer",
        size: 25,
        speed: 1.5,
        health: 2,
        color: "rgb(68, 204, 255)",
        dropMin: 2,
        dropMax: 3,
        unlockLevel: 8,
        attackRange: 300,
        attackRate: 2000,
        projectileSpeed: 4,
        projectileSize: 8,
        projectileColor: "rgb(34, 170, 238)",
        symbol: "🐲",
        pathfindInterval: 800
      },
      // New swarm unit
      SWARM: {
        name: "Rhythm Crawler",
        size: 20,
        speed: 2.2,
        health: 1,
        color: "rgb(230, 120, 50)",
        dropMin: 0,
        dropMax: 1,
        unlockLevel: 12,
        symbol: "🐜",
        pathfindInterval: 400,
        spawnInClusters: true,
        clusterSize: {min: 4, max: 8}
      },
      // New catapult unit
      CATAPULT: {
        name: "Echo Bombardier",
        size: 35,
        speed: 0.8,
        health: 5,
        color: "rgb(100, 50, 100)",
        dropMin: 2,
        dropMax: 4,
        unlockLevel: 14,
        symbol: "🧨",
        pathfindInterval: 1500,
        attackRange: 500,
        attackRate: 3000,
        projectileSpeed: 3,
        projectileSize: 12,
        projectileColor: "rgb(255, 100, 100)",
        aoeDamage: true,
        aoeDuration: 4000,
        aoeRadius: 90
      }
    };
  }

  // Update enemy system
update(deltaTime, playerX, playerY, level, camera) {
  // Update spawn timer
  this.spawnTimer += deltaTime;
      // Update difficulty multiplier based on level
    this.difficultyMultiplier = 1 + level * 0.12;
    
    // In the update method, replace fixed maxEnemies with:
    const currentMaxEnemies = Math.min(
      this.baseMaxEnemies + Math.floor((level - 1) * this.enemiesPerLevel),
      this.absoluteMaxEnemies
    );

  // Only spawn enemies if allowed
  if (this.shouldSpawn && this.spawnTimer >= this.spawnRate && this.enemies.length < currentMaxEnemies) {
    this.spawnEnemy(playerX, playerY, camera, level);
    this.spawnTimer = 0;
  }
    

    // Then use currentMaxEnemies in your spawn check
    if (this.spawnTimer >= this.spawnRate && this.enemies.length < currentMaxEnemies) {
      this.spawnEnemy(playerX, playerY, camera, level);
      this.spawnTimer = 0;
    }
    
    // Update the occupied grid periodically
    if (Date.now() - this.lastGridUpdate > this.gridUpdateInterval) {
      this.updateOccupiedGrid();
      this.lastGridUpdate = Date.now();
    }
    
    // Update enemy movement and behavior
    this.updateEnemies(deltaTime, playerX, playerY);
    
    // Update enemy projectiles
    this.updateProjectiles(deltaTime);
    
    // Update AoE damage zones
    this.updateAoeDamageZones(deltaTime);
  }

  // Make sure the reset method works correctly
  reset() {
    this.enemies = [];
    this.enemyProjectiles = [];
    this.aoeDamageZones = [];
    this.spawnTimer = 0;
    this.grid = {}; // Clear spatial grid
    console.log("Enemy system reset");
  }

  // Create a sparse grid of occupied cells for Warcraft 3-style spatial awareness
  updateOccupiedGrid() {
    // Clear the grid
    this.grid = {};
    
    // Add each enemy to the grid
    for (const enemy of this.enemies) {
      // Get the grid cell coordinates
      const cellX = Math.floor(enemy.x / this.gridSize);
      const cellY = Math.floor(enemy.y / this.gridSize);
      
      // Mark the cell as occupied
      const cellKey = `${cellX},${cellY}`;
      if (!this.grid[cellKey]) {
        this.grid[cellKey] = [];
      }
      this.grid[cellKey].push(enemy);
      
      // Also mark neighboring cells for larger enemies (Warcraft 3's clearance system)
      if (enemy.size > this.gridSize * 0.7) {
        // Mark a 3x3 grid for larger enemies
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue; // Skip center cell (already marked)
            
            const neighborKey = `${cellX + dx},${cellY + dy}`;
            if (!this.grid[neighborKey]) {
              this.grid[neighborKey] = [];
            }
            this.grid[neighborKey].push(enemy);
          }
        }
      }
    }
  }

  // Get enemies in a radius around a point (for Warcraft 3-style collision detection)
  getEnemiesInRadius(x, y, radius) {
    // Calculate grid cells that could contain enemies in the radius
    const startCellX = Math.floor((x - radius) / this.gridSize);
    const endCellX = Math.floor((x + radius) / this.gridSize);
    const startCellY = Math.floor((y - radius) / this.gridSize);
    const endCellY = Math.floor((y + radius) / this.gridSize);
    
    // Check each cell in the area
    const nearbyEnemies = [];
    const checkedEnemies = new Set(); // To avoid duplicates
    
    for (let cellX = startCellX; cellX <= endCellX; cellX++) {
      for (let cellY = startCellY; cellY <= endCellY; cellY++) {
        const cellKey = `${cellX},${cellY}`;
        const cellEnemies = this.grid[cellKey] || [];
        
        for (const enemy of cellEnemies) {
          // Skip if already checked this enemy
          if (checkedEnemies.has(enemy)) continue;
          checkedEnemies.add(enemy);
          
          // Check if enemy is within radius
          const dx = enemy.x - x;
          const dy = enemy.y - y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq <= radius * radius) {
            nearbyEnemies.push(enemy);
          }
        }
      }
    }
    
    return nearbyEnemies;
  }

  // Spawn a new enemy based on game level
 spawnEnemy(playerX, playerY, camera, level) {
  // Determine which enemy types are available based on level

    // Calculate spawn position outside visible area
    const screenWidth = camera.gameWidth;
    const screenHeight = camera.gameHeight;
    const bufferDistance = 100; // Distance beyond screen edge to spawn
    
    let x, y;
    const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    
    switch(side) {
      case 0: // top
        x = playerX + (Math.random() * screenWidth - screenWidth/2);
        y = playerY - screenHeight/2 - bufferDistance;
        break;
      case 1: // right
        x = playerX + screenWidth/2 + bufferDistance;
        y = playerY + (Math.random() * screenHeight - screenHeight/2);
        break;
      case 2: // bottom
        x = playerX + (Math.random() * screenWidth - screenWidth/2);
        y = playerY + screenHeight/2 + bufferDistance;
        break;
      case 3: // left
        x = playerX - screenWidth/2 - bufferDistance;
        y = playerY + (Math.random() * screenHeight - screenHeight/2);
        break;
    }
      const availableTypes = Object.entries(this.ENEMY_TYPES)
    .filter(([_, type]) => type.unlockLevel <= level)
    .map(([id, _]) => id);
  
  // Count current enemies by type
  const typeCount = {};
  for (const enemy of this.enemies) {
    typeCount[enemy.type] = (typeCount[enemy.type] || 0) + 1;
  }
  
  // Filter types that exceed max percentage
  const validTypes = availableTypes.filter(typeId => {
    const count = typeCount[typeId] || 0;
    return count < Math.floor(this.enemies.length * this.maxTypePercentage);
  });
  
  // If all types exceed limit, allow all types (preventing softlock)
  const typesToUse = validTypes.length > 0 ? validTypes : availableTypes;
  
  // Continue with normal type selection from filtered list...
  let typeWeights = typesToUse.map(typeId => {
    const typeLevel = this.ENEMY_TYPES[typeId].unlockLevel;
    return Math.max(1, level - typeLevel + 1) * 1.2;
  });
    

    
    // Calculate total weight
    const totalWeight = typeWeights.reduce((sum, weight) => sum + weight, 0);
    
    // Pick a random type based on weights
    let randomWeight = Math.random() * totalWeight;
    let selectedTypeIndex = 0;
    
    for (let i = 0; i < typeWeights.length; i++) {
      randomWeight -= typeWeights[i];
      if (randomWeight <= 0) {
        selectedTypeIndex = i;
        break;
      }
    }
    
    const selectedTypeId = availableTypes[selectedTypeIndex];
    const enemyType = this.ENEMY_TYPES[selectedTypeId];
    
    // For swarm type, create a cluster of enemies
    if (selectedTypeId === "SWARM" && enemyType.spawnInClusters) {
      const clusterSize = Math.floor(
        Math.random() * (enemyType.clusterSize.max - enemyType.clusterSize.min + 1) + 
        enemyType.clusterSize.min
      );
      
      // Create cluster of swarm enemies
      for (let i = 0; i < clusterSize; i++) {
        // Add random offset for cluster members
        const clusterSpread = 50;
        const offsetX = (Math.random() - 0.5) * clusterSpread;
        const offsetY = (Math.random() - 0.5) * clusterSpread;
        
        this.createEnemy(
          selectedTypeId, 
          enemyType, 
          x + offsetX, 
          y + offsetY,
          // Add cluster references to enable swarm behavior
          { clusterId: Date.now(), clusterIndex: i, clusterSize: clusterSize }
        );
      }
      
      return;
    }
    
    // Normal single enemy spawning
    this.createEnemy(selectedTypeId, enemyType, x, y);
  }

  // Helper method to create an enemy instance
  createEnemy(typeId, enemyType, x, y, clusterInfo = null) {
    // Create enemy with type-specific properties
    const enemy = {
      x: x,
      y: y,
      type: typeId,
      size: enemyType.size,
      speed: enemyType.speed * (this.difficultyMultiplier / 2),
      color: enemyType.color,
      health: enemyType.health,
      maxHealth: enemyType.health, // Store original max health for UI
      symbol: enemyType.symbol,
      attackTimer: 0,
      
      // Warcraft 3-style movement properties
      pathfindInterval: enemyType.pathfindInterval || 800,
      lastPathfindTime: 0,
      targetX: x, // Current movement target
      targetY: y,
      steeringForce: { x: 0, y: 0 }, // Current steering force
      // Tanks have momentum, other units have different behaviors
      momentum: typeId === "TANK" ? { x: 0, y: 0 } : null
    };
    
    // Add ranged attack properties if applicable
    if (typeId === "RANGED" || typeId === "CATAPULT") {
      enemy.attackRate = enemyType.attackRate;
      enemy.attackRange = enemyType.attackRange;
      enemy.projectileSpeed = enemyType.projectileSpeed;
      enemy.projectileSize = enemyType.projectileSize || 8;
      enemy.projectileColor = enemyType.projectileColor;
      
      // Additional properties for catapult AOE
      if (typeId === "CATAPULT") {
        enemy.aoeDamage = enemyType.aoeDamage;
        enemy.aoeDuration = enemyType.aoeDuration;
        enemy.aoeRadius = enemyType.aoeRadius;
      }
    }
    
    // Add swarm behavior if this is part of a cluster
    if (clusterInfo) {
      enemy.clusterId = clusterInfo.clusterId;
      enemy.clusterIndex = clusterInfo.clusterIndex;
      enemy.clusterSize = clusterInfo.clusterSize;
    }
    
    this.enemies.push(enemy);
    return enemy;
  }

  // Update all enemies and their behaviors - Warcraft 3 style
  updateEnemies(deltaTime, playerX, playerY) {
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      
      // Check if it's time to recalculate path (Warcraft 3 throttled pathfinding)
      const now = Date.now();
      if (now - enemy.lastPathfindTime > enemy.pathfindInterval) {
        this.calculatePath(enemy, playerX, playerY);
        enemy.lastPathfindTime = now;
      }
      
      // Update movement using enhanced movement logic
      this.updateEnemyMovement(enemy, playerX, playerY, deltaTime);
      
      // Apply separation for collision avoidance (enhanced)
      this.applySeparationForce(enemy, deltaTime);
      
      // Special swarm behavior for clustered enemies
      if (enemy.type === "SWARM" && enemy.clusterId) {
        this.applySwarmBehavior(enemy, deltaTime);
      }
      
      // Handle ranged enemy attacks
      if (enemy.type === "RANGED" || enemy.type === "CATAPULT") {
        enemy.attackTimer += deltaTime;
        
        if (enemy.attackTimer >= enemy.attackRate) {
          // Check if player is in range
          const dist = Math.hypot(playerX - enemy.x, playerY - enemy.y);
          
          if (dist <= enemy.attackRange) {
            this.fireEnemyProjectile(enemy, playerX, playerY);
            enemy.attackTimer = 0;
          }
        }
      }
    }
  }

  // Calculate path for an enemy - Warcraft 3 style pathfinding
  calculatePath(enemy, targetX, targetY) {
    // Warcraft 3 pathfinding assigns movement targets based on unit type
    
    // Set the general target
    enemy.targetX = targetX;
    enemy.targetY = targetY;
    
    // For RANGED enemies, implement Warcraft 3-style ranged unit behavior
    if (enemy.type === "RANGED" && enemy.attackRange) {
      const dx = targetX - enemy.x;
      const dy = targetY - enemy.y;
      const dist = Math.hypot(dx, dy);
      
      // If closer than 70% of attack range, move away from target
      if (dist < enemy.attackRange * 0.55) {
        const moveBackDist = enemy.attackRange * 0.8;
        const scale = moveBackDist / dist;
        
        // Target is in the opposite direction
        enemy.targetX = enemy.x - dx * scale;
        enemy.targetY = enemy.y - dy * scale;
      } 
      // If at good distance, strafe perpendicular to target
      else if (dist < enemy.attackRange * 1.2) {
        // Choose a point perpendicular to the player
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const strafeScale = enemy.attackRange * 0.5;
        
        // 50% chance to go clockwise or counter-clockwise
        const direction = Math.random() < 0.5 ? 1 : -1;
        
        enemy.targetX = enemy.x + perpX * strafeScale * direction;
        enemy.targetY = enemy.y + perpY * strafeScale * direction;
      }
      // Otherwise approach target normally
    }
    
    // CATAPULT behavior - tries to maintain optimal range
    if (enemy.type === "CATAPULT" && enemy.attackRange) {
      const dx = targetX - enemy.x;
      const dy = targetY - enemy.y;
      const dist = Math.hypot(dx, dy);
      
      // Catapults prefer to stay at 80% of their attack range
      const optimalDist = enemy.attackRange * 0.8;
      
      if (Math.abs(dist - optimalDist) < 50) {
        // At optimal range, don't move much
        enemy.targetX = enemy.x + (Math.random() - 0.5) * 20;
        enemy.targetY = enemy.y + (Math.random() - 0.5) * 20;
      } else if (dist < optimalDist - 50) {
        // Too close, back away
        const moveBackScale = optimalDist / Math.max(1, dist);
        enemy.targetX = enemy.x - dx * moveBackScale;
        enemy.targetY = enemy.y - dy * moveBackScale;
      } else {
        // Too far, move closer
        // No adjustment needed, default target is player
      }
    }
    
    // Special behaviors for enemy types (Warcraft 3-style unit behaviors)
    switch(enemy.type) {
      case "SPEEDY":
        // Add some randomness to the path (more erratic movement)
        if (Math.random() < 0.3) {
          const randomOffset = 100;
          enemy.targetX += (Math.random() * 2 - 1) * randomOffset;
          enemy.targetY += (Math.random() * 2 - 1) * randomOffset;
        }
        break;
      case "TANK":
        // Tanks target the player more directly but move slower
        enemy.targetX = targetX;
        enemy.targetY = targetY;
        break;
      case "SWARM":
        // Swarm units occasionally jitter their path
        if (Math.random() < 0.4) {
          const jitterAmount = 30;
          enemy.targetX += (Math.random() * 2 - 1) * jitterAmount;
          enemy.targetY += (Math.random() * 2 - 1) * jitterAmount;
        }
        break;
    }
  }

  // Swarm-specific behavior for clustered enemies
  applySwarmBehavior(enemy, deltaTime) {
    // Find other swarm units in the same cluster
    const swarmmates = this.enemies.filter(other => 
      other !== enemy && 
      other.type === "SWARM" && 
      other.clusterId === enemy.clusterId
    );
    
    if (swarmmates.length === 0) return;
    
    // Calculate center of the swarm
    let centerX = 0, centerY = 0;
    for (const mate of swarmmates) {
      centerX += mate.x;
      centerY += mate.y;
    }
    centerX /= swarmmates.length;
    centerY /= swarmmates.length;
    
    // Apply cohesion force toward center
    const dx = centerX - enemy.x;
    const dy = centerY - enemy.y;
    const dist = Math.hypot(dx, dy);
    
    // Only apply cohesion if too far from center
    if (dist > 40) {
      const cohesionFactor = 0.005;
      enemy.x += dx * cohesionFactor * deltaTime;
      enemy.y += dy * cohesionFactor * deltaTime;
    }
    
    // Add small wiggle movement to create busy swarm visual
    if (Math.random() < 0.1) {
      enemy.x += (Math.random() - 0.5) * 2;
      enemy.y += (Math.random() - 0.5) * 2;
    }
  }

  // Update enemy movement based on type - enhanced with Warcraft 3 style 
  updateEnemyMovement(enemy, playerX, playerY, deltaTime) {
    // Movement vector to target (using the calculated target position)
    const dx = enemy.targetX - enemy.x;
    const dy = enemy.targetY - enemy.y;
    const dist = Math.hypot(dx, dy);
    
    // If we're close enough to target, just stop
    if (dist < 5) return;
    
    // Normalize direction
    const dirX = dx / dist;
    const dirY = dy / dist;
    
    // Calculate movement step based on delta time for smooth movement
    const step = enemy.speed * (deltaTime / 16);
    
    // Modified movement behavior for different enemy types
    switch (enemy.type) {
      case "RANGED":
        // Keep distance from player if too close
        if (dist < 30) { // Avoid very close range
          enemy.x -= dirX * step * 1.5; // Move away faster
          enemy.y -= dirY * step * 1.5;
        } else {
          // Normal movement toward target
          enemy.x += dirX * step;
          enemy.y += dirY * step;
        }
        break;

      case "SPEEDY":
        // Speedy units have more erratic movement (like Warcraft 3 fast units)
        enemy.x += dirX * step;
        enemy.y += dirY * step;
        
        // Add some jitter to the movement
        const jitter = step * 0.3;
        enemy.x += (Math.random() * 2 - 1) * jitter;
        enemy.y += (Math.random() * 2 - 1) * jitter;
        break;
        
      case "TANK": 
        // Tanks have momentum (turning radius) - they turn slower like WC3 heavy units
        if (!enemy.momentum) {
          enemy.momentum = { x: dirX, y: dirY };
        } else {
          // Gradually adjust momentum toward target direction
          const momentumFactor = 0.85;
          enemy.momentum.x = enemy.momentum.x * momentumFactor + dirX * (1 - momentumFactor);
          enemy.momentum.y = enemy.momentum.y * momentumFactor + dirY * (1 - momentumFactor);
          
          // Move using blended momentum
          enemy.x += enemy.momentum.x * step;
          enemy.y += enemy.momentum.y * step;
        }
        break;
        
      case "CATAPULT":
        // Catapults move very deliberately with slight hesitation
        if (Math.random() < 0.9) { // Occasionally pause
          enemy.x += dirX * step * 0.9; // Slightly slower
          enemy.y += dirY * step * 0.9;
        }
        break;
        
      case "SWARM":
        // Swarm units have rapid but lighter movement
        enemy.x += dirX * step * 1.1; // Slightly faster
        enemy.y += dirY * step * 1.1;
        // Smaller jitter than speedy units
        const swarmJitter = step * 0.2;
        enemy.x += (Math.random() * 2 - 1) * swarmJitter;
        enemy.y += (Math.random() * 2 - 1) * swarmJitter;
        break;
        
      default:
        // Basic movement for other types
        enemy.x += dirX * step;
        enemy.y += dirY * step;
        break;
    }
  }

  // Enhanced separation force with Warcraft 3-style avoidance
  applySeparationForce(enemy, deltaTime = 16) {
    const separationRadius = enemy.size * 2.5; // Radius to check for nearby enemies
    const separationWeight = 0.3; // How strongly to separate
    
    // Get nearby enemies using spatial grid (more efficient)
    let nearbyEnemies;
    
    // If grid is being used, use it for efficiency
    if (Object.keys(this.grid).length > 0) {
      nearbyEnemies = this.getEnemiesInRadius(enemy.x, enemy.y, separationRadius);
    } else {
      // Fallback to checking a limited number of enemies
      const maxNeighborsToCheck = Math.min(15, this.enemies.length);
      nearbyEnemies = [];
      
      for (let i = 0; i < maxNeighborsToCheck; i++) {
        // Get a semi-random offset to check different enemies each frame
        const randomOffset = (i * 17) % this.enemies.length; // Prime number helps avoid patterns
        const otherEnemyIndex = (randomOffset) % this.enemies.length;
        const other = this.enemies[otherEnemyIndex];
        
        if (other === enemy) continue;
        
        const otherDx = enemy.x - other.x;
        const otherDy = enemy.y - other.y;
        const otherDist = Math.hypot(otherDx, otherDy);
        
        if (otherDist < separationRadius) {
          nearbyEnemies.push(other);
        }
      }
    }
    
    let separationX = 0;
    let separationY = 0;
    let neighborCount = 0;
    
    // Calculate separation force from each nearby enemy
    for (const other of nearbyEnemies) {
      if (other === enemy) continue;
      
      // For swarm units, reduce separation from their own cluster
      if (enemy.type === "SWARM" && other.type === "SWARM" && 
          enemy.clusterId && other.clusterId === enemy.clusterId) {
        continue; // Skip separation within same swarm cluster
      }
      
      const otherDx = enemy.x - other.x;
      const otherDy = enemy.y - other.y;
      const otherDist = Math.hypot(otherDx, otherDy);
      
      if (otherDist <= 0) {
        // Extremely close or overlapping - apply stronger push (Warcraft 3-style)
        separationX += (Math.random() * 2 - 1) * 2;
        separationY += (Math.random() * 2 - 1) * 2;
        neighborCount++;
        continue;
      }
      
      if (otherDist < separationRadius) {
        // Strength of separation is inversely proportional to distance
        // Closer units cause stronger repulsion (Warcraft 3-like)
        const separationFactor = (separationRadius - otherDist) / separationRadius;
        
        // Account for unit size - larger units push harder (Warcraft 3 clearance system)
        const sizeFactor = (other.size / enemy.size) * 0.5 + 0.5;
        
        separationX += (otherDx / otherDist) * separationFactor * sizeFactor;
        separationY += (otherDy / otherDist) * separationFactor * sizeFactor;
        neighborCount++;
      }
    }
    
    // Apply separation if we found neighbors
    if (neighborCount > 0) {
      // Normalize separation vector
      const separationMag = Math.hypot(separationX, separationY);
      if (separationMag > 0) {
        separationX /= separationMag;
        separationY /= separationMag;
      }
      
      // Add a small amount of randomness to prevent perfect alignment (Warcraft-style)
      const jitter = 0.05;
      separationX += (Math.random() * 2 - 1) * jitter;
      separationY += (Math.random() * 2 - 1) * jitter;
      
      // Adjust movement strength based on enemy type (Warcraft 3-style type differences)
      let adjustedWeight = separationWeight;
      if (enemy.type === "TANK") {
        adjustedWeight *= 1.5; // Tanks push harder (like Tauren in WC3)
      } else if (enemy.type === "SPEEDY") {
        adjustedWeight *= 0.8; // Speedy units are more agile and slip through (like Wisps in WC3)
      } else if (enemy.type === "SWARM") {
        adjustedWeight *= 0.5; // Swarm units don't push much, they crowd together
      }
      
      // Apply separation force as movement
      const step = enemy.speed * (deltaTime / 16) * adjustedWeight;
      enemy.x += separationX * step;
      enemy.y += separationY * step;
      
      // Store the separation force for other calculations
      enemy.steeringForce = {
        x: separationX,
        y: separationY
      };
    }
  }

  // Fire a projectile from a ranged enemy
// In enemy.js - Replace the fireEnemyProjectile method
fireEnemyProjectile(enemy, targetX, targetY) {
  // Store player's current position as the target
  const fixedTargetX = targetX;
  const fixedTargetY = targetY;
  
  // Calculate direction to target
  const dx = fixedTargetX - enemy.x;
  const dy = fixedTargetY - enemy.y;
  const dist = Math.hypot(dx, dy);
  
  if (dist <= 0) return;
  
  const dirX = dx / dist;
  const dirY = dy / dist;
  
  // Create projectile with fixed target
  const projectile = {
    x: enemy.x,
    y: enemy.y,
    targetX: fixedTargetX,  // Store target position
    targetY: fixedTargetY,
    targetDistance: dist,    // Store distance to target
    size: enemy.projectileSize || 8,
    speed: enemy.projectileSpeed || 4,
    dirX: dirX,
    dirY: dirY,
    color: enemy.projectileColor || "rgb(34, 170, 238)",
    damage: 1,
    distance: 0,
    maxDistance: enemy.attackRange * 1.5,
    aoeDamage: enemy.aoeDamage || false,
    aoeDuration: enemy.aoeDuration || 0,
    aoeRadius: enemy.aoeRadius || 0
  };
  
  this.enemyProjectiles.push(projectile);
  
  if (window.audioSystem) {
    window.audioSystem.playSound("enemy_attack", 0.5);
  }
  
  return projectile;
}

// Update the projectiles method to check if target reached
updateProjectiles(deltaTime) {
  for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
    const projectile = this.enemyProjectiles[i];
    
    // Move projectile
    projectile.x += projectile.dirX * projectile.speed;
    projectile.y += projectile.dirY * projectile.speed;
    
    // Update distance traveled
    projectile.distance += projectile.speed;
    
    // For catapult projectiles with fixed targets, check if target reached
    if (projectile.aoeDamage && projectile.targetX !== undefined) {
      const distToTarget = Math.hypot(
        projectile.x - projectile.targetX, 
        projectile.y - projectile.targetY
      );
      
      // If we've passed or reached the target point, create AoE zone
      if (distToTarget <= projectile.speed || projectile.distance >= projectile.targetDistance) {
        // Create AoE at target position (not at current projectile position)
        this.createAoeDamageZone(
          projectile.targetX, 
          projectile.targetY, 
          projectile.aoeRadius, 
          projectile.aoeDuration,
          projectile.damage
        );
        
        // Play explosion sound
        if (window.audioSystem) {
          window.audioSystem.playSound("boss_field", 0.4);
        }
        
        // Remove the projectile
        this.enemyProjectiles.splice(i, 1);
        continue;
      }
    }
    
    // Remove if max distance reached (fallback)
    if (projectile.distance > projectile.maxDistance) {
      // For AoE projectiles, create damage zone when they expire
      if (projectile.aoeDamage) {
        this.createAoeDamageZone(
          projectile.x, 
          projectile.y, 
          projectile.aoeRadius, 
          projectile.aoeDuration,
          projectile.damage
        );
        
        if (window.audioSystem) {
          window.audioSystem.playSound("boss_field", 0.4);
        }
      }
      
      this.enemyProjectiles.splice(i, 1);
    }
  }
}

  // Create AoE damage zone
  createAoeDamageZone(x, y, radius, duration, damage) {
    const zone = {
      x: x,
      y: y,
      radius: radius,
      duration: duration,
      timeLeft: duration,
      damage: damage,
      damageTimer: 0, // For periodic damage
      damageInterval: 500, // Damage every 500ms
      color: "rgba(255, 100, 100, 0.3)",
      pulsate: true
    };
    
    this.aoeDamageZones.push(zone);
    return zone;
  }

  // Update AoE damage zones
  updateAoeDamageZones(deltaTime) {
    for (let i = this.aoeDamageZones.length - 1; i >= 0; i--) {
      const zone = this.aoeDamageZones[i];
      
      // Decrease time left
      zone.timeLeft -= deltaTime;
      
      // Remove expired zones
      if (zone.timeLeft <= 0) {
        this.aoeDamageZones.splice(i, 1);
      }
    }
  }

  // Draw enemies and projectiles
  drawEnemies(ctx) {
    // Draw enemy projectiles
    for (let projectile of this.enemyProjectiles) {
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, projectile.size / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw trail
      ctx.strokeStyle = projectile.color.replace('rgb', 'rgba').replace(')', ', 0.4)');
      ctx.lineWidth = projectile.size / 3;
      ctx.beginPath();
      ctx.moveTo(
        projectile.x - projectile.dirX * projectile.size * 2,
        projectile.y - projectile.dirY * projectile.size * 2
      );
      ctx.lineTo(projectile.x, projectile.y);
      ctx.stroke();
      
      // Special visual for catapult projectiles
      if (projectile.aoeDamage) {
        // Draw shadow below projectile
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.ellipse(
          projectile.x, 
          projectile.y + projectile.size/2, 
          projectile.size * 0.7, 
          projectile.size * 0.3, 
          0, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }
    
    // Draw AoE damage zones
    for (let zone of this.aoeDamageZones) {
      // Calculate opacity based on time left
      const opacity = 0.3 * (zone.timeLeft / zone.duration);
      
      // Pulsating effect
      const pulseScale = zone.pulsate ? 
        1 + 0.1 * Math.sin(Date.now() / 200) : 1;
      
      // Draw damage zone
      ctx.fillStyle = zone.color.replace('0.3', opacity.toString());
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius * pulseScale, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw danger border
      ctx.strokeStyle = "rgba(255, 50, 50, " + opacity * 1.5 + ")";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius * pulseScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  
    // Draw enemies
    for (let enemy of this.enemies) {
      // Draw enemy body
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw enemy type symbol
      ctx.fillStyle = "#fff";
      ctx.font = `${enemy.size / 1.2}px Consolas`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(enemy.symbol, enemy.x, enemy.y);
      
      // Draw health indicator for enemies with more than 1 health
      if (enemy.maxHealth > 1) {
        const healthBarWidth = enemy.size * 0.8;
        const healthBarHeight = 4;
        const healthPercentage = enemy.health / enemy.maxHealth;
        
        // Background
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(
          enemy.x - healthBarWidth / 2,
          enemy.y - enemy.size / 2 - 10,
          healthBarWidth,
          healthBarHeight
        );
        
        // Health bar
        ctx.fillStyle = enemy.health === 1 ? "rgb(255, 68, 68)" : "rgb(68, 255, 68)";
        ctx.fillRect(
          enemy.x - healthBarWidth / 2,
          enemy.y - enemy.size / 2 - 10,
          healthBarWidth * healthPercentage,
          healthBarHeight
        );
      }
    }
  }

  // Check collision with player
  checkPlayerCollision(playerX, playerY, playerSize, deltaTime) {
    // Check collision with enemy bodies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      // Calculate distance
      const dx = playerX - enemy.x;
      const dy = playerY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Check for collision
      if (dist < playerSize / 2 + enemy.size / 2) {
        // Return the collided enemy and index
        return { enemy, index: i };
      }
    }
    
    // Check collision with enemy projectiles
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.enemyProjectiles[i];
      
      // Calculate distance
      const dx = playerX - projectile.x;
      const dy = playerY - projectile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Check for collision
      if (dist < playerSize / 2 + projectile.size / 2) {
        // Remove the projectile
        this.enemyProjectiles.splice(i, 1);
        
        // Return collision with projectile
        return { 
          isProjectile: true, 
          damage: projectile.damage
        };
      }
    }
    
    // Check collision with AoE damage zones
    for (let zone of this.aoeDamageZones) {
      // Calculate distance to zone center
      const dx = playerX - zone.x;
      const dy = playerY - zone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Check if player is inside damage zone
      if (dist < zone.radius + playerSize / 2) {
        // Update damage timer
        zone.damageTimer = (zone.damageTimer || 0) + deltaTime;
        
        // Apply damage periodically
        if (zone.damageTimer >= zone.damageInterval) {
          zone.damageTimer = 0;
          return {
            isAoeDamage: true,
            damage: zone.damage
          };
        }
      }
    }
    
    // No collision
    return null;
  }

  // Remove enemy and generate rewards
  removeEnemy(index, damageSource) {
    if (index >= 0 && index < this.enemies.length) {
      const enemy = this.enemies[index];
      
      // Use damage source power if provided, otherwise default to 1
      // This handles both projectiles and melee attacks
      const damage = damageSource && damageSource.power ? damageSource.power : 1;
      
      // Reduce health by damage amount
      enemy.health -= damage;
      
      if (enemy.health <= 0) {
        // Enemy is defeated, remove from array
        this.enemies.splice(index, 1);
        
        // Get enemy type data
        const enemyType = this.ENEMY_TYPES[enemy.type];
        
        // Spawn rewards from defeated enemy
        if (this.noteSystem) {
          // Skip reward drop for swarm units sometimes (they come in clusters)
          if (enemy.type === "SWARM" && Math.random() < 0.7) {
            return enemy; // No drop from this swarm unit
          }
          
          // Determine how many notes to drop
          const dropCount = Math.floor(Math.random() * 
                         (enemyType.dropMax - enemyType.dropMin + 1)) + 
                          enemyType.dropMin;
          
          // Spawn notes
          for (let i = 0; i < dropCount; i++) {
            this.noteSystem.spawnNoteFragment(
              enemy.x + (Math.random() - 0.5) * 20, 
              enemy.y + (Math.random() - 0.5) * 20
            );
          }
          
          // Chance to drop a heart (higher for tougher enemies)
          const heartChance = enemy.type === "TANK" ? 0.12 : 
                             enemy.type === "CATAPULT" ? 0.15 :
                             enemy.type === "RANGED" ? 0.1 : 0.08;
          
          if (Math.random() < heartChance) {
            this.noteSystem.spawnHealthPickup(enemy.x, enemy.y);
          }
        }
        
        return enemy;
      }
      
      // Enemy wasn't fully defeated yet
      return null;
    }
    return null;
  }

  // Get all enemies
  getEnemies() {
    return this.enemies;
  }
  
  // Get enemy projectiles
  getEnemyProjectiles() {
    return this.enemyProjectiles;
  }
}

export default EnemySystem;