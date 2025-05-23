// conductor.js - Level-based event system implementation

class ConductorSystem {
  constructor(gameStateManager, audioSystem, enemySystem) {
    // Core properties
    this.gameStateManager = gameStateManager;
    this.audioSystem = audioSystem;
    this.enemySystem = enemySystem;
    this.enabled = false;
    this.currentEvent = null;
    this.eventTimer = 0;
    this.baseDuration = 10000;   // Base duration (will be scaled with level)
    this.eventDuration = this.baseDuration;
    
    // Level-based event triggering
    this.lastEventLevel = 0;
    this.eventLevels = [7, 11, 14, 17, 21, 23]; // Levels at which events trigger
    this.currentLevelIndex = 0;
    
    // Event objects
    this.fallingNotes = [];
    this.safeZones = [];
    
    // Scoring
    this.eventScore = 0;
    this.totalScore = 0;
    
    // Available events
    this.events = [
      "FALLING_NOTES",
      "RHYTHM_ZONES",
      "TEMPO_CHANGE",
      "HAZARD_LINES"
    ];
    
    // Settings for testing
    this.enabledEvents = {
      FALLING_NOTES: true,
      RHYTHM_ZONES: true,
      TEMPO_CHANGE: true,
      HAZARD_LINES: true
    };
  }

  initialize() {
    this.enabled = true;
    this.eventTimer = 0;
    this.setupInitialEvents();
    console.log("Conductor system initialized and enabled");
    return true;
  }

  setupInitialEvents() {
    // Ensure we have some initial events enabled
    for (const key in this.enabledEvents) {
      this.enabledEvents[key] = true;
    }
    
    // Reset level tracking
    this.lastEventLevel = 0;
    this.currentLevelIndex = 0;
  }

  update(deltaTime, player) {
    if (!this.enabled || !player || this.gameStateManager.isPaused()) return;

    // Handle event timing
    if (this.currentEvent) {
      this.eventTimer += deltaTime;
      if (this.eventTimer >= this.eventDuration) {
        this.endEvent();
      } else {
        // Update current event
        this.updateCurrentEvent(deltaTime, player);
      }
    } else {
      // Check if we should trigger based on player level
      const nextEventLevel = this.getNextEventLevel();
      
      if (player.level >= nextEventLevel) {
        console.log(`Conductor: Starting event at level ${player.level}, threshold was ${nextEventLevel}`);
        this.startRandomEvent(player.level);
        this.lastEventLevel = player.level;
        this.currentLevelIndex++;
      }
    }
  }

  // Get the next level at which an event should trigger
  getNextEventLevel() {
    if (this.currentLevelIndex >= this.eventLevels.length) {
      // If we've gone through all predefined levels, use a fallback pattern
      return this.lastEventLevel + 2;
    }
    return this.eventLevels[this.currentLevelIndex];
  }

  startRandomEvent(playerLevel) {
    // Filter to only enabled events
    const availableEvents = this.events.filter(event => this.enabledEvents[event]);
    
    if (availableEvents.length === 0) return;
    
    // Select random event
    const eventType = availableEvents[Math.floor(Math.random() * availableEvents.length)];
    this.startEvent(eventType, playerLevel);
  }

  startEvent(eventType, playerLevel = 1) {
    if (!this.enabledEvents[eventType]) return;
    
    this.eventDuration = this.baseDuration + (playerLevel * 1000);
    this.currentEvent = eventType;
    this.eventTimer = 0;
    this.eventScore = 0;
    
    // Handle enemy behavior for certain events
    if (this.enemySystem && 
       (eventType === "FALLING_NOTES" || eventType === "RHYTHM_ZONES")) {
      this.enemySystem.enemies = []; // Clear enemies
      this.enemyShouldSpawn = this.enemySystem.shouldSpawn; // Store current spawn state
      this.enemySystem.shouldSpawn = false; // Disable enemy spawning
    }
    
    // Initialize event
    switch(eventType) {
      case "FALLING_NOTES":
        this.initFallingNotes(playerLevel);
        break;
      case "RHYTHM_ZONES":
        this.initRhythmZones(playerLevel);
        break;
      case "TEMPO_CHANGE":
        this.initTempoChange(playerLevel);
        break;
      case "HAZARD_LINES":
        this.initHazardLines(playerLevel);
        break;
    }
      
    // Play event start sound
    if (this.audioSystem) {
      this.audioSystem.playSound("conductor_event");
    }
    
    console.log(`Conductor event started: ${eventType} (Level ${playerLevel})`);
  }

