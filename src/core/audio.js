// audio.js - Handles audio playback and rhythm-based mechanics

class AudioSystem {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    
    // Audio context and sources
    this.audioContext = null;
    this.audioInitialized = false;
    this.musicTrack = null;
    this.currentMusicType = ""; // "menu", "gameplay", "boss"
    this.musicVolume = 0.5;
    this.sfxVolume = 0.7;
    this.soundEnabled = true;
    this.soundBuffers = {};
    this.audioSources = {};
    
    // Metronome for rhythm mechanics
    this.metronome = null;
    this.bpm = 60; // Default tempo
    this.beatInterval = null;
    this.currentBeat = 0;
    this.beatsPerMeasure = 4;
    this.noteSubdivisions = 1; // 1 = quarter notes, 2 = eighth notes, etc.
    this.subdivisionInterval = null;
    
    // Beat callbacks
    this.onBeatCallbacks = [];
    this.onSubdivisionCallbacks = [];
    this.onBeatBonus = 1.2; // Beat bonus multiplier
    
    // UI elements
    this.soundSettingsUI = null;
    
    // Bind methods
    this.onBeat = this.onBeat.bind(this);
    this.onSubdivision = this.onSubdivision.bind(this);
    
    // Track if initialized
    this.initialized = false;
  }

  // Initialize audio system
  initialize() {
    if (this.initialized) return;
    
    // Create audio context
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.audioInitialized = true;
      console.log("Audio context initialized");
      
      // Set up master volume nodes
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      
      this.musicGain = this.audioContext.createGain();
      this.musicGain.connect(this.masterGain);
      this.musicGain.gain.value = this.musicVolume;
      
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.connect(this.masterGain);
      this.sfxGain.gain.value = this.sfxVolume;
      
      // Load sound effects
      this.loadSounds();
      
      // Create sound settings UI
      this.createSoundSettingsUI();
      
      // Start with menu music
      this.playMenuMusic();
      
      this.initialized = true;
    } catch (e) {
      console.error("Web Audio API not supported:", e);
      this.audioInitialized = false;
    }
    document.addEventListener('click', () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    }, { once: true });
    
    // Make audio system globally available
    window.audioSystem = this;
    
    return this.initialized;
  }

// Updated onBeat and onSubdivision methods for the AudioSystem in audio.js

onBeat(beatNumber) {
  // Reset subdivision counter on main beat
  this.subBeatCounter = 0;
  
  // Create the global rhythm event with unique timestamp
  window.rhythmBeatEvent = {
    isDownbeat: beatNumber === 0,
    beatNumber: beatNumber,
    beatBonus: this.onBeatBonus,
    timestamp: Date.now()
  };
  
  // Call any registered callbacks
  if (this.onBeatCallbacks && this.onBeatCallbacks.length > 0) {
    this.onBeatCallbacks.forEach(callback => callback(beatNumber));
  }
  
  // Play beat sound
  if (beatNumber === 0) {
    this.playSound("beat_strong", 0.4); // Lower volume
  } else {
    this.playSound("beat_weak", 0.3); // Lower volume
  }
}

