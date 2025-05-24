
// main.js - Updated to remove boss system references

// Core imports
import GameStateManager from './core/gameState.js';
import Camera from './core/camera.js';
import InputManager from './core/input.js';
import GameSystem from './core/game.js';
import ConductorSystem from './systems/conductor.js';
// Entity imports
import { Player, CHARACTER_TYPES } from './entities/player.js';
import EnemySystem from './entities/enemy.js';
import NoteSystem from './entities/note.js';

// System imports
import CombatSystem from './systems/combat.js';
import { UpgradeSystem, MUSIC_UPGRADES } from './systems/upgrade.js';


// UI imports
import MessageSystem from './ui/messages.js';

class SilentSurvivors {
  constructor() {
    // Game canvas and context
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Game dimensions
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    // Core systems
    this.gameStateManager = new GameStateManager();
    this.camera = new Camera(this.width, this.height);
    this.inputManager = new InputManager(this.gameStateManager);
    this.messageSystem = new MessageSystem(this.gameStateManager);

  

    // Game entities
    this.noteSystem = new NoteSystem();
    this.player = new Player();
    this.enemySystem = new EnemySystem(this.noteSystem);
    
    // Game systems
    this.combatSystem = new CombatSystem(
      this.gameStateManager, 
      this.noteSystem,
      this.enemySystem
    );
    this.upgradeSystem = new UpgradeSystem(this.gameStateManager);
        this.conductorSystem = new ConductorSystem(
      this.gameStateManager, 
      window.audioSystem || null,
      this.enemySystem
    );
    // Consolidated game system
    this.gameSystem = new GameSystem();
    
    // Game state
    this.level = 1;
    this.noteFragments = 0;
    this.notesForLevelUp = 5;
    
    // Animation and timing
    this.lastTime = 0;
    this.deltaTime = 0;
    this.animationFrameId = null;
    
    // Bind methods
    this.gameLoop = this.gameLoop.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleCharacterSelect = this.handleCharacterSelect.bind(this);
    
    // Initialize UI
    this.setupUI();
    
    // Set up event listeners
    window.addEventListener('resize', this.handleResize);
  }

  // Initialize the game
initialize() {
  // Set canvas size
  this.canvas.width = this.width;
  this.canvas.height = this.height;
  
  // Initialize systems
  this.inputManager.initialize();
  this.upgradeSystem.initialize();
  this.messageSystem.initialize();
  
  // Initialize consolidated game system
  this.gameSystem.initialize(this.messageSystem, this.gameStateManager, this.camera);

  // Initialize and enable the conductor system
  this.conductorSystem.initialize();
  this.conductorSystem.setEnabled(true);
  console.log("Conductor system enabled:", this.conductorSystem.enabled);

  // Show character selection first
  this.gameStateManager.changeState(this.gameStateManager.states.CHARACTER_SELECT);
  this.setupCharacterSelect();
  
  console.log('Game initialized with dimensions:', this.width, 'x', this.height);
}