  endEvent() {
    if (!this.currentEvent) return;
    
    // Cleanup based on event type
    switch(this.currentEvent) {
      case "FALLING_NOTES":
        this.fallingNotes = [];
        break;
      case "RHYTHM_ZONES":
        this.safeZones = [];
        break;
      case "TEMPO_CHANGE":
        // Reset tempo to default
        if (this.audioSystem) {
          this.audioSystem.setBPM(60);
        }
        break;
    }
    
    // Re-enable enemy spawning for events that disabled it
    if (this.enemySystem && 
       (this.currentEvent === "FALLING_NOTES" || this.currentEvent === "RHYTHM_ZONES")) {
      this.enemySystem.shouldSpawn = this.enemyShouldSpawn || true;
    }
    
    // Add to total score
    this.totalScore += this.eventScore;
    
    // Show score notification
    this.showEventScore();
    
    this.currentEvent = null;
    this.eventTimer = 0;
    
    console.log(`Conductor event ended. Score: ${this.eventScore}`);
  }

  updateCurrentEvent(deltaTime, player) {
    switch(this.currentEvent) {
      case "FALLING_NOTES":
        this.updateFallingNotes(deltaTime, player);
        break;
      case "RHYTHM_ZONES":
        this.updateRhythmZones(deltaTime, player);
        break;
      case "HAZARD_LINES":
        this.updateHazardLines(deltaTime, player);
        break;
      case "TEMPO_CHANGE":
        // Tempo change doesn't need continuous updates
        break;
      default:
        break;
    }
  }

  // FALLING_NOTES implementation
  initFallingNotes(playerLevel) {
    this.fallingNotes = [];
    this.fallingNotesTimer = 0;
    
    // Longer interval for fewer notes
    const baseInterval = 1200;
    this.fallingNotesInterval = Math.max(600, baseInterval - (playerLevel * 30));
  }

