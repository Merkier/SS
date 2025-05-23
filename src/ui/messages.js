// messages.js - Handles display of in-game messages

class MessageSystem {
    constructor(gameStateManager) {
      this.gameStateManager = gameStateManager;
      this.messageElement = null;
      this.overlayElement = null;
      this.initialized = false;
    }
  
    // Initialize message UI elements
    initialize() {
      if (this.initialized) return;
      
      // Create overlay for dimming the game
      this.overlayElement = document.createElement('div');
      this.overlayElement.id = 'message-overlay';
      this.overlayElement.style.position = 'absolute';
      this.overlayElement.style.top = '0';
      this.overlayElement.style.left = '0';
      this.overlayElement.style.width = '100%';
      this.overlayElement.style.height = '100%';
      this.overlayElement.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      this.overlayElement.style.zIndex = '900';
      this.overlayElement.style.display = 'none';
      document.body.appendChild(this.overlayElement);
      
      // Create message container
      this.messageElement = document.createElement('div');
      this.messageElement.id = 'message-container';
      this.messageElement.style.position = 'absolute';
      this.messageElement.style.top = '50%';
      this.messageElement.style.left = '50%';
      this.messageElement.style.transform = 'translate(-50%, -50%)';
      this.messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      this.messageElement.style.color = 'white';
      this.messageElement.style.padding = '20px';
      this.messageElement.style.borderRadius = '10px';
      this.messageElement.style.maxWidth = '80%';
      this.messageElement.style.textAlign = 'center';
      this.messageElement.style.zIndex = '1000';
      this.messageElement.style.display = 'none';
      this.messageElement.style.boxShadow = '0 0 20px rgba(128, 128, 255, 0.5)';
      document.body.appendChild(this.messageElement);
      
      // Add click event to dismiss message
      this.overlayElement.addEventListener('click', () => {
        if (this.gameStateManager.currentState === this.gameStateManager.states.MESSAGE) {
          // Only auto-dismiss if not set to auto-dismiss
          if (this.gameStateManager.messageTimer <= 0) {
            this.gameStateManager.dismissMessage();
          }
        }
      });
      
      this.initialized = true;
    }
  
    // Update message display based on game state
    update() {
      if (!this.initialized) this.initialize();
      
      if (this.gameStateManager.currentState === this.gameStateManager.states.MESSAGE) {
        this.showCurrentMessage();
      } else {
        this.hideMessage();
      }
    }
  
    // Display the current message
    showCurrentMessage() {
      const messageData = this.gameStateManager.messageData;
      if (!messageData) return;
      
      // Show overlay
      this.overlayElement.style.display = 'block';
      
      // Customize message appearance based on type
      let backgroundColor, borderColor, fontSize, fontColor;
      
      switch (messageData.type) {
        case 'levelUp':
          backgroundColor = 'rgba(0, 100, 0, 0.9)';
          borderColor = '#00ff00';
          fontSize = '24px';
          fontColor = '#ffffff';
          break;
        case 'bossWarning':
          backgroundColor = 'rgba(100, 0, 0, 0.9)';
          borderColor = '#ff0000';
          fontSize = '28px';
          fontColor = '#ff5555';
          break;
        case 'upgrade':
          backgroundColor = 'rgba(70, 0, 100, 0.9)';
          borderColor = '#aa88ff';
          fontSize = '22px';
          fontColor = '#ddbbff';
          break;
        case 'requiem':
          backgroundColor = 'rgba(100, 50, 0, 0.9)';
          borderColor = '#ffaa00';
          fontSize = '26px';
          fontColor = '#ffcc00';
          break;
        case 'info':
        default:
          backgroundColor = 'rgba(0, 0, 60, 0.9)';
          borderColor = '#4488ff';
          fontSize = '20px';
          fontColor = '#ffffff';
          break;
      }
      
      // Apply styles
      this.messageElement.style.backgroundColor = backgroundColor;
      this.messageElement.style.border = `2px solid ${borderColor}`;
      this.messageElement.style.fontSize = fontSize;
      this.messageElement.style.color = fontColor;
      
      // Set content
      this.messageElement.innerHTML = messageData.content;
      
      // Add dismiss button if not auto-dismiss
      if (this.gameStateManager.messageTimer <= 0) {
        const dismissButton = document.createElement('button');
        dismissButton.innerHTML = 'Continue';
        dismissButton.style.marginTop = '20px';
        dismissButton.style.padding = '10px 20px';
        dismissButton.style.backgroundColor = borderColor;
        dismissButton.style.color = '#000000';
        dismissButton.style.border = 'none';
        dismissButton.style.borderRadius = '5px';
        dismissButton.style.cursor = 'pointer';
        dismissButton.style.fontSize = '16px';
        dismissButton.style.fontWeight = 'bold';
        
        dismissButton.addEventListener('click', () => {
          this.gameStateManager.dismissMessage();
        });
        
        this.messageElement.appendChild(document.createElement('br'));
        this.messageElement.appendChild(dismissButton);
      }
      
      // Show message
      this.messageElement.style.display = 'block';
      
      // Add animation effect
      this.messageElement.style.animation = 'messageAppear 0.3s ease-out';
      this.messageElement.style.opacity = '0';
      setTimeout(() => {
        this.messageElement.style.opacity = '1';
      }, 10);
    }
  