  // Setup game UI
setupUI() {
  // Create UI container
  const ui = document.createElement('div');
  ui.id = 'ui';
  ui.style.position = 'absolute';
  ui.style.top = '10px';
  ui.style.left = '10px';
  ui.style.color = 'white';
  ui.style.fontSize = '14px';
  ui.style.fontFamily = 'Consolas, sans-serif';
  ui.style.zIndex = '100';
  
  // Create UI content
  ui.innerHTML = `
    <div>Level: <span id="level">1</span></div>
    <div>Notes: <span id="notes">0</span> / <span id="notes-needed">5</span></div>
  `;
  
  const healthUI = document.createElement('div');
  healthUI.id = 'health-ui';
  healthUI.style.position = 'absolute';
  healthUI.style.top = '40px';
  healthUI.style.left = '10px';
  healthUI.style.color = 'white';
  healthUI.style.zIndex = '100';
  document.body.appendChild(healthUI);
  this.updateHealthUI();
  
  // Add to document
  document.body.appendChild(ui);
  
  // Create experience bar
  const levelProgress = document.createElement('div');
  levelProgress.id = 'level-progress';
  levelProgress.style.position = 'absolute';
  levelProgress.style.top = '10px';
  levelProgress.style.left = '0';
  levelProgress.style.right = '0';
  levelProgress.style.margin = '0 auto';
  levelProgress.style.width = '200px';
  levelProgress.style.height = '20px';
  levelProgress.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  levelProgress.style.border = '1px solid #444';
  levelProgress.style.zIndex = '100';
  
  // Create progress bar
  const progressBar = document.createElement('div');
  progressBar.id = 'progress-bar';
  progressBar.style.height = '100%';
  progressBar.style.width = '0%';
  progressBar.style.backgroundColor = '#8844ff';
  
  levelProgress.appendChild(progressBar);
  document.body.appendChild(levelProgress);
  
  // Create stats panel
  const statsPanel = document.createElement('div');
  statsPanel.id = 'stats-panel';
  statsPanel.style.position = 'absolute';
  statsPanel.style.top = '50px'; // Move to top right
  statsPanel.style.right = '10px'; 
  statsPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
  statsPanel.style.padding = '10px';
  statsPanel.style.borderRadius = '5px';
  statsPanel.style.color = 'white';
  statsPanel.style.fontSize = '12px';
  statsPanel.style.zIndex = '100';
  statsPanel.style.display = 'block'; // Start closed by default

  // Add stats button
  const statsButton = document.createElement('button');
  statsButton.id = 'stats-button';
  statsButton.textContent = 'Close'; // Start with 'Stats' since panel is hidden
  statsButton.style.position = 'absolute';
  statsButton.style.top = '10px'; // Move to top right
  statsButton.style.right = '10px';
  statsButton.style.padding = '5px 10px';
  statsButton.style.backgroundColor = '#6644aa';
  statsButton.style.color = 'white';
  statsButton.style.border = 'none';
  statsButton.style.borderRadius = '5px';
  statsButton.style.zIndex = '100';
  statsButton.style.cursor = 'pointer';

  statsButton.addEventListener('click', () => {
    if (statsPanel.style.display === 'none') {
      statsPanel.style.display = 'block';
      statsButton.textContent = 'Close';
      this.updateStatsPanel();
    } else {
      statsPanel.style.display = 'none';
      statsButton.textContent = 'Stats';
    }
  });

  document.body.appendChild(statsPanel);
  document.body.appendChild(statsButton);
  
  // Create rhythm display
  const rhythmDisplay = document.createElement('div');
  rhythmDisplay.id = 'rhythm-display';
  rhythmDisplay.style.position = 'absolute';
  rhythmDisplay.style.bottom = '20px';
  rhythmDisplay.style.left = '50%';
  rhythmDisplay.style.transform = 'translateX(-50%)';
  rhythmDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  rhythmDisplay.style.padding = '5px 15px';
  rhythmDisplay.style.borderRadius = '20px';
  rhythmDisplay.style.color = '#ffffff';
  rhythmDisplay.style.fontSize = '18px';
  rhythmDisplay.style.zIndex = '50';
  document.body.appendChild(rhythmDisplay);
}
  // Setup character selection screen
  setupCharacterSelect() {
    // Create character selection container
    const characterSelect = document.createElement('div');
    characterSelect.id = 'character-select';
    characterSelect.style.position = 'absolute';
    characterSelect.style.top = '50%';
    characterSelect.style.left = '50%';
    characterSelect.style.transform = 'translate(-50%, -50%)';
    characterSelect.style.width = '80%';
    characterSelect.style.maxWidth = '500px';
    characterSelect.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    characterSelect.style.border = '2px solid #444';
    characterSelect.style.borderRadius = '10px';
    characterSelect.style.padding = '20px';
    characterSelect.style.color = 'white';
    characterSelect.style.textAlign = 'center';
    characterSelect.style.zIndex = '200';
    

  
  // Get data from fame system
  const fameSystem = this.gameSystem?.fameSystem || window.fameSystem;
  let playerName = fameSystem ? fameSystem.playerName : "Player";
  let famePoints = fameSystem ? fameSystem.famePoints : 0;
  let maxLevel = fameSystem ? fameSystem.maxLevel : 1;

    // Simple name input that auto-saves
  let nameHTML = `
    <div class="player-info" style="margin-bottom: 20px;">
      <div style="font-size: 18px; margin-bottom: 10px;">Your Name:</div>
      <input type="text" id="player-name-input" value="${playerName}" maxlength="20"
        style="padding: 8px; width: 200px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #6644aa; border-radius: 4px;">
      <div style="font-size: 14px; color: #aaa; margin-top: 5px;">Fame Points: ${famePoints}</div>
    </div>
  `;
  
  // Create appropriate name section
  if (playerName && playerName !== "Player") {
    // Display existing player name, fame and max level
    nameHTML = `
      <div class="player-info" style="margin-bottom: 20px;">
        <div style="font-size: 18px; margin-bottom: 5px;">Welcome back, <span style="color: #ffcc00;">${playerName}</span>!</div>
        <div style="font-size: 14px; color: #aaa;">Fame Points: ${famePoints} | Best Level: ${maxLevel}</div>
      </div>
    `;
  } else {
    // Show name input form
    nameHTML = `
      <div class="player-name-form" style="margin-bottom: 20px;">
        <div style="font-size: 18px; margin-bottom: 10px;">Enter Your Name:</div>
        <input type="text" id="player-name-input" placeholder="Your Name" maxlength="20"
          style="padding: 8px; width: 200px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #6644aa; border-radius: 4px; margin-right: 10px;">
      </div>
    `;
  }
    // Add content
    characterSelect.innerHTML = `
              ${nameHTML}
      <h2>Choose Your Character</h2>

      <div style="display: flex; justify-content: center; flex-wrap: wrap;">
        <div class="character-option" data-type="ARCHER">
          <div class="character-icon" style="background-color: #22aaff;">🏹</div>
          <div>Archer</div>
          <div style="font-size: 12px; margin-top: 5px;">Ranged attacks</div>
        </div>
        <div class="character-option" data-type="FOOTMAN">
          <div class="character-icon" style="background-color: #44cc66;">⚔️</div>
          <div>Footman</div>
          <div style="font-size: 12px; margin-top: 5px;">Melee attacks</div>
        </div>
      </div>
    `;
    
    // Add styles for character options
    const style = document.createElement('style');
    style.textContent = `
      .character-option {
        display: inline-block;
        margin: 10px;
        padding: 15px;
        width: 120px;
        background-color: rgba(255, 255, 255, 0.1);
        border: 2px solid #666;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .character-option:hover {
        background-color: rgba(255, 255, 255, 0.2);
        border-color: #aaa;
      }
      .character-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 10px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
      }
      .character-option.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }
      .disabled-message {
        font-size: 10px;
        color: #ff6666;
        margin-top: 5px;
      }
    `;
    document.head.appendChild(style);
    
    const footmanOption = characterSelect.querySelector('.character-option[data-type="FOOTMAN"]');
    footmanOption.classList.add('disabled');
    const disabledMsg = document.createElement('div');
    disabledMsg.className = 'disabled-message';
    disabledMsg.textContent = 'Might be coming soon';
    footmanOption.appendChild(disabledMsg);
    


  // Add to document
  document.body.appendChild(characterSelect);
    
  // Add event listeners for name functionality
  // Auto-save name when input changes
  const nameInput = document.getElementById('player-name-input');
  if (nameInput && fameSystem) {
    nameInput.addEventListener('input', () => {
      if (nameInput.value.trim() !== '') {
        fameSystem.setPlayerName(nameInput.value.trim());
      }
    });
  }

    // Add event listeners for character selection
    const options = characterSelect.querySelectorAll('.character-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        const type = option.getAttribute('data-type');
        this.handleCharacterSelect(type);
      });
    });
  }

  // Handle character selection
