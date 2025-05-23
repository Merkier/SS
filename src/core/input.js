// input.js - Handles player input from joystick, touch, and keyboard

class InputManager {
    constructor(gameStateManager) {
      this.gameStateManager = gameStateManager;
      
      // Input state
      this.joystick = {
        active: false,
        baseX: 0,
        baseY: 0,
        stickX: 0,
        stickY: 0,
        deltaX: 0,
        deltaY: 0
      };
      
      this.keyboard = {
        up: false,
        down: false,
        left: false,
        right: false,
        space: false
      };
      
      // Movement values derived from input
      this.movementX = 0;
      this.movementY = 0;
      
      // Bind methods
      this.handleJoystickStart = this.handleJoystickStart.bind(this);
      this.handleJoystickMove = this.handleJoystickMove.bind(this);
      this.handleJoystickEnd = this.handleJoystickEnd.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleKeyUp = this.handleKeyUp.bind(this);
      
      // Track if initialized
      this.initialized = false;
    }
  
    // Initialize input handlers
    initialize() {
      if (this.initialized) return;
      
      // Create joystick UI
      this.createJoystickUI();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      console.log('Input system initialized');
    }
  
    // Create virtual joystick for mobile
    createJoystickUI() {
      const joystickArea = document.createElement('div');
      joystickArea.id = 'joystick-area';
      joystickArea.style.position = 'absolute';
      joystickArea.style.bottom = '20px';
      joystickArea.style.left = '20px';
      joystickArea.style.width = '120px';
      joystickArea.style.height = '120px';
      joystickArea.style.borderRadius = '60px';
      joystickArea.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      joystickArea.style.touchAction = 'none';
      joystickArea.style.zIndex = '500';
      
      const joystickStick = document.createElement('div');
      joystickStick.id = 'joystick';
      joystickStick.style.position = 'absolute';
      joystickStick.style.top = '50%';
      joystickStick.style.left = '50%';
      joystickStick.style.width = '50px';
      joystickStick.style.height = '50px';
      joystickStick.style.borderRadius = '25px';
      joystickStick.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
      joystickStick.style.transform = 'translate(-50%, -50%)';
      joystickStick.style.touchAction = 'none';
      
      joystickArea.appendChild(joystickStick);
      document.body.appendChild(joystickArea);
      
      // Store joystick elements
      this.joystickArea = joystickArea;
      this.joystickStick = joystickStick;
      
      // Set initial base position
      const rect = joystickArea.getBoundingClientRect();
      this.joystick.baseX = rect.left + rect.width / 2;
      this.joystick.baseY = rect.top + rect.height / 2;
      this.joystick.stickX = this.joystick.baseX;
      this.joystick.stickY = this.joystick.baseY;
    }
  
    // Setup all event listeners
    setupEventListeners() {
      // Touch events for joystick
      this.joystickArea.addEventListener('touchstart', this.handleJoystickStart);
      this.joystickArea.addEventListener('touchmove', this.handleJoystickMove);
      this.joystickArea.addEventListener('touchend', this.handleJoystickEnd);
      
      // Mouse events for joystick (for testing on desktop)
      this.joystickArea.addEventListener('mousedown', this.handleJoystickStart);
      document.addEventListener('mousemove', this.handleJoystickMove);
      document.addEventListener('mouseup', this.handleJoystickEnd);
      
      // Keyboard controls
      document.addEventListener('keydown', this.handleKeyDown);
      document.addEventListener('keyup', this.handleKeyUp);
      
      // Resize listener to update joystick position
      window.addEventListener('resize', () => {
        const rect = this.joystickArea.getBoundingClientRect();
        this.joystick.baseX = rect.left + rect.width / 2;
        this.joystick.baseY = rect.top + rect.height / 2;
      });
    }
  
    // Update input state
    update() {
      // Combine joystick and keyboard input
      this.updateMovementValues();
    }
  
    // Get current movement delta
    getMovement() {
      return {
        x: this.movementX,
        y: this.movementY
      };
    }
  
    // Update movement values from all inputs
    updateMovementValues() {
      let dx = 0;
      let dy = 0;
      
      // Get joystick input
      if (this.joystick.active) {
        dx = this.joystick.deltaX;
        dy = this.joystick.deltaY;
      }
      
      // Get keyboard input
      if (this.keyboard.right) dx = 1;
      if (this.keyboard.left) dx = -1;
      if (this.keyboard.down) dy = 1;
      if (this.keyboard.up) dy = -1;
      
      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
      }
      
      this.movementX = dx;
      this.movementY = dy;
    }
  
    // Joystick Event Handlers
    handleJoystickStart(e) {
      // Skip if game is paused
      if (this.gameStateManager.isPaused()) return;
      
      e.preventDefault();
      this.joystick.active = true;
      this.updateJoystickPosition(e);
    }
  
    handleJoystickMove(e) {
      // Skip if joystick is not active
      if (!this.joystick.active) return;
      
      e.preventDefault();
      this.updateJoystickPosition(e);
    }
  
    handleJoystickEnd(e) {
      e.preventDefault();
      this.joystick.active = false;
      this.joystick.deltaX = 0;
      this.joystick.deltaY = 0;
      
      // Reset joystick position
      this.joystickStick.style.transform = `translate(-50%, -50%)`;
    }
  
    updateJoystickPosition(e) {
      let clientX, clientY;
      
      // Handle both touch and mouse events
      if (e.type.startsWith('touch') && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      // Calculate joystick delta
      const rect = this.joystickArea.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate delta from center
      let deltaX = clientX - centerX;
      let deltaY = clientY - centerY;
      
      // Limit joystick movement to the area radius
      const radius = rect.width / 2;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > radius) {
        deltaX = deltaX * radius / distance;
        deltaY = deltaY * radius / distance;
      }
      
      // Update joystick element position
      this.joystickStick.style.transform = `translate(calc(${deltaX}px - 50%), calc(${deltaY}px - 50%))`;
      
      // Normalize for player movement (value between -1 and 1)
      this.joystick.deltaX = deltaX / radius;
      this.joystick.deltaY = deltaY / radius;
    }
  
    // Keyboard Event Handlers
    handleKeyDown(e) {
      // Skip if game is paused
      if (this.gameStateManager.isPaused()) return;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          this.keyboard.up = true;
          break;
        case 'ArrowDown':
        case 's':
          this.keyboard.down = true;
          break;
        case 'ArrowLeft':
        case 'a':
          this.keyboard.left = true;
          break;
        case 'ArrowRight':
        case 'd':
          this.keyboard.right = true;
          break;
        case ' ':
          this.keyboard.space = true;
          break;
        case 'Escape':
          // Toggle pause
          this.gameStateManager.togglePause();
          break;
          case 'b':
          // Debug boss system
          if (window.game) window.game.debugBossSystem();
          break;
        case 'n':
          // Force spawn boss
          if (window.game) window.game.forceSpawnBoss();
          break;
      }
    }
  
    handleKeyUp(e) {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          this.keyboard.up = false;
          break;
        case 'ArrowDown':
        case 's':
          this.keyboard.down = false;
          break;
        case 'ArrowLeft':
        case 'a':
          this.keyboard.left = false;
          break;
        case 'ArrowRight':
        case 'd':
          this.keyboard.right = false;
          break;
        case ' ':
          this.keyboard.space = false;
          break;
      }
    }
  }
  
  export default InputManager;