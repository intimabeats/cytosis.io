// [v1.0-Part3] Renderer implementation
// #=== 90% ===#

import { Camera, GameState, PowerUpType } from './types';

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  camera: Camera;
  gridSize: number;
  gridColor: string;
  backgroundColor: string;
  lastFrameTime: number;
  fps: number;
  
  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.camera = camera;
    this.gridSize = 50;
    this.gridColor = 'rgba(200, 200, 200, 0.2)';
    this.backgroundColor = '#f0f0f0';
    this.lastFrameTime = performance.now();
    this.fps = 60;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize(): void {
    // Set canvas size to match window
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // Update camera dimensions
    if ('resize' in this.camera) {
      (this.camera as any).resize(this.canvas.width, this.canvas.height);
    }
  }
  
  render(gameState: GameState): void {
    try {
      // Calculate FPS
      const now = performance.now();
      const deltaTime = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.fps = Math.round(1000 / deltaTime);
      
      const ctx = this.ctx;
      
      // Clear canvas
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Draw grid
      this.drawGrid();
      
      // Draw world border
      this.drawWorldBorder(gameState.worldSize);
      
      // Draw game elements in order (background to foreground)
      
      // 1. Draw food
      for (const food of gameState.food) {
        try {
          food.render(ctx, this.camera);
        } catch (error) {
          console.error("Error rendering food:", error);
        }
      }
      
      // 2. Draw viruses
      for (const virus of gameState.viruses) {
        try {
          virus.render(ctx, this.camera);
        } catch (error) {
          console.error("Error rendering virus:", error);
        }
      }
      
      // 3. Draw power-ups
      for (const powerUp of gameState.powerUps) {
        try {
          powerUp.render(ctx, this.camera);
        } catch (error) {
          console.error("Error rendering power-up:", error);
        }
      }
      
      // 4. Draw players (AI first, then human player on top)
      const players = Array.from(gameState.players.values());
      const aiPlayers = players.filter(p => p.isAI);
      const humanPlayers = players.filter(p => !p.isAI);
      
      // Render AI players first
      for (const player of aiPlayers) {
        try {
          // Skip invisible players
          if (player.hasEffect(PowerUpType.INVISIBILITY)) continue;
          player.render(ctx, this.camera);
        } catch (error) {
          console.error("Error rendering AI player:", error);
        }
      }
      
      // Render human players on top
      for (const player of humanPlayers) {
        try {
          player.render(ctx, this.camera);
        } catch (error) {
          console.error("Error rendering human player:", error);
        }
      }
      
      // 5. Draw particles on top
      for (const particle of gameState.particles) {
        try {
          particle.render(ctx, this.camera);
        } catch (error) {
          console.error("Error rendering particle:", error);
        }
      }
      
      // Update leaderboard
      this.updateLeaderboard(gameState.leaderboard);
      
      // Draw FPS counter (if in debug mode)
      if ((window as any).debugMode) {
        this.drawFPS();
      }
    } catch (error) {
      console.error("Error in renderer:", error);
    }
  }
  
  private drawGrid(): void {
    const ctx = this.ctx;
    const camera = this.camera;
    
    // Calculate grid boundaries based on camera view
    const topLeft = camera.screenToWorld({ x: 0, y: 0 });
    const bottomRight = camera.screenToWorld({ x: this.canvas.width, y: this.canvas.height });
    
    const startX = Math.floor(topLeft.x / this.gridSize) * this.gridSize;
    const startY = Math.floor(topLeft.y / this.gridSize) * this.gridSize;
    const endX = Math.ceil(bottomRight.x / this.gridSize) * this.gridSize;
    const endY = Math.ceil(bottomRight.y / this.gridSize) * this.gridSize;
    
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let x = startX; x <= endX; x += this.gridSize) {
      const screenX = camera.worldToScreen({ x, y: 0 }).x;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, this.canvas.height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = startY; y <= endY; y += this.gridSize) {
      const screenY = camera.worldToScreen({ x: 0, y }).y;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(this.canvas.width, screenY);
      ctx.stroke();
    }
  }
  
  private drawWorldBorder(worldSize: { x: number, y: number }): void {
    const ctx = this.ctx;
    const camera = this.camera;
    
    // Convert world coordinates to screen coordinates
    const topLeft = camera.worldToScreen({ x: 0, y: 0 });
    const bottomRight = camera.worldToScreen({ x: worldSize.x, y: worldSize.y });
    
    // Draw border
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    ctx.stroke();
  }
  
  private updateLeaderboard(leaderboard: { id: string, name: string, score: number }[]): void {
    const leaderboardElement = document.getElementById('leaderboard-content');
    if (!leaderboardElement) return;
    
    // Clear current leaderboard
    leaderboardElement.innerHTML = '';
    
    // Add each player to the leaderboard
    leaderboard.forEach((entry, index) => {
      const entryElement = document.createElement('div');
      entryElement.textContent = `${index + 1}. ${entry.name}: ${entry.score}`;
      leaderboardElement.appendChild(entryElement);
    });
  }
  
  private drawFPS(): void {
    const ctx = this.ctx;
    
    ctx.font = '14px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(`FPS: ${this.fps}`, 10, 20);
  }
}
