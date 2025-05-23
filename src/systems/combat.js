// combat.js - Cleaned up combat system with rhythm mechanics

import ParticleSystem from "../systems/particle.js";

class CombatSystem {
  constructor(gameStateManager, noteSystem, enemySystem = null) {
    this.gameStateManager = gameStateManager;
    this.noteSystem = noteSystem;
    this.enemySystem = enemySystem; 
    this.projectiles = [];
    this.meleeAttacks = [];
    this.attackTimer = 0;
    this.particleSystem = new ParticleSystem();

    // Register global rhythm event handlers
    window.rhythmBeatEvent = null;
    window.rhythmSubdivisionEvent = null;
    
    // Make the combat system globally available
    window.combatSystem = this;
  }

  processRhythmEvents(player, targetX = null, targetY = null) {
    const results = {
      projectiles: [],
      meleeAttacks: [],
    };

    // Process main beat events
    if (window.rhythmBeatEvent &&
        Date.now() - window.rhythmBeatEvent.timestamp < 150) {
      
      const currentBeat = window.rhythmBeatEvent.beatNumber;
      const pattern = player.rhythmPattern || ["1"];
      
      // Check if this beat is in the pattern (1,2,3,4)
      const beatString = String(currentBeat + 1); // Convert 0-indexed to 1-indexed
      if (pattern.includes(beatString)) {
        if (player.characterType === "ARCHER") {
          const newProjectiles = this.fireProjectileWithRhythm(
            player,
            targetX,
            targetY,
            window.rhythmBeatEvent.beatBonus || 1.2
          );
          results.projectiles.push(...newProjectiles);
        } else if (player.characterType === "FOOTMAN") {
          const attacks = this.performMeleeAttackWithRhythm(
            player,
            window.rhythmBeatEvent.beatBonus || 1.2
          );
          results.meleeAttacks.push(...attacks);
        }
      }

      window.rhythmBeatEvent = null;
    }

    // Process eighth notes (subdivisions)
    if (window.rhythmSubdivisionEvent &&
        Date.now() - window.rhythmSubdivisionEvent.timestamp < 150 &&
        player.hasEighthNotes) {
      
      // Check if pattern includes "&" and this is an eighth note subdivision
      const pattern = player.rhythmPattern || [];
      if (pattern.includes("&") && window.rhythmSubdivisionEvent.isEighth) {
        if (player.characterType === "ARCHER") {
          const subdivisionProjectiles = this.fireProjectileWithRhythm(
            player,
            targetX,
            targetY,
            window.rhythmSubdivisionEvent.beatBonus || 1.0
          );
          results.projectiles.push(...subdivisionProjectiles);
        } else if (player.characterType === "FOOTMAN") {
          const subdivisionAttacks = this.performMeleeAttackWithRhythm(
            player,
            window.rhythmSubdivisionEvent.beatBonus || 1.0
          );
          results.meleeAttacks.push(...subdivisionAttacks);
        }
      }

      window.rhythmSubdivisionEvent = null;
    }

    return results;
  }

  // Update all combat elements
  update(deltaTime, player, enemies) {
    // Only manually trigger attacks if no rhythm system is active
    if (!window.audioSystem) {
      // Update attack timer
      this.attackTimer += deltaTime;

      // Check if it's time to attack
      if (this.attackTimer >= player.attackRate) {
        // Reset timer
        this.attackTimer = 0;

        // Perform attack based on character type
        if (player.characterType === "ARCHER") {
          const closestEnemy = this.findClosestEnemy(player, enemies);
          const projectiles = this.fireProjectileWithRhythm(
            player,
            closestEnemy ? closestEnemy.x : null,
            closestEnemy ? closestEnemy.y : null
          );
          this.projectiles.push(...projectiles);
        } else if (player.characterType === "FOOTMAN") {
          const attacks = this.performMeleeAttackWithRhythm(player);
          this.meleeAttacks.push(...attacks);
        }
      }
    }

    // Update projectiles
    this.updateProjectiles(deltaTime, enemies);

    // Update melee attacks
    this.updateMeleeAttacks(deltaTime, player, enemies);

    // Update particles
    this.particleSystem.update(deltaTime);
  }

