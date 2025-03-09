// src/main.ts
import './style.css';
import { Game } from './game';

// Initialize the game when the window loads
window.addEventListener('load', () => {
  // Set debug mode to false by default
  (window as any).debugMode = false;
  
  // Create and start the game
  const game = new Game();
  
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
  
  // Add custom name input before starting
  const playerName = prompt("Enter your name:", "Player" + Math.floor(Math.random() * 1000));
  if (playerName) {
    game.playerName = playerName;
  }
  
  // Start the game after name input
  game.start();
  
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
