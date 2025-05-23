// player.js - Player entity and related functions

// Character Types
const CHARACTER_TYPES = {
    ARCHER: {
      name: "Archer",
      color: "#22aaff",
      attackType: "ranged",
      attackRate: 100, // ms
      projectileSpeed: 8,
      range: 150,
      symbol: "b"
    },
    FOOTMAN: {
      name: "Footman",
      color: "#44cc66",
      attackType: "melee",
      attackRate: 300, // ms
      attackRange: 80,
      attackDamage: 1
    }
  };
  
  class Player {
    constructor() {
    // Position and movement
    this.x = 0;
    this.y = 0;
    this.size = 40;
    this.speed = 3.5;
    
    // Character info
    this.characterType = null;
    this.color = "#4488ff";
    this.vx = 0;
    this.vy = 0;
    
    this.level = 1;

    // Combat stats
    this.attackPower = 1;
    this.attackRate = 1000;
    this.range = 500;
    this.attackRange = 80;
    this.critChance = 0.01;
    this.doubleAttackChance = 0;
    this.burstAttack = 1;
    this.piercing = false;
    this.pierceCount = 1;
    this.multiTarget = false;
    this.multiArrowCount = 1;
    this.fullCircleArrows = false;
    this.magnetRange = 1.0;
    this.magnetStrength = 1.0;
      
    this.attackBeats = [0]; // Initially only attacks on first beat (0-indexed)
    this.rhythmPattern = ["1"]; // Default pattern for level 1
    this.hasEighthNotes = false; // Whether pattern includes eighth notes

      // Health system
      this.health = 3;
      this.maxHealth = 3;
      this.invulnerableTimer = 0;
      this.invulnerableDuration = 1000;
      this.flashTimer = 0;
      
      // Weapon evolution
      this.weaponEvolved = false;
      this.evolvedWeaponName = null;
      this.weaponColor = null;
      
      // Temporary effects
      this.tempSpeedReduction = 1;
      this.tempAttackRateReduction = 1;
      this.symbol = "🏹";
    }
  
    // Initialize player with character type
    initialize(type) {
      this.characterType = type;
      
      // Set character-specific properties
      const charType = CHARACTER_TYPES[type];
      this.color = charType.color;
      this.attackRate = charType.attackRate;
      
      if (type === "ARCHER") {
        this.range = charType.range;
        this.projectileSpeed = charType.projectileSpeed;
      } else if (type === "FOOTMAN") {
        this.attackRange = charType.attackRange;
        this.attackDamage = charType.attackDamage;
      }
      
      return this;
    }
  
    // Update player state
    update(deltaTime) {
      // Update invulnerability timer
      if (this.invulnerableTimer > 0) {
        this.invulnerableTimer -= deltaTime;
      }
      
      // Update damage flash effect
      if (this.flashTimer > 0) {
        this.flashTimer -= deltaTime;
      }
    }
  
    // Move player based on input
    move(dirX, dirY, deltaTime) {
      // Calculate movement delta
      const length = Math.sqrt(dirX * dirX + dirY * dirY);
      
      if (length > 0) {
        // Normalize direction
        const normalizedDirX = dirX / length;
        const normalizedDirY = dirY / length;
        
        // Apply speed and any temporary effects
        const effectiveSpeed = this.speed * this.tempSpeedReduction;
        
        // Update position
        this.x += normalizedDirX * effectiveSpeed;
        this.y += normalizedDirY * effectiveSpeed;
      }
    }
  
    // Take damage
// player.js - modify takeDamage method
takeDamage(amount) {
  if (this.invulnerableTimer > 0) return false;
  
  this.health -= amount;
  this.invulnerableTimer = this.invulnerableDuration;
  
  // Visual feedback
  this.flashTimer = 500;
  
  // Prevent negative health
  if (this.health < 0) this.health = 0;
  
  // Return true  if dead 
  return this.health <= 0;
}
  
    // Heal player
    heal(amount) {
      this.health = Math.min(this.health + amount, this.maxHealth);
    }
  
    // Draw player and effects
    draw(ctx) {
      // Base color from character type
      ctx.fillStyle = this.weaponEvolved ? this.weaponColor : this.color;
      
      // Draw player body
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw outline
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw character-specific weapon icon
      if (this.characterType === "ARCHER") {
        this.drawArcherIcon(ctx);
      } else if (this.characterType === "FOOTMAN") {
        this.drawFootmanIcon(ctx);
      }
      
      // Draw damage flash effect
      if (this.flashTimer > 0) {
        const flashOpacity = (this.flashTimer % 200 < 100) ? 0.7 : 0;
        ctx.fillStyle = `rgba(255, 0, 0, ${flashOpacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2 + 5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw evolved weapon effect
      if (this.weaponEvolved) {
        ctx.strokeStyle = this.weaponColor || "#ffff00";
        ctx.lineWidth = 3;
        
        // Pulsing glow
        const pulseSize = 5 + Math.sin(Date.now() / 200) * 3;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2 + pulseSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw evolved weapon name
        if (this.evolvedWeaponName) {
          ctx.fillStyle = "#ffffff";
          ctx.font = "12px Consolas";
          ctx.textAlign = "center";
          ctx.fillText(this.evolvedWeaponName, this.x, this.y - this.size / 2 - 15);
        }
      }
    }
  
    // Draw archer icon
    drawArcherIcon(ctx) {
      ctx.fillStyle = "##22aaff";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw enemy type symbol
      ctx.fillStyle = "#fff";
      ctx.font = `${this.size}px Consolas`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.symbol, this.x, this.y);
      
    }
  
    // Draw footman icon
    drawFootmanIcon(ctx) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      
      // Draw sword
      ctx.beginPath();
      ctx.moveTo(this.x + this.size/6, this.y - this.size/3);
      ctx.lineTo(this.x - this.size/6, this.y + this.size/3);
      ctx.stroke();
      
      // Sword hilt
      ctx.beginPath();
      ctx.moveTo(this.x + this.size/6 - this.size/10, this.y - this.size/3 + this.size/10);
      ctx.lineTo(this.x + this.size/6 + this.size/10, this.y - this.size/3 - this.size/10);
      ctx.stroke();
      
      // Draw shield
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.size/4, this.size/3, Math.PI/4, 0, Math.PI * 2);
      ctx.stroke();
      
      // Shield emblem
      ctx.beginPath();
      ctx.moveTo(this.x - this.size/8, this.y);
      ctx.lineTo(this.x + this.size/8, this.y);
      ctx.moveTo(this.x, this.y - this.size/8);
      ctx.lineTo(this.x, this.y + this.size/8);
      ctx.stroke();
    }
  
    // Apply an upgrade to the player
    applyUpgrade(upgrade) {
      upgrade.apply(this);
    }
  
    // Evolve weapon based on category
    evolveWeapon(category) {
      if (this.weaponEvolved) return;
      
      this.weaponEvolved = true;
      
      // Different evolutions based on character and category
      if (this.characterType === "ARCHER") {
        switch (category) {
          case "INTERVAL":
            this.evolveToPrecisionBow();
            break;
          case "SCALE":
            this.evolveToHarmonyBow();
            break;
          case "RHYTHM":
            this.evolveToStaccatoBow();
            break;
        }
      } else if (this.characterType === "FOOTMAN") {
        switch (category) {
          case "INTERVAL":
            this.evolveToResonantBlade();
            break;
          case "SCALE":
            this.evolveToHarmonicShield();
            break;
          case "RHYTHM":
            this.evolveToTempoMace();
            break;
        }
      }
      
      return this.evolvedWeaponName;
    }
  
    // Weapon evolution implementations
    evolveToPrecisionBow() {
      this.evolvedWeaponName = "Precision Bow";
      this.range *= 1.5;
      this.critChance += 0.2;
      this.attackPower *= 1.3;
      this.projectileSpeed *= 1.5;
      this.weaponColor = "#ff9900";
    }
  
    evolveToHarmonyBow() {
      this.evolvedWeaponName = "Harmony Bow";
      this.multiTarget = true;
      this.piercing = true;
      this.attackPower *= 1.2;
      this.weaponColor = "#44aaff";
    }
  
    evolveToStaccatoBow() {
      this.evolvedWeaponName = "Staccato Bow";
      this.attackRate *= 0.6; // Much faster
      this.burstAttack = 3;
      this.doubleAttackChance += 0.3;
      this.weaponColor = "#ff44ff";
    }
  
    evolveToResonantBlade() {
      this.evolvedWeaponName = "Resonant Blade";
      this.attackRange *= 1.5;
      this.attackPower *= 1.5;
      this.weaponColor = "#ffaa00";
    }
  
    evolveToHarmonicShield() {
      this.evolvedWeaponName = "Harmonic Shield";
      this.multiTarget = true;
      this.attackPower *= 1.2;
      this.maxHealth += 2;
      this.health += 2;
      this.weaponColor = "#00ccff";
    }
  
    evolveToTempoMace() {
      this.evolvedWeaponName = "Tempo Mace";
      this.attackRate *= 0.7;
      this.speed *= 1.3;
      this.doubleAttackChance += 0.4;
      this.weaponColor = "#ff00ff";
    }
  
// Updated reset method for Player class
reset() {
  // Basic stats
  this.health = 3;
  this.maxHealth = 3;
  this.attackPower = 1;
  this.speed = 3.5;
  
  // Combat stats
  this.critChance = 0.01;  // Reset to initial value, not 0
  this.doubleAttackChance = 0;
  this.burstAttack = 1;
  
  // Projectile properties
  this.piercing = false;
  this.pierceCount = 1;
  this.multiTarget = false;
  this.multiArrowCount = 1;  // Was missing
  this.fullCircleArrows = false;  // Was missing
  
  // Item collection
  this.magnetRange = 1.0;  // Was missing
  this.magnetStrength = 1.0;  // Was missing
  
  // Rhythm properties
  this.attackBeats = [0];  // Was missing

  
  // Visual effects
  this.weaponEvolved = false;
  this.evolvedWeaponName = null;
  this.weaponColor = null;
  this.tempSpeedReduction = 1;
  this.tempAttackRateReduction = 1;
  
  // Character-specific defaults
  if (this.characterType === "ARCHER") {
    this.range = CHARACTER_TYPES.ARCHER.range;
    this.attackRate = CHARACTER_TYPES.ARCHER.attackRate;
    this.projectileSpeed = CHARACTER_TYPES.ARCHER.projectileSpeed;
  } else if (this.characterType === "FOOTMAN") {
    this.attackRange = CHARACTER_TYPES.FOOTMAN.attackRange;
    this.attackRate = CHARACTER_TYPES.FOOTMAN.attackRate;
  }
}
  }
  
  export { Player, CHARACTER_TYPES };