handleCharacterSelect(type) {
  // Initialize player with selected character
  this.player.initialize(type);
  
  // Hide character select screen
  document.getElementById('character-select').style.display = 'none';
  
  // Start game
  this.gameStateManager.changeState(this.gameStateManager.states.PLAYING);
  if (document.getElementById('stats-panel').style.display === 'block') {
    this.updateStatsPanel();
  }
  
  // Ensure player level is set correctly
  this.player.level = this.level;
  
  // Notify game system about character selection
  this.gameSystem.onCharacterSelect(this.player);
  
  // Update conductor with player info
  this.conductorSystem.update(0, this.player);
  
  console.log(`Character selected: ${type}`);
}
  
  // Update stats panel
updateStatsPanel() {
  const statsPanel = document.getElementById('stats-panel');
  if (!statsPanel || !this.player) return;
    
  // Build stats panel HTML with just the key stats
  statsPanel.innerHTML = `
    <div style="margin-bottom:5px;font-weight:bold;">Stats</div>
    <div>Attack: ${this.player.attackPower.toFixed(1)}</div>
    <div>Crit Chance: ${(this.player.critChance * 100).toFixed(0)}%</div>
    <div>Movement: ${this.player.speed.toFixed(1)}</div>
    ${this.player.attackRange ? `<div>Attack Range: ${this.player.attackRange.toFixed(1)}</div>` : ''}
    ${this.player.piercing ? `<div>Pierce: ${this.player.pierceCount || 1}</div>` : ''}
    ${this.player.multiTarget ? '<div>Multi-Target: Yes</div>' : ''}
    ${this.player.doubleAttackChance > 0 ? `<div>Double Attack: ${(this.player.doubleAttackChance * 100).toFixed(0)}%</div>` : ''}
    ${this.player.magnetRange > 1 ? `<div>Magnet: x${this.player.magnetRange.toFixed(1)}</div>` : ''}
    ${this.player.burstAttack > 1 ? `<div>Burst: x${this.player.burstAttack}</div>` : ''}
  `;
}

  // Start the game
  start() {
    this.initialize();
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
    console.log('Game started');
  }

  // Main game loop
  gameLoop(timestamp) {
    // Calculate delta time
    this.deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    // Cap delta time to prevent large jumps
    if (this.deltaTime > 100) this.deltaTime = 100;
    
    this.update();
    this.render();
    
    // Continue loop
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  // Update game state
// Fixed update method for main.js
update() {
  // Update message system (always active)
  this.messageSystem.update();
  this.gameStateManager.updateMessageTimer(this.deltaTime);
  
  // Update health UI
  this.updateHealthUI();
  
  // Update stats panel if visible
  if (document.getElementById('stats-panel')?.style.display === 'block') {
    this.updateStatsPanel();
  }
  
  // Skip game logic updates if game is paused
  if (this.gameStateManager.isPaused()) return;
  
  // Update input
  this.inputManager.update();
  
  // Get movement input
  const movement = this.inputManager.getMovement();

  if (this.gameStateManager.currentState === this.gameStateManager.states.PLAYING) {
    // Update player
    this.player.move(movement.x, movement.y, this.deltaTime);
    this.player.update(this.deltaTime);
    
    // Update camera to follow player
    this.camera.follow(this.player);
    
    // Update conductor system
    this.conductorSystem.update(this.deltaTime, this.player);
    
    // Update enemies efficiently
  // Update enemies - simplify to respect conductor system's management
if (!this.conductorSystem.currentEvent || 
    (this.conductorSystem.currentEvent !== "RHYTHM_ZONES" && 
     this.conductorSystem.currentEvent !== "FALLING_NOTES")) {
  // Only update enemies when conductor isn't managing them
  this.enemySystem.update(this.deltaTime, this.player.x, this.player.y, this.level, this.camera);
}
    
    // Process rhythm events for combat
    const enemies = this.enemySystem.getEnemies();
    let closestEnemy = null;
    
    if (enemies.length > 0) {
      let closestDist = Infinity;
      for (let enemy of enemies) {
        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }
    }
    
    // Get and apply rhythm results
    const rhythmResults = this.combatSystem.processRhythmEvents(
      this.player,
      closestEnemy?.x,
      closestEnemy?.y
    );
    
    if (rhythmResults.projectiles?.length > 0) {
      this.combatSystem.projectiles.push(...rhythmResults.projectiles);
    }
    
    if (rhythmResults.meleeAttacks?.length > 0) {
      this.combatSystem.meleeAttacks.push(...rhythmResults.meleeAttacks);
    }
    
    // Update combat
    this.combatSystem.update(this.deltaTime, this.player, this.enemySystem.getEnemies());
    
    // Update game systems
    this.gameSystem.update(
      this.deltaTime, 
      this.player,
      this.enemySystem,
      this.noteSystem,
      this.upgradeSystem
    );

    this.noteSystem.update(
      this.deltaTime,
      this.player.x,
      this.player.y,
      this.player.magnetRange || 1.0,
      this.player.magnetStrength || 1.0
    );

    // Check for note collection
    const collectionResult = this.noteSystem.checkCollection(
      this.player.x, this.player.y, this.player.size
    );
    
    if (collectionResult) {
      this.handleNoteCollection(collectionResult);
    }
    
    // Check for collisions with enemies
    const collision = this.enemySystem.checkPlayerCollision(
      this.player.x, this.player.y, this.player.size, this.deltaTime
    );

    if (collision) {
      this.handlePlayerCollision(collision);
    }
  }
}

// Extract note collection handling to a separate method for clarity
handleNoteCollection(collectionResult) {
  // Handle health pickup
  if (collectionResult.healthCollected) {
    const wasMaxHealth = this.player.health >= this.player.maxHealth;
    this.player.heal(1);
    
    // Play heart collection sound
    if (window.audioSystem) {
      window.audioSystem.playSound("collect_health");
    }
    
    // Bonus for collecting at max health
    if (wasMaxHealth) {
      // Calculate exact boost amount before applying
      const boostAmount = this.player.attackPower * 0.1;
      
      // Apply the boost
      this.player.attackPower += boostAmount;
      
      // Create a notification
      this.messageSystem.showRewardText("Max Health Bonus: +10% Damage!", "#ff5e5e");
      
      // Reset after 10 seconds by removing exactly what we added
      setTimeout(() => {
        this.player.attackPower -= boostAmount;
      }, 10000);
    }
  }
  
  // Increase note fragments if notes were collected
  if (collectionResult.notes && collectionResult.value > 0) {
    this.noteFragments += collectionResult.value;
    
    // Check for level up
    if (this.noteFragments >= this.notesForLevelUp) {
      this.levelUp();
      this.notesForLevelUp = Math.floor(1 + (this.level * 1.5) + Math.pow(this.level - 1, 1.8));
    }
    
    // Update UI
    this.updateUI();
  }
}

// Extract collision handling to a separate method for clarity
handlePlayerCollision(collision) {
  // Apply damage to player
  let damage = collision.damage || 1;
  const isDead = this.player.takeDamage(damage);
  
  // Play appropriate sound
  if (window.audioSystem) {
    window.audioSystem.playSound("player_hit", collision.isAoeDamage ? 0.5 : 1.0);
  }
  
  // Handle collision with enemy body
  if (collision.enemy) {
    // Push player back
    const dx = this.player.x - collision.enemy.x;
    const dy = this.player.y - collision.enemy.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0) {
      const pushForce = 10;
      this.player.x += (dx / dist) * pushForce;
      this.player.y += (dy / dist) * pushForce;
    }
    
    // Remove enemy
    const removedEnemy = this.enemySystem.removeEnemy(collision.index);
    if (removedEnemy) {
      this.gameSystem.onEnemyDefeated(removedEnemy, this.noteSystem);
    }
  }
  
  // Check if player is dead
  if (isDead) {
    this.gameOver();
  }
}

  // Render the game
  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Draw different content based on game state
    switch (this.gameStateManager.currentState) {
      case this.gameStateManager.states.MENU:
        this.renderMenu();
        break;
        
      case this.gameStateManager.states.CHARACTER_SELECT:
        this.renderCharacterSelect();
        break;
        
      case this.gameStateManager.states.PLAYING:
      case this.gameStateManager.states.PAUSED:
      case this.gameStateManager.states.MESSAGE:
      case this.gameStateManager.states.UPGRADE:
        this.renderGame();
        break;
        
      case this.gameStateManager.states.GAME_OVER:
        this.renderGameOver();
        break;
    }
  }

  // Render menu screen
  renderMenu() {
    // Draw background
    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '48px Consolas';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Silent Survivors', this.width / 2, this.height / 3);
  }

  // Render character select screen
  renderCharacterSelect() {
    // Draw background
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw musical grid in background
    this.drawMusicGrid();
  }

  // Render main gameplay
