// upgrade.js - Modified version with fixed event listeners and without attack_speed

// Simplified upgrade system with level-based improvements
const MUSIC_UPGRADES = [
  {
    id: "attack_range",
    name: "Attack Range",
    description: "Increases attack range by 5%",
    maxLevel: 8,
    apply: (player, level = 1) => {
      player.attackRange = player.attackRange * (1 + 0.05 * level);
    }
  },
  {
    id: "max_health",
    name: "Heart Container",
    description: "Increases maximum health by 1",
    maxLevel: 5,
    apply: (player, level = 1) => {
      player.maxHealth = 3 + level;
      player.health = Math.min(player.health + 1, player.maxHealth);
    }
  },
  {
    id: "attack_power",
    name: "Attack Power",
    description: "Increases attack damage by 15%",
    maxLevel: 10,
    apply: (player, level = 1) => {
      player.attackPower = 1 * (1 + 0.15 * level);
    }
  },
  {
    id: "critical_chance",
    name: "Critical Hit",
    description: "Increases critical hit chance by 4%",
    maxLevel: 8,
    apply: (player, level = 1) => {
      player.critChance = 0.01 + (0.04 * level);
    }
  },
  {
    id: "movement_speed",
    name: "Movement Speed",
    description: "Increases movement speed by 8%",
    maxLevel: 6,
    apply: (player, level = 1) => {
      player.speed = 3.5 * (1 + 0.08 * level);
    }
  },
  {
    id: "piercing",
    name: "Piercing Shot",
    description: "Attacks pierce through additional targets",
    maxLevel: 5,
    apply: (player, level = 1) => {
      player.pierceCount = 1 + level;
      player.piercing = true;
    }
  },
  {
    id: "multi_arrow",
    name: "Multi-Arrow",
    description: "Adds 2 additional arrows per attack",
    maxLevel: 4,
    characterType: "ARCHER",
    apply: (player, level = 1) => {
      player.multiArrowCount = 1 + (2 * level);
      player.fullCircleArrows = level >= 4;
    }
  },
  {
    id: "magnet",
    name: "Note Magnet",
    description: "Increases note attraction range by 15%",
    maxLevel: 6,
    apply: (player, level = 1) => {
      player.magnetRange = 1 + (0.15 * level);
      player.magnetStrength = 1 + (0.15 * level);
    }
  },{
  id: "rhythm_upgrade",
  name: "Attack Rhythm",
  description: "Attacks on more beats",
  category: "RHYTHM",
  maxLevel: 7,
  apply: (player, level = 1) => {
    // Define attack patterns based on spec
    const attackPatterns = {
      1: ["1"],
      2: ["1", "3"],
      3: ["1", "2", "3"],
      4: ["1", "2", "3", "4"],
      5: ["1", "&", "2", "3", "4"],
      6: ["1", "&", "2", "3", "&", "4"],
      7: ["1", "&", "2", "&", "3", "&", "4"]
    };
    
    // Get pattern for current level
    const pattern = attackPatterns[level] || attackPatterns[1];
    
    // Convert pattern to beat positions
    player.attackBeats = [];
    player.hasEighthNotes = false;
    
    for (const slot of pattern) {
      if (slot === "1") player.attackBeats.push(0);
      else if (slot === "2") player.attackBeats.push(1);
      else if (slot === "3") player.attackBeats.push(2);
      else if (slot === "4") player.attackBeats.push(3);
      else if (slot === "&") player.hasEighthNotes = true;
    }
    
    // Store the full pattern for eighth note processing
    player.rhythmPattern = pattern;
  }
}
];