  updateFallingNotes(deltaTime, player) {
    // Spawn new notes - timed to music beat when possible
    this.fallingNotesTimer += deltaTime;
    
    const shouldSpawnOnBeat = window.rhythmBeatEvent && 
                             Date.now() - window.rhythmBeatEvent.timestamp < 100;
    
    if (shouldSpawnOnBeat || this.fallingNotesTimer >= this.fallingNotesInterval) {
      // Fewer notes that gradually increase
      const progress = this.eventTimer / this.eventDuration;
      const noteCount = 1 + Math.floor(progress * 2);
      
      for (let i = 0; i < noteCount; i++) {
        this.spawnFallingNote();
      }
      
      this.fallingNotesTimer = 0;
    }
    
    // Update existing notes
    for (let i = this.fallingNotes.length - 1; i >= 0; i--) {
      const note = this.fallingNotes[i];
      
      // Move note downward
      note.y += note.speed * (deltaTime / 16);
      
      // Rotate note for visual effect
      note.rotation += 0.01 * (deltaTime / 16);
      
      // Remove if off-screen
      if (note.y > player.y + 500) {
        this.fallingNotes.splice(i, 1);
        continue;
      }
      
      // Check collision with player
      const dx = player.x - note.x;
      const dy = player.y - note.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < player.size / 2 + note.size / 2) {
        // Hit player with note
        if (!note.hasHitPlayer) {
          player.takeDamage(1);
          note.hasHitPlayer = true;
          
          // Play hit sound
          if (window.audioSystem) {
            window.audioSystem.playSound("player_hit");
          }
        }
      }
      
      // Check collision with projectiles
      if (window.combatSystem && window.combatSystem.projectiles) {
        const projectiles = window.combatSystem.projectiles;
        
        for (let j = projectiles.length - 1; j >= 0; j--) {
          const projectile = projectiles[j];
          
          const projDx = projectile.x - note.x;
          const projDy = projectile.y - note.y;
          const projDist = Math.sqrt(projDx * projDx + projDy * projDy);
          
          if (projDist < projectile.size / 2 + note.size / 2) {
            // Note hit by projectile
            this.fallingNotes.splice(i, 1);
            
            // Remove non-piercing projectile
            if (!projectile.piercing) {
              projectiles.splice(j, 1);
            }
            
            // Small point bonus for destroying notes
            this.eventScore += 1;
            
            // Play destroy sound
            if (window.audioSystem) {
              window.audioSystem.playSound("melee_hit", 0.5);
            }
            
            break;
          }
        }
      }
    }
  }

  spawnFallingNote() {
    // Get player position from global reference
    const player = window.game?.player;
    if (!player) return;
    
    // Spawn within visible area relative to player position
    const offsetX = (Math.random() * 600) - 300; // ±300 from player
    const offsetY = -400; // Above player
    
    const x = player.x + offsetX;
    const y = player.y + offsetY;
    
    // Create harmful note
    const note = {
      x: x,
      y: y,
      size: 20,
      speed: 2 + Math.random() * 3,
      color: "#ff3333", // Red for harmful notes
      symbol: "♯",
      rotation: Math.random() * Math.PI * 2,
      hasHitPlayer: false
    };
    
    this.fallingNotes.push(note);
    return note;
  }

  // RHYTHM_ZONES implementation
  initRhythmZones(playerLevel) {
    this.safeZones = [];
    this.safeZoneTimer = 0;
    
    const baseSpawnRate = 2500;
    this.safeZoneSpawnRate = Math.max(1200, baseSpawnRate - (playerLevel * 100));
    
    // Initial safe zones
    const initialZones = Math.max(2, 4 - Math.floor(playerLevel / 3));
    
    for (let i = 0; i < initialZones; i++) {
      this.spawnSafeZone();
    }
  }

  updateRhythmZones(deltaTime, player) {
    // Change safe zones periodically
    this.safeZoneTimer += deltaTime;
    
    if (this.safeZoneTimer >= this.safeZoneSpawnRate) {
      // Create transition zones
      const oldZones = [...this.safeZones];
      this.safeZones = [];
      
      // Create new zones before removing old ones
      const progress = this.eventTimer / this.eventDuration;
      const maxZones = Math.max(1, 3 - Math.floor(progress * 2));
      
      for (let i = 0; i < maxZones; i++) {
        this.spawnSafeZone();
      }
      
      // Keep old zones briefly with fading
      for (const zone of oldZones) {
        zone.fadeTimer = 1000;
        zone.maxFadeTime = 1000;
        this.safeZones.push(zone);
      }
      
      this.safeZoneTimer = 0;
      
      if (this.audioSystem) {
        this.audioSystem.playSound("beat_strong", 0.5);
      }
    }
    
    // Update fading for old zones
    for (let i = this.safeZones.length - 1; i >= 0; i--) {
      const zone = this.safeZones[i];
      
      if (zone.fadeTimer !== undefined) {
        zone.fadeTimer -= deltaTime;
        
        if (zone.fadeTimer <= 0) {
          this.safeZones.splice(i, 1);
        }
      }
    }
    
    // Check if player is in any safe zone
    let inSafeZone = false;
    
    for (const zone of this.safeZones) {
      const dx = player.x - zone.x;
      const dy = player.y - zone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < zone.radius) {
        inSafeZone = true;
        
        // Only score points for non-fading zones
        if (zone.fadeTimer === undefined) {
          zone.scoreTimer = (zone.scoreTimer || 0) + deltaTime;
          if (zone.scoreTimer >= 1000) {
            this.eventScore += 5;
            zone.scoreTimer = 0;
          }
        }
        
        break;
      }
    }
    
    // Damage player if not in safe zone
    if (player && !inSafeZone) {
      this.dangerZoneTimer = (this.dangerZoneTimer || 0) + deltaTime;
      if (this.dangerZoneTimer >= 1000) {
        player.takeDamage(1);
        this.dangerZoneTimer = 0;
        
        if (window.audioSystem) {
          window.audioSystem.playSound("player_hit");
        }
      }
    } else {
      this.dangerZoneTimer = 0;
    }
  }

  spawnSafeZone() {
    // Get player position
    const player = window.game?.player || { x: 0, y: 0 };
    
    // Random position within bounds around player
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 200;
    
    const x = player.x + Math.cos(angle) * distance;
    const y = player.y + Math.sin(angle) * distance;
    
    this.safeZones.push({
      x: x,
      y: y,
      radius: 80 + Math.random() * 40,
      scoreTimer: 0,
      pulseRate: 300 + Math.random() * 200
    });
  }

  // TEMPO_CHANGE implementation
  initTempoChange(playerLevel) {
    const audioSystem = this.audioSystem || window.audioSystem;
    this.originalBPM = audioSystem ? audioSystem.bpm : 60;
    
    // Simpler calculation
    const speedFactor = 1.4 + (Math.min(playerLevel, 10) * 0.02);
    this.isSpeedUp = Math.random() < 0.5;
    
    if (audioSystem) {
      const newBPM = this.isSpeedUp ? 
                   Math.round(this.originalBPM * speedFactor) : 
                   Math.round(this.originalBPM / speedFactor);
                   
      console.log(`Tempo change: ${this.isSpeedUp ? 'up' : 'down'} to ${newBPM} BPM (from ${this.originalBPM})`);
      
      // Set new BPM
      audioSystem.setBPM(newBPM);
      audioSystem.playSound(this.isSpeedUp ? "tempo_up" : "tempo_down", 0.7);
    }
    
    // Visual effects
    this.tempoFlashTime = 1000;
    this.tempoUpdateTime = 0;
  }