renderGame() {
  // Save context for camera transform
  this.ctx.save();
  
  // Apply camera transform
  this.ctx.translate(this.camera.x, this.camera.y);
  
  // Draw background
  this.drawMusicGrid();
  
  // Draw entities in correct order
  this.noteSystem.drawNotes(this.ctx);
  this.enemySystem.drawEnemies(this.ctx);
  
  // Draw integrated systems
  this.gameSystem.draw(this.ctx);
  
  this.combatSystem.drawProjectiles(this.ctx);
  this.combatSystem.drawMeleeAttacks(this.ctx);
  this.player.draw(this.ctx);
  
  // Draw particles (after other entities)
  this.combatSystem.drawParticles(this.ctx);
  
  // Restore context
  this.ctx.restore();
  
  this.ctx.restore();
  

    // Draw conductor system HUD (after camera transform is reset)
    if (this.conductorSystem && this.conductorSystem.currentEvent) {
      this.conductorSystem.drawEventHUD(this.ctx);
      
      // Draw event-specific visuals using the method from ConductorSystem
      if (typeof this.conductorSystem.drawCurrentEventVisuals === 'function') {
        this.conductorSystem.drawCurrentEventVisuals(this.ctx);
      }
    }
}

// Add the missing drawFallingNotes method
drawFallingNotes() {
  if (!this.conductorSystem || !this.conductorSystem.fallingNotes) return;
  
  for (const note of this.conductorSystem.fallingNotes) {
    // Apply camera transform to get screen position
    const screenX = note.x + this.camera.x;
    const screenY = note.y + this.camera.y;
    
    // Draw falling note
    this.ctx.save();
    this.ctx.translate(screenX, screenY);
    this.ctx.rotate(note.rotation);
    
    // Draw note circle
    this.ctx.fillStyle = note.color;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, note.size / 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw note symbol
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = `${note.size}px Consolas`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(note.symbol, 0, 0);
    
    this.ctx.restore();
  }
}


