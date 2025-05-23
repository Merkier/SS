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
    this.baseDuration = 10000;
    this.eventDuration = this.baseDuration;
    
    this.lastEventLevel = 0;
    this.eventLevels = [7, 11, 14, 17, 21, 23];
    this.currentLevelIndex = 0;
    
    this.fallingNotes = [];
    this.safeZones = [];
    
    this.eventScore = 0;
    this.totalScore = 0;

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
    
    this.events = [
      "FALLING_NOTES", "RHYTHM_ZONES", "TEMPO_CHANGE", "HAZARD_LINES",
      this.PERCUSSIONIST_EVENT, this.CONDUCTOR_EVENT, this.ORCHESTRATOR_EVENT
    ];
    
    this.enabledEvents = {
      FALLING_NOTES: true, RHYTHM_ZONES: true, TEMPO_CHANGE: true, HAZARD_LINES: true,
      PERCUSSIONIST_EVENT: true, CONDUCTOR_EVENT: true, ORCHESTRATOR_EVENT: true
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
    for (const key in this.enabledEvents) {
      this.enabledEvents[key] = true;
    }
    this.lastEventLevel = 0;
    this.currentLevelIndex = 0;
    this.nextBossLevelIndex = 0;
    this.activeBoss = null;
  }

  update(deltaTime, player) {
    if (!this.enabled || !player || this.gameStateManager.isPaused()) return;

    if (this.currentEvent) {
      this.eventTimer += deltaTime;
      if (this.eventTimer >= this.eventDuration) {
        this.endEvent();
      } else {
        this.updateCurrentEvent(deltaTime, player);
      }
    } else {
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
      const nextEventLevel = this.getNextEventLevel();
      if (player.level >= nextEventLevel && player.level > this.lastEventLevel) {
        console.log(`Conductor: Starting regular event at level ${player.level}, threshold was ${nextEventLevel}`);
        this.startRandomEvent(player.level);
        this.lastEventLevel = player.level;
        this.currentLevelIndex++;
      }
    }
  }

  getNextEventLevel() {
    if (this.currentLevelIndex >= this.eventLevels.length) {
      let potentialNextLevel = this.lastEventLevel + 2;
      while(this.bossEventLevels.slice(this.nextBossLevelIndex).includes(potentialNextLevel)) {
        potentialNextLevel++;
      }
      return potentialNextLevel;
    }
    return this.eventLevels[this.currentLevelIndex];
  }

  startRandomEvent(playerLevel) {
    const availableEvents = this.events.filter(event =>
        this.enabledEvents[event] &&
        !Object.values(this.bossEventMapping).includes(event)
    );
    if (availableEvents.length === 0) return;
    const eventType = availableEvents[Math.floor(Math.random() * availableEvents.length)];
    this.startEvent(eventType, playerLevel);
  }

  startEvent(eventType, playerLevel = 1) {
    if (!this.enabledEvents[eventType]) return;

    this.eventDuration = this.baseDuration + (playerLevel * 1000);
    if (Object.values(this.bossEventMapping).includes(eventType)) {
      this.eventDuration = 90000 + (playerLevel * 5000); 
    }

    this.currentEvent = eventType;
    this.eventTimer = 0;
    this.eventScore = 0;

    if (this.enemySystem && (eventType === "FALLING_NOTES" || eventType === "RHYTHM_ZONES" || Object.values(this.bossEventMapping).includes(eventType))) {
      this.enemyShouldSpawn = this.enemySystem.shouldSpawn;
      this.enemySystem.shouldSpawn = false;
    }

    switch(eventType) {
      case "FALLING_NOTES": this.initFallingNotes(playerLevel); break;
      case "RHYTHM_ZONES": this.initRhythmZones(playerLevel); break;
      case "TEMPO_CHANGE": this.initTempoChange(playerLevel); break;
      case "HAZARD_LINES": this.initHazardLines(playerLevel); break;
      case this.PERCUSSIONIST_EVENT: this.initPercussionistEvent(playerLevel); break;
      case this.CONDUCTOR_EVENT: this.initConductorEvent(playerLevel); break;
      case this.ORCHESTRATOR_EVENT: this.initOrchestratorEvent(playerLevel); break;
    }
    if (this.audioSystem) this.audioSystem.playSound("conductor_event"); 
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
      if (this.activeBoss && this.activeBoss.health > 0) { 
        // Boss survived
      }
      this.activeBoss = null;
      if (this.audioSystem) this.audioSystem.playMusic("gameplay"); 
    }

    switch(this.currentEvent) {
      case "FALLING_NOTES": this.fallingNotes = []; break;
      case "RHYTHM_ZONES": this.safeZones = []; break;
      case "TEMPO_CHANGE": if (this.audioSystem && this.originalBPM) this.audioSystem.setBPM(this.originalBPM); else if (this.audioSystem) this.audioSystem.setBPM(60); break;
    }
    this.totalScore += this.eventScore;
    this.showEventScore();
    this.currentEvent = null;
    this.eventTimer = 0;
    console.log(`Conductor event ended. Score: ${this.eventScore}`);
  }

  updateCurrentEvent(deltaTime, player) {
    switch(this.currentEvent) {
      case "FALLING_NOTES": this.updateFallingNotes(deltaTime, player); break;
      case "RHYTHM_ZONES": this.updateRhythmZones(deltaTime, player); break;
      case "HAZARD_LINES": this.updateHazardLines(deltaTime, player); break;
      case "TEMPO_CHANGE": break;
      case this.PERCUSSIONIST_EVENT: this.updatePercussionistEvent(deltaTime, player); break;
      case this.CONDUCTOR_EVENT: this.updateConductorEvent(deltaTime, player); break;
      case this.ORCHESTRATOR_EVENT: this.updateOrchestratorEvent(deltaTime, player); break;
      default: break;
    }
  }

  // --- PERCUSSIONIST BOSS EVENT ---
  initPercussionistEvent(playerLevel) {
    console.log("Init Percussionist Boss Event for player level " + playerLevel);
    const bossData = { 
        name: "Rhythm Devourer", size: 100, health: 100, color: "#ff2200", speed: 1.2,
        attackInterval: 2000, attackType: "shockwave", requiemAbility: "Percussion Canon",
        requiemInterval: 10000, dropAmount: 20, icon: "🥁"
    };
    this.activeBoss = {
        type: 'PERCUSSIONIST', name: bossData.name, icon: bossData.icon,
        x: window.innerWidth / 2, 
        y: -bossData.size,
        targetX: window.innerWidth / 2,
        targetY: window.innerHeight / 4,
        size: bossData.size, color: bossData.color, speed: bossData.speed,
        health: bossData.health * (1 + playerLevel * 0.15), 
        maxHealth: bossData.health * (1 + playerLevel * 0.15),
        attackInterval: bossData.attackInterval, attackType: bossData.attackType,
        requiemAbility: bossData.requiemAbility, requiemInterval: bossData.requiemInterval,
        requiemTimer: 0, attackTimer: 0,
        phase: "entry", invulnerable: true,
        dropAmount: bossData.dropAmount,
        bossAttacks: [], 
        defeatTimer: 0, requiemChargeTime: 0
    };
    if (this.audioSystem) this.audioSystem.playSound("boss_warning");
    if (window.messageSystem && typeof window.messageSystem.showBossWarning === 'function') {
        window.messageSystem.showBossWarning(this.activeBoss.name, "The earth trembles with a thunderous beat!");
    }
    console.log("Percussionist initialized:", this.activeBoss);
  }

  updatePercussionistEvent(deltaTime, player) {
    if (!this.activeBoss) return;
    const boss = this.activeBoss; // Alias for convenience
    const gameWidth = window.innerWidth; 

    switch (boss.phase) {
      case "entry":
        boss.y += (boss.targetY - boss.y) * 0.05;
        if (Math.abs(boss.y - boss.targetY) < 1) {
          boss.y = boss.targetY;
          boss.phase = "combat";
          boss.invulnerable = false;
          if (this.audioSystem) this.audioSystem.playMusic("boss_theme_percussionist"); 
        }
        break;
      case "combat":
        boss.x += (boss.targetX - boss.x) * 0.03 * boss.speed;
        boss.targetX = gameWidth / 2 + Math.sin(Date.now() / (2000 / boss.speed)) * (gameWidth / 3);

        boss.attackTimer += deltaTime;
        if (boss.attackTimer >= boss.attackInterval) {
          boss.attackTimer = 0;
          boss.bossAttacks.push({
            type: "shockwave", x: boss.x, y: boss.y, radius: 0, maxRadius: 350 + player.level * 10,
            speed: 3 + player.level * 0.1, damage: 1, color: boss.color, hasHitPlayer: false, id: Date.now() + Math.random()
          });
          if (this.audioSystem) this.audioSystem.playSound("boss_shockwave");
        }
        boss.requiemTimer += deltaTime;
        if (boss.requiemTimer >= boss.requiemInterval) {
          boss.requiemTimer = 0;
          boss.phase = "requiem";
          boss.invulnerable = true;
          boss.requiemChargeTime = 3000;
          if (this.audioSystem) this.audioSystem.playSound("requiem_charge");
          if (window.messageSystem && typeof window.messageSystem.showRequiemWarning === 'function') {
            window.messageSystem.showRequiemWarning();
          }
        }
        break;
      case "requiem":
        boss.requiemChargeTime -= deltaTime;
        if (boss.requiemChargeTime <= 0) {
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              if (!this.activeBoss || this.activeBoss.type !== 'PERCUSSIONIST') return; 
              this.activeBoss.bossAttacks.push({
                type: "shockwave", x: this.activeBoss.x, y: this.activeBoss.y, radius: 0,
                maxRadius: 500 + player.level * 15, speed: 4 + player.level * 0.15, damage: 1,
                color: "#ff0000", isRequiem: true, hasHitPlayer: false, id: Date.now() + Math.random() + i
              });
            }, i * 600);
          }
          boss.phase = "combat";
          boss.invulnerable = false;
          if (this.audioSystem) this.audioSystem.playSound("requiem_activate");
          if (window.messageSystem && typeof window.messageSystem.showRequiemActivated === 'function') {
            window.messageSystem.showRequiemActivated(boss.requiemAbility);
          }
        }
        break;
      case "defeated":
        boss.defeatTimer -= deltaTime;
        if (boss.defeatTimer <= 0) {
          if (window.noteSystem && typeof window.noteSystem.spawnNoteFragment === 'function') { 
            for (let i = 0; i < boss.dropAmount; i++) {
              window.noteSystem.spawnNoteFragment(boss.x + (Math.random()-0.5)*50, boss.y + (Math.random()-0.5)*50);
            }
          }
          console.log(`${boss.name} defeated! Rewards dropped.`);
          this.endEvent(); 
        }
        break;
    }

    for (let i = boss.bossAttacks.length - 1; i >= 0; i--) {
      const attack = boss.bossAttacks[i];
      if (attack.type === "shockwave") {
        attack.radius += attack.speed * (deltaTime / 16.67); 
        const distToPlayer = Math.hypot(player.x - attack.x, player.y - attack.y);
        const shockwaveHitboxWidth = 20; 

        if (!attack.hasHitPlayer && Math.abs(distToPlayer - attack.radius) < (player.size / 2 + shockwaveHitboxWidth / 2)) {
          if (player.takeDamage(attack.damage)) { /* Player defeated */ }
          attack.hasHitPlayer = true; 
        }
        if (attack.radius >= attack.maxRadius) {
          boss.bossAttacks.splice(i, 1);
        }
      }
    }

    if (!boss.invulnerable && window.combatSystem && typeof window.combatSystem.getProjectiles === 'function') {
      const projectiles = window.combatSystem.getProjectiles(); 
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const dist = Math.hypot(p.x - boss.x, p.y - boss.y);
        if (dist < (p.size / 2 + boss.size / 2)) {
          boss.health -= p.power;
          if (window.particleSystem && typeof window.particleSystem.createHitEffect === 'function') {
            window.particleSystem.createHitEffect(p.x, p.y, p.isCritical);
          }
          if (this.audioSystem) this.audioSystem.playSound(p.isCritical ? "boss_hit_crit" : "boss_hit");
          if (!p.piercing) projectiles.splice(i, 1); 

          if (boss.health <= 0 && boss.phase !== "defeated") {
            boss.phase = "defeated";
            boss.invulnerable = true;
            boss.defeatTimer = 3000;
            if (this.audioSystem) this.audioSystem.playSound("boss_defeated");
            if (window.messageSystem && typeof window.messageSystem.showBossDefeated === 'function'){
                 window.messageSystem.showBossDefeated(boss.name, 50); // Example fame
            }
          }
          break; 
        }
      }
    }
  }

  drawPercussionistEvent(ctx) {
    if (!this.activeBoss) return;
    const boss = this.activeBoss; 
    const camera = window.game?.camera || { x: 0, y: 0 }; 
    let currentSize = boss.size; // Initialize currentSize with boss's actual size

    ctx.globalAlpha = 1;

    if (boss.phase === "requiem") {
      currentSize = boss.size * (1 + 0.1 * Math.sin(Date.now() / 100)); 
      ctx.fillStyle = `rgba(255, 0, 0, 0.1)`; 
      ctx.beginPath();
      ctx.arc(boss.x - camera.x, boss.y - camera.y, currentSize * 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (boss.phase === "defeated") {
      ctx.globalAlpha = Math.max(0, boss.defeatTimer / 3000);
      currentSize = boss.size + ((1 - ctx.globalAlpha) * 50); // Modify existing currentSize
    }

    ctx.fillStyle = boss.color;
    ctx.beginPath();
    ctx.arc(boss.x - camera.x, boss.y - camera.y, currentSize / 2, 0, Math.PI * 2);
    ctx.fill();

    if (boss.invulnerable && boss.phase !== "defeated" && boss.phase !== "entry") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(boss.x - camera.x, boss.y - camera.y, currentSize / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    ctx.fillStyle = "#FFF";
    ctx.font = `${currentSize * 0.4}px Consolas`; // currentSize should be defined here
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(boss.icon, boss.x - camera.x, boss.y - camera.y);
    ctx.globalAlpha = 1;

    for (const attack of boss.bossAttacks) {
      if (attack.type === "shockwave") {
        const ringWidth = 20;
        const gradOpacity = attack.isRequiem ? 1 : 0.7;
        const gradColor = attack.isRequiem ? "255,0,0" : "255,100,0";
        const currentRadius = attack.radius;

        const gradient = ctx.createRadialGradient(
            attack.x - camera.x, attack.y - camera.y, Math.max(0, currentRadius - ringWidth / 2),
            attack.x - camera.x, attack.y - camera.y, currentRadius + ringWidth / 2
        );
        gradient.addColorStop(0, `rgba(${gradColor},0)`);
        gradient.addColorStop(0.5, `rgba(${gradColor},${gradOpacity * Math.max(0, (attack.maxRadius - currentRadius)) / attack.maxRadius})`);
        gradient.addColorStop(1, `rgba(${gradColor},0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        const outerArcRadius = currentRadius + ringWidth / 2;
        const innerArcRadius = Math.max(0, currentRadius - ringWidth / 2);
        if (outerArcRadius > innerArcRadius) { 
            ctx.arc(attack.x - camera.x, attack.y - camera.y, outerArcRadius, 0, Math.PI * 2);
            ctx.arc(attack.x - camera.x, attack.y - camera.y, innerArcRadius, 0, Math.PI * 2, true);
            ctx.fill();
        }
      }
    }

    if (boss.phase !== "defeated" && boss.phase !== "entry") {
      const barWidth = Math.min(ctx.canvas.width * 0.6, 400);
      const barHeight = 20;
      const barX = ctx.canvas.width / 2 - barWidth / 2;
      const barY = 30;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      const healthPercent = Math.max(0, boss.health / boss.maxHealth);
      ctx.fillStyle = boss.color;
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      ctx.strokeStyle = "#FFF";
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = "#FFF";
      ctx.font = "14px Consolas";
      ctx.textAlign = "center";
      ctx.fillText(boss.name, ctx.canvas.width / 2, barY - 8);
      if (boss.phase === "combat"){
        const reqPercent = boss.requiemTimer / boss.requiemInterval;
        ctx.fillStyle = "rgba(200, 0, 255, 0.6)";
        ctx.fillRect(barX, barY + barHeight + 2, barWidth * reqPercent, 5);
      }
    }
  }

  // --- PLACEHOLDER BOSS EVENTS ---
  initConductorEvent(playerLevel) { console.log("Init Conductor Boss for PL " + playerLevel); this.activeBoss = { type: 'CONDUCTOR', name: 'Dissonance Director', icon: '🎭', bossAttacks: [] }; }
  updateConductorEvent(deltaTime, player) { /* TODO */ }
  drawConductorEvent(ctx) { if(this.activeBoss) {ctx.fillStyle="#FFF";ctx.font="20px Consolas";ctx.textAlign="center";ctx.fillText(this.activeBoss.name + " (Boss Placeholder)", ctx.canvas.width/2, 150);} }

  initOrchestratorEvent(playerLevel) { console.log("Init Orchestrator Boss for PL " + playerLevel); this.activeBoss = { type: 'ORCHESTRATOR', name: 'Silence Symphony', icon: '🎻', bossAttacks: [] }; }
  updateOrchestratorEvent(deltaTime, player) { /* TODO */ }
  drawOrchestratorEvent(ctx) { if(this.activeBoss) {ctx.fillStyle="#FFF";ctx.font="20px Consolas";ctx.textAlign="center";ctx.fillText(this.activeBoss.name + " (Boss Placeholder)", ctx.canvas.width/2, 150);} }

  // --- Standard Event Implementations ---
  initFallingNotes(playerLevel) { this.fallingNotes = []; this.fallingNotesTimer=0; const baseI=1200; this.fallingNotesInterval=Math.max(600,baseI-(playerLevel*30));}
  updateFallingNotes(deltaTime, player) {
    this.fallingNotesTimer += deltaTime;
    if (this.fallingNotesTimer >= this.fallingNotesInterval) {
        const progress = this.eventTimer / this.eventDuration;
        const noteCount = 1 + Math.floor(progress * 2);
        for (let i = 0; i < noteCount; i++) this.spawnFallingNote();
        this.fallingNotesTimer = 0;
    }
    for (let i = this.fallingNotes.length - 1; i >= 0; i--) {
        const note = this.fallingNotes[i];
        note.y += note.speed * (deltaTime / 16.67);
        note.rotation += 0.01 * (deltaTime / 16.67);
        if (note.y > (window.game?.player?.y || 0) + (window.innerHeight || 0) / 1.5) { this.fallingNotes.splice(i, 1); continue; }
        const dx = player.x - note.x; const dy = player.y - note.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.size / 2 + note.size / 2) {
            if (!note.hasHitPlayer) { player.takeDamage(1); note.hasHitPlayer = true; if (window.audioSystem) window.audioSystem.playSound("player_hit"); }
        }
        if (window.combatSystem && window.combatSystem.projectiles) {
            const projectiles = window.combatSystem.projectiles;
            for (let j = projectiles.length - 1; j >= 0; j--) {
                const p = projectiles[j];
                const pDx = p.x - note.x; const pDy = p.y - note.y;
                const pDist = Math.sqrt(pDx*pDx + pDy*pDy);
                if (pDist < p.size/2 + note.size/2) {
                    this.fallingNotes.splice(i,1); if(!p.piercing) projectiles.splice(j,1); this.eventScore+=1; if(window.audioSystem)window.audioSystem.playSound("melee_hit",0.5); break;
                }
            }
        }
    }
  }
  spawnFallingNote() { 
    const player = window.game?.player; if(!player) return;
    const x = player.x + (Math.random()*600)-300; const y = player.y - (window.innerHeight || 600)/2 - 50;
    this.fallingNotes.push({x,y,size:20,speed:2+Math.random()*3,color:"#ff3333",symbol:"♯",rotation:Math.random()*Math.PI*2,hasHitPlayer:false});
  }
  initRhythmZones(playerLevel) { this.safeZones=[]; this.safeZoneTimer=0; const baseSR=2500; this.safeZoneSpawnRate=Math.max(1200,baseSR-(playerLevel*100)); const initZ=Math.max(2,4-Math.floor(playerLevel/3)); for(let i=0;i<initZ;i++)this.spawnSafeZone();}
  updateRhythmZones(deltaTime, player) {
    this.safeZoneTimer+=deltaTime;
    if(this.safeZoneTimer >= this.safeZoneSpawnRate){
        const oldZones=[...this.safeZones]; this.safeZones=[];
        const progress=this.eventTimer/this.eventDuration; const maxZ=Math.max(1,3-Math.floor(progress*2));
        for(let i=0;i<maxZ;i++)this.spawnSafeZone();
        for(const z of oldZones){z.fadeTimer=1000;z.maxFadeTime=1000;this.safeZones.push(z);}
        this.safeZoneTimer=0; if(this.audioSystem)this.audioSystem.playSound("beat_strong",0.5);
    }
    for(let i=this.safeZones.length-1;i>=0;i--){const z=this.safeZones[i];if(z.fadeTimer!==undefined){z.fadeTimer-=deltaTime;if(z.fadeTimer<=0)this.safeZones.splice(i,1);}}
    let inSafeZone=false;
    for(const z of this.safeZones){
        const dx=player.x-z.x; const dy=player.y-z.y; const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<z.radius){inSafeZone=true;if(z.fadeTimer===undefined){z.scoreTimer=(z.scoreTimer||0)+deltaTime;if(z.scoreTimer>=1000){this.eventScore+=5;z.scoreTimer=0;}}break;}
    }
    if(player&&!inSafeZone){this.dangerZoneTimer=(this.dangerZoneTimer||0)+deltaTime;if(this.dangerZoneTimer>=1000){player.takeDamage(1);this.dangerZoneTimer=0;if(window.audioSystem)window.audioSystem.playSound("player_hit");}}else{this.dangerZoneTimer=0;}
  }
  spawnSafeZone() { 
    const player = window.game?.player || {x:0,y:0};
    const angle=Math.random()*Math.PI*2; const dist=100+Math.random()*200;
    this.safeZones.push({x:player.x+Math.cos(angle)*dist,y:player.y+Math.sin(angle)*dist,radius:80+Math.random()*40,scoreTimer:0,pulseRate:300+Math.random()*200});
  }
  initTempoChange(playerLevel) { const audioSys = this.audioSystem||window.audioSystem; this.originalBPM = audioSys ? audioSys.bpm : 60; const sF=1.4+(Math.min(playerLevel,10)*0.02); this.isSpeedUp=Math.random()<0.5; if(audioSys){const nBPM=this.isSpeedUp?Math.round(this.originalBPM*sF):Math.round(this.originalBPM/sF);audioSys.setBPM(nBPM);audioSys.playSound(this.isSpeedUp?"tempo_up":"tempo_down",0.7);}this.tempoFlashTime=1000;}
  initHazardLines(playerLevel) { this.hazardLineIndices=[];this.lastHazardLineChange=0;this.hazardLineChangeInterval=4000;this.lineCount=Math.min(2+Math.floor(playerLevel/5),4);this.selectHazardousLines();this.hazardLineDamageTimer=0;this.wavePhases=[0,0.3,0.6,0.9,1.2];this.waveFrequencies=[100,90,110,95,105];}
  updateHazardLines(deltaTime, player) { /* ... as before, ensure player and window.game.camera access is safe */ }
  selectHazardousLines() { /* ... as before */ }
  
  drawFallingNotes(ctx) { 
      const camera = window.game?.camera || { x: 0, y: 0 };
      for (const note of this.fallingNotes) {
          ctx.save();
          ctx.translate(note.x - camera.x, note.y - camera.y);
          ctx.rotate(note.rotation);
          ctx.fillStyle = note.color;
          ctx.beginPath();
          ctx.fillRect(-note.size/2, -note.size/2, note.size, note.size);
          ctx.restore();
      }
  }
  drawRhythmZones(ctx) { /* ... as before */ }
  drawTempoChange(ctx) { /* ... as before */ }
  drawHazardLines(ctx) { /* ... as before */ }

  drawCurrentEventVisuals(ctx) {
    if (!this.currentEvent) return;
    switch(this.currentEvent) {
      case "FALLING_NOTES": this.drawFallingNotes(ctx); break;
      case "RHYTHM_ZONES": this.drawRhythmZones(ctx); break;
      case "TEMPO_CHANGE": this.drawTempoChange(ctx); break;
      case "HAZARD_LINES": this.drawHazardLines(ctx); break;
      case this.PERCUSSIONIST_EVENT: this.drawPercussionistEvent(ctx); break;
      case this.CONDUCTOR_EVENT: this.drawConductorEvent(ctx); break;
      case this.ORCHESTRATOR_EVENT: this.drawOrchestratorEvent(ctx); break;
    }
  }

  drawEventHUD(ctx) { /* ... as before ... */ }
  formatEventName(eventType) { /* ... as before ... */ }
  showEventScore() { /* ... as before ... */ }
  toggleEvent(eventType, enabled) { /* ... as before ... */ }
  setEnabled(enabled) { /* ... as before ... */ }
  reset() { 
    this.enabled = false; this.currentEvent = null; this.eventTimer = 0;
    this.fallingNotes = []; this.safeZones = [];
    this.eventScore = 0; this.totalScore = 0;
    this.lastEventLevel = 0; this.currentLevelIndex = 0;
    this.activeBoss = null; this.nextBossLevelIndex = 0;
    if(this.audioSystem && this.originalBPM) this.audioSystem.setBPM(this.originalBPM); else if (this.audioSystem) this.audioSystem.setBPM(60);
  }
}

export default ConductorSystem;
