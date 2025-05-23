// BossSystem.js - Handles boss encounters and special attacks

class BossSystem {
  constructor(gameStateManager, messageSystem, gameWidth) {
    this.gameStateManager = gameStateManager;
    this.messageSystem = messageSystem;
    this.gameWidth = 200;
    
    // Boss data
    this.activeBoss = null;
    this.bossAttacks = [];
    this.bossHealthBar = {
      width: 300,
      height: 20,
      x: 0,
      y: 50
    };

    // Boss spawning
    this.nextBossLevel = 5; // First boss at level 5
    this.bossFightActive = false;
    this.bossDefeated = false;
      }}
// Boss data with music-themed attacks and behaviors
const BOSS_TYPES = {
    PERCUSSIONIST: {
        name: "Rhythm Devourer",
        size: 100,
        health: 100,
        color: "#ff2200",
        speed: 1.2,
        attackInterval: 2000,
        attackType: "shockwave",
        requiemAbility: "Percussion Canon",
        requiemInterval: 10000,
        description: "Unleashes rhythmic shockwaves that disrupt your tempo.",
        dropAmount: 20,
        icon: "🥁"
    },
    CONDUCTOR: {
        name: "Dissonance Director",
        size: 85,
        health: 120,
        color: "#8800ff",
        speed: 1.5,
        attackInterval: 3000,
        attackType: "summon",
        requiemAbility: "Cacophonic Swarm",
        requiemInterval: 15000,
        description: "Summons minions to create dissonance in your harmony.",
        dropAmount: 25,
        icon: "🎭"
    },
    ORCHESTRATOR: {
        name: "Silence Symphony",
        size: 120,
        health: 150,
        color: "#00aaff",
        speed: 0.8,
        attackInterval: 2500,
        attackType: "field",
        requiemAbility: "Grand Silence",
        requiemInterval: 12000,
        description: "Creates fields of silence that dampen your abilities.",
        dropAmount: 30,
        icon: "🎻"
    }
};

// Initialize boss-related variables
let activeBoss = null;
let bossAttackTimer = 0;
let bossRequiemTimer = 0;
let nextBossLevel = 5; // First boss appears at level 5
let bossDefeated = false;
let bossHealthBar = {
    width: 300,
    height: 20,
    x: 300 / 2 - 150,
    y: 50
};
let bossAttacks = [];

// Spawn a boss at designated intervals
function spawnBoss() {
    // Determine which boss to spawn based on level
    let bossType;
    let bossLevel = Math.floor(level / 5); // Every 5 levels cycle through bosses
    
    switch(bossLevel % 3) {
        case 0: bossType = "PERCUSSIONIST"; break;
        case 1: bossType = "CONDUCTOR"; break;
        case 2: bossType = "ORCHESTRATOR"; break;
    }
    
    // Create boss instance
    const bossData = BOSS_TYPES[bossType];
    
    // Scale boss difficulty with level
    const levelMultiplier = 1 + (level * 0.1);
    
    activeBoss = {
        type: bossType,
        name: bossData.name,
        x: GAME_WIDTH / 2,
        y: -bossData.size, // Start above screen
        size: bossData.size,
        health: bossData.health * levelMultiplier,
        maxHealth: bossData.health * levelMultiplier,
        color: bossData.color,
        speed: bossData.speed,
        attackInterval: bossData.attackInterval,
        attackType: bossData.attackType,
        requiemAbility: bossData.requiemAbility,
        requiemInterval: bossData.requiemInterval,
        requiemTimer: 0,
        attackTimer: 0,
        active: false, // Not fully entered screen yet
        targetX: GAME_WIDTH / 2,
        targetY: GAME_HEIGHT / 4,
        phase: "entry", // entry, combat, requiem, defeated
        invulnerable: true,
        dropAmount: bossData.dropAmount,
        icon: bossData.icon
    };
    
    // Clear enemies for boss fight
    enemies = [];
    
    // Pause regular spawning
    bossFightActive = true;
    
    // Play boss warning sound
    playSound("boss_warning");
    
    // Show boss warning
    showBossWarning(bossData.name, bossData.description);
}

