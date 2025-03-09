// src/renderer.ts
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
  showMinimap: boolean;
  minimapSize: number;
  minimapOpacity: number;
  backgroundPattern: CanvasPattern | null;
  
  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.camera = camera;
    this.gridSize = 50;
    this.gridColor = 'rgba(200, 200, 200, 0.2)';
    this.backgroundColor = '#f0f0f0';
    this.lastFrameTime = performance.now();
    this.fps = 60;
    
    // Minimap settings
    this.showMinimap = true;
    this.minimapSize = 150;
    this.minimapOpacity = 0.7;
    
    // Background pattern
    this.backgroundPattern = null;
    this.createBackgroundPattern();
    
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
    
    // Recreate background pattern after resize
    this.createBackgroundPattern();
  }
  
  createBackgroundPattern(): void {
    try {
      // Create a small canvas for the pattern
      const patternCanvas = document.createElement('canvas');
      const patternCtx = patternCanvas.getContext('2d');
      
      if (!patternCtx) return;
      
      // Set pattern size
      patternCanvas.width = 100;
      patternCanvas.height = 100;
      
      // Fill with background color
      patternCtx.fillStyle = this.backgroundColor;
      patternCtx.fillRect(0, 0, 100, 100);
      
      // Add subtle texture
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 2 + 1;
        
        patternCtx.fillStyle = 'rgba(0, 0, 0, 0.03)';
        patternCtx.beginPath();
        patternCtx.arc(x, y, size, 0, Math.PI * 2);
        patternCtx.fill();
      }
      
      // Create pattern
      this.backgroundPattern = this.ctx.createPattern(patternCanvas, 'repeat');
    } catch (error) {
      console.error("Error creating background pattern:", error);
      this.backgroundPattern = null;
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
      ctx.fillStyle = this.backgroundPattern || this.backgroundColor;
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
      
      // Draw minimap
      if (this.showMinimap) {
        this.drawMinimap(gameState);
      }
      
      // Update leaderboard
      this.updateLeaderboard(gameState.leaderboard);
      
      // Draw FPS counter (if in debug mode)
      if ((window as any).debugMode) {
        this.drawFPS();
      }
      
      // Draw visual indicators for game events
      this.drawGameEvents();
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
    
    // Add danger zone near borders
    const dangerZoneSize = 100 * camera.scale;
    
    // Top danger zone
    const gradient1 = ctx.createLinearGradient(0, topLeft.y, 0, topLeft.y + dangerZoneSize);
    gradient1.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradient1.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = gradient1;
    ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, dangerZoneSize);
    
    // Bottom danger zone
    const gradient2 = ctx.createLinearGradient(0, bottomRight.y - dangerZoneSize, 0, bottomRight.y);
    gradient2.addColorStop(0, 'rgba(255, 0, 0, 0)');
    gradient2.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
    ctx.fillStyle = gradient2;
    ctx.fillRect(topLeft.x, bottomRight.y - dangerZoneSize, bottomRight.x - topLeft.x, dangerZoneSize);
    
    // Left danger zone
    const gradient3 = ctx.createLinearGradient(topLeft.x, 0, topLeft.x + dangerZoneSize, 0);
    gradient3.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradient3.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = gradient3;
    ctx.fillRect(topLeft.x, topLeft.y, dangerZoneSize, bottomRight.y - topLeft.y);
    
    // Right danger zone
    const gradient4 = ctx.createLinearGradient(bottomRight.x - dangerZoneSize, 0, bottomRight.x, 0);
    gradient4.addColorStop(0, 'rgba(255, 0, 0, 0)');
    gradient4.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
    ctx.fillStyle = gradient4;
    ctx.fillRect(bottomRight.x - dangerZoneSize, topLeft.y, dangerZoneSize, bottomRight.y - topLeft.y);
  }
  
  private drawMinimap(gameState: GameState): void {
    const ctx = this.ctx;
    const worldSize = gameState.worldSize;
    
    // Calculate minimap position and size
    const padding = 10;
    const size = this.minimapSize;
    const x = this.canvas.width - size - padding;
    const y = this.canvas.height - size - padding;
    
    // Draw minimap background
    ctx.fillStyle = `rgba(0, 0, 0, ${this.minimapOpacity})`;
    ctx.fillRect(x, y, size, size);
    
    // Draw minimap border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
    
    // Calculate scale factor
    const scaleX = size / worldSize.x;
    const scaleY = size / worldSize.y;
    
    // Draw players on minimap
    const players = Array.from(gameState.players.values());
    
    for (const player of players) {
      // Skip invisible players (except human player)
      if (player.hasEffect(PowerUpType.INVISIBILITY) && player.isAI) continue;
      
      const pos = player.getAveragePosition();
      const minimapX = x + pos.x * scaleX;
      const minimapY = y + pos.y * scaleY;
      
      // Draw player dot
      ctx.beginPath();
      ctx.arc(minimapX, minimapY, player.isAI ? 3 : 5, 0, Math.PI * 2);
      ctx.fillStyle = player.isAI ? player.color : '#ffffff';
      ctx.fill();
      
      // Add outline for human player
      if (!player.isAI) {
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    
    // Draw viruses on minimap
    for (const virus of gameState.viruses) {
      const minimapX = x + virus.position.x * scaleX;
      const minimapY = y + virus.position.y * scaleY;
      
      ctx.beginPath();
      ctx.arc(minimapX, minimapY, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff00';
      ctx.fill();
    }
    
    // Draw power-ups on minimap
    for (const powerUp of gameState.powerUps) {
      const minimapX = x + powerUp.position.x * scaleX;
      const minimapY = y + powerUp.position.y * scaleY;
      
      ctx.beginPath();
      ctx.arc(minimapX, minimapY, 3, 0, Math.PI * 2);
      ctx.fillStyle = powerUp.color;
      ctx.fill();
    }
    
    // Draw camera view rectangle
    const cameraTopLeft = this.camera.screenToWorld({ x: 0, y: 0 });
    const cameraBottomRight = this.camera.screenToWorld({ x: this.canvas.width, y: this.canvas.height });
    
    const viewX = x + cameraTopLeft.x * scaleX;
    const viewY = y + cameraTopLeft.y * scaleY;
    const viewWidth = (cameraBottomRight.x - cameraTopLeft.x) * scaleX;
    const viewHeight = (cameraBottomRight.y - cameraTopLeft.y) * scaleY;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(viewX, viewY, viewWidth, viewHeight);
  }
  
  private updateLeaderboard(leaderboard: { id: string, name: string, score: number, isHuman?: boolean }[]): void {
    const leaderboardElement = document.getElementById('leaderboard-content');
    if (!leaderboardElement) return;
    
    // Clear current leaderboard
    leaderboardElement.innerHTML = '';
    
    // Add each player to the leaderboard
    leaderboard.forEach((entry, index) => {
      const entryElement = document.createElement('div');
      
      // Highlight human player
      if (entry.isHuman) {
        entryElement.style.color = '#ffff00'; // Yellow for human player
        entryElement.style.fontWeight = 'bold';
      }
      
      // Add medal emoji for top 3
      let prefix = '';
      if (index === 0) prefix = '🥇 ';
      else if (index === 1) prefix = '🥈 ';
      else if (index === 2) prefix = '🥉 ';
      
      entryElement.textContent = `${prefix}${index + 1}. ${entry.name}: ${entry.score}`;
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
  
  private drawGameEvents(): void {
    // This method will draw visual indicators for game events
    // like power-up collections, player eliminations, etc.
    // These will be added by event listeners
    
    // The actual implementation would depend on a queue of visual events
    // that would be added by the game and consumed by the renderer
  }
  
  // Method to add visual effects for game events
  addVisualEffect(type: string, data: any): void {
    // This would be called from event handlers to add visual effects
    // For example, when a player is eliminated, a text popup could be shown
    
    // Implementation would depend on a queue of visual effects
  }
}
