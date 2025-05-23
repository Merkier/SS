// fame.js - Handles fame points persistence and unlockables

class FameSystem {
  constructor() {
    this.famePoints = 0;
    this.totalFamePoints = 0;  
    this.playerName = "Player"; // Default player name
    this.maxLevel = 1; // Add max level tracking
    this.unlockedContent = {
      characters: ["ARCHER", "FOOTMAN"],
      scales: ["major"],
      instruments: ["basic"],
      passives: []
    };
    
    // Unlock requirements
    this.unlockRequirements = {
      characters: {
        "BARD": 200,
        "DRUMMER": 500,
        "CONDUCTOR": 1000
      },
      scales: {
        "minor": 100,
        "dorian": 300,
        "pentatonic": 600,
        "chromatic": 900
      },
      instruments: {
        "advanced": 400,
        "exotic": 700,
        "legendary": 1200
      },
      passives: {
        "note_magnet": 150,
        "faster_attacks": 350,
        "extra_health": 550,
        "chest_finder": 750,
        "boss_damage": 1100
      }
    };
    
    // UI elements
    this.fameUI = null;
    this.unlockMenuUI = null;
    
    // Initialize from localStorage if available
    this.loadFromStorage();
  }
// Add this method
setPlayerName(name) {
  this.playerName = name || "Player";
  this.saveToStorage();
  return this.playerName;
}
  // Initialize fame UI
  setupFamePointsUI() {    
    this.updateFamePointsUI();
  }

  // Update fame points display
  updateFamePointsUI() {

  }

  // Show unlock menu
  showUnlockMenu() {
    if (this.unlockMenuUI) {
      // Just show if already created
      this.unlockMenuUI.style.display = 'block';
      return;
    }
    
    // Create unlock menu
    const menu = document.createElement('div');
    menu.id = 'unlock-menu';
    menu.style.position = 'absolute';
    menu.style.top = '50%';
    menu.style.left = '50%';
    menu.style.transform = 'translate(-50%, -50%)';
    menu.style.width = '80%';
    menu.style.maxWidth = '500px';
    menu.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    menu.style.border = '2px solid #6644aa';
    menu.style.borderRadius = '10px';
    menu.style.padding = '20px';
    menu.style.color = 'white';
    menu.style.zIndex = '900';
    menu.style.maxHeight = '80%';
    menu.style.overflowY = 'auto';
    
    // Add header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '20px';
    
    const title = document.createElement('h2');
    title.textContent = 'Unlockables';
    title.style.margin = '0';
    
    const fameDisplay = document.createElement('div');
    fameDisplay.textContent = `Fame Points: ${this.famePoints}`;
    fameDisplay.style.color = '#ffcc00';
    fameDisplay.style.fontWeight = 'bold';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.backgroundColor = '#6644aa';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.padding = '5px 10px';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    
    closeButton.addEventListener('click', () => {
      menu.style.display = 'none';
    });
    
    header.appendChild(title);
    header.appendChild(fameDisplay);
    header.appendChild(closeButton);
    menu.appendChild(header);
    
    // Add categories
    const categories = [
      { id: 'characters', name: 'Characters' },
      { id: 'scales', name: 'Scales' },
      { id: 'instruments', name: 'Instruments' },
      { id: 'passives', name: 'Passive Abilities' }
    ];
    
    for (const category of categories) {
      const section = document.createElement('div');
      section.className = 'unlock-section';
      section.style.marginBottom = '20px';
      
      const sectionTitle = document.createElement('h3');
      sectionTitle.textContent = category.name;
      sectionTitle.style.borderBottom = '1px solid #6644aa';
      sectionTitle.style.paddingBottom = '5px';
      
      section.appendChild(sectionTitle);
      
      // Add unlockable items
      const items = this.unlockRequirements[category.id];
      
      for (const itemId in items) {
        const cost = items[itemId];
        const isUnlocked = this.unlockedContent[category.id].includes(itemId);
        
        const item = document.createElement('div');
        item.className = 'unlock-item';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '8px';
        item.style.margin = '5px 0';
        item.style.backgroundColor = isUnlocked ? 'rgba(100, 255, 100, 0.2)' : 'rgba(255, 255, 255, 0.1)';
        item.style.borderRadius = '5px';
        
        const itemName = document.createElement('div');
        itemName.textContent = this.formatItemName(itemId);
        
        const itemCost = document.createElement('div');
        if (isUnlocked) {
          itemCost.textContent = 'Unlocked';
          itemCost.style.color = '#44ff44';
        } else {
          itemCost.textContent = `${cost} Fame`;
          itemCost.style.color = this.famePoints >= cost ? '#ffcc00' : '#ff4444';
        }
        
        const unlockButton = document.createElement('button');
        unlockButton.textContent = isUnlocked ? 'Unlocked' : 'Unlock';
        unlockButton.style.backgroundColor = isUnlocked ? '#44aa44' : (this.famePoints >= cost ? '#6644aa' : '#444444');
        unlockButton.style.border = 'none';
        unlockButton.style.color = 'white';
        unlockButton.style.padding = '3px 8px';
        unlockButton.style.borderRadius = '3px';
        unlockButton.style.cursor = isUnlocked ? 'default' : (this.famePoints >= cost ? 'pointer' : 'not-allowed');
        unlockButton.disabled = isUnlocked || this.famePoints < cost;
        
        if (!isUnlocked && this.famePoints >= cost) {
          unlockButton.addEventListener('click', () => {
            this.unlockItem(category.id, itemId, cost);
            this.showUnlockMenu(); // Refresh menu
          });
        }
        
        item.appendChild(itemName);
        item.appendChild(itemCost);
        item.appendChild(unlockButton);
        
        section.appendChild(item);
      }
      
      menu.appendChild(section);
    }
    
    document.body.appendChild(menu);
    this.unlockMenuUI = menu;
  }

