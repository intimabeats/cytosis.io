// src/main.ts
import './style.css';
import { Game } from './game';
import { randomColor } from './utils';

// Background animation for welcome screen
function setupBackgroundAnimation() {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  
  const backgroundCanvas = document.getElementById('background-canvas');
  if (backgroundCanvas) {
    backgroundCanvas.appendChild(canvas);
  }
  
  const cells: {
    x: number;
    y: number;
    radius: number;
    color: string;
    vx: number;
    vy: number;
  }[] = [];
  
  // Create random cells
  for (let i = 0; i < 50; i++) {
    cells.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 5 + Math.random() * 30,
      color: randomColor(),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5
    });
  }
  
  function animate() {
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw cells
    for (const cell of cells) {
      cell.x += cell.vx;
      cell.y += cell.vy;
      
      // Bounce off walls
      if (cell.x < 0 || cell.x > canvas.width) cell.vx *= -1;
      if (cell.y < 0 || cell.y > canvas.height) cell.vy *= -1;
      
      // Draw cell
      ctx.beginPath();
      ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
      ctx.fillStyle = cell.color;
      ctx.fill();
    }
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

// Initialize the game when the window loads
window.addEventListener('load', () => {
  // Set debug mode to false by default
  (window as any).debugMode = false;
  
  // Setup welcome screen background
  setupBackgroundAnimation();
  
  // Create the game instance
  const game = new Game();
  
  // Setup color picker
  const colorPicker = document.getElementById('color-picker');
  let selectedColor = '#ff4655'; // Default color
  
  if (colorPicker) {
    const colorOptions = colorPicker.querySelectorAll('.color-option');
    
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Remove selected class from all options
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        
        // Add selected class to clicked option
        option.classList.add('selected');
        
        // Get selected color
        selectedColor = option.getAttribute('data-color') || '#ff4655';
      });
    });
  }
  
  // Setup play button
  const playButton = document.getElementById('play-button');
  const welcomeScreen = document.getElementById('welcome-screen');
  const playerNameInput = document.getElementById('player-name') as HTMLInputElement;
  
  if (playButton && welcomeScreen && playerNameInput) {
    playButton.addEventListener('click', () => {
      // Get player name (use default if empty)
      let playerName = playerNameInput.value.trim();
      if (!playerName) {
        playerName = "Player" + Math.floor(Math.random() * 1000);
      }
      
      // Set player name and color
      game.playerName = playerName;
      game.playerColor = selectedColor;
      
      // Hide welcome screen
      welcomeScreen.style.display = 'none';
      
      // Start the game
      game.start();
    });
  }
  
  // Add event listener for restart button
  const restartButton = document.getElementById('restart-button');
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      // Hide game over screen
      const gameOverScreen = document.getElementById('game-over');
      if (gameOverScreen) {
        gameOverScreen.style.display = 'none';
      }
      
      // Restart the game
      game.restart();
    });
  }
  
  // Add debug mode toggle (press D key)
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd') {
      (window as any).debugMode = !(window as any).debugMode;
      console.log("Debug mode:", (window as any).debugMode);
    }
  });
  
  // Add resize handler
  window.addEventListener('resize', () => {
    game.handleResize();
  });
  
  // Add touch controls for mobile
  setupTouchControls(game);
});

// Setup touch controls for mobile devices
function setupTouchControls(game: Game): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  
  // Double tap for split
  let lastTapTime = 0;
  canvas.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    
    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected
      window.dispatchEvent(new CustomEvent('player-split'));
      e.preventDefault();
    }
    
    lastTapTime = currentTime;
  });
  
  // Long press for eject
  let touchTimeout: number | null = null;
  
  canvas.addEventListener('touchstart', (e) => {
    if (touchTimeout === null) {
      touchTimeout = window.setTimeout(() => {
        // Long press detected
        window.dispatchEvent(new CustomEvent('player-eject'));
        touchTimeout = null;
      }, 500);
    }
  });
  
  canvas.addEventListener('touchend', () => {
    if (touchTimeout !== null) {
      clearTimeout(touchTimeout);
      touchTimeout = null;
    }
  });
  
  canvas.addEventListener('touchmove', () => {
    if (touchTimeout !== null) {
      clearTimeout(touchTimeout);
      touchTimeout = null;
    }
  });
}