onSubdivision() {
  // Increment subdivision counter
  this.subBeatCounter = (this.subBeatCounter || 0) + 1;
  
  // Calculate beat position
  const currentBeat = this.currentBeat || 0;
  const position = this.subBeatCounter / this.noteSubdivisions;
  
  // Create the subdivision event with unique timestamp to prevent duplicates
  window.rhythmSubdivisionEvent = {
    position: position,
    beatBonus: this.onBeatBonus * 0.8,
    timestamp: Date.now(),
    isEighth: this.noteSubdivisions === 2,
    isTriplet: this.noteSubdivisions === 3,
    isSixteenth: this.noteSubdivisions === 4 || this.noteSubdivisions === 8,
    isSyncopated: this.noteSubdivisions === 2 && this.subBeatCounter % 2 === 1
  };
  
  // Call callbacks
  if (this.onSubdivisionCallbacks && this.onSubdivisionCallbacks.length > 0) {
    this.onSubdivisionCallbacks.forEach(callback => callback());
  }
  
  // Play subdivision sound at lower volume
  this.playSound("beat_subdivision", 0.2);
}

  addBeatCallback(callback) {
    if (!this.onBeatCallbacks) this.onBeatCallbacks = [];
    this.onBeatCallbacks.push(callback);
  }

  addSubdivisionCallback(callback) {
    if (!this.onSubdivisionCallbacks) this.onSubdivisionCallbacks = [];
    this.onSubdivisionCallbacks.push(callback);
  }

  // Load all game sounds
  loadSounds() {
    const soundFiles = {
      // UI sounds
      "menu_select": "assets/sounds/menu_select.mp3",
      "level_up": "assets/sounds/level_up.mp3",
      "upgrade_select": "assets/sounds/upgrade_select.mp3",
      
      // Player sounds
      "player_hit": "assets/sounds/player_hit.mp3",
      "player_death": "assets/sounds/player_death.mp3",
      "collect_note": "assets/sounds/collect_note.mp3",
      "spawn_health": "assets/sounds/spawn_health.mp3",
      "collect_health": "assets/sounds/collect_health.mp3",

      // Weapon sounds - archer
      "bow_fire": "assets/sounds/bow_fire.mp3",
      "bow_crit": "assets/sounds/bow_crit.mp3",
      "bow_evolve": "assets/sounds/bow_evolve.mp3",
      
      // Weapon sounds - footman
      "melee_swing": "assets/sounds/melee_swing.mp3",
      "melee_hit": "assets/sounds/melee_hit.mp3",
      "melee_crit": "assets/sounds/melee_crit.mp3",
      "melee_evolve": "assets/sounds/melee_evolve.mp3",
      
      // Enemy sounds
      "enemy_death": "assets/sounds/enemy_death.mp3",
      
      // Boss sounds
      "boss_warning": "assets/sounds/boss_warning.mp3",
      "boss_hit": "assets/sounds/boss_hit.mp3",
      "boss_hit_crit": "assets/sounds/boss_hit_crit.mp3",
      "boss_defeated": "assets/sounds/boss_defeated.mp3",
      "requiem_charge": "assets/sounds/requiem_charge.mp3",
      "requiem_activate": "assets/sounds/requiem_activate.mp3",
      "boss_shockwave": "assets/sounds/boss_shockwave.mp3",
      "boss_summon": "assets/sounds/boss_summon.mp3",
      "boss_field": "assets/sounds/boss_field.mp3",
      "tempo_up": "assets/sounds/tempo_up.mp3",
      "tempo_down": "assets/sounds/tempo_down.mp3",
      "conductor_event": "assets/sounds/conductor_event.mp3",
      
      // Chest and item sounds
      "chest_appear": "assets/sounds/chest_appear.mp3",
      "chest_open": "assets/sounds/chest_open.mp3",
      
      // Metronome sounds
      "beat_strong": "assets/sounds/beat_strong.mp3",
      "beat_weak": "assets/sounds/beat_weak.mp3",
      "beat_subdivision": "assets/sounds/beat_subdivision.mp3",
      
      // Music tracks
      "music_menu": "assets/music/menu_theme.mp3",
      "music_gameplay_1": "assets/music/Ashes_of_Daylight.mp3",
      "music_gameplay_2": "assets/music/Shelter_Breaths.mp3",
      "music_gameplay_3": "assets/music/Echoes_in_the_Dust.mp3",
      "music_gameplay_4": "assets/music/Scavenge_Pulse.mp3",
      "music_gameplay_5": "assets/music/Blood_and_Battery.mp3",
      "music_gameplay_6": "assets/music/No_One_Is_Coming.mp3",
      "music_gameplay_7": "assets/music/Last_Ember.mp3",
      "music_gameplay_8": "assets/music/Feral_Horizon.mp3",
      "music_gameplay_9": "assets/music/Born_of_Hunger .mp3",
      "music_gameplay_10": "assets/music/We_Endure.mp3",
      "music_boss": "assets/music/boss_theme.mp3"
    };
    
    // Load each sound file
    for (const sound in soundFiles) {
      this.loadSound(sound, soundFiles[sound]);
    }
  }

  // Load individual sound
  loadSound(id, url) {
    if (!this.audioInitialized) return;
    
    // Create placeholder buffer for the sound
    this.soundBuffers[id] = {
      url: url,
      buffer: null,
      loaded: false,
      loading: false
    };
    
    // We'll lazily load sounds when first played to reduce initial load time
    console.log(`Prepared sound: ${id} (${url})`);
  }

  setBPMWithTransition(newBPM, transitionTime = 1000) {
  if (!this.audioInitialized) return;
  
  const startBPM = this.bpm;
  const bpmDiff = newBPM - startBPM;
  const startTime = Date.now();
  
  // Clear existing transition
  if (this.bpmTransitionInterval) {
    clearInterval(this.bpmTransitionInterval);
  }
  
  this.bpmTransitionInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / transitionTime, 1);
    
    // Ease-in-out for smoother transition
    const easedProgress = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    const currentBPM = startBPM + bpmDiff * easedProgress;
    this.setBPM(Math.round(currentBPM));
    
    if (progress >= 1) {
      clearInterval(this.bpmTransitionInterval);
      this.bpmTransitionInterval = null;
    }
  }, 50); // Update every 50ms
  
  return newBPM;
}
  // Actually load and decode audio data
  async fetchSound(id) {
    if (!this.audioInitialized) return false;
    
    const sound = this.soundBuffers[id];
    
    if (!sound) {
      console.error(`Sound not found: ${id}`);
      return false;
    }
    
    if (sound.loaded) return true; // Already loaded
    if (sound.loading) return false; // Currently loading
    
    sound.loading = true;
    
    try {
      // Fetch the audio file
      const response = await fetch(sound.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sound: ${sound.url}`);
      }
      
      // Get array buffer
      const arrayBuffer = await response.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Store decoded buffer
      sound.buffer = audioBuffer;
      sound.loaded = true;
      sound.loading = false;
      
      console.log(`Loaded sound: ${id}`);
      return true;
    } catch (error) {
      console.error(`Error loading sound ${id}:`, error);
      sound.loading = false;
      return false;
    }
  }

  // Set up metronome for beat synchronization
  setupMetronome() {
    if (!this.audioInitialized) return;
    
    // Set up beat interval based on BPM
    this.setBPM(this.bpm);
  }

  // Set tempo (beats per minute)
setBPM(newBPM) {
  console.log(`Setting BPM to ${newBPM}`);
  this.bpm = newBPM;
  
  // Clear existing intervals
  if (this.beatInterval) {
    clearInterval(this.beatInterval);
  }
  
  if (this.subdivisionInterval) {
    clearInterval(this.subdivisionInterval);
  }
  
  // Calculate milliseconds per beat
  const msPerBeat = 60000 / this.bpm;
  
  // Set up new beat interval
  this.beatInterval = setInterval(() => {
    // Increment beat counter
    this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
    
    // Call onBeat handler
    this.onBeat(this.currentBeat);
    
  }, msPerBeat);
  
  // Always set up eighth note subdivisions (2 per beat)
  const msPerEighth = msPerBeat / 2;
  let eighthCounter = 0;
  
  this.subdivisionInterval = setInterval(() => {
    eighthCounter++;
    
    // Skip even counts (those are main beats)
    if (eighthCounter % 2 === 0) {
      eighthCounter = 0;
      return;
    }
    
    // This is an eighth note subdivision
    this.onSubdivision();
    
  }, msPerEighth);
  
  return this.bpm;
}

  // Set subdivision level
  setNoteSubdivisions(subdivisions) {
    this.noteSubdivisions = subdivisions;
    // Recalculate beat timing
    this.setBPM(this.bpm);
  }

  async synchronizedPlayback(musicId) {
    if (!this.audioInitialized) return false;
    
    // Reset any existing timers
    if (this.beatInterval) clearInterval(this.beatInterval);
    if (this.subdivisionInterval) clearInterval(this.subdivisionInterval);
    
    // Load the music
    const loaded = await this.fetchSound(musicId);
    if (!loaded) return false;
    
    // Stop current music
    this.stopMusic();
    
    // Create source for music
    const source = this.audioContext.createBufferSource();
    source.buffer = this.soundBuffers[musicId].buffer;
    source.loop = true;
    source.connect(this.musicGain);
    
    // Use exact timing
    this.currentBeat = this.beatsPerMeasure - 1; // Will increment to 0 on first beat
    
    // Calculate precise beat timing in seconds
    const beatTime = 60 / this.bpm;
    
    // Setup beat interval with window.setTimeout for more precision
    const scheduleBeat = () => {
      this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
      this.onBeat(this.currentBeat);
      
      // Schedule next beat
      this.beatTimeout = setTimeout(scheduleBeat, beatTime * 1000);
      
      // Schedule subdivisions if needed
      if (this.noteSubdivisions > 1) {
        const subTime = beatTime / this.noteSubdivisions * 1000;
        for (let i = 1; i < this.noteSubdivisions; i++) {
          setTimeout(() => this.onSubdivision(), subTime * i);
        }
      }
    };
    
    // Start music precisely
    source.start(0);
    this.musicTrack = source;
    
    // Start first beat immediately 
    scheduleBeat();
    
    return true;
  }

  // Play music by type
  playMusic(type) {
    if (!this.audioInitialized || !this.soundEnabled) return;
    if (this.currentMusicType === type) return;
    
    // Stop current music
    if (this.musicTrack) {
      this.fadeOutMusic().then(() => {
        this.startMusicByType(type);
      });
    } else {
      this.startMusicByType(type);
    }
    
    this.currentMusicType = type;
  }

  // Start music by type
  async startMusicByType(type) {
    let musicId;
    
    switch(type) {
      case "menu":
        musicId = "music_menu";
        break;
      case "gameplay":
        musicId = "music_gameplay_1";
        break;
      case "boss":
        musicId = "music_boss";
        break;
      default:
        musicId = "music_menu";
    }
    
    await this.playMusicTrack(musicId);
  }

  // Start gameplay with sequenced tracks
  startGameplay() {
    // Create a sequence of songs to play
    
    const song1 = "music_gameplay_1";
    const song2 = "music_gameplay_2";
    const song3 = "music_gameplay_3";
    const song4 = "music_gameplay_4";
    const song5 = "music_gameplay_5";
    const song6 = "music_gameplay_6";
    const song7 = "music_gameplay_7";
    const song8 = "music_gameplay_8";
    this.currentSequence = [song1, song2, song3, song4, song5, song6, song7, song8];
    // Fisher-Yates shuffle algorithm
    function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    // Apply the shuffle
    this.currentSequence = shuffleArray([...this.currentSequence]);
    this.sequenceIndex = 0;
    
    // Set tempo
    this.bpm = 60;
    
    // Clear any existing intervals/timeouts
    this.clearAllTimers();
    
    // Play the first song and set up sequencing
    this.playSequencedTrack();
    
    this.currentMusicType = "gameplay";
  }

  // Helper function to play tracks in sequence
  playSequencedTrack() {
    const currentSongId = this.currentSequence[this.sequenceIndex];
    
    this.fetchSound(currentSongId).then(loaded => {
      if (!loaded) return;
      
      // Stop current music
      if (this.musicTrack) {
        this.musicTrack.stop();
        this.musicTrack.disconnect();
      }
      
      // Create source
      const source = this.audioContext.createBufferSource();
      source.buffer = this.soundBuffers[currentSongId].buffer;
      source.loop = false;
      source.connect(this.musicGain);
      
      // Get duration for scheduling
      const duration = source.buffer.duration * 1000;
      
      // Schedule next song
      this.sequenceTimeout = setTimeout(() => {
        // Move to next track
        this.sequenceIndex = (this.sequenceIndex + 1) % this.currentSequence.length;
        
        // Play the next track
        this.playSequencedTrack();
      }, duration - 50); // Slight overlap to prevent gaps
      
      // Set up beat tracking
      this.currentBeat = this.beatsPerMeasure - 1;
      const beatTime = 60 / this.bpm;
      
      const scheduleBeat = () => {
        this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
        this.onBeat(this.currentBeat);
        
        this.beatTimeout = setTimeout(scheduleBeat, beatTime * 1000);
        
        if (this.noteSubdivisions > 1) {
          const subTime = beatTime / this.noteSubdivisions * 1000;
          for (let i = 1; i < this.noteSubdivisions; i++) {
            setTimeout(() => this.onSubdivision(), subTime * i);
          }
        }
      };
      
      // Start music and beats
      source.start(0);
      this.musicTrack = source;
      scheduleBeat();
    });
  }

  // Play a specific music track
  async playMusicTrack(id) {
    if (!this.audioInitialized || !this.soundEnabled) return;
    
    // Ensure sound is loaded
    const loaded = await this.fetchSound(id);
    if (!loaded) return;
    
    // If we already have a music track, stop it
    if (this.musicTrack) {
      this.stopMusic();
    }
    
    // Create source for music
    const source = this.audioContext.createBufferSource();
    source.buffer = this.soundBuffers[id].buffer;
    source.loop = true;
    
    // Connect to music gain node
    source.connect(this.musicGain);
    
    // Start playback
    source.start(0);
    
    // Save current track
    this.musicTrack = source;
  }

  // Fade out current music
  fadeOutMusic() {
    return new Promise(resolve => {
      if (!this.musicTrack) {
        resolve();
        return;
      }
      
      // Get current volume
      const currentVolume = this.musicGain.gain.value;
      
      // Schedule a gradual fade out over 1 second
      const fadeTime = 1;
      this.musicGain.gain.setValueAtTime(currentVolume, this.audioContext.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeTime);
      
      // Stop the track after fade out
      setTimeout(() => {
        this.stopMusic();
        
        // Reset gain to original volume
        this.musicGain.gain.setValueAtTime(this.musicVolume, this.audioContext.currentTime);
        
        resolve();
      }, fadeTime * 1000);
    });
  }

  // Stop current music immediately
  stopMusic() {
    if (this.musicTrack) {
      this.musicTrack.stop();
      this.musicTrack.disconnect();
      this.musicTrack = null;
    }
    
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
      this.sequenceTimeout = null;
    }
  }

  // Shorthand functions for different music types
  playMenuMusic() {
    this.playMusic("menu");
  }

  playGameplayMusic() {
    // For menu, just play music without beats
    if (this.gameStateManager?.currentState === this.gameStateManager.states.MENU || 
        this.gameStateManager?.currentState === this.gameStateManager.states.CHARACTER_SELECT) {
      this.playMusic("gameplay");
      return;
    }
    
    // For actual gameplay, use synchronized beats
    this.startGameplay();
  }
  
  clearAllTimers() {
    if (this.beatInterval) clearInterval(this.beatInterval);
    if (this.subdivisionInterval) clearInterval(this.subdivisionInterval);
    if (this.beatTimeout) clearTimeout(this.beatTimeout);
    if (this.sequenceTimeout) clearTimeout(this.sequenceTimeout);
  }
  
  playBossMusic() {
    
    // Start synchronized music and beat system
    this.synchronizedPlayback("music_boss");
    this.currentMusicType = "boss";
  }

  // Play a sound effect
  async playSound(soundId, volumeMultiplier = 1.0) {
    if (!this.audioInitialized || !this.soundEnabled) return;
    
    if (!this.soundBuffers[soundId]) {
      console.warn(`Sound not found: ${soundId}`);
      return;
    }
    
    // Ensure the sound is loaded
    const loaded = await this.fetchSound(soundId);
    if (!loaded) return;
    
    // Create audio source
    const source = this.audioContext.createBufferSource();
    source.buffer = this.soundBuffers[soundId].buffer;
    
    // Create a gain node for this specific sound
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = this.sfxVolume * volumeMultiplier;
    
    // Connect source to gain, then to master sfx gain
    source.connect(gainNode);
    gainNode.connect(this.sfxGain);
    
    // Track the source to be able to stop it later if needed
    const sourceId = Date.now() + Math.random().toString(36).substr(2, 9);
    this.audioSources[sourceId] = source;
    
    // Play the sound
    source.start(0);
    
    // Remove from sources when finished
    source.onended = () => {
      delete this.audioSources[sourceId];
    };
    
    return sourceId;
  }

  // Set music volume
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.audioContext.currentTime);
    }
  }

  // Set sound effects volume
  setSFXVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.audioContext.currentTime);
    }
  }

  // Toggle sound on/off
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    
    if (!this.soundEnabled) {
      // Stop all sounds
      this.fadeOutMusic();
      
      // Stop all sound effects
      for (const sourceId in this.audioSources) {
        const source = this.audioSources[sourceId];
        if (source) {
          source.stop();
          source.disconnect();
        }
      }
      this.audioSources = {};
    } else {
      // Resume appropriate music
      if (this.gameStateManager) {
        const currentState = this.gameStateManager.currentState;
        
        if (currentState === this.gameStateManager.states.PLAYING) {
          if (window.bossSystem && window.bossSystem.activeBoss) {
            this.playBossMusic();
          } else {
            this.playGameplayMusic();
          }
        } else if (currentState === this.gameStateManager.states.MENU || 
                   currentState === this.gameStateManager.states.CHARACTER_SELECT) {
          this.playMenuMusic();
        }
      }
    }
    
    // Update UI if available
    if (this.soundSettingsUI) {
      const toggleButton = document.getElementById('toggle-sound');
      if (toggleButton) {
        toggleButton.textContent = this.soundEnabled ? 'Mute' : 'Unmute';
      }
    }
    
    return this.soundEnabled;
  }

  // Create sound settings UI
  createSoundSettingsUI() {
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'sound-settings';
    settingsPanel.style.position = 'absolute';
    settingsPanel.style.top = '10px';
    settingsPanel.style.right = '10px';
    settingsPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    settingsPanel.style.padding = '10px';
    settingsPanel.style.borderRadius = '5px';
    settingsPanel.style.color = '#ffffff';
    settingsPanel.style.fontSize = '14px';
    settingsPanel.style.display = 'none';
    settingsPanel.style.zIndex = '100';
    
    settingsPanel.innerHTML = `
      <div style="text-align: center; margin-bottom: 10px; font-weight: bold;">Sound Settings</div>
      <div style="margin-bottom: 5px;">
        <label for="music-volume">Music: </label>
        <input type="range" id="music-volume" min="0" max="100" value="${this.musicVolume * 100}" />
      </div>
      <div style="margin-bottom: 5px;">
        <label for="sfx-volume">SFX: </label>
        <input type="range" id="sfx-volume" min="0" max="100" value="${this.sfxVolume * 100}" />
      </div>
      <div style="text-align: center;">
        <button id="toggle-sound">${this.soundEnabled ? 'Mute' : 'Unmute'}</button>
        <button id="close-settings">Close</button>
      </div>
    `;
    
    document.body.appendChild(settingsPanel);
    this.soundSettingsUI = settingsPanel;
    
    // Add event listeners
    document.getElementById('music-volume').addEventListener('input', (e) => {
      this.setMusicVolume(e.target.value / 100);
    });
    
    document.getElementById('sfx-volume').addEventListener('input', (e) => {
      this.setSFXVolume(e.target.value / 100);
    });
    
    document.getElementById('toggle-sound').addEventListener('click', () => {
      this.toggleSound();
    });
    
    document.getElementById('close-settings').addEventListener('click', () => {
      this.toggleSoundSettings();
    });
    
    // Add sound settings button to game UI
    const soundButton = document.createElement('div');
    soundButton.id = 'sound-button';
    soundButton.style.position = 'absolute';
    soundButton.style.top = '10px';
    soundButton.style.right = '66px';
    soundButton.style.width = '30px';
    soundButton.style.height = '30px';
    soundButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    soundButton.style.borderRadius = '50%';
    soundButton.style.display = 'flex';
    soundButton.style.alignItems = 'center';
    soundButton.style.justifyContent = 'center';
    soundButton.style.cursor = 'pointer';
    soundButton.innerHTML = '🔊';
    soundButton.style.fontSize = '18px';
    soundButton.style.color = '#ffffff';
    
    soundButton.addEventListener('click', this.toggleSoundSettings.bind(this));
    document.body.appendChild(soundButton);
  }

  // Toggle sound settings panel visibility
  toggleSoundSettings() {
    if (!this.soundSettingsUI) return;
    
    if (this.soundSettingsUI.style.display === 'none') {
      this.soundSettingsUI.style.display = 'block';
    } else {
      this.soundSettingsUI.style.display = 'none';
    }
  }

  // Clean up resources
  destroy() {
    // Stop all sounds
    this.stopMusic();
    
    // Stop all active sound effects
    for (const sourceId in this.audioSources) {
      const source = this.audioSources[sourceId];
      if (source) {
        source.stop();
        source.disconnect();
      }
    }
    
    if (this.beatTimeout) {
      clearTimeout(this.beatTimeout);
    }

    // Clear intervals
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
    }
    
    if (this.subdivisionInterval) {
      clearInterval(this.subdivisionInterval);
    }
    
    // Remove UI elements
    if (this.soundSettingsUI) {
      document.body.removeChild(this.soundSettingsUI);
    }
    
    const soundButton = document.getElementById('sound-button');
    if (soundButton) {
      document.body.removeChild(soundButton);
    }
    
    // Reset state
    this.initialized = false;
    this.soundBuffers = {};
    this.audioSources = {};
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

export default AudioSystem;