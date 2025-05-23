// gameSystem.js - Consolidated game system with integrated functionality

import Camera from './camera.js';
import GameStateManager from './gameState.js';
import AudioSystem from './audio.js';
import ChestSystem from '../entities/chest.js';
import FameSystem from '../systems/fame.js';
import ParticleSystem from '../systems/particle.js';

class GameSystem {
  constructor() {
    // Core references
    this.gameStateManager = null;
    this.messageSystem = null;
    this.camera = null;
    
    // Game systems
    this.audioSystem = null;
    this.chestSystem = null;
    this.fameSystem = null;
    this.particleSystem = null;
    
    this.initialized = false;
  }

  initialize(messageSystem, gameStateManager, camera) {
    if (this.initialized) return true;
    
    if (!messageSystem) {
      console.error("Error: messageSystem is required for initialization");
      return false;
    }
    
    this.messageSystem = messageSystem;
    this.gameStateManager = gameStateManager;
    this.camera = camera;
    
    try {
      // Initialize systems
      this.particleSystem = new ParticleSystem();
      this.fameSystem = new FameSystem();
      this.chestSystem = new ChestSystem(this.messageSystem);
      this.audioSystem = new AudioSystem(this.gameStateManager);
      
      // Initialize audio
      if (this.audioSystem) {
        this.audioSystem.initialize();
      }
      
      // Set up UI elements
      this.fameSystem.setupFamePointsUI();
      
      // Make systems globally available
      window.gameSystem = this;
      window.fameSystem = this.fameSystem;
      window.audioSystem = this.audioSystem;
      
      this.initialized = true;
      console.log("Game system initialized successfully");
      return true;
    } catch (error) {
      console.error("Error initializing game system:", error);
      return false;
    }
  }

  update(deltaTime, player, enemySystem, noteSystem, upgradeSystem) {
    if (!this.initialized || !player) return {};
      
    // Update chest system
    if (this.chestSystem) {
      const collectedChests = this.chestSystem.update(
        deltaTime, player.x, player.y, player.size
      );
      
      if (collectedChests && collectedChests.length > 0) {
        for (const chest of collectedChests) {
          this.chestSystem.processChestReward(
            chest, player, noteSystem, upgradeSystem
          );
        }
      }
    }
    
    // Update particles
    if (this.particleSystem) {
      this.particleSystem.update(deltaTime);
    }
    
    return {};
  }

  draw(ctx) {
    if (!ctx || !this.camera) return;
    
    // Draw chests
    if (this.chestSystem) {
      this.chestSystem.drawChests(ctx);
    }
    
    // Draw particles
    if (this.particleSystem) {
      this.particleSystem.draw(ctx);
    }
  }

  // Game event handlers
  onEnemyDefeated(enemy, noteSystem) {
    // Spawn note fragment
    if (noteSystem) {
      noteSystem.spawnNoteFragment(enemy.x, enemy.y);
    }
    
    // Check if chest should spawn
    if (this.chestSystem) {
      this.chestSystem.checkChestSpawn(enemy.x, enemy.y);
    }
    
    // Play sound effect
    if (this.audioSystem) {
      this.audioSystem.playSound("enemy_death");
    }
  }

  onLevelUp(player, level) {
    if (this.audioSystem) {
      this.audioSystem.playSound("level_up");
    }
  }

  onCharacterSelect(player) {
    // Apply passive bonuses
    if (this.fameSystem) {
      this.fameSystem.applyPassiveUnlocks(player);
    }
    
    // Start gameplay music
    if (this.audioSystem) {
      this.audioSystem.playGameplayMusic();
    }
    
    return player;
  }

  onGameOver(level, noteFragments, upgradeCount) {
    if (!this.fameSystem) return null;
    
    const fameEarned = this.fameSystem.calculateRunFame(level, noteFragments, upgradeCount);
    this.fameSystem.addFamePoints(fameEarned);
    
    return {
      fameEarned,
      totalFame: this.fameSystem.famePoints
    };
  }

  destroy() {
    if (this.audioSystem) {
      this.audioSystem.destroy();
    }
    
    delete window.gameSystem;
    delete window.fameSystem;
    delete window.audioSystem;
  }
}

export default GameSystem;