initHazardLines(playerLevel) {
  // Store which lines are hazardous
  this.hazardLineIndices = [];
  this.lastHazardLineChange = 0;
  this.hazardLineChangeInterval = 4000; // Change lines every 4 seconds
  
  // Select lines to be hazardous based on player level
  this.lineCount = Math.min(2 + Math.floor(playerLevel / 5), 4);
  
  // Pick initial hazardous lines
  this.selectHazardousLines();
  
  // Setup damage timer and wave properties
  this.hazardLineDamageTimer = 0;
  this.wavePhases = [0, 0.3, 0.6, 0.9, 1.2]; // Different phases for each line
  this.waveFrequencies = [100, 90, 110, 95, 105]; // Different frequencies
}

updateHazardLines(deltaTime, player) {
  if (!player) return;
  
  // Check if it's time to change hazardous lines
  this.lastHazardLineChange += deltaTime;
  if (this.lastHazardLineChange >= this.hazardLineChangeInterval) {
    this.selectHazardousLines();
    this.lastHazardLineChange = 0;
    
    // Play warning sound
    if (window.audioSystem) {
      window.audioSystem.playSound("beat_strong", 0.5);
    }
  }
  
  // Check collision with hazardous lines
  let isOnHazardLine = false;
  
  const lineSpacing = 40;
  const staffLines = 5;
  const totalHeight = lineSpacing * (staffLines - 1) + 100;
  
  // Get player section
  const sectionY = Math.floor(player.y / totalHeight) * totalHeight;
  
  // Calculate collision size
  const collisionRadius = player.size * 0.4;
  
  // Check each hazardous line in the section
  for (const lineIndex of this.hazardLineIndices) {
    const lineY = sectionY + lineIndex * lineSpacing;
    
    // Create electrical wave pattern
    const isBeat = (Date.now() - (window.rhythmBeatEvent?.timestamp || 0)) < 200;
    const baseAmount = isBeat ? 15 : 8;
    
    // Composite wave function for electrical effect
    const time = Date.now() / this.waveFrequencies[lineIndex];
    const phase = this.wavePhases[lineIndex];
    
    // Main sine wave + higher frequency lower amplitude wave
    const adjustedLineY = lineY + 
      Math.sin(time + phase) * baseAmount + 
      Math.sin(time * 3) * (baseAmount/3) * 
      (Math.sin(time / 2) > 0 ? 1 : -1); // Sharp direction changes
    
    // Check collision with adjusted precision
    if (Math.abs(player.y - adjustedLineY) < collisionRadius) {
      isOnHazardLine = true;
      break;
    }
  }
  
  // Apply damage if on hazard line
  if (isOnHazardLine) {
    this.hazardLineDamageTimer = (this.hazardLineDamageTimer || 0) + deltaTime;
    if (this.hazardLineDamageTimer > 1000) {
      player.takeDamage(1);
      this.hazardLineDamageTimer = 0;
      
      if (window.audioSystem) {
        window.audioSystem.playSound("player_hit");
      }
    }
  } else {
    // Reset damage timer when not on hazard line
    this.hazardLineDamageTimer = 0;
  }
}