// Render game over screen
renderGameOver() {
  // Draw dim background
  this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  this.ctx.fillRect(0, 0, this.width, this.height);
  
  // Draw game over text
  this.ctx.fillStyle = '#ff4444';
  this.ctx.font = '48px Consolas';
  this.ctx.textAlign = 'center';
  this.ctx.fillText('Game Over', this.width / 2, this.height / 3);
  
  // Get player name from fame system
  const fameSystem = this.gameSystem?.fameSystem || window.fameSystem;
  const playerName = fameSystem ? fameSystem.playerName || "Player" : "Player";
  
  // Draw player name and stats
  this.ctx.fillStyle = '#ffffff';
  this.ctx.font = '24px Consolas';
  this.ctx.fillText(playerName, this.width / 2, this.height / 2 - 30);
  this.ctx.fillText(`Level Reached: ${this.level}`, this.width / 2, this.height / 2);

  // Draw fame earned
  const fameEarned = this.gameSystem?.fameSystem?.calculateRunFame(
    this.level, 
    this.noteFragments, 
    this.upgradeSystem.getUpgrades().length
  ) || 0;
  
  this.ctx.fillText(`Fame Earned: ${fameEarned}`, this.width / 2, this.height / 2 + 40);
}
  // Draw musical staff grid background
