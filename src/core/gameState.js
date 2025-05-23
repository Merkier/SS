// gameState.js - Manages game state transitions and pause functionality

class GameStateManager {
    constructor() {
      this.states = {
        MENU: 'menu',           // Main menu
        CHARACTER_SELECT: 'characterSelect',  // Character selection screen
        PLAYING: 'playing',     // Normal gameplay
        PAUSED: 'paused',       // Game paused
        MESSAGE: 'message',     // Displaying a message (game paused)
        UPGRADE: 'upgrade',     // Selecting upgrades (game paused)
        BOSS_WARNING: 'bossWarning',  // Boss warning message (game paused)
        GAME_OVER: 'gameOver'   // Game over screen
      };
      
      this.currentState = this.states.MENU;
      this.previousState = null;
      this.messageQueue = [];   // Queue of messages to display
      this.messageData = null;  // Data for current message
      this.messageTimer = 0;    // Auto-dismiss timer for current message
      this.pauseListeners = []; // Callbacks for pause state changes
    }
  
    // Change to a new state
    changeState(newState) {
      this.previousState = this.currentState;
      this.currentState = newState;
      
      // Notify listeners about state change
      this.notifyListeners();
      
      console.log(`Game state changed: ${this.previousState} -> ${this.currentState}`);
      return this.currentState;
    }
  
    // Add a message to the queue
    queueMessage(messageType, messageContent, autoDismissTime = 0, callback = null) {
      this.messageQueue.push({
        type: messageType,
        content: messageContent,
        autoDismissTime: autoDismissTime,
        callback: callback
      });
      
      // If we're not already showing a message, show this one
      if (this.currentState !== this.states.MESSAGE) {
        this.showNextMessage();
      }
    }
  
    // Show the next message in the queue
    showNextMessage() {
      if (this.messageQueue.length > 0) {
        // Get the next message
        this.messageData = this.messageQueue.shift();
        
        // Pause the game and show the message
        this.previousState = this.currentState;
        this.currentState = this.states.MESSAGE;
        this.notifyListeners();
        
        // Set auto-dismiss timer if specified
        if (this.messageData.autoDismissTime > 0) {
          this.messageTimer = this.messageData.autoDismissTime;
        } else {
          this.messageTimer = 0;
        }
        
        console.log(`Showing message: ${this.messageData.type}`);
        return true;
      }
      return false;
    }
  
    // Dismiss current message
    dismissMessage() {
      // Execute callback if exists
      if (this.messageData && this.messageData.callback) {
        this.messageData.callback();
      }
      
      // Clear message data
      this.messageData = null;
      
      // Check if there are more messages
      if (this.messageQueue.length > 0) {
        // Show next message
        this.showNextMessage();
      } else {
        // Return to previous state
        this.currentState = this.previousState;
        this.notifyListeners();
      }
    }
  
    // Update message timer
    updateMessageTimer(deltaTime) {
      if (this.currentState === this.states.MESSAGE && this.messageTimer > 0) {
        this.messageTimer -= deltaTime;
        
        if (this.messageTimer <= 0) {
          this.dismissMessage();
        }
      }
    }
  
    // Check if game is currently paused
    isPaused() {
      return this.currentState === this.states.PAUSED || 
             this.currentState === this.states.MESSAGE ||
             this.currentState === this.states.UPGRADE ||
             this.currentState === this.states.BOSS_WARNING;
    }
  
    // Add a pause state change listener
    addPauseListener(callback) {
      this.pauseListeners.push(callback);
    }
  
    // Notify all listeners
    notifyListeners() {
      const isPaused = this.isPaused();
      for (const listener of this.pauseListeners) {
        listener(isPaused);
      }
    }
  
    // Manual pause/unpause
    togglePause() {
      if (this.currentState === this.states.PAUSED) {
        this.currentState = this.previousState;
      } else if (this.currentState === this.states.PLAYING) {
        this.previousState = this.currentState;
        this.currentState = this.states.PAUSED;
      }
      this.notifyListeners();
    }
  }
  
  export default GameStateManager;