    // Hide the message
    hideMessage() {
      this.overlayElement.style.display = 'none';
      this.messageElement.style.display = 'none';
    }
  
    // Create various message types
    showLevelUp(level) {
      this.gameStateManager.queueMessage(
        'levelUp',
        `<h2>Level Up!</h2>
         <p>You've reached level ${level}</p>
         <p>Choose an upgrade to continue</p>`,
        0,  // No auto-dismiss
        null // No callback
      );
    }
  
    showBossWarning(bossName, description) {
      this.gameStateManager.queueMessage(
        'bossWarning',
        `<h2>WARNING!</h2>
         <h3>REQUIEM BOSS APPROACHING</h3>
         <div style="font-size: 32px; margin: 10px 0;">${bossName}</div>
         <p>${description}</p>`,
        4000,  // Auto-dismiss after 4 seconds
        null   // No callback
      );
    }
  
    showRequiemAttack(attackName) {
      this.gameStateManager.queueMessage(
        'requiem',
        `<h2>REQUIEM ACTIVATED</h2>
         <div style="font-size: 28px; margin: 10px 0;">${attackName}</div>`,
        2500,  // Auto-dismiss after 2.5 seconds
        null   // No callback
      );
    }
  
    showBossDefeated(bossName, famePoints) {
      this.gameStateManager.queueMessage(
        'info',
        `<h2>REQUIEM BOSS DEFEATED!</h2>
         <div style="font-size: 24px; margin: 10px 0;">${bossName}</div>
         <p>+${famePoints} Fame Points</p>`,
        3000,  // Auto-dismiss after 3 seconds
        null   // No callback
      );
    }
  
    showRewardText(text, color) {
      // This is a non-pausing effect
      const rewardText = document.createElement('div');
      rewardText.style.position = 'absolute';
      rewardText.style.top = '50%';
      rewardText.style.left = '50%';
      rewardText.style.transform = 'translate(-50%, -50%)';
      rewardText.style.color = color;
      rewardText.style.fontSize = '24px';
      rewardText.style.fontWeight = 'bold';
      rewardText.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.7)';
      rewardText.style.zIndex = '1000';
      rewardText.textContent = text;
      document.body.appendChild(rewardText);
  
      // Animate and remove
      let opacity = 1;
      let size = 24;
      let yOffset = 0;
      
      const animateText = () => {
        opacity -= 0.02;
        size += 0.5;
        yOffset -= 1;
        
        rewardText.style.opacity = opacity;
        rewardText.style.fontSize = `${size}px`;
        rewardText.style.transform = `translate(-50%, calc(-50% + ${yOffset}px))`;
        
        if (opacity > 0) {
          requestAnimationFrame(animateText);
        } else {
          document.body.removeChild(rewardText);
        }
      };
      
      requestAnimationFrame(animateText);
    }
  
    // Add CSS styles to document
    addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes messageAppear {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        
        #message-container {
          transition: opacity 0.3s ease;
        }
        
        #message-container button:hover {
          filter: brightness(1.2);
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  export default MessageSystem;