class UpgradeSystem {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this.currentUpgrades = [];
    this.upgradeLevels = {}; // Track levels for each upgrade ID
    this.upgradeMenu = null;
    this.initialized = false;
  }

  // Initialize upgrade system
  initialize() {
    if (this.initialized) return;
    this.createUpgradeMenu();
    this.initialized = true;
    console.log('Upgrade system initialized');
  }

  // Create upgrade menu UI
  createUpgradeMenu() {
    this.upgradeMenu = document.createElement('div');
    this.upgradeMenu.id = 'upgrade-menu';
    this.upgradeMenu.style.position = 'absolute';
    this.upgradeMenu.style.top = '50%';
    this.upgradeMenu.style.left = '50%';
    this.upgradeMenu.style.transform = 'translate(-50%, -50%)';
    this.upgradeMenu.style.width = '80%';
    this.upgradeMenu.style.maxWidth = '500px';
    this.upgradeMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    this.upgradeMenu.style.border = '2px solid #6644aa';
    this.upgradeMenu.style.borderRadius = '10px';
    this.upgradeMenu.style.padding = '20px';
    this.upgradeMenu.style.color = 'white';
    this.upgradeMenu.style.display = 'none';
    this.upgradeMenu.style.zIndex = '800';
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = 'Choose an Upgrade';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    this.upgradeMenu.appendChild(title);
    
    // Add options container
    const optionsContainer = document.createElement('div');
    optionsContainer.id = 'upgrade-options';
    this.upgradeMenu.appendChild(optionsContainer);
    
    document.body.appendChild(this.upgradeMenu);
  }

  // Show upgrade menu with options
  showUpgradeMenu(player) {
    this.currentPlayer = player;
    // Clear previous options
    const upgradeOptions = document.getElementById('upgrade-options');
    upgradeOptions.innerHTML = '';
    
    // Choose 3 random upgrades to show
    const availableUpgrades = this.getAvailableUpgrades();
    const upgradesToShow = this.chooseRandomUpgrades(availableUpgrades, 3);
    
    // Create upgrade options
    upgradesToShow.forEach((upgradeIndex) => {
      const upgrade = MUSIC_UPGRADES[upgradeIndex];
      const currentLevel = this.upgradeLevels[upgrade.id] || 0;
      
      // Skip if max level reached
      if (currentLevel >= upgrade.maxLevel) return;
      
      const displayLevel = currentLevel + 1;
      const maxLevel = upgrade.maxLevel;
      
      const option = this.createUpgradeOption({
        ...upgrade,
        displayDescription: `${upgrade.description} (Level ${displayLevel}/${maxLevel})`,
        index: upgradeIndex
      });
      
      upgradeOptions.appendChild(option);
    });
    
    // Show menu and pause game
    this.upgradeMenu.style.display = 'block';
    this.gameStateManager.changeState(this.gameStateManager.states.UPGRADE);
  }

  // Create an upgrade option element
  createUpgradeOption(upgradeInfo) {
    const option = document.createElement('div');
    option.className = 'upgrade-option';
    option.style.margin = '10px 0';
    option.style.padding = '15px';
    option.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    option.style.border = '1px solid #6644aa';
    option.style.borderRadius = '8px';
    option.style.cursor = 'pointer';
    option.style.transition = 'all 0.2s';
    
    // Add hover effect
    option.addEventListener('mouseenter', () => {
      option.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      option.style.borderColor = '#aa88ff';
    });
    
    option.addEventListener('mouseleave', () => {
      option.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      option.style.borderColor = '#6644aa';
    });
    
    // Add upgrade content
    const nameDiv = document.createElement('div');
    nameDiv.className = 'upgrade-name';
    nameDiv.style.fontWeight = 'bold';
    nameDiv.style.color = '#aa88ff';
    nameDiv.style.marginBottom = '5px';
    nameDiv.textContent = upgradeInfo.name;
    
    const descDiv = document.createElement('div');
    descDiv.textContent = upgradeInfo.displayDescription || upgradeInfo.description;
    
    option.appendChild(nameDiv);
    option.appendChild(descDiv);
    
    // Add click handler
    const self = this; // Store 'this' context
    option.addEventListener('click', function() {
      self.selectUpgrade(self.currentPlayer, upgradeInfo.index);
    });
    
    return option;
  }

  // Select and apply an upgrade
  selectUpgrade(player, upgradeIndex) {
    if (!player) {
      console.error("Player is undefined in selectUpgrade");
      return null;
    }
    
    const upgrade = MUSIC_UPGRADES[upgradeIndex];
    
    // Initialize upgrade level if not present
    if (!this.upgradeLevels[upgrade.id]) {
      this.upgradeLevels[upgrade.id] = 0;
    }
    
    // Increment level if below max
    if (this.upgradeLevels[upgrade.id] < upgrade.maxLevel) {
      this.upgradeLevels[upgrade.id]++;
    }
    
    // Apply upgrade with current level
    upgrade.apply(player, this.upgradeLevels[upgrade.id]);
    
    // Update upgrade description to show level
    const actualLevel = this.upgradeLevels[upgrade.id];
    
    // Add to current upgrades for tracking
    this.currentUpgrades.push({
      id: upgrade.id,
      name: upgrade.name,
      description: `${upgrade.description} (Level ${actualLevel}/${upgrade.maxLevel})`,
      level: actualLevel,
      // Use the upgrade's category if available, otherwise "UPGRADE"
      category: upgrade.category || "UPGRADE"
    });
    
    if (upgrade.category === "RHYTHM" && window.combatSystem && window.combatSystem.updateAttackPattern) {
      window.combatSystem.updateAttackPattern(this.currentUpgrades);
  }

    // Hide upgrade menu and resume game
    this.upgradeMenu.style.display = 'none';
    this.gameStateManager.changeState(this.gameStateManager.states.PLAYING);
    

    // Play upgrade sound
    if (window.audioSystem) {
      window.audioSystem.playSound("upgrade_select");
    }
    return upgrade;
  }

  // Get list of available upgrades (not at max level)
  getAvailableUpgrades() {
    return MUSIC_UPGRADES
      .filter(upgrade => !upgrade.characterType || upgrade.characterType === this.currentPlayer.characterType)
      .map((upgrade, index) => {
        const currentLevel = this.upgradeLevels[upgrade.id] || 0;
        return {
          index: index,
          currentLevel: currentLevel,
          maxLevel: upgrade.maxLevel
        };
      })
      .filter(upgrade => upgrade.currentLevel < upgrade.maxLevel);
  }

  // Choose random upgrades to show
  chooseRandomUpgrades(availableUpgrades, count) {
    if (availableUpgrades.length <= count) {
      return availableUpgrades.map(upgrade => upgrade.index);
    }
    
    // Shuffle available upgrades
    const shuffled = [...availableUpgrades].sort(() => Math.random() - 0.5);
    
    // Take the first 'count' upgrades
    return shuffled.slice(0, count).map(upgrade => upgrade.index);
  }

  // Get current upgrades
  getUpgrades() {
    return this.currentUpgrades;
  }

  // Reset upgrades
  reset() {
    this.currentUpgrades = [];
    this.upgradeLevels = {};
  }
}

export { UpgradeSystem, MUSIC_UPGRADES };