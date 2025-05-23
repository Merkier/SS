// camera.js - Handles camera positioning and world transform

class Camera {
    constructor(gameWidth, gameHeight) {
      this.x = 0;
      this.y = 0;
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.centerX = gameWidth / 2;
      this.centerY = gameHeight / 2;
    }
  
    // Update camera position to follow target (usually player)
    follow(target) {
      // Camera position is the negative of player position
      // This creates the illusion of player staying in center
      this.x = this.centerX - target.x;
      this.y = this.centerY - target.y;
    }
  
    // Apply camera transform to entity coordinates
    applyToEntity(entity) {
      return {
        x: entity.x + this.x,
        y: entity.y + this.y,
        size: entity.size // Size remains unchanged
      };
    }
  
    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
      return {
        x: screenX - this.x,
        y: screenY - this.y
      };
    }
  
    // Convert world coordinates to screen coordinates
    worldToScreen(worldX, worldY) {
      return {
        x: worldX + this.x,
        y: worldY + this.y
      };
    }
  
    // Check if an entity is visible on screen
    isVisible(entity) {
      const screenPos = this.worldToScreen(entity.x, entity.y);
      return (
        screenPos.x + entity.size > 0 &&
        screenPos.x - entity.size < this.gameWidth &&
        screenPos.y + entity.size > 0 &&
        screenPos.y - entity.size < this.gameHeight
      );
    }
  }
  
  export default Camera;