  // Find closest enemy for targeting
  findClosestEnemy(player, enemies) {
    let closestEnemy = null;
    let closestDist = Infinity;

    for (let enemy of enemies) {
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestEnemy = enemy;
      }
    }

    return closestEnemy;
  }

  // Fire projectile with rhythm mechanics
  fireProjectileWithRhythm(player, targetX, targetY, beatBonus = 1.0) {
    // Calculate direction to target
    let dirX = 0;
    let dirY = -1; // Default direction up if no target

    if (targetX !== null && targetY !== null) {
      const dx = targetX - player.x;
      const dy = targetY - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        dirX = dx / dist;
        dirY = dy / dist;
      }
    }

    // Create projectile
    const projectile = {
      x: player.x,
      y: player.y,
      size: 10,
      speed: player.projectileSpeed || 8,
      dirX: dirX,
      dirY: dirY,
      color: "#ffcc00",
      power: player.attackPower * beatBonus,
      isCritical: Math.random() < player.critChance,
      piercing: player.piercing,
      pierceCount: player.pierceCount || 1,
      hitEnemies: [],
      distance: 0,
      maxDistance: player.range || 500,
      rhythmTime: Date.now(),
    };

    // Critical hits are larger and more powerful
    if (projectile.isCritical) {
      projectile.size *= 1.5;
      projectile.power *= 2;
      projectile.color = "#ff4400";
      if (window.audioSystem) {
        window.audioSystem.playSound("bow_crit");
      }
    } else if (window.audioSystem) {
      window.audioSystem.playSound("bow_fire");
    }

    let projectiles = [];

    if (player.characterType === "ARCHER" && player.multiArrowCount > 1) {
      if (player.fullCircleArrows) {
        // Fire arrows in a 360° circle
        for (let i = 0; i < player.multiArrowCount; i++) {
          const angle = (Math.PI * 2 * i) / player.multiArrowCount;
          const newDirX = Math.cos(angle);
          const newDirY = Math.sin(angle);

          projectiles.push({
            ...projectile,
            dirX: newDirX,
            dirY: newDirY,
          });
        }
      } else {
        // Fire arrows in an expanding arc
        const arcWidth = Math.min(
          Math.PI,
          Math.PI * (player.multiArrowCount / 7)
        );

        for (let i = 0; i < player.multiArrowCount; i++) {
          let angleOffset;
          if (player.multiArrowCount > 1) {
            angleOffset =
              arcWidth * (i / (player.multiArrowCount - 1)) - arcWidth / 2;
          } else {
            angleOffset = 0;
          }

          const cos = Math.cos(angleOffset);
          const sin = Math.sin(angleOffset);

          const newDirX = dirX * cos - dirY * sin;
          const newDirY = dirX * sin + dirY * cos;

          projectiles.push({
            ...projectile,
            dirX: newDirX,
            dirY: newDirY,
          });
        }
      }
    } else {
      projectiles.push(projectile);
    }

    // Create attack trail particles
    this.particleSystem.createAttackTrail(
      player.x,
      player.y,
      dirX,
      dirY,
      "#ffcc00",
      projectile.isCritical
    );

    // Handle burst attack
    let additionalProjectiles = [];

    if (player.burstAttack > 1) {
      for (let i = 1; i < player.burstAttack; i++) {
        // Add slight spread for burst shots
        const spreadAngle = (i - Math.floor(player.burstAttack / 2)) * 0.1;
        const cos = Math.cos(spreadAngle);
        const sin = Math.sin(spreadAngle);
        const spreadDirX = dirX * cos - dirY * sin;
        const spreadDirY = dirX * sin + dirY * cos;

        const burstProjectile = {
          ...projectile,
          dirX: spreadDirX,
          dirY: spreadDirY,
          x: player.x + spreadDirX * 10,
          y: player.y + spreadDirY * 10,
        };

        additionalProjectiles.push(burstProjectile);
      }
    }

    // Double attack chance
    if (Math.random() < player.doubleAttackChance) {
      const doubleProjectile = {
        ...projectile,
        x: player.x + dirY * 10,
        y: player.y - dirX * 10,
      };
      
      additionalProjectiles.push(doubleProjectile);
    }

    // Return all projectiles
    return [...projectiles, ...additionalProjectiles];
  }

  // Perform melee attack with rhythm mechanics
  performMeleeAttackWithRhythm(player, beatBonus = 1.0) {
    const range = player.attackRange || 80;

    // Create melee attack
    const attack = {
      x: player.x,
      y: player.y,
      range: range,
      duration: 200, // ms
      timeLeft: 200,
      power: player.attackPower * beatBonus,
      hitEnemies: [],
      hitBoss: false,
      multiTarget: player.multiTarget,
      color: "#44cc66",
      isCritical: Math.random() < player.critChance,
      rhythmTime: Date.now(),
    };

    // Critical hits have larger range and more power
    if (attack.isCritical) {
      attack.range *= 1.3;
      attack.power *= 2;
      attack.color = "#ff4400";
      attack.duration *= 1.2;
      attack.timeLeft = attack.duration;
      if (window.audioSystem) {
        window.audioSystem.playSound("melee_crit");
      }
    } else if (window.audioSystem) {
      window.audioSystem.playSound("melee_swing");
    }

    // Additional attacks based on abilities
    let additionalAttacks = [];

    // Check for double attack chance
    if (Math.random() < player.doubleAttackChance) {
      additionalAttacks.push({
        ...attack,
        timeLeft: attack.duration,
        hitEnemies: [],
        hitBoss: false,
        rhythmTime: Date.now() + 150,
      });
    }

    // Burst attack
    if (player.burstAttack > 1) {
      for (let i = 1; i < player.burstAttack; i++) {
        additionalAttacks.push({
          ...attack,
          timeLeft: attack.duration,
          hitEnemies: [],
          hitBoss: false,
          rhythmTime: Date.now() + i * 250,
        });
      }
    }

    return [attack, ...additionalAttacks];
  }

  // Update projectiles
  updateProjectiles(deltaTime, enemies) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      // Move projectile
      projectile.x += projectile.dirX * projectile.speed;
      projectile.y += projectile.dirY * projectile.speed;

      // Update distance traveled
      projectile.distance += projectile.speed;

      // Check for collision with enemies
      let hitEnemy = false;

      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];

        // Skip if this enemy was already hit by a piercing projectile
        if (projectile.hitEnemies && projectile.hitEnemies.includes(enemy)) {
          continue;
        }

        // Simple circle collision
        const dx = projectile.x - enemy.x;
        const dy = projectile.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < projectile.size / 2 + enemy.size / 2) {
          // Hit!
          hitEnemy = true;

          // Track hit enemy for piercing projectiles
          if (projectile.piercing) {
            if (!projectile.hitEnemies) {
              projectile.hitEnemies = [];
            }
            projectile.hitEnemies.push(enemy);
          }

          // Use enemySystem to remove enemy (which now handles health reduction)
          const removedEnemy = this.enemySystem?.removeEnemy(j, projectile);
          
          // Only create effect if enemy was fully defeated
          if (removedEnemy) {
            // Create hit effect
            this.particleSystem.createHitEffect(
              enemy.x,
              enemy.y,
              projectile.isCritical
            );
            
            // Play hit sound
            if (window.audioSystem) {
              window.audioSystem.playSound("enemy_death");
            }
          } else {
            // Enemy was hit but not defeated
            // Create smaller hit effect
            this.particleSystem.createHitEffect(
              enemy.x,
              enemy.y,
              false
            );
            
            // Play hit sound
            if (window.audioSystem) {
              window.audioSystem.playSound("enemy_hit", 0.5);
            }
          }

          // Break unless projectile can pierce more targets
          if (!projectile.piercing || 
              (projectile.pierceCount > 0 && 
              projectile.hitEnemies.length >= projectile.pierceCount)) {
            break;
          }
        }
      }

      // Remove non-piercing projectile if it hit an enemy
      if (hitEnemy && 
          (!projectile.piercing || 
          (projectile.pierceCount > 0 && 
            projectile.hitEnemies.length >= projectile.pierceCount))) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Remove if max distance reached or off screen
      if (projectile.distance > projectile.maxDistance) {
        this.projectiles.splice(i, 1);
      }
    }
  }
  
  // Update melee attacks
  updateMeleeAttacks(deltaTime, player, enemies) {
    for (let i = this.meleeAttacks.length - 1; i >= 0; i--) {
      const attack = this.meleeAttacks[i];

      // Decrease time left
      attack.timeLeft -= deltaTime;

      // Remove expired attacks
      if (attack.timeLeft <= 0) {
        this.meleeAttacks.splice(i, 1);
        continue;
      }

      // Check for hits on enemies
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];

        // Skip if already hit by this attack
        if (attack.hitEnemies.includes(enemy)) {
          continue;
        }

        // Check distance
        const dx = enemy.x - attack.x;
        const dy = enemy.y - attack.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < attack.range + enemy.size / 2) {
          // Hit!
          attack.hitEnemies.push(enemy);

          // Use enemySystem to remove enemy (which handles note spawning)
          const removedEnemy = this.enemySystem?.removeEnemy(j, attack);
          
          if (removedEnemy) {
            // Create hit effect
            this.particleSystem.createHitEffect(
              enemy.x,
              enemy.y,
              attack.isCritical
            );

            // Play hit sound
            if (window.audioSystem) {
              window.audioSystem.playSound(
                attack.isCritical ? "melee_crit" : "melee_hit"
              );
            }
          }

          // Stop checking more enemies unless multiTarget
          if (!attack.multiTarget) {
            break;
          }
        }
      }
    }
  }

  // Draw projectiles
  drawProjectiles(ctx) {
    for (let projectile of this.projectiles) {
      // Draw main projectile
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, projectile.size / 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw trail
      ctx.strokeStyle = `rgba(255, 204, 0, 0.4)`;
      ctx.lineWidth = projectile.size / 3;
      ctx.beginPath();
      ctx.moveTo(
        projectile.x - projectile.dirX * projectile.size * 2,
        projectile.y - projectile.dirY * projectile.size * 2
      );
      ctx.lineTo(projectile.x, projectile.y);
      ctx.stroke();
    }
  }

  // Draw melee attacks
  drawMeleeAttacks(ctx) {
    for (let attack of this.meleeAttacks) {
      // Calculate opacity based on time left
      const opacity = attack.timeLeft / attack.duration;

      // Parse color components
      const r = parseInt(attack.color.substr(1, 2), 16);
      const g = parseInt(attack.color.substr(3, 2), 16);
      const b = parseInt(attack.color.substr(5, 2), 16);

      // Draw circle for attack area
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`;
      ctx.beginPath();
      ctx.arc(attack.x, attack.y, attack.range, 0, Math.PI * 2);
      ctx.fill();

      // Draw ring
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(attack.x, attack.y, attack.range, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Draw particles
  drawParticles(ctx) {
    this.particleSystem.draw(ctx);
  }

  // Get projectiles
  getProjectiles() {
    return this.projectiles;
  }

  // Get melee attacks
  getMeleeAttacks() {
    return this.meleeAttacks;
  }

  // Reset combat system
  reset() {
    this.projectiles = [];
    this.meleeAttacks = [];
    this.attackTimer = 0;
    this.particleSystem.clearAll();
  }
}

export default CombatSystem;