drawMusicGrid() {
  // Draw musical staff-like lines
  this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  this.ctx.lineWidth = 1;
  
  const lineSpacing = 40;
  const staffLines = 5;
  
  // Calculate visible area in world coordinates
  const visibleArea = {
    left: -this.camera.x,
    top: -this.camera.y,
    right: -this.camera.x + this.width,
    bottom: -this.camera.y + this.height
  };
  
  // Calculate which staff sections are visible
  const startY = Math.floor(visibleArea.top / (lineSpacing * staffLines + 100)) * (lineSpacing * staffLines + 100);
  const endY = visibleArea.bottom;
  
  // For conductor hazard lines event
  const isHazardEvent = this.conductorSystem && 
                       this.conductorSystem.currentEvent === "HAZARD_LINES";
  
  // For each staff section
  for (let y = startY; y < endY; y += lineSpacing * staffLines + 100) {
    // Choose one hazardous line per section (fixed but determined by y position)
    const hazardIndex = Math.abs(Math.floor(y / 1000)) % staffLines;
    
    for (let i = 0; i < staffLines; i++) {
      // Calculate line y position
      let lineY = y + i * lineSpacing;
      
      // Add vibration to the hazardous line
      // In main.js, replace the simple vibration calculation with:
if (isHazardEvent && i === hazardIndex) {
  // Get current beat for sync
  const isBeat = (Date.now() - (window.rhythmBeatEvent?.timestamp || 0)) < 200;
  
  // Get wave parameters from conductor system
  const waveIndex = i % 5;
  const frequency = this.conductorSystem.waveFrequencies?.[waveIndex] || 100;
  const phase = this.conductorSystem.wavePhases?.[waveIndex] || 0;
  
  // Calculate electrical wave pattern
  const baseAmount = isBeat ? 15 : 8;
  const time = Date.now() / frequency;
  
  // Complex wave pattern
  lineY += Math.sin(time + phase) * baseAmount + 
    Math.sin(time * 3) * (baseAmount/3) * 
    (Math.sin(time / 2) > 0 ? 1 : -1);

        // Draw hazardous line
        this.ctx.beginPath();
        this.ctx.moveTo(visibleArea.left, lineY);
        this.ctx.lineTo(visibleArea.right, lineY);
        
        this.ctx.strokeStyle = "rgba(255, 50, 50, 0.7)";
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Check for player collision
        if (this.player) {
          const playerY = this.player.y;
          if (Math.abs(playerY - lineY) < this.player.size / 2) {
            // Damage player (but not too frequently)
            if (!this.lastHazardDamageTime || 
                Date.now() - this.lastHazardDamageTime > 1000) {
              this.player.takeDamage(1);
              this.lastHazardDamageTime = Date.now();
            }
          }
        }
      } else {
        // Normal line
        this.ctx.beginPath();
        this.ctx.moveTo(visibleArea.left, lineY);
        this.ctx.lineTo(visibleArea.right, lineY);
        
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
  }
}

  // Update UI elements
  updateUI() {
    // Update level and notes display
    document.getElementById('level').textContent = this.level;
    document.getElementById('notes').textContent = this.noteFragments;
    document.getElementById('notes-needed').textContent = this.notesForLevelUp;
    
    // Update progress bar
    const progressPercent = (this.noteFragments / this.notesForLevelUp) * 100;
    document.getElementById('progress-bar').style.width = progressPercent + '%';
    
  }

  updateHealthUI() {
    const healthUI = document.getElementById('health-ui');
    if (!healthUI || !this.player) return;
    
    let hearts = '';
    for (let i = 0; i < this.player.maxHealth; i++) {
      if (i < this.player.health) {
        hearts += '❤️ ';
      } else {
        hearts += '🖤 ';
      }
    }
    healthUI.textContent = hearts;
  }
  
  // Level up
levelUp() {
  // Increment level
  this.level++;
  
  // Reset note fragments
  this.noteFragments = 0;
  
  // IMPORTANT: Keep player.level in sync
  this.player.level = this.level;
  
  // Calculate notes needed for next level up
  this.notesForLevelUp = Math.floor(5 + (this.level * 1.5));
  
  // Update UI
  this.updateUI();
  
  // Show level up message and upgrade menu
  this.messageSystem.showLevelUp(this.level);
  this.upgradeSystem.showUpgradeMenu(this.player);
  
  // Notify game system
  this.gameSystem.onLevelUp(this.player, this.level);
  
  console.log(`Level up! Now level ${this.level}`);
  
  // Log if we reached a conductor event level
  const nextEventLevel = this.conductorSystem.getNextEventLevel();
  if (this.level >= nextEventLevel) {
    console.log(`Reached conductor event level ${this.level}, threshold: ${nextEventLevel}`);
  }
}



  // Game over
gameOver() {
  // Change state
  this.gameStateManager.changeState(this.gameStateManager.states.GAME_OVER);
  
  // Calculate fame points through game system
  const gameOverStats = this.gameSystem.onGameOver(
    this.level, 
    this.noteFragments, 
    this.upgradeSystem.getUpgrades().length
  );
  
  // Check for new max level
  const fameSystem = this.gameSystem?.fameSystem || window.fameSystem;
  let isNewRecord = false;
  if (fameSystem) {
    isNewRecord = fameSystem.updateMaxLevel(this.level);
  }
  
  console.log(`Game over. Fame earned: ${gameOverStats ? gameOverStats.fameEarned : 0}`);
  
  // Show game over screen with restart button
  setTimeout(() => {
    // Show new record message if applicable
    if (isNewRecord) {
      const newRecordMsg = document.createElement('div');
      newRecordMsg.textContent = 'NEW RECORD!';
      newRecordMsg.style.position = 'absolute';
      newRecordMsg.style.top = '25%';
      newRecordMsg.style.left = '50%';
      newRecordMsg.style.transform = 'translateX(-50%)';
      newRecordMsg.style.color = '#ffff00';
      newRecordMsg.style.fontSize = '28px';
      newRecordMsg.style.fontWeight = 'bold';
      newRecordMsg.style.textShadow = '0 0 10px #ff8800';
      document.body.appendChild(newRecordMsg);
    }
    
    const restartButton = document.createElement('button');
    restartButton.id = 'restart-button';
    restartButton.textContent = 'Play Again';
    restartButton.style.position = 'absolute';
    restartButton.style.top = '60%';
    restartButton.style.left = '50%';
    restartButton.style.transform = 'translateX(-50%)';
    restartButton.style.padding = '10px 20px';
    restartButton.style.fontSize = '20px';
    restartButton.style.backgroundColor = '#ff4444';
    restartButton.style.color = 'white';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '5px';
    restartButton.style.cursor = 'pointer';
    
    restartButton.addEventListener('click', () => {
      // Remove new record message if it exists
      const newRecordMsg = document.querySelector('div');
      if (newRecordMsg && newRecordMsg.textContent === 'NEW RECORD!') {
        document.body.removeChild(newRecordMsg);
      }
      this.resetGame();
    });
    
    document.body.appendChild(restartButton);
  }, 1500);
}

  // Reset game
resetGame() {
  // Remove restart button if exists
  const restartButton = document.getElementById('restart-button');
  if (restartButton) {
    document.body.removeChild(restartButton);
  }
  
  // Reset game state
  this.level = 1;
  this.noteFragments = 0;
  this.notesForLevelUp = 10;
  
  // Reset player and systems
  this.player.reset();
  this.enemySystem.reset();
  this.noteSystem.reset();
  this.combatSystem.reset();
  this.upgradeSystem.reset();
  this.conductorSystem.reset();
  
  // Re-enable conductor
  this.conductorSystem.initialize();
  this.conductorSystem.setEnabled(true);
  
  // Return to character select
  this.gameStateManager.changeState(this.gameStateManager.states.CHARACTER_SELECT);
  document.getElementById('character-select').style.display = 'block';
  
  // Update UI
  this.updateUI();
  
  console.log('Game reset');
}


  toggleConductorEvent(eventType, enabled) {
  if (this.conductorSystem) {
    return this.conductorSystem.toggleEvent(eventType, enabled);
  }
  return false;
}

// Add method to enable/disable conductor system
setConductorEnabled(enabled) {
  if (this.conductorSystem) {
    return this.conductorSystem.setEnabled(enabled);
  }
  return false;
}

  // Handle window resize
  handleResize() {
    // Update dimensions
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    // Resize canvas
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    // Update camera dimensions
    this.camera.gameWidth = this.width;
    this.camera.gameHeight = this.height;
    this.camera.centerX = this.width / 2;
    this.camera.centerY = this.height / 2;
    
    console.log(`Window resized: ${this.width}x${this.height}`);
  }

  // Add these helper methods to SilentSurvivors class
showNameChangeUI() {
  const characterSelect = document.getElementById('character-select');
  if (!characterSelect) return;
  
  const playerInfoSection = characterSelect.querySelector('.player-info');
  if (!playerInfoSection) return;
  
  const nameChangeForm = document.createElement('div');
  nameChangeForm.className = 'player-name-form';
  nameChangeForm.style.marginBottom = '20px';
  nameChangeForm.innerHTML = `
    <div style="font-size: 18px; margin-bottom: 10px;">Change Your Name:</div>
    <input type="text" id="player-name-input" placeholder="${(this.gameSystem?.fameSystem || window.fameSystem)?.playerName || 'Your Name'}" maxlength="20"
      style="padding: 8px; width: 200px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #6644aa; border-radius: 4px; margin-right: 10px;">
    <button id="save-name-btn" style="padding: 8px 12px; background: #6644aa; border: none; color: white; border-radius: 3px; cursor: pointer;">Save</button>
  `;
  
  playerInfoSection.replaceWith(nameChangeForm);
  
  const saveNameBtn = document.getElementById('save-name-btn');
  const nameInput = document.getElementById('player-name-input');
  if (saveNameBtn && nameInput) {
    saveNameBtn.addEventListener('click', () => {
      this.savePlayerName(nameInput.value);
    });
    
    nameInput.focus();
    nameInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        this.savePlayerName(nameInput.value);
      }
    });
  }
}

savePlayerName(name) {
  if (!name || name.trim() === '') return;
  
  const fameSystem = this.gameSystem?.fameSystem || window.fameSystem;
  if (fameSystem) {
    fameSystem.setPlayerName(name.trim());
    this.setupCharacterSelect();
  }
}
}
document.addEventListener('DOMContentLoaded', () => {
  const game = new SilentSurvivors();
  window.game = game; // Make globally available for debugging
  game.start();

});