function updateBoss(deltaTime) {
    if (!activeBoss) return;
    
    // Update boss position and behavior based on current phase
    switch(activeBoss.phase) {
        case "entry":
            // Move boss onto screen
            const dx = activeBoss.targetX - activeBoss.x;
            const dy = activeBoss.targetY - activeBoss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                activeBoss.x += dx * 0.05;
                activeBoss.y += dy * 0.05;
            } else {
                // Boss has reached position, begin combat
                activeBoss.phase = "combat";
                activeBoss.invulnerable = false;
                
                // Play boss theme music
                playBossMusic();
            }
            break;
            
        case "combat":
            // Regular boss movement
            bossMovement(deltaTime);
            
            // Regular attack pattern
            activeBoss.attackTimer += deltaTime;
            if (activeBoss.attackTimer >= activeBoss.attackInterval) {
                bossTriggerAttack();
                activeBoss.attackTimer = 0;
            }
            
            // Requiem ability charge
            activeBoss.requiemTimer += deltaTime;
            if (activeBoss.requiemTimer >= activeBoss.requiemInterval) {
                // Enter requiem phase
                activeBoss.phase = "requiem";
                activeBoss.invulnerable = true;
                activeBoss.requiemTimer = 0;
                activeBoss.requiemChargeTime = 3000; // 3 seconds to prepare
                
                // Visual warning
                showRequiemWarning();
                
                // Play requiem warning sound
                playSound("requiem_charge");
            }
            break;
            
        case "requiem":
            // Requiem charge-up animation
            activeBoss.requiemChargeTime -= deltaTime;
            
            if (activeBoss.requiemChargeTime <= 0) {
                // Execute requiem attack
                triggerRequiemAttack();
                
                // Return to combat phase
                activeBoss.phase = "combat";
                activeBoss.invulnerable = false;
            }
            break;
            
        case "defeated":
            // Boss defeat animation
            activeBoss.defeatTimer -= deltaTime;
            
            if (activeBoss.defeatTimer <= 0) {
                // Remove boss and drop rewards
                dropBossRewards();
                activeBoss = null;
                bossFightActive = false;
                bossDefeated = true;
                
                // Resume normal gameplay music
                playGameplayMusic();
            }
            break;
    }
    
    // Update boss attacks
    updateBossAttacks(deltaTime);
    
    // Check for player collision with boss
    checkBossCollision();
}

function bossMovement(deltaTime) {
    // Different movement patterns based on boss type
    switch(activeBoss.type) {
        case "PERCUSSIONIST":
            // Moves in rhythmic patterns side to side
            activeBoss.targetX = GAME_WIDTH / 2 + Math.sin(Date.now() / 1000 * 1.5) * (GAME_WIDTH / 3);
            break;
            
        case "CONDUCTOR":
            // Approaches player periodically then retreats
            if (Math.sin(Date.now() / 3000) > 0) {
                // Approach player
                activeBoss.targetX = player.x;
                activeBoss.targetY = Math.min(GAME_HEIGHT / 3, player.y - 100);
            } else {
                // Retreat to top
                activeBoss.targetX = GAME_WIDTH / 2;
                activeBoss.targetY = GAME_HEIGHT / 5;
            }
            break;
            
        case "ORCHESTRATOR":
            // Moves in circular patterns
            const time = Date.now() / 2000;
            activeBoss.targetX = GAME_WIDTH / 2 + Math.cos(time) * (GAME_WIDTH / 4);
            activeBoss.targetY = GAME_HEIGHT / 3 + Math.sin(time) * (GAME_HEIGHT / 6);
            break;
    }
    
    // Move toward target position
    const dx = activeBoss.targetX - activeBoss.x;
    const dy = activeBoss.targetY - activeBoss.y;
    
    activeBoss.x += dx * 0.03 * activeBoss.speed;
    activeBoss.y += dy * 0.03 * activeBoss.speed;
}

