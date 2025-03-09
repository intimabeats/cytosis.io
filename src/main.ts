// [v1.0-Part4] Main entry point
// #=== 95% ===#

import './style.css';
import { Game } from './game';

// Initialize the game when the window loads
window.addEventListener('load', () => {
  // Set debug mode to false by default
  (window as any).debugMode = false;
  
  // Create and start the game
  const game = new Game();
  game.start();
  
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
});
