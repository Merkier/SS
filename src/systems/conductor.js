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

    // Boss Event Types
    this.PERCUSSIONIST_EVENT = "PERCUSSIONIST_EVENT";
    this.CONDUCTOR_EVENT = "CONDUCTOR_EVENT";
    this.ORCHESTRATOR_EVENT = "ORCHESTRATOR_EVENT";
    this.activeBoss = null;
    this.bossEventLevels = [5, 10, 15];
    this.bossEventMapping = { 
      5: this.PERCUSSIONIST_EVENT, 
      10: this.CONDUCTOR_EVENT, 
      15: this.ORCHESTRATOR_EVENT 
    };
    this.nextBossLevelIndex = 0;
    
    // Available events
    this.events = [
      "FALLING_NOTES",
      "RHYTHM_ZONES",
      "TEMPO_CHANGE",
      "HAZARD_LINES",
      this.PERCUSSIONIST_EVENT,
      this.CONDUCTOR_EVENT,
      this.ORCHESTRATOR_EVENT
    ];
    
    // Settings for testing
    this.enabledEvents = {
      FALLING_NOTES: true,
      RHYTHM_ZONES: true,
      TEMPO_CHANGE: true,
      HAZARD_LINES: true,
      PERCUSSIONIST_EVENT: true,
      CONDUCTOR_EVENT: true,
      ORCHESTRATOR_EVENT: true
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
    this.nextBossLevelIndex = 0;
    this.activeBoss = null;
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
      // Check for boss events first
      if (this.nextBossLevelIndex < this.bossEventLevels.length) {
        const nextBossLevel = this.bossEventLevels[this.nextBossLevelIndex];
        if (player.level >= nextBossLevel) {
          const bossEventType = this.bossEventMapping[nextBossLevel];
          if (bossEventType && this.enabledEvents[bossEventType]) { 
            console.log(`Conductor: Starting BOSS event ${bossEventType} at level ${player.level}`);
            this.startEvent(bossEventType, player.level);
            this.lastEventLevel = player.level; 
            this.nextBossLevelIndex++; 
            return; 
          }
        }
      }

      // If no boss event, proceed to check for regular events
      const nextEventLevel = this.getNextEventLevel();
      if (player.level >= nextEventLevel && player.level > this.lastEventLevel) { 
        console.log(`Conductor: Starting regular event at level ${player.level}, threshold was ${nextEventLevel}`);
        this.startRandomEvent(player.level); // player.level might be > nextEventLevel if a boss event just finished
        this.lastEventLevel = player.level; 
        this.currentLevelIndex++; 
      }
    }
  }

  // Get the next level at which an event should trigger
  getNextEventLevel() {
    if (this.currentLevelIndex >= this.eventLevels.length) {
      // If we've gone through all predefined levels, use a fallback pattern
      // Ensure this doesn't overlap with upcoming boss levels if possible, or make it high enough
      let potentialNextLevel = this.lastEventLevel + 2;
      while(this.bossEventLevels.slice(this.nextBossLevelIndex).includes(potentialNextLevel)) {
        potentialNextLevel++;
      }
      return potentialNextLevel;
    }
    return this.eventLevels[this.currentLevelIndex];
  }

  startRandomEvent(playerLevel) {
    // Filter to only enabled events that are not boss events
    const availableEvents = this.events.filter(event => 
        this.enabledEvents[event] && 
        !Object.values(this.bossEventMapping).includes(event)
    );
    
    if (availableEvents.length === 0) return;
    
    // Select random event
    const eventType = availableEvents[Math.floor(Math.random() * availableEvents.length)];
    this.startEvent(eventType, playerLevel);
  }

  startEvent(eventType, playerLevel = 1) {
    if (!this.enabledEvents[eventType]) return;
    
    this.eventDuration = this.baseDuration + (playerLevel * 1000);
    // For boss events, you might want a longer or specific duration
    if (Object.values(this.bossEventMapping).includes(eventType)) {
        this.eventDuration = 60000 + (playerLevel * 5000); // Example: Boss events last longer
    }

    this.currentEvent = eventType;
    this.eventTimer = 0;
    this.eventScore = 0;
    
    if (this.enemySystem && (eventType === "FALLING_NOTES" || eventType === "RHYTHM_ZONES" || Object.values(this.bossEventMapping).includes(eventType))) {
      this.enemyShouldSpawn = this.enemySystem.shouldSpawn; 
      this.enemySystem.shouldSpawn = false; 
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
      case this.PERCUSSIONIST_EVENT: 
        this.initPercussionistEvent(playerLevel); 
        break;
      case this.CONDUCTOR_EVENT: 
        this.initConductorEvent(playerLevel); 
        break;
      case this.ORCHESTRATOR_EVENT: 
        this.initOrchestratorEvent(playerLevel); 
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
    
    if (this.enemySystem && this.enemyShouldSpawn !== undefined && 
        (this.currentEvent === "FALLING_NOTES" || this.currentEvent === "RHYTHM_ZONES" || Object.values(this.bossEventMapping).includes(this.currentEvent))) {
      this.enemySystem.shouldSpawn = this.enemyShouldSpawn;
      delete this.enemyShouldSpawn; 
    }
    if (Object.values(this.bossEventMapping).includes(this.currentEvent)) {
        this.activeBoss = null; 
    }

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
          this.audioSystem.setBPM(this.originalBPM || 60); // Use stored original or default
        }
        break;
      // Add cases for boss events if specific cleanup needed beyond activeBoss = null
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
        // Tempo change doesn't need continuous updates beyond initial setup
        break;
      case this.PERCUSSIONIST_EVENT: 
        this.updatePercussionistEvent(deltaTime, player); 
        break;
      case this.CONDUCTOR_EVENT: 
        this.updateConductorEvent(deltaTime, player); 
        break;
      case this.ORCHESTRATOR_EVENT: 
        this.updateOrchestratorEvent(deltaTime, player); 
        break;
      default:
        break;
    }
  }

  // FALLING_NOTES implementation
  initFallingNotes(playerLevel) {
    this.fallingNotes = [];
    this.fallingNotesTimer = 0;
    
    const baseInterval = 1200;
    this.fallingNotesInterval = Math.max(600, baseInterval - (playerLevel * 30));
  }

  updateFallingNotes(deltaTime, player) {
    this.fallingNotesTimer += deltaTime;
    
    const shouldSpawnOnBeat = window.rhythmBeatEvent && 
                             Date.now() - window.rhythmBeatEvent.timestamp < 100;
    
    if (shouldSpawnOnBeat || this.fallingNotesTimer >= this.fallingNotesInterval) {
      const progress = this.eventTimer / this.eventDuration;
      const noteCount = 1 + Math.floor(progress * 2);
      
      for (let i = 0; i < noteCount; i++) {
        this.spawnFallingNote();
      }
      this.fallingNotesTimer = 0;
    }
    
    for (let i = this.fallingNotes.length - 1; i >= 0; i--) {
      const note = this.fallingNotes[i];
      note.y += note.speed * (deltaTime / 16);
      note.rotation += 0.01 * (deltaTime / 16);
      
      if (note.y > player.y + 500) { // Adjusted off-screen condition based on player
        this.fallingNotes.splice(i, 1);
        continue;
      }
      
      const dx = player.x - note.x;
      const dy = player.y - note.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < player.size / 2 + note.size / 2) {
        if (!note.hasHitPlayer) {
          player.takeDamage(1);
          note.hasHitPlayer = true;
          if (window.audioSystem) window.audioSystem.playSound("player_hit");
        }
      }
      
      if (window.combatSystem && window.combatSystem.projectiles) {
        const projectiles = window.combatSystem.projectiles;
        for (let j = projectiles.length - 1; j >= 0; j--) {
          const projectile = projectiles[j];
          const projDx = projectile.x - note.x;
          const projDy = projectile.y - note.y;
          const projDist = Math.sqrt(projDx * projDx + projDy * projDy);
          
          if (projDist < projectile.size / 2 + note.size / 2) {
            this.fallingNotes.splice(i, 1);
            if (!projectile.piercing) projectiles.splice(j, 1);
            this.eventScore += 1;
            if (window.audioSystem) window.audioSystem.playSound("melee_hit", 0.5);
            break; 
          }
        }
      }
    }
  }

  spawnFallingNote() {
    const player = window.game?.player;
    if (!player) return;
    
    const offsetX = (Math.random() * 600) - 300; 
    const offsetY = -400; 
    
    const x = player.x + offsetX;
    const y = player.y + offsetY;
    
    const note = {
      x: x, y: y, size: 20, speed: 2 + Math.random() * 3,
      color: "#ff3333", symbol: "♯", rotation: Math.random() * Math.PI * 2,
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
    const initialZones = Math.max(2, 4 - Math.floor(playerLevel / 3));
    for (let i = 0; i < initialZones; i++) this.spawnSafeZone();
  }

  updateRhythmZones(deltaTime, player) {
    this.safeZoneTimer += deltaTime;
    if (this.safeZoneTimer >= this.safeZoneSpawnRate) {
      const oldZones = [...this.safeZones];
      this.safeZones = [];
      const progress = this.eventTimer / this.eventDuration;
      const maxZones = Math.max(1, 3 - Math.floor(progress * 2));
      for (let i = 0; i < maxZones; i++) this.spawnSafeZone();
      for (const zone of oldZones) {
        zone.fadeTimer = 1000; zone.maxFadeTime = 1000; this.safeZones.push(zone);
      }
      this.safeZoneTimer = 0;
      if (this.audioSystem) this.audioSystem.playSound("beat_strong", 0.5);
    }

    for (let i = this.safeZones.length - 1; i >= 0; i--) {
      const zone = this.safeZones[i];
      if (zone.fadeTimer !== undefined) {
        zone.fadeTimer -= deltaTime;
        if (zone.fadeTimer <= 0) this.safeZones.splice(i, 1);
      }
    }

    let inSafeZone = false;
    for (const zone of this.safeZones) {
      const dx = player.x - zone.x; const dy = player.y - zone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < zone.radius) {
        inSafeZone = true;
        if (zone.fadeTimer === undefined) {
          zone.scoreTimer = (zone.scoreTimer || 0) + deltaTime;
          if (zone.scoreTimer >= 1000) { this.eventScore += 5; zone.scoreTimer = 0; }
        }
        break;
      }
    }

    if (player && !inSafeZone) {
      this.dangerZoneTimer = (this.dangerZoneTimer || 0) + deltaTime;
      if (this.dangerZoneTimer >= 1000) {
        player.takeDamage(1); this.dangerZoneTimer = 0;
        if (window.audioSystem) window.audioSystem.playSound("player_hit");
      }
    } else { this.dangerZoneTimer = 0; }
  }

  spawnSafeZone() {
    const player = window.game?.player || { x: 0, y: 0 };
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 200;
    const x = player.x + Math.cos(angle) * distance;
    const y = player.y + Math.sin(angle) * distance;
    this.safeZones.push({
      x: x, y: y, radius: 80 + Math.random() * 40,
      scoreTimer: 0, pulseRate: 300 + Math.random() * 200
    });
  }

  // TEMPO_CHANGE implementation
  initTempoChange(playerLevel) {
    const audioSystem = this.audioSystem || window.audioSystem;
    this.originalBPM = audioSystem ? audioSystem.bpm : 60;
    const speedFactor = 1.4 + (Math.min(playerLevel, 10) * 0.02);
    this.isSpeedUp = Math.random() < 0.5;
    if (audioSystem) {
      const newBPM = this.isSpeedUp ? 
                   Math.round(this.originalBPM * speedFactor) : 
                   Math.round(this.originalBPM / speedFactor);
      console.log(`Tempo change: ${this.isSpeedUp ? 'up' : 'down'} to ${newBPM} BPM (from ${this.originalBPM})`);
      audioSystem.setBPM(newBPM);
      audioSystem.playSound(this.isSpeedUp ? "tempo_up" : "tempo_down", 0.7);
    }
    this.tempoFlashTime = 1000;
  }

  // HAZARD_LINES implementation
  initHazardLines(playerLevel) {
    this.hazardLineIndices = [];
    this.lastHazardLineChange = 0;
    this.hazardLineChangeInterval = 4000; 
    this.lineCount = Math.min(2 + Math.floor(playerLevel / 5), 4);
    this.selectHazardousLines();
    this.hazardLineDamageTimer = 0;
    this.wavePhases = [0, 0.3, 0.6, 0.9, 1.2]; 
    this.waveFrequencies = [100, 90, 110, 95, 105]; 
  }

  updateHazardLines(deltaTime, player) {
    if (!player) return;
    this.lastHazardLineChange += deltaTime;
    if (this.lastHazardLineChange >= this.hazardLineChangeInterval) {
      this.selectHazardousLines();
      this.lastHazardLineChange = 0;
      if (window.audioSystem) window.audioSystem.playSound("beat_strong", 0.5);
    }

    let isOnHazardLine = false;
    const lineSpacing = 40; const staffLines = 5;
    const totalHeight = lineSpacing * (staffLines - 1) + 100; // This seems to match old HTML structure
    const sectionY = Math.floor(player.y / totalHeight) * totalHeight; // This might need adjustment based on actual game world
    const collisionRadius = player.size * 0.4;

    for (const lineIndex of this.hazardLineIndices) {
      const lineY = sectionY + lineIndex * lineSpacing; 
      const isBeat = (Date.now() - (window.rhythmBeatEvent?.timestamp || 0)) < 200;
      const baseAmount = isBeat ? 15 : 8;
      const time = Date.now() / this.waveFrequencies[lineIndex];
      const phase = this.wavePhases[lineIndex];
      const adjustedLineY = lineY + Math.sin(time + phase) * baseAmount + 
                           Math.sin(time * 3) * (baseAmount/3) * (Math.sin(time / 2) > 0 ? 1 : -1);
      if (Math.abs(player.y - adjustedLineY) < collisionRadius) {
        isOnHazardLine = true; break;
      }
    }

    if (isOnHazardLine) {
      this.hazardLineDamageTimer = (this.hazardLineDamageTimer || 0) + deltaTime;
      if (this.hazardLineDamageTimer > 1000) {
        player.takeDamage(1); this.hazardLineDamageTimer = 0;
        if (window.audioSystem) window.audioSystem.playSound("player_hit");
      }
    } else { this.hazardLineDamageTimer = 0; }
  }

  selectHazardousLines() {
    this.hazardLineIndices = [];
    const possibleLines = [0, 1, 2, 3, 4]; 
    for (let i = 0; i < this.lineCount; i++) {
      if (possibleLines.length > 0) {
        const randIndex = Math.floor(Math.random() * possibleLines.length);
        this.hazardLineIndices.push(possibleLines[randIndex]);
        possibleLines.splice(randIndex, 1);
      }
    }
  }

  // Placeholder Boss Event Methods
  initPercussionistEvent(playerLevel) { 
    console.log("Init Percussionist level " + playerLevel); 
    this.activeBoss = { type: 'PERCUSSIONIST', name: 'Rhythm Devourer' }; 
  }
  updatePercussionistEvent(deltaTime, player) { /* Boss Logic */ }
  drawPercussionistEvent(ctx) { 
    if(this.activeBoss) {
        ctx.fillStyle="#FFF"; ctx.font="20px Consolas"; ctx.textAlign="center";
        ctx.fillText(this.activeBoss.name + " (Boss)", ctx.canvas.width/2, 150);
    }
  }

  initConductorEvent(playerLevel) { 
    console.log("Init Conductor level " + playerLevel); 
    this.activeBoss = { type: 'CONDUCTOR', name: 'Dissonance Director' }; 
  }
  updateConductorEvent(deltaTime, player) { /* Boss Logic */ }
  drawConductorEvent(ctx) { 
    if(this.activeBoss) {
        ctx.fillStyle="#FFF"; ctx.font="20px Consolas"; ctx.textAlign="center";
        ctx.fillText(this.activeBoss.name + " (Boss)", ctx.canvas.width/2, 150);
    }
  }

  initOrchestratorEvent(playerLevel) { 
    console.log("Init Orchestrator level " + playerLevel); 
    this.activeBoss = { type: 'ORCHESTRATOR', name: 'Silence Symphony' }; 
  }
  updateOrchestratorEvent(deltaTime, player) { /* Boss Logic */ }
  drawOrchestratorEvent(ctx) { 
    if(this.activeBoss) {
        ctx.fillStyle="#FFF"; ctx.font="20px Consolas"; ctx.textAlign="center";
        ctx.fillText(this.activeBoss.name + " (Boss)", ctx.canvas.width/2, 150);
    }
  }
  
  // Draw methods for events
  drawRhythmZones(ctx) {
    const camera = window.game?.camera || { x: 0, y: 0 }; // Assuming camera might be used for offsets
    ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
    ctx.font = '18px Consolas'; ctx.textAlign = 'center';
    ctx.fillText('WARNING: Unsafe Areas! Stay In Safe Zones!', ctx.canvas.width / 2, 30);
    ctx.fillStyle = "rgba(255, 100, 100, 0.15)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    for (const zone of this.safeZones) {
      let opacity = 1.0;
      if (zone.fadeTimer !== undefined) opacity = zone.fadeTimer / zone.maxFadeTime;
      const pulse = 0.8 + 0.2 * Math.sin(Date.now() / zone.pulseRate);
      ctx.fillStyle = `rgba(100, 255, 100, ${0.4 * opacity})`;
      ctx.beginPath();
      ctx.arc(zone.x + camera.x, zone.y + camera.y, zone.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(50, 200, 50, ${0.8 * opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(zone.x + camera.x, zone.y + camera.y, zone.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();
      if (zone.fadeTimer === undefined) {
        ctx.fillStyle = "#ffffff"; ctx.font = "20px Consolas"; 
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("♪", zone.x + camera.x, zone.y + camera.y);
      }
    }
  }

  drawTempoChange(ctx) {
    const width = ctx.canvas.width; const height = ctx.canvas.height;
    ctx.fillStyle = this.isSpeedUp ? "#ff8844" : "#44aaff";
    ctx.font = "24px Consolas"; ctx.textAlign = "center";
    ctx.fillText(this.isSpeedUp ? "TEMPO UP!" : "TEMPO DOWN!", width / 2, height / 2 - 100);
    if (this.eventTimer < this.tempoFlashTime) {
      const opacity = (this.tempoFlashTime - this.eventTimer) / this.tempoFlashTime * 0.2;
      ctx.fillStyle = this.isSpeedUp ? `rgba(255, 100, 0, ${opacity})` : `rgba(0, 100, 255, ${opacity})`;
      ctx.fillRect(0, 0, width, height);
    }
    const indicators = 8; const spacing = 30;
    const startX = width / 2 - (indicators * spacing) / 2;
    for (let i = 0; i < indicators; i++) {
      const x = startX + i * spacing; const y = height / 2 - 50;
      const beatDuration = this.isSpeedUp ? 400 : 800; 
      const beat = Math.floor((this.eventTimer % (beatDuration * indicators)) / beatDuration);
      ctx.fillStyle = (i === beat) ? "#ffffff" : "rgba(255, 255, 255, 0.3)";
      ctx.beginPath(); ctx.arc(x, y, (i === beat) ? 8 : 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawHazardLines(ctx) {
    ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
    ctx.font = '18px Consolas'; ctx.textAlign = 'center';
    ctx.fillText('WARNING: Hazardous Staff Lines! Avoid the red lines!', ctx.canvas.width / 2, 30);
  }

  // New method to draw specific event visuals
  drawCurrentEventVisuals(ctx) {
    if (!this.currentEvent) return;
    switch(this.currentEvent) {
      case "FALLING_NOTES":
        // Assuming drawFallingNotes would be implemented here or called if it exists
        // For now, let's imagine it has its own drawing logic for this.fallingNotes
        // this.drawFallingNotes(ctx); 
        break;
      case "RHYTHM_ZONES":
        this.drawRhythmZones(ctx);
        break;
      case "TEMPO_CHANGE":
        this.drawTempoChange(ctx);
        break;
      case "HAZARD_LINES":
        this.drawHazardLines(ctx);
        break;
      case this.PERCUSSIONIST_EVENT:
        this.drawPercussionistEvent(ctx);
        break;
      case this.CONDUCTOR_EVENT:
        this.drawConductorEvent(ctx);
        break;
      case this.ORCHESTRATOR_EVENT:
        this.drawOrchestratorEvent(ctx);
        break;
    }
  }

  // Event HUD drawing
  drawEventHUD(ctx) {
    if (!this.currentEvent) return; // Only draw HUD if an event is active

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Consolas';
    ctx.textAlign = 'center';
    ctx.fillText(`Conductor Event: ${this.formatEventName(this.currentEvent)}`, ctx.canvas.width / 2, 80);
    
    const timerWidth = 200; const timerHeight = 5;
    const timerX = ctx.canvas.width / 2 - timerWidth / 2;
    const timerY = 90;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(timerX, timerY, timerWidth, timerHeight);
    
    const progress = Math.min(this.eventTimer / this.eventDuration, 1);
    ctx.fillStyle = progress < 0.5 ? '#44ff44' : (progress < 0.8 ? '#ffff44' : '#ff4444');
    ctx.fillRect(timerX, timerY, timerWidth * progress, timerHeight);
    
    ctx.fillStyle = '#ffcc00';
    ctx.font = '14px Consolas';
    ctx.fillText(`Score: ${this.eventScore}`, ctx.canvas.width / 2, 110);
  }

  formatEventName(eventType) {
    if (!eventType) return "";
    return eventType.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  showEventScore() {
    const messageSystem = window.messageSystem || null;
    if (!messageSystem) return;
    const color = this.eventScore > 50 ? "#44ff44" : this.eventScore > 20 ? "#ffff44" : "#ff8844";
    messageSystem.showRewardText(`Event Score: ${this.eventScore}`, color);
  }
    
  toggleEvent(eventType, enabled) {
    if (this.enabledEvents.hasOwnProperty(eventType)) {
      this.enabledEvents[eventType] = enabled;
      return true;
    }
    return false;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.currentEvent) this.endEvent();
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
    this.activeBoss = null;
    this.nextBossLevelIndex = 0;
  }
}

export default ConductorSystem;
