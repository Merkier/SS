// chest.js - Handles chest spawning and rewards

class ChestSystem {
  constructor(messageSystem) {
    this.chests = [];
    this.messageSystem = messageSystem;
    this.chestSize = 30;
    this.chestSpawnChance = 0.03; // 3% chance per enemy killed
  }

  // Update chests
  update(deltaTime, playerX, playerY, playerSize) {
    const collectedChests = [];
    
    for (let i = this.chests.length - 1; i >= 0; i--) {
      const chest = this.chests[i];

      // Handle chest opening animation
      if (chest.collected) {
        chest.openTimer += deltaTime;
        if (chest.openTimer > 1000) {
          this.chests.splice(i, 1);
        }
        continue;
      }

      // Check for player collision
      const dx = playerX - chest.x;
      const dy = playerY - chest.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < playerSize / 2 + chest.size / 2) {
        chest.collected = true;
        chest.openTimer = 0;
        collectedChests.push(chest);
        
        // Play chest open sound
        if (window.audioSystem) {
          window.audioSystem.playSound("chest_open");
        }
      }
    }
    
    return collectedChests.length > 0 ? collectedChests : null;
  }

  // Spawn a chest
  spawnChest(x, y, guaranteedUpgrade = false) {
    const chest = {
      x: x,
      y: y,
      size: this.chestSize,
      collected: false,
      openTimer: 0,
      guaranteedUpgrade: guaranteedUpgrade // For boss chests
    };
    
    this.chests.push(chest);
    
    // Play chest spawn sound
    if (window.audioSystem) {
      window.audioSystem.playSound("chest_appear");
    }
    
    return chest;
  }

  // Draw chests
  drawChests(ctx) {
    for (let chest of this.chests) {
      // Don't draw if already collected and animation finished
      if (chest.collected && chest.openTimer > 1000) continue;

      // Base chest color
      ctx.fillStyle = "#ffc107";

      // Chest body
      ctx.fillRect(
        chest.x - chest.size / 2,
        chest.y - chest.size / 2,
        chest.size,
        chest.size * 0.7
      );

      // Chest lid (with animation if opened)
      if (chest.collected) {
        const openProgress = Math.min(chest.openTimer / 500, 1);
        ctx.fillRect(
          chest.x - chest.size / 2,
          chest.y - chest.size / 2 - chest.size * 0.3 * openProgress,
          chest.size,
          chest.size * 0.3
        );

        // Draw glow for opened chest
        ctx.fillStyle = `rgba(255, 255, 150, ${1 - openProgress})`;
        ctx.beginPath();
        ctx.arc(chest.x, chest.y, chest.size + openProgress * 20, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(
          chest.x - chest.size / 2,
          chest.y - chest.size / 2 - chest.size * 0.3,
          chest.size,
          chest.size * 0.3
        );
      }

      // Chest lock
      ctx.fillStyle = "#b0942a";
      ctx.fillRect(
        chest.x - chest.size * 0.1,
        chest.y - chest.size * 0.15,
        chest.size * 0.2,
        chest.size * 0.3
      );
      
      // Special glow for boss chests
      if (chest.guaranteedUpgrade && !chest.collected) {
        const glowOpacity = 0.3 + 0.2 * Math.sin(Date.now() / 200);
        ctx.fillStyle = `rgba(255, 215, 0, ${glowOpacity})`;
        ctx.beginPath();
        ctx.arc(chest.x, chest.y, chest.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Process chest rewards
  processChestReward(chest, player, noteSystem, upgradeSystem) {
    if (!chest) return null;
    
    // Different reward types based on chest type
    if (chest.guaranteedUpgrade) {
      // Boss chest - guaranteed upgrade
      this.messageSystem.showRewardText("Guaranteed Upgrade!", "#aa88ff");
      
      // Schedule the upgrade for next frame to avoid state conflicts
      setTimeout(() => {
        if (upgradeSystem) {
          upgradeSystem.showUpgradeMenu(player);
        }
      }, 100);
      
      return { type: "upgrade" };
    } else {
      // Regular chest - random reward
      // 3 types of rewards:
      // 1. Health restore
      // 2. Multiple note fragments
      // 3. Instant upgrade
      
      const rewardType = Math.floor(Math.random() * 3);
      
      switch (rewardType) {
        case 0: // Health restore
          if (player.health < player.maxHealth) {
            player.heal(1);
            this.messageSystem.showRewardText("Health +1!", "#ff5e5e");
            return { type: "health" };
          } else {
            // If already full health, give notes instead
            const fragmentCount = 6 + Math.floor(Math.random() * 3); 
            this.spawnChestNoteFragments(chest.x, chest.y, fragmentCount, noteSystem);
            this.messageSystem.showRewardText("Notes x" + fragmentCount + "!", "#44ff44");
            return { type: "notes", count: fragmentCount };
          }
          
        case 1: // Note fragments
          const fragmentCount = 6 + Math.floor(Math.random() * 3);
          this.spawnChestNoteFragments(chest.x, chest.y, fragmentCount, noteSystem);
          this.messageSystem.showRewardText("Notes x" + fragmentCount + "!", "#44ff44");
          return { type: "notes", count: fragmentCount };
          
        case 2: // Instant upgrade
          this.messageSystem.showRewardText("Instant Upgrade!", "#aa88ff");
          
          // Schedule the upgrade for next frame to avoid state conflicts
          setTimeout(() => {
            if (upgradeSystem) {
              upgradeSystem.showUpgradeMenu(player);
            }
          }, 100);
          
          return { type: "upgrade" };
      }
    }
    
    return null;
  }
  
  // Spawn note fragments from a chest
  spawnChestNoteFragments(x, y, count, noteSystem) {
    if (!noteSystem) return [];
    
    // Create circular pattern for notes
    const fragments = [];
    
    for (let i = 0; i < count; i++) {
      // Spawn fragments in a circle around the chest
      const angle = (Math.PI * 2 * i) / count;
      const distance = 50;
      const noteX = x + Math.cos(angle) * distance;
      const noteY = y + Math.sin(angle) * distance;
      
      const newFragments = noteSystem.spawnNoteFragment(noteX, noteY, 1, false);
      fragments.push(...newFragments);
    }
    
    return fragments;
  }

  // Check if a chest should spawn from enemy defeat
  checkChestSpawn(enemyX, enemyY) {
    if (Math.random() < this.chestSpawnChance) {
      return this.spawnChest(enemyX, enemyY);
    }
    return null;
  }

  // Get all chests
  getChests() {
    return this.chests;
  }

  // Reset chest system
  reset() {
    this.chests = [];
  }
}

export default ChestSystem;