// Helper method to select new hazardous lines
selectHazardousLines() {
  this.hazardLineIndices = [];
  const possibleLines = [0, 1, 2, 3, 4]; // 5 staff lines
  
  for (let i = 0; i < this.lineCount; i++) {
    if (possibleLines.length > 0) {
      const randIndex = Math.floor(Math.random() * possibleLines.length);
      this.hazardLineIndices.push(possibleLines[randIndex]);
      possibleLines.splice(randIndex, 1);
    }
  }
}

  // Draw methods for events
  drawRhythmZones(ctx) {
    const camera = window.game?.camera || { x: 0, y: 0 };
    
    ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
    ctx.font = '18px Consolas';
    ctx.textAlign = 'center';
    ctx.fillText('WARNING: Unsafe Areas! Stay In Safe Zones!', ctx.canvas.width / 2, 30);
    
    ctx.fillStyle = "rgba(255, 100, 100, 0.15)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw safe zones with fading support
    for (const zone of this.safeZones) {
      // Calculate opacity based on fade state
      let opacity = 1.0;
      if (zone.fadeTimer !== undefined) {
        opacity = zone.fadeTimer / zone.maxFadeTime;
      }
      
      const pulse = 0.8 + 0.2 * Math.sin(Date.now() / zone.pulseRate);
      
      // Draw zone with opacity
      ctx.fillStyle = `rgba(100, 255, 100, ${0.4 * opacity})`;
      ctx.beginPath();
      ctx.arc(zone.x + camera.x, zone.y + camera.y, 
              zone.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = `rgba(50, 200, 50, ${0.8 * opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(zone.x + camera.x, zone.y + camera.y, 
              zone.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();
      
      // Only draw symbol for non-fading zones
      if (zone.fadeTimer === undefined) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px Consolas";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♪", zone.x + camera.x, zone.y + camera.y);
      }
    }
  }

  drawTempoChange(ctx) {
    // Get screen dimensions
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // Show tempo change notification
    ctx.fillStyle = this.isSpeedUp ? "#ff8844" : "#44aaff";
    ctx.font = "24px Consolas";
    ctx.textAlign = "center";
    ctx.fillText(
      this.isSpeedUp ? "TEMPO UP!" : "TEMPO DOWN!", 
      width / 2, 
      height / 2 - 100
    );
    
    // Flash effect for first second
    if (this.eventTimer < this.tempoFlashTime) {
      // Draw full screen overlay
      const opacity = (this.tempoFlashTime - this.eventTimer) / this.tempoFlashTime * 0.2;
      ctx.fillStyle = this.isSpeedUp ? `rgba(255, 100, 0, ${opacity})` : `rgba(0, 100, 255, ${opacity})`;
      ctx.fillRect(0, 0, width, height);
    }
    
    // Draw tempo indicator
    const indicators = 8;
    const spacing = 30;
    const startX = width / 2 - (indicators * spacing) / 2;
    
    for (let i = 0; i < indicators; i++) {
      const x = startX + i * spacing;
      const y = height / 2 - 50;
      
      // Highlight current beat
      const beatDuration = this.isSpeedUp ? 400 : 800; // ms per beat
      const beat = Math.floor((this.eventTimer % (beatDuration * indicators)) / beatDuration);
      
      if (i === beat) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

drawHazardLines(ctx) {
  // Just draw the warning text - the actual hazard lines are handled in main.js drawMusicGrid
  ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
  ctx.font = '18px Consolas';
  ctx.textAlign = 'center';
  ctx.fillText('WARNING: Hazardous Staff Lines! Avoid the red lines!', ctx.canvas.width / 2, 30);
  
  // No need to duplicate the line drawing logic - main.js already checks
  // for this.conductorSystem.currentEvent === "HAZARD_LINES"
}

  // Event HUD drawing
  drawEventHUD(ctx) {
    // Event name
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Consolas';
    ctx.textAlign = 'center';
    ctx.fillText(`Conductor Event: ${this.formatEventName(this.currentEvent)}`, ctx.canvas.width / 2, 80);
    
    // Timer bar
    const timerWidth = 200;
    const timerHeight = 5;
    const timerX = ctx.canvas.width / 2 - timerWidth / 2;
    const timerY = 90;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(timerX, timerY, timerWidth, timerHeight);
    
    const progress = Math.min(this.eventTimer / this.eventDuration, 1);
    ctx.fillStyle = progress < 0.5 ? '#44ff44' : (progress < 0.8 ? '#ffff44' : '#ff4444');
    ctx.fillRect(timerX, timerY, timerWidth * progress, timerHeight);
    
    // Current score
    ctx.fillStyle = '#ffcc00';
    ctx.font = '14px Consolas';
    ctx.fillText(`Score: ${this.eventScore}`, ctx.canvas.width / 2, 110);
  }

  // Format event name for UI display
  formatEventName(eventType) {
    if (!eventType) return "";
    return eventType.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Event score notification
  showEventScore() {
    // Only create notification if we have a message system
    const messageSystem = window.messageSystem || null;
    if (!messageSystem) return;
    
    const color = this.eventScore > 50 ? "#44ff44" : 
                this.eventScore > 20 ? "#ffff44" : "#ff8844";
    
    messageSystem.showRewardText(`Event Score: ${this.eventScore}`, color);
  }
    
  // Control methods
  toggleEvent(eventType, enabled) {
    if (this.enabledEvents.hasOwnProperty(eventType)) {
      this.enabledEvents[eventType] = enabled;
      return true;
    }
    return false;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.currentEvent) {
      this.endEvent();
    }
    return this.enabled;
  }

  reset() {
    this.enabled = false;
    this.currentEvent = null;
    this.eventTimer = 0;
    this.fallingNotes = [];
    this.safeZones = [];
    this.eventScore = 0;
    this.totalScore = 0;
    this.lastEventLevel = 0;
    this.currentLevelIndex = 0;
  }
}

export default ConductorSystem;