function bossTriggerAttack() {
    switch(activeBoss.attackType) {
        case "shockwave":
            // Create expanding ring
            bossAttacks.push({
                type: "shockwave",
                x: activeBoss.x,
                y: activeBoss.y,
                radius: 0,
                maxRadius: 300,
                speed: 3,
                damage: 1,
                color: activeBoss.color
            });
            playSound("boss_shockwave");
            break;
            
        case "summon":
            // Spawn minions
            const minions = 3 + Math.floor(level / 10);
            for (let i = 0; i < minions; i++) {
                const angle = (Math.PI * 2 * i) / minions;
                const spawnX = activeBoss.x + Math.cos(angle) * 80;
                const spawnY = activeBoss.y + Math.sin(angle) * 80;
                
                // Create smaller "Silencer" minions
                enemies.push({
                    x: spawnX,
                    y: spawnY,
                    size: ENEMY_SIZE * 0.8,
                    speed: ENEMY_SPEED * 1.5,
                    color: activeBoss.color,
                    isMinion: true
                });
            }
            playSound("boss_summon");
            break;
            
        case "field":
            // Create damaging fields
            const fields = 2 + Math.floor(level / 15);
            
            for (let i = 0; i < fields; i++) {
                // Create fields near player
                const fieldX = player.x + (Math.random() - 0.5) * 300;
                const fieldY = player.y + (Math.random() - 0.5) * 300;
                
                bossAttacks.push({
                    type: "field",
                    x: fieldX,
                    y: fieldY,
                    radius: 80,
                    duration: 5000,
                    timeLeft: 5000,
                    damage: 1,
                    color: activeBoss.color,
                    pulsate: true
                });
            }
            playSound("boss_field");
            break;
    }
}

function triggerRequiemAttack() {
    // Powerful "ultimate" attack based on boss type
    switch(activeBoss.type) {
        case "PERCUSSIONIST":
            // Multiple shockwaves in quick succession
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    bossAttacks.push({
                        type: "shockwave",
                        x: activeBoss.x,
                        y: activeBoss.y,
                        radius: 0,
                        maxRadius: 500,
                        speed: 4,
                        damage: 1,
                        color: "#ff0000",
                        isRequiem: true
                    });
                }, i * 500);
            }
            break;
            
        case "CONDUCTOR":
            // Massive minion swarm
            const swarmSize = 10 + Math.floor(level / 5);
            for (let i = 0; i < swarmSize; i++) {
                setTimeout(() => {
                    const angle = (Math.PI * 2 * i) / swarmSize;
                    const spawnDistance = 200;
                    const spawnX = activeBoss.x + Math.cos(angle) * spawnDistance;
                    const spawnY = activeBoss.y + Math.sin(angle) * spawnDistance;
                    
                    enemies.push({
                        x: spawnX,
                        y: spawnY,
                        size: ENEMY_SIZE,
                        speed: ENEMY_SPEED * 2,
                        color: "#aa00ff",
                        isMinion: true
                    });
                }, i * 200);
            }
            break;
            
        case "ORCHESTRATOR":
            // Screen-wide silence field that dampens player abilities
            bossAttacks.push({
                type: "silence",
                x: GAME_WIDTH / 2,
                y: GAME_HEIGHT / 2,
                radius: Math.max(GAME_WIDTH, GAME_HEIGHT),
                duration: 8000,
                timeLeft: 8000,
                effect: "dampen",
                color: "#00ccff",
                pulsate: true,
                isRequiem: true
            });
            
            // Apply temporary debuff to player
            player.tempSpeedReduction = 0.6; // 40% slower
            player.tempAttackRateReduction = 1.5; // 50% slower attacks
            
            // Remove debuff after silence field ends
            setTimeout(() => {
                player.tempSpeedReduction = 1;
                player.tempAttackRateReduction = 1;
            }, 8000);
            break;
    }
    
    // Visual effect
    showRequiemActivated(activeBoss.requiemAbility);
    
    // Sound effect
    playSound("requiem_activate");
}

