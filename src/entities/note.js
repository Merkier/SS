// note.js - Enhanced implementation with note fragments and collection mechanics

class NoteSystem {
  constructor() {
    this.notes = [];
    this.noteSize = 15;
    this.attractionRange = 150;
    this.baseAttractionSpeed = 3;
    this.maxAttractionSpeed = 8;
    this.noteSymbols = ["♩", "♪", "♫", "♬", "♭", "♮", "♯"];
    this.noteColors = ["#ff8800", "#44ff44", "#ff44ff", "#44ffff"];
  }

  // Update note fragments with physics and lifetime management
  update(deltaTime, playerX, playerY, magnetRange = 1.0, magnetStrength = 1.0) {
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      
      // Update lifetime
      if (note.lifetime) {
        note.lifetime -= deltaTime;
        if (note.lifetime <= 0) {
          // Note disappeared
          this.notes.splice(i, 1);
          continue;
        }
        
        // Fade out when about to disappear
        if (note.lifetime < 2000) {
          note.opacity = note.lifetime / 2000;
        }
      }
      
      // Initial velocity movement (slows down over time)
      if (note.vx || note.vy) {
        note.x += note.vx * (deltaTime / 16);
        note.y += note.vy * (deltaTime / 16);
        
        // Slow down over time (simulating friction)
        note.vx *= 0.97;
        note.vy *= 0.97;
        
        // Stop very small movement to optimize
        if (Math.abs(note.vx) < 0.01) note.vx = 0;
        if (Math.abs(note.vy) < 0.01) note.vy = 0;
      }
      
      // Move notes towards player when close
      const dx = playerX - note.x;
      const dy = playerY - note.y;
      const dist = Math.hypot(dx, dy);
      
      // Attraction range with magnet enhancement
      if (dist < this.attractionRange * magnetRange) {
        // Speed increases with magnet strength and as note gets closer
        const attractionSpeed = (this.baseAttractionSpeed + 
          (1 - dist / (this.attractionRange * magnetRange)) * this.maxAttractionSpeed) * magnetStrength;
        
        if (dist > 0) {
          note.x += (dx / dist) * attractionSpeed * (deltaTime / 16);
          note.y += (dy / dist) * attractionSpeed * (deltaTime / 16);
        }
        
        // Add small oscillation effect
        note.offsetY = Math.sin(Date.now() / 200 + note.id) * 3;
      } else {
        // Small floating animation when not attracted
        note.offsetY = Math.sin(Date.now() / 400 + note.id) * 2;
      }
      
      // Handle any special effects
      if (note.sparkle) {
        note.sparkleTime -= deltaTime;
        if (note.sparkleTime <= 0) {
          note.sparkle = false;
        }
      }
      
      // Handle scaling effects
      if (note.scaleEffect) {
        note.scaleTimer += deltaTime;
        note.scale = 1 + 0.2 * Math.sin(note.scaleTimer / 200);
      }
    }
  }

  // Spawn a note fragment at position with physics
  spawnNoteFragment(x, y, count = 1, fromEnemy = true) {
    const fragments = [];
    
    for (let i = 0; i < count; i++) {
      // Add random offset for multiple fragments in a circular pattern
      const angle = Math.random() * Math.PI * 2;
      const distance = count > 1 ? Math.random() * 30 : 0;
      const offsetX = Math.cos(angle) * distance;
      const offsetY = Math.sin(angle) * distance;
      
      // Random initial velocity for more natural movement
      const speed = 0.5 + Math.random() * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      // Random note color and symbol
      const color = this.noteColors[Math.floor(Math.random() * this.noteColors.length)];
      const symbol = this.noteSymbols[Math.floor(Math.random() * this.noteSymbols.length)];
      
      const note = {
        x: x + offsetX,
        y: y + offsetY,
        vx: vx,
        vy: vy,
        size: this.noteSize,
        color: color,
        symbol: symbol,
        id: Math.random(), // Used for oscillation effect
        offsetY: 0, // For floating animation
        sparkle: fromEnemy, // Sparkle effect for enemy drops
        sparkleTime: 500, // How long to sparkle
        scaleEffect: true, // Pulse scale effect
        scaleTimer: Math.random() * 1000, // Randomize start phase
        scale: 1.0,
        value: fromEnemy ? 1 : 2, // Boss/chest notes worth more
        fromBoss: !fromEnemy,
        lifetime: 15000 + Math.random() * 5000, // Notes disappear after 15-20 seconds
        opacity: 1.0
      };
      
      this.notes.push(note);
      fragments.push(note);
    }
    
    // Play note spawn sound
    if (window.audioSystem && fragments.length > 0) {
      // Adjust volume based on number of notes
      const volume = Math.min(0.2 + (fragments.length * 0.05), 0.5);
      window.audioSystem.playSound("collect_note", volume);
    }
    
    return fragments;
  }

  // Check for collection by player
  checkCollection(playerX, playerY, playerSize) {
    const collectedNotes = [];
    let totalValue = 0;
    let healthCollected = false;
    
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      
      // Calculate distance
      const dx = playerX - note.x;
      const dy = playerY - note.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Check for collection
      if (dist < playerSize / 2 + note.size / 2) {
        // Remove from array
        this.notes.splice(i, 1);
        
        if (note.isHealth) {
          healthCollected = true;
        } else {
          collectedNotes.push(note);
          totalValue += note.value;
          
          // Play collection sound if audio system available
          if (window.audioSystem) {
            window.audioSystem.playSound("collect_note");
          }
        }
      }
    }
  
    // Return results object
    return {
      notes: collectedNotes.length > 0 ? collectedNotes : null,
      value: totalValue,
      healthCollected: healthCollected
    };
  }

  // Draw all notes with enhanced visuals
  drawNotes(ctx) {
    for (let note of this.notes) {
      // Calculate actual size with scale effect
      const actualSize = note.size * (note.scale || 1);
      
      // Handle transparency for disappearing notes
      const opacity = note.opacity !== undefined ? note.opacity : 1.0;
      
      if (note.isHealth) {
        // Draw heart background
        ctx.fillStyle = "#ff5e5e";
        ctx.beginPath();
        ctx.arc(note.x, note.y + note.offsetY, actualSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw heart symbol
        ctx.fillStyle = "#ffffff";
        ctx.font = `${actualSize}px Consolas`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♥", note.x, note.y + note.offsetY);
        
        // Draw glow effect
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(note.x, note.y + note.offsetY, actualSize / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();
        
        continue; // Skip the regular note drawing
      }

      // Draw colorful circle with proper opacity
      // Check if the color is in hex or rgba format
      if (note.color.startsWith('#')) {
        // Convert hex to rgba
        const r = parseInt(note.color.slice(1, 3), 16);
        const g = parseInt(note.color.slice(3, 5), 16);
        const b = parseInt(note.color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      } else {
        // Already in rgb/rgba format
        ctx.fillStyle = note.color.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
      }
      
      ctx.beginPath();
      ctx.arc(note.x, note.y + note.offsetY, actualSize / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Sparkle effect for newly dropped notes
      if (note.sparkle) {
        const sparkleOpacity = note.sparkleTime / 500 * opacity;
        ctx.strokeStyle = `rgba(255, 255, 255, ${sparkleOpacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(note.x, note.y + note.offsetY, actualSize / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Boss note indicator (larger, more dramatic)
      if (note.fromBoss) {
        ctx.strokeStyle = `rgba(255, 204, 0, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(note.x, note.y + note.offsetY, actualSize / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Draw music symbol with proper opacity
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      ctx.font = `${actualSize}px Consolas`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(note.symbol, note.x, note.y + note.offsetY);
    }
  }

  // Create a note explosion effect (for boss defeats)
  createNoteExplosion(x, y, count, isBossDefeat = false) {
    const fragments = [];
    
    for (let i = 0; i < count; i++) {
      // Create note with more dramatic effects for boss defeats
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * (isBossDefeat ? 5 : 3);
      const distance = Math.random() * (isBossDefeat ? 100 : 50);
      
      // Spawn note at calculated position with velocity
      const noteX = x + Math.cos(angle) * distance / 5;
      const noteY = y + Math.sin(angle) * distance / 5;
      
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      // Create note with special properties
      const note = {
        x: noteX,
        y: noteY,
        vx: vx,
        vy: vy,
        size: this.noteSize * (isBossDefeat ? 1.5 : 1),
        color: this.noteColors[Math.floor(Math.random() * this.noteColors.length)],
        symbol: this.noteSymbols[Math.floor(Math.random() * this.noteSymbols.length)],
        id: Math.random(),
        offsetY: 0,
        sparkle: true,
        sparkleTime: 2000, // Longer sparkle for explosions
        scaleEffect: true,
        scaleTimer: Math.random() * 1000,
        scale: 1.2,
        value: isBossDefeat ? 2 : 1,
        fromBoss: isBossDefeat,
        lifetime: 20000 + Math.random() * 5000,
        opacity: 1.0
      };
      
      this.notes.push(note);
      fragments.push(note);
    }
    
    return fragments;
  }

  // Create health pickup
  spawnHealthPickup(x, y) {
    const healthPickup = {
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 3, // Random initial velocity
      vy: (Math.random() - 0.5) * 3,
      size: 20,
      color: "#ff5e5e",
      symbol: "♥",
      id: Math.random(),
      offsetY: 0,
      sparkle: true,
      sparkleTime: 2000,
      scaleEffect: true,
      scaleTimer: Math.random() * 1000,
      scale: 1.2,
      value: 0,
      isHealth: true,
      lifetime: 30000 // Health pickups last longer
    };
    
    this.notes.push(healthPickup);
    
    // Play health spawn sound
    if (window.audioSystem) {
      window.audioSystem.playSound("spawn_health", 0.5);
    }
    
    return healthPickup;
  }

  // Get all notes
  getNotes() {
    return this.notes;
  }

  // Reset note system
  reset() {
    this.notes = [];
  }
}

export default NoteSystem;