  // Format item name for display
  formatItemName(itemId) {
    return itemId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Unlock a new item
  unlockItem(category, itemId, cost) {
    if (this.famePoints < cost || this.unlockedContent[category].includes(itemId)) {
      return false;
    }
    
    // Deduct cost
    this.famePoints -= cost;
    
    // Add to unlocked content
    this.unlockedContent[category].push(itemId);
    
    // Update UI
    this.updateFamePointsUI();
    
    // Save to storage
    this.saveToStorage();
    
    console.log(`Unlocked ${itemId} in ${category} for ${cost} fame points`);
    return true;
  }

  // Add fame points
  addFamePoints(amount) {
    this.famePoints += amount;
    this.totalFamePoints += amount;
    
    // Update UI
    this.updateFamePointsUI();
    
    // Save to storage
    this.saveToStorage();
    
    return this.famePoints;
  }

  // Check if an item is unlocked
  isUnlocked(category, itemId) {
    return this.unlockedContent[category].includes(itemId);
  }

  // Get all unlocked items in a category
  getUnlockedItems(category) {
    return [...this.unlockedContent[category]];
  }

updateMaxLevel(level) {
  if (level > this.maxLevel) {
    this.maxLevel = level;
    this.saveToStorage();
    return true; // Return true if it's a new record
  }
  return false;
}

saveToStorage() {
  try {
    const data = {
      famePoints: this.famePoints,
      totalFamePoints: this.totalFamePoints,
      playerName: this.playerName,
      maxLevel: this.maxLevel, // Add max level to saved data
      unlockedContent: this.unlockedContent
    };
    
    localStorage.setItem('silentSurvivors_stats', JSON.stringify(data));
  } catch (e) {
    console.error('Error saving fame data to localStorage:', e);
  }
}

loadFromStorage() {
  try {
    const storedData = localStorage.getItem('silentSurvivors_stats');
    
    if (storedData) {
      const data = JSON.parse(storedData);
      
      this.famePoints = data.famePoints || 0;
      this.totalFamePoints = data.totalFamePoints || 0;
      this.playerName = data.playerName || "Player";
      this.maxLevel = data.maxLevel || 1; // Load max level with fallback
        
      // Merge unlocked content 
      if (data.unlockedContent) {
        for (const category in this.unlockedContent) {
          if (data.unlockedContent[category]) {
            this.unlockedContent[category] = data.unlockedContent[category];
          }
        }
      }
      
      console.log('Fame data loaded from localStorage');
      return true;
    }
  } catch (e) {
    console.error('Error loading fame data from localStorage:', e);
  }
  
  return false;
}

  // Calculate fame points for a game run
  calculateRunFame(level, noteFragments, upgradeCount) {
    const fameEarned = Math.floor(level * 10 + noteFragments * 2 + upgradeCount * 5);
    return fameEarned;
  }

  // Apply passive unlocks to player
  applyPassiveUnlocks(player) {
    const passives = this.unlockedContent.passives;
    
    if (passives.includes('extra_health')) {
      player.maxHealth += 1;
      player.health += 1;
    }
    
    if (passives.includes('faster_attacks')) {
      player.attackRate *= 0.9; // 10% faster attacks
    }
    
    if (passives.includes('boss_damage')) {
      player.bossDamageBonus = 1.25; // 25% more damage to bosses
    }
    
    return player;
  }

  // Get fame state for integrations
  getState() {
    return {
      famePoints: this.famePoints,
      totalFamePoints: this.totalFamePoints,
      unlockedContent: { ...this.unlockedContent }
    };
  }
}

export default FameSystem;