function updateBossAttacks(deltaTime) {
    for (let i = bossAttacks.length - 1; i >= 0; i--) {
        const attack = bossAttacks[i];
        
        switch(attack.type) {
            case "shockwave":
                // Expand the shockwave
                attack.radius += attack.speed;
                
                // Check for collision with player
                const distToPlayer = Math.hypot(player.x - attack.x, player.y - attack.y);
                const hitboxRange = 20; // Width of the shockwave ring
                
                if (Math.abs(distToPlayer - attack.radius) < hitboxRange + player.size / 2) {
                    if (!attack.hasHitPlayer) {
                        playerTakeDamage(attack.damage);
                        attack.hasHitPlayer = true;
                    }
                }
                
                // Remove if too large
                if (attack.radius >= attack.maxRadius) {
                    bossAttacks.splice(i, 1);
                }
                break;
                
            case "field":
            case "silence":
                // Decrease timer
                attack.timeLeft -= deltaTime;
                
                // Check if player is inside field
                const distToField = Math.hypot(player.x - attack.x, player.y - attack.y);
                
                if (distToField < attack.radius + player.size / 2) {
                    if (attack.type === "field") {
                        // Damage over time (only every 1 second)
                        attack.damageTimer = (attack.damageTimer || 0) + deltaTime;
                        if (attack.damageTimer > 1000) {
                            playerTakeDamage(attack.damage);
                            attack.damageTimer = 0;
                        }
                    }
                }
                
                // Remove if expired
                if (attack.timeLeft <= 0) {
                    bossAttacks.splice(i, 1);
                }
                break;
        }
    }
}

function checkBossCollision() {
    if (!activeBoss || activeBoss.phase === "entry" || activeBoss.phase === "defeated") return;
    
    // Check collision between player and boss
    const dx = player.x - activeBoss.x;
    const dy = player.y - activeBoss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < player.size / 2 + activeBoss.size / 2) {
        // Push player away
        const pushForce = 15;
        player.x += (dx / dist) * pushForce;
        player.y += (dy / dist) * pushForce;
        
        // Keep player on screen
        player.x = Math.max(player.size / 2, Math.min(player.x, GAME_WIDTH - player.size / 2));
        player.y = Math.max(player.size / 2, Math.min(player.y, GAME_HEIGHT - player.size / 2));
        
        // Damage player
        playerTakeDamage(1);
    }
    
    // Check projectile hits on boss
    if (!activeBoss.invulnerable) {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const projectile = projectiles[i];
            
            const pDx = projectile.x - activeBoss.x;
            const pDy = projectile.y - activeBoss.y;
            const pDist = Math.sqrt(pDx * pDx + pDy * pDy);
            
            if (pDist < projectile.size / 2 + activeBoss.size / 2) {
                // Hit!
                activeBoss.health -= projectile.power;
                
                // Create hit effect
                createHitEffect(projectile.x, projectile.y, projectile.isCritical);
                
                // Remove non-piercing projectile
                if (!projectile.piercing) {
                    projectiles.splice(i, 1);
                }
                
                // Play hit sound
                playSound(projectile.isCritical ? "boss_hit_crit" : "boss_hit");
                
                // Check if boss defeated
                if (activeBoss.health <= 0) {
                    defeatedBoss();
                }
            }
        }
    }
    
    // Check melee hits on boss
    if (player.characterType === "FOOTMAN" && !activeBoss.invulnerable) {
        for (let i = meleeAttacks.length - 1; i >= 0; i--) {
            const attack = meleeAttacks[i];
            
            // Skip if boss already hit by this attack
            if (attack.hitBoss) continue;
            
            // Check distance
            const aDx = activeBoss.x - attack.x;
            const aDy = activeBoss.y - attack.y;
            const aDist = Math.sqrt(aDx * aDx + aDy * aDy);
            
            if (aDist < attack.range + activeBoss.size / 2) {
                // Hit!
                attack.hitBoss = true;
                
                // Calculate damage
                let damage = attack.power;
                let isCritical = Math.random() < player.critChance;
                
                if (isCritical) {
                    damage *= 2;
                }
                
                // Damage boss
                activeBoss.health -= damage;
                
                // Create hit effect
                createHitEffect(
                    attack.x + (aDx / aDist) * attack.range, 
                    attack.y + (aDy / aDist) * attack.range,
                    isCritical
                );
                
                // Play hit sound
                playSound(isCritical ? "boss_hit_crit" : "boss_hit");
                
                // Check if boss defeated
                if (activeBoss.health <= 0) {
                    defeatedBoss();
                }
            }
        }
    }
}

function defeatedBoss() {
    // Set boss to defeated state
    activeBoss.phase = "defeated";
    activeBoss.invulnerable = true;
    activeBoss.defeatTimer = 3000; // 3 second death animation
    
    // Update next boss level
    nextBossLevel = level + 5;
    
    // Award extra fame points
    const bossLevel = Math.floor(level / 5);
    const fameReward = 50 + (bossLevel * 10);
    famePoints += fameReward;
    totalFamePoints += fameReward;
    
    // Show defeat message
    showBossDefeated(activeBoss.name, fameReward);
    
    // Play victory sound
    playSound("boss_defeated");
}

