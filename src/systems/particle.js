// particle.js - Handles various visual particle effects

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.noteSymbols = ["♩", "♪", "♫", "♬", "♭", "♮", "♯", "𝄞", "𝄢", "𝄪"];
  }

  // Update all particles
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.x += particle.vx * (deltaTime / 16);
      particle.y += particle.vy * (deltaTime / 16);
      
      // Apply gravity if needed
      if (particle.gravity) {
        particle.vy += particle.gravity * (deltaTime / 16);
      }
      
      // Update rotation
      if (particle.rotationSpeed) {
        particle.rotation += particle.rotationSpeed * (deltaTime / 16);
      }
      
      // Update scale
      if (particle.scaleSpeed) {
        particle.scale += particle.scaleSpeed * (deltaTime / 16);
        if (particle.scale <= 0) {
          particle.scale = 0.01; // Prevent negative scale
        }
      }
      
      // Update color
      if (particle.fadeSpeed) {
        particle.opacity -= particle.fadeSpeed * (deltaTime / 16);
      }
      
      // Update lifetime
      particle.timeLeft -= deltaTime;
      
      // Remove expired particles
      if (particle.timeLeft <= 0 || particle.opacity <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Draw all particles
  draw(ctx) {
    for (let particle of this.particles) {
      // Skip if opacity too low
      if (particle.opacity <= 0.01) continue;
      
      ctx.save();
      
      // Move to particle position and apply transformations
      ctx.translate(particle.x, particle.y);
      
      if (particle.rotation) {
        ctx.rotate(particle.rotation);
      }
      
      if (particle.scale) {
        ctx.scale(particle.scale, particle.scale);
      }
      
      // Draw particle based on type
      switch (particle.type) {
        case 'circle':
          this.drawCircleParticle(ctx, particle);
          break;
        case 'symbol':
          this.drawSymbolParticle(ctx, particle);
          break;
        case 'spark':
          this.drawSparkParticle(ctx, particle);
          break;
        case 'trail':
          this.drawTrailParticle(ctx, particle);
          break;
        case 'explosion':
          this.drawExplosionParticle(ctx, particle);
          break;
        default:
          this.drawDefaultParticle(ctx, particle);
          break;
      }
      
      ctx.restore();
    }
  }

  // Drawing methods for different particle types
  drawCircleParticle(ctx, particle) {
    ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.opacity})`;
    ctx.beginPath();
    ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSymbolParticle(ctx, particle) {
    ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.opacity})`;
    ctx.font = `${particle.size}px Consolas`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(particle.symbol, 0, 0);
  }

  drawSparkParticle(ctx, particle) {
    ctx.strokeStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.opacity})`;
    ctx.lineWidth = particle.size / 4;
    ctx.beginPath();
    ctx.moveTo(-particle.size / 2, 0);
    ctx.lineTo(particle.size / 2, 0);
    ctx.moveTo(0, -particle.size / 2);
    ctx.lineTo(0, particle.size / 2);
    ctx.stroke();
  }

  drawTrailParticle(ctx, particle) {
    // Gradient trail
    const gradient = ctx.createLinearGradient(
      -particle.size, 0,
      particle.size, 0
    );
    
    gradient.addColorStop(0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, 0)`);
    gradient.addColorStop(0.5, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.opacity})`);
    gradient.addColorStop(1, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, particle.size, particle.size / 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawExplosionParticle(ctx, particle) {
    // Radial gradient for explosion
    const gradient = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, particle.size
    );
    
    gradient.addColorStop(0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.opacity})`);
    gradient.addColorStop(0.7, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.opacity * 0.5})`);
    gradient.addColorStop(1, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }

  drawDefaultParticle(ctx, particle) {
    // Simple square particle
    ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.opacity})`;
    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
  }

  // Create various particle effects
  createHitEffect(x, y, isCritical = false) {
    const count = isCritical ? 15 : 8;
    const color = isCritical ? {r: 255, g: 68, b: 0} : {r: 255, g: 204, b: 0};
    const size = isCritical ? 15 : 10;
    
    // Explosion particles
    this.createExplosion(x, y, count, {
      size: size,
      color: color,
      lifetime: 500,
      speedMultiplier: 2,
      fadeSpeed: 0.05
    });
    
    // Center flash
    this.particles.push({
      type: 'explosion',
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      size: isCritical ? 40 : 30,
      color: color,
      opacity: 0.8,
      fadeSpeed: 0.1,
      scale: 1.0,
      scaleSpeed: 0.02,
      rotation: 0,
      timeLeft: 300
    });
    
    return this.particles.length;
  }

  createExplosion(x, y, count, options = {}) {
    const defaults = {
      size: 10,
      color: {r: 255, g: 255, b: 255},
      lifetime: 1000,
      speedMultiplier: 1,
      fadeSpeed: 0.02,
      gravity: 0,
      types: ['circle', 'spark']
    };
    
    const settings = {...defaults, ...options};
    
    for (let i = 0; i < count; i++) {
      // Random angle and speed
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random() * 1.5) * settings.speedMultiplier;
      
      // Random particle type
      const type = settings.types[Math.floor(Math.random() * settings.types.length)];
      
      // Slightly randomize color
      const colorVariation = 30;
      const color = {
        r: Math.min(255, Math.max(0, settings.color.r + (Math.random() * colorVariation) - colorVariation/2)),
        g: Math.min(255, Math.max(0, settings.color.g + (Math.random() * colorVariation) - colorVariation/2)),
        b: Math.min(255, Math.max(0, settings.color.b + (Math.random() * colorVariation) - colorVariation/2))
      };
      
      this.particles.push({
        type: type,
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: settings.size * (0.7 + Math.random() * 0.6),
        color: color,
        opacity: 0.8 + Math.random() * 0.2,
        fadeSpeed: settings.fadeSpeed * (0.8 + Math.random() * 0.4),
        scale: 1.0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        gravity: settings.gravity,
        timeLeft: settings.lifetime * (0.8 + Math.random() * 0.4)
      });
    }
    
    return this.particles.length;
  }

  createNoteExplosion(x, y, count) {
    // Create musical note particles
    for (let i = 0; i < count; i++) {
      // Random direction and distance
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const distance = Math.random() * 50;
      
      // Random note symbol
      const symbol = this.noteSymbols[Math.floor(Math.random() * this.noteSymbols.length)];
      
      // Random color (music-themed colors)
      const colorOptions = [
        {r: 255, g: 136, b: 0},   // Orange
        {r: 68, g: 255, b: 68},   // Green
        {r: 255, g: 68, b: 255},  // Pink
        {r: 68, g: 255, b: 255},  // Cyan
        {r: 255, g: 255, b: 68}   // Yellow
      ];
      
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      
      // Create symbol particle
      this.particles.push({
        type: 'symbol',
        x: x + Math.cos(angle) * (distance / 5), // Initial position slightly offset
        y: y + Math.sin(angle) * (distance / 5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 15 + Math.random() * 15,
        color: color,
        opacity: 1.0,
        fadeSpeed: 0.008,
        scale: 1.0,
        scaleSpeed: 0.001,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        symbol: symbol,
        gravity: 0.05,
        timeLeft: 1000 + Math.random() * 2000
      });
    }
    
    return this.particles.length;
  }

  createWeaponEvolutionEffect(x, y, color) {
    // Convert color hex to RGB
    let r = 255, g = 255, b = 0; // Default yellow
    if (color && color.startsWith('#')) {
      r = parseInt(color.substr(1, 2), 16);
      g = parseInt(color.substr(3, 2), 16);
      b = parseInt(color.substr(5, 2), 16);
    }
    
    // Swirling particles around player
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 50 + Math.random() * 20;
      
      // Spiral particles
      this.particles.push({
        type: 'circle',
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        vx: Math.cos(angle) * -2,  // Move towards player
        vy: Math.sin(angle) * -2,
        size: 5 + Math.random() * 10,
        color: {r, g, b},
        opacity: 0.8,
        fadeSpeed: 0.01,
        scale: 1.0,
        scaleSpeed: 0.01,
        rotation: 0,
        rotationSpeed: 0,
        timeLeft: 1500
      });
    }
    
    // Central flash
    this.particles.push({
      type: 'explosion',
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      size: 80,
      color: {r, g, b},
      opacity: 0.9,
      fadeSpeed: 0.02,
      scale: 1.0,
      scaleSpeed: 0.01,
      rotation: 0,
      rotationSpeed: 0,
      timeLeft: 1000
    });
    
    // Small sparks bursting outward
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      
      this.particles.push({
        type: 'spark',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 10,
        color: {r: 255, g: 255, b: 255}, // White sparks
        opacity: 1.0,
        fadeSpeed: 0.03,
        scale: 1.0,
        rotation: angle,
        timeLeft: 500
      });
    }
    
    return this.particles.length;
  }

  createRequiemAttackEffect(x, y, color) {
    // Convert color hex to RGB
    let r = 255, g = 0, b = 0; // Default red
    if (color && color.startsWith('#')) {
      r = parseInt(color.substr(1, 2), 16);
      g = parseInt(color.substr(3, 2), 16);
      b = parseInt(color.substr(5, 2), 16);
    }
    
    // Large expanding ring
    for (let i = 0; i < 3; i++) {
      const delay = i * 300;
      
      // Delayed spawning
      setTimeout(() => {
        this.particles.push({
          type: 'explosion',
          x: x,
          y: y,
          vx: 0,
          vy: 0,
          size: 50,
          color: {r, g, b},
          opacity: 0.8,
          fadeSpeed: 0.01,
          scale: 1.0,
          scaleSpeed: 0.05,  // Fast expansion
          rotation: 0,
          timeLeft: 2000
        });
      }, delay);
    }
    
    // Radial symbol particles
    const symbolCount = 12;
    for (let i = 0; i < symbolCount; i++) {
      const angle = (Math.PI * 2 * i) / symbolCount;
      const symbol = this.noteSymbols[Math.floor(Math.random() * this.noteSymbols.length)];
      
      this.particles.push({
        type: 'symbol',
        x: x,
        y: y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        size: 30,
        color: {r, g, b},
        opacity: 1.0,
        fadeSpeed: 0.01,
        scale: 1.0,
        rotation: angle,
        symbol: symbol,
        timeLeft: 2000
      });
    }
    
    return this.particles.length;
  }

  createAttackTrail(x, y, dirX, dirY, color, isCritical = false) {
    // Convert color hex to RGB if provided
    let r = 255, g = 204, b = 0; // Default gold
    if (color && color.startsWith('#')) {
      r = parseInt(color.substr(1, 2), 16);
      g = parseInt(color.substr(3, 2), 16);
      b = parseInt(color.substr(5, 2), 16);
    }
    
    // Make critical attacks more dramatic
    const trailCount = isCritical ? 5 : 3;
    
    for (let i = 0; i < trailCount; i++) {
      // Calculate offset perpendicular to direction
      const perpX = -dirY;
      const perpY = dirX;
      const offset = (Math.random() - 0.5) * (isCritical ? 10 : 5);
      
      this.particles.push({
        type: 'trail',
        x: x + perpX * offset,
        y: y + perpY * offset,
        vx: -dirX * 2,
        vy: -dirY * 2,
        size: isCritical ? 15 : 10,
        color: {r, g, b},
        opacity: 0.7,
        fadeSpeed: 0.1,
        scale: 1.0,
        rotation: Math.atan2(dirY, dirX),
        timeLeft: 300
      });
    }
    
    return this.particles.length;
  }

  createBeatIndicator(x, y, isDownbeat) {
    // Visual pulse to indicate the beat
    const size = isDownbeat ? 30 : 20;
    const color = isDownbeat ? {r: 255, g: 204, b: 0} : {r: 255, g: 255, b: 255};
    
    this.particles.push({
      type: 'circle',
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      size: size,
      color: color,
      opacity: 0.8,
      fadeSpeed: 0.05,
      scale: 1.0,
      scaleSpeed: 0.03,
      rotation: 0,
      timeLeft: 500
    });
    
    return this.particles.length;
  }

  // Get particle count
  getCount() {
    return this.particles.length;
  }

  // Clear all particles
  clearAll() {
    this.particles = [];
  }
}

export default ParticleSystem;