function dropBossRewards() {
    // Drop a substantial amount of note fragments
    for (let i = 0; i < activeBoss.dropAmount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 150;
        const x = activeBoss.x + Math.cos(angle) * distance;
        const y = activeBoss.y + Math.sin(angle) * distance;
        
        spawnNoteFragment(x, y);
    }
    
    // Also drop a chest with guaranteed upgrade
    spawnChest(activeBoss.x, activeBoss.y, true); // true = guaranteed upgrade
    
    // Show note explosion effect
    createNoteExplosion(activeBoss.x, activeBoss.y, activeBoss.dropAmount);
}

function drawBoss() {
    if (!activeBoss) return;
    
    // Draw boss based on type
    ctx.fillStyle = activeBoss.color;
    
    // Pulsating effect during requiem charge
    if (activeBoss.phase === "requiem") {
        const pulseScale = 1 + 0.1 * Math.sin(Date.now() / 50);
        ctx.beginPath();
        ctx.arc(activeBoss.x, activeBoss.y, activeBoss.size / 2 * pulseScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Aura
        ctx.fillStyle = `rgba(${parseInt(activeBoss.color.substr(1, 2), 16)}, ${parseInt(activeBoss.color.substr(3, 2), 16)}, ${parseInt(activeBoss.color.substr(5, 2), 16)}, 0.3)`;
        ctx.beginPath();
        ctx.arc(activeBoss.x, activeBoss.y, activeBoss.size * pulseScale, 0, Math.PI * 2);
        ctx.fill();
    } else if (activeBoss.phase === "defeated") {
        // Fadeout effect
        const fadeProgress = activeBoss.defeatTimer / 3000;
        ctx.globalAlpha = fadeProgress;
        ctx.beginPath();
        ctx.arc(activeBoss.x, activeBoss.y, activeBoss.size / 2 + (1 - fadeProgress) * 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    } else {
        // Normal boss
        ctx.beginPath();
        ctx.arc(activeBoss.x, activeBoss.y, activeBoss.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Invulnerability visual effect
        if (activeBoss.invulnerable && activeBoss.phase !== "defeated") {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(activeBoss.x, activeBoss.y, activeBoss.size / 2 + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    // Draw boss icon
    ctx.fillStyle = "#ffffff";
    ctx.font = `${activeBoss.size / 2}px Consolas`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(activeBoss.icon, activeBoss.x, activeBoss.y);
    
    // Draw boss health bar
    if (activeBoss.phase !== "defeated") {
        drawBossHealthBar();
    }
    
    // Draw boss attacks
    drawBossAttacks();
}

function drawBossHealthBar() {
    // Position bar at top of screen
    bossHealthBar.x = GAME_WIDTH / 2 - bossHealthBar.width / 2;
    
    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(bossHealthBar.x, bossHealthBar.y, bossHealthBar.width, bossHealthBar.height);
    
    // Border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(bossHealthBar.x, bossHealthBar.y, bossHealthBar.width, bossHealthBar.height);
    
    // Health
    const healthPercentage = activeBoss.health / activeBoss.maxHealth;
    ctx.fillStyle = activeBoss.color;
    ctx.fillRect(
        bossHealthBar.x, 
        bossHealthBar.y, 
        bossHealthBar.width * healthPercentage, 
        bossHealthBar.height
    );
    
    // Boss name
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Consolas";
    ctx.textAlign = "center";
    ctx.fillText(
        activeBoss.name, 
        GAME_WIDTH / 2, 
        bossHealthBar.y - 10
    );
    
    // Requiem charge indicator
    if (activeBoss.phase === "combat") {
        const requiemPercentage = activeBoss.requiemTimer / activeBoss.requiemInterval;
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(
            bossHealthBar.x,
            bossHealthBar.y + bossHealthBar.height + 5,
            bossHealthBar.width * requiemPercentage,
            5
        );
    }
}

function drawBossAttacks() {
    for (let attack of bossAttacks) {
        switch(attack.type) {
            case "shockwave":
                // Draw expanding ring
                const ringWidth = 20;
                
                // Create gradient
                const gradient = ctx.createRadialGradient(
                    attack.x, attack.y, attack.radius - ringWidth / 2,
                    attack.x, attack.y, attack.radius + ringWidth / 2
                );
                
                gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
                gradient.addColorStop(0.5, attack.isRequiem ? "#ff0000" : attack.color);
                gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(attack.x, attack.y, attack.radius + ringWidth / 2, 0, Math.PI * 2);
                ctx.arc(attack.x, attack.y, attack.radius - ringWidth / 2, 0, Math.PI * 2, true);
                ctx.fill();
                break;
                
            case "field":
                // Pulsating harmful field
                const fieldOpacity = attack.pulsate ? 
                    0.2 + 0.1 * Math.sin(Date.now() / 200) : 0.3;
                
                ctx.fillStyle = `rgba(${parseInt(attack.color.substr(1, 2), 16)}, ${parseInt(attack.color.substr(3, 2), 16)}, ${parseInt(attack.color.substr(5, 2), 16)}, ${fieldOpacity})`;
                ctx.beginPath();
                ctx.arc(attack.x, attack.y, attack.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Danger indicator
                ctx.strokeStyle = attack.color;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(attack.x, attack.y, attack.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                break;
                
            case "silence":
                // Large dampening field
                const silenceOpacity = attack.pulsate ? 
                    0.1 + 0.05 * Math.sin(Date.now() / 300) : 0.15;
                
                ctx.fillStyle = `rgba(${parseInt(attack.color.substr(1, 2), 16)}, ${parseInt(attack.color.substr(3, 2), 16)}, ${parseInt(attack.color.substr(5, 2), 16)}, ${silenceOpacity})`;
                ctx.beginPath();
                ctx.arc(attack.x, attack.y, attack.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Musical notation overlays
                ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + 0.05 * Math.sin(Date.now() / 200)})`;
                
                // Draw rest symbols across the field
                const rests = 12;
                for (let i = 0; i < rests; i++) {
                    const angle = (Math.PI * 2 * i) / rests;
                    const distance = attack.radius * 0.6 * Math.random();
                    const x = attack.x + Math.cos(angle) * distance;
                    const y = attack.y + Math.sin(angle) * distance;
                    
                    ctx.font = "30px Consolas";
                    ctx.textAlign = "center";
                    ctx.fillText("𝄽", x, y);
                }
                break;
        }
    }
}

function showBossWarning(bossName, bossDescription) {
    const warning = document.createElement('div');
    warning.id = 'boss-warning';
    warning.style.position = 'absolute';
    warning.style.top = '50%';
    warning.style.left = '50%';
    warning.style.transform = 'translate(-50%, -50%)';
    warning.style.color = '#ff0000';
    warning.style.fontSize = '30px';
    warning.style.fontWeight = 'bold';
    warning.style.textAlign = 'center';
    warning.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    warning.style.padding = '30px';
    warning.style.borderRadius = '15px';
    warning.style.border = '3px solid #ff0000';
    warning.style.zIndex = '1000';
    warning.innerHTML = `WARNING:<br>REQUIEM BOSS APPROACHING<br><span style="font-size: 36px;">${bossName}</span><br><span style="font-size: 18px; color: #ffffff;">${bossDescription}</span>`;
    document.body.appendChild(warning);

    // Remove after 4 seconds
    setTimeout(() => {
        document.body.removeChild(warning);
    }, 4000);
}

function showRequiemWarning() {
    const warning = document.createElement('div');
    warning.id = 'requiem-warning';
    warning.style.position = 'absolute';
    warning.style.top = '50%';
    warning.style.left = '50%';
    warning.style.transform = 'translate(-50%, -50%)';
    warning.style.color = '#ff0000';
    warning.style.fontSize = '32px';
    warning.style.fontWeight = 'bold';
    warning.style.textAlign = 'center';
    warning.style.textShadow = '0 0 10px #ff0000';
    warning.style.zIndex = '1000';
    warning.innerHTML = `REQUIEM ABILITY CHARGING!`;
    document.body.appendChild(warning);

    // Flash effect
    let opacity = 1;
    const flashInterval = setInterval(() => {
        opacity = opacity === 1 ? 0.3 : 1;
        warning.style.opacity = opacity;
    }, 200);

    // Remove after 3 seconds
    setTimeout(() => {
        clearInterval(flashInterval);
        document.body.removeChild(warning);
    }, 3000);
}

function showRequiemActivated(abilityName) {
    const message = document.createElement('div');
    message.id = 'requiem-activate';
    message.style.position = 'absolute';
    message.style.top = '40%';
    message.style.left = '50%';
    message.style.transform = 'translate(-50%, -50%)';
    message.style.color = '#ff0000';
    message.style.fontSize = '36px';
    message.style.fontWeight = 'bold';
    message.style.textAlign = 'center';
    message.style.textShadow = '0 0 15px #ff0000, 0 0 30px #ff0000';
    message.style.zIndex = '1000';
    message.innerHTML = `REQUIEM ACTIVATED:<br>${abilityName}`;
    document.body.appendChild(message);

    // Add dramatic zoom effect
    let scale = 1;
    const zoomInterval = setInterval(() => {
        scale += 0.05;
        message.style.transform = `translate(-50%, -50%) scale(${scale})`;
        message.style.opacity = (2 - scale) / 1;
    }, 50);

    // Remove after 2.5 seconds
    setTimeout(() => {
        clearInterval(zoomInterval);
        document.body.removeChild(message);
    }, 2500);
}

function showBossDefeated(bossName, fameReward) {
    const message = document.createElement('div');
    message.id = 'boss-defeated';
    message.style.position = 'absolute';
    message.style.top = '40%';
    message.style.left = '50%';
    message.style.transform = 'translate(-50%, -50%)';
    message.style.color = '#ffcc00';
    message.style.fontSize = '32px';
    message.style.fontWeight = 'bold';
    message.style.textAlign = 'center';
    message.style.textShadow = '0 0 10px #ffcc00';
    message.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    message.style.padding = '20px';
    message.style.borderRadius = '10px';
    message.style.zIndex = '1000';
    message.innerHTML = `REQUIEM BOSS DEFEATED!<br>${bossName}<br><span style="font-size: 24px; color: #ffffff;">+${fameReward} Fame Points</span>`;
    document.body.appendChild(message);

    // Remove after 3 seconds
    setTimeout(() => {
        document.body.removeChild(message);
    }, 3000);
}

function createHitEffect(x, y, isCritical) {
    const hitEffect = {
        x: x,
        y: y,
        size: isCritical ? 40 : 30,
        opacity: 1,
        color: isCritical ? "#ff4400" : "#ffcc00"
    };
    
    // Add hit effect animation
    const animateHit = () => {
        // Draw hit effect
        ctx.fillStyle = `rgba(${parseInt(hitEffect.color.substr(1, 2), 16)}, ${parseInt(hitEffect.color.substr(3, 2), 16)}, ${parseInt(hitEffect.color.substr(5, 2), 16)}, ${hitEffect.opacity})`;
        ctx.beginPath();
        ctx.arc(hitEffect.x, hitEffect.y, hitEffect.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Update effect
        hitEffect.size += 2;
        hitEffect.opacity -= 0.05;
        
        // Continue animation if still visible
        if (hitEffect.opacity > 0) {
            requestAnimationFrame(animateHit);
        }
    };
    
    animateHit();
}

function createNoteExplosion(x, y, count) {
    for (let i = 0; i < count; i++) {
        // Create particle at boss position
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 5;
        const size = 10 + Math.random() * 20;
        const lifetime = 1000 + Math.random() * 2000;
        
        const noteSymbols = ["♩", "♪", "♫", "♬", "♭", "♮", "♯"];
        const symbol = noteSymbols[Math.floor(Math.random() * noteSymbols.length)];
        
        const noteParticle = {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size,
            color: `hsl(${Math.random() * 360}, 100%, 70%)`,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            lifetime: lifetime,
            timeLeft: lifetime,
            symbol: symbol
        };
        
        // Add to particles array
        particles.push(noteParticle);
    }
}

// Add a function to check if it's time to spawn a boss
function checkBossSpawn() {
    if (level >= nextBossLevel && !activeBoss && !bossFightActive) {
        spawnBoss();
    }
}

// Initialize particles array
let particles = [];

export default BossSystem;