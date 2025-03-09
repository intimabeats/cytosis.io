// [v1.1] Main game logic with restart functionality
// #=== 100% ===#

import { GameCamera } from './camera';
import { Controls } from './controls';
import { Renderer } from './renderer';
import { GamePlayer } from './player';
import { GameFood } from './food';
import { GameVirus } from './virus';
import { GamePowerUp } from './powerup';
import { ParticleSystem, GameParticle } from './particles';
import { AIController } from './ai';
import { 
  GameState, 
  Player, 
  PowerUpType,
  Vector2D,
  Entity
} from './types';
import {
  randomPosition,
  randomColor,
  checkCollision,
  distance,
  radiusFromMass,
  massFromRadius
} from './utils';

export class Game {
  canvas: HTMLCanvasElement;
  camera: GameCamera;
  controls: Controls;
  renderer: Renderer;
  gameState: GameState;
  lastTime: number;
  running: boolean;
  playerName: string;
  humanPlayer: GamePlayer | null;
  aiControllers: Map<string, AIController>;
  particleSystem: ParticleSystem;
  debugMode: boolean;
  
  constructor() {
    // Initialize canvas
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    
    // Set up game components
    this.camera = new GameCamera(window.innerWidth, window.innerHeight);
    this.controls = new Controls(this.canvas, this.camera);
    this.renderer = new Renderer(this.canvas, this.camera);
    this.particleSystem = new ParticleSystem();
    
    // Initialize game state
    this.gameState = {
      players: new Map(),
      food: [],
      viruses: [],
      powerUps: [],
      particles: [],
      worldSize: { x: 5000, y: 5000 },
      leaderboard: []
    };
    
    this.lastTime = 0;
    this.running = false;
    this.playerName = "Player" + Math.floor(Math.random() * 1000);
    this.humanPlayer = null;
    this.aiControllers = new Map();
    this.debugMode = false;
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up debug mode (press D to toggle)
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'd') {
        this.debugMode = !this.debugMode;
        console.log("Debug mode:", this.debugMode);
      }
    });
  }
  
  start(): void {
    // Create human player
    const playerPos = {
      x: this.gameState.worldSize.x / 2,
      y: this.gameState.worldSize.y / 2
    };
    this.humanPlayer = new GamePlayer(this.playerName, playerPos);
    this.gameState.players.set(this.humanPlayer.id, this.humanPlayer);
    
    // Initialize game world
    this.initializeWorld();
    
    // Start game loop
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  restart(): void {
    // Clear existing game state
    this.gameState.players.clear();
    this.gameState.food = [];
    this.gameState.viruses = [];
    this.gameState.powerUps = [];
    this.gameState.particles = [];
    this.aiControllers.clear();
    
    // Create new human player
    const playerPos = {
      x: this.gameState.worldSize.x / 2,
      y: this.gameState.worldSize.y / 2
    };
    this.humanPlayer = new GamePlayer(this.playerName, playerPos);
    this.gameState.players.set(this.humanPlayer.id, this.humanPlayer);
    
    // Initialize game world
    this.initializeWorld();
    
    // Reset camera
    this.camera.position = { ...playerPos };
    this.camera.targetPosition = { ...playerPos };
    this.camera.scale = 1;
    this.camera.targetScale = 1;
    
    // Make sure game is running
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }
  
  showGameOver(): void {
    // Update final score
    const finalScoreElement = document.getElementById('final-score');
    if (finalScoreElement && this.humanPlayer) {
      finalScoreElement.textContent = this.humanPlayer.score.toString();
    }
    
    // Show game over screen
    const gameOverScreen = document.getElementById('game-over');
    if (gameOverScreen) {
      gameOverScreen.style.display = 'block';
    }
  }
  
  private gameLoop(timestamp: number): void {
    try {
      // Calculate delta time
      const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap at 100ms
      this.lastTime = timestamp;
      
      // Update game state
      this.update(deltaTime);
      
      // Render game
      this.renderer.render(this.gameState);
      
      // Continue game loop
      if (this.running) {
        requestAnimationFrame(this.gameLoop.bind(this));
      }
    } catch (error) {
      console.error("Error in game loop:", error);
      // Try to recover and continue
      this.lastTime = performance.now();
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }
  
  private update(deltaTime: number): void {
    // Update controls
    this.controls.update();
    
    // Update human player direction based on mouse position
    if (this.humanPlayer && this.humanPlayer.cells.length > 0) {
      const mousePos = this.controls.getMousePosition();
      this.humanPlayer.setTargetDirection(mousePos);
    }
    
    // Update all players
    this.gameState.players.forEach(player => {
      try {
        player.update(deltaTime);
      } catch (error) {
        console.error("Error updating player:", error);
      }
    });
    
    // Update AI controllers
    this.aiControllers.forEach(controller => {
      try {
        // Pass a filtered list of entities to avoid undefined issues
        const validEntities = this.getAllEntities().filter(entity => 
          entity && entity.position && 
          typeof entity.position.x === 'number' && 
          typeof entity.position.y === 'number'
        );
        controller.update(deltaTime, validEntities);
      } catch (error) {
        console.error("Error updating AI controller:", error);
      }
    });
    
    // Update food
    for (let i = 0; i < this.gameState.food.length; i++) {
      try {
        this.gameState.food[i].update(deltaTime);
      } catch (error) {
        console.error("Error updating food:", error);
        // Remove problematic food
        this.gameState.food.splice(i, 1);
        i--;
      }
    }
    
    // Update viruses
    for (let i = 0; i < this.gameState.viruses.length; i++) {
      try {
        this.gameState.viruses[i].update(deltaTime);
      } catch (error) {
        console.error("Error updating virus:", error);
        // Remove problematic virus
        this.gameState.viruses.splice(i, 1);
        i--;
      }
    }
    
    // Update power-ups
    for (let i = 0; i < this.gameState.powerUps.length; i++) {
      try {
        this.gameState.powerUps[i].update(deltaTime);
      } catch (error) {
        console.error("Error updating power-up:", error);
        // Remove problematic power-up
        this.gameState.powerUps.splice(i, 1);
        i--;
      }
    }
    
    // Update particles
    try {
      this.particleSystem.update(deltaTime);
      this.gameState.particles = this.particleSystem.particles;
    } catch (error) {
      console.error("Error updating particles:", error);
      // Clear particles in case of error
      this.particleSystem = new ParticleSystem();
      this.gameState.particles = [];
    }
    
    // Check collisions
    this.checkCollisions();
    
    // Update camera to follow human player
    if (this.humanPlayer && this.humanPlayer.cells.length > 0) {
      const playerPos = this.humanPlayer.getAveragePosition();
      const maxRadius = this.humanPlayer.getMaxRadius();
      this.camera.follow(playerPos, maxRadius);
    }
    
    // Update camera
    this.camera.update(deltaTime);
    
    // Spawn new food if needed
    this.spawnFood();
    
    // Spawn power-ups occasionally
    this.spawnPowerUps(deltaTime);
    
    // Update leaderboard
    this.updateLeaderboard();
    
    // Check if human player is dead
    if (this.humanPlayer && this.humanPlayer.cells.length === 0) {
      this.respawnPlayer();
    }
    
    // Keep entities within world bounds
    this.enforceWorldBounds();
    
    // Debug info
    if (this.debugMode) {
      this.showDebugInfo();
    }
  }
  
  private showDebugInfo(): void {
    console.log({
      players: this.gameState.players.size,
      food: this.gameState.food.length,
      viruses: this.gameState.viruses.length,
      powerUps: this.gameState.powerUps.length,
      particles: this.gameState.particles.length,
      fps: Math.round(1 / ((performance.now() - this.lastTime) / 1000))
    });
  }
  
  private initializeWorld(): void {
    // Spawn initial food
    for (let i = 0; i < 1000; i++) {
      this.spawnFoodItem();
    }
    
    // Spawn viruses
    for (let i = 0; i < 20; i++) {
      this.spawnVirus();
    }
    
    // Spawn AI players
    for (let i = 0; i < 10; i++) {
      this.spawnAI();
    }
  }
  
  private spawnFood(): void {
    // Maintain a minimum amount of food
    const minFood = 1000;
    const maxSpawnPerFrame = 5;
    
    if (this.gameState.food.length < minFood) {
      const spawnCount = Math.min(minFood - this.gameState.food.length, maxSpawnPerFrame);
      
      for (let i = 0; i < spawnCount; i++) {
        this.spawnFoodItem();
      }
    }
  }
  
  private spawnFoodItem(): void {
    try {
      const position = randomPosition(this.gameState.worldSize);
      const food = new GameFood(position);
      this.gameState.food.push(food);
    } catch (error) {
      console.error("Error spawning food:", error);
    }
  }
  
  private spawnVirus(): void {
    try {
      const position = randomPosition(this.gameState.worldSize);
      const virus = new GameVirus(position);
      this.gameState.viruses.push(virus);
    } catch (error) {
      console.error("Error spawning virus:", error);
    }
  }
  
  private spawnPowerUps(deltaTime: number): void {
    // Spawn power-ups occasionally
    if (Math.random() < 0.01 * deltaTime) {
      try {
        const position = randomPosition(this.gameState.worldSize);
        const type = Math.floor(Math.random() * 4) as PowerUpType; // 0-3 for different types
        const powerUp = new GamePowerUp(position, type);
        this.gameState.powerUps.push(powerUp);
      } catch (error) {
        console.error("Error spawning power-up:", error);
      }
    }
  }
  
  private spawnAI(): void {
    try {
      // Create AI player
      const position = randomPosition(this.gameState.worldSize);
      const aiName = "Bot" + Math.floor(Math.random() * 1000);
      const aiPlayer = new GamePlayer(aiName, position, true);
      
      // Add to game state
      this.gameState.players.set(aiPlayer.id, aiPlayer);
      
      // Create AI controller
      const aiController = new AIController(aiPlayer, this.gameState.worldSize);
      this.aiControllers.set(aiPlayer.id, aiController);
    } catch (error) {
      console.error("Error spawning AI:", error);
    }
  }
  
  private respawnPlayer(): void {
    if (!this.humanPlayer) return;
    
    // Show game over screen instead of immediately respawning
    this.showGameOver();
    
    // Keep the player in the game state but with no cells
    // This prevents errors but doesn't actually respawn the player
    // The player will be properly respawned when restart() is called
  }

	  private checkCollisions(): void {
    try {
      // Check player-food collisions
      this.checkPlayerFoodCollisions();
      
      // Check player-player collisions
      this.checkPlayerPlayerCollisions();
      
      // Check player-virus collisions
      this.checkPlayerVirusCollisions();
      
      // Check player-powerup collisions
      this.checkPlayerPowerUpCollisions();
    } catch (error) {
      console.error("Error checking collisions:", error);
    }
  }
  
  private checkPlayerFoodCollisions(): void {
    // For each player
    this.gameState.players.forEach(player => {
      // For each cell of the player
      for (const cell of player.cells) {
        // Check collision with each food item
        for (let i = this.gameState.food.length - 1; i >= 0; i--) {
          const food = this.gameState.food[i];
          
          if (checkCollision(cell, food)) {
            // Player eats food
            cell.mass += food.value;
            cell.radius = radiusFromMass(cell.mass);
            
            // Create particle effect
            this.particleSystem.createSplash(
              food.position,
              food.color,
              { x: cell.position.x - food.position.x, y: cell.position.y - food.position.y },
              5
            );
            
            // Remove food
            this.gameState.food.splice(i, 1);
          }
        }
      }
    });
  }
  
  private checkPlayerPlayerCollisions(): void {
    const players = Array.from(this.gameState.players.values());
    
    // Check each player against every other player
    for (let i = 0; i < players.length; i++) {
      const playerA = players[i];
      
      for (let j = i + 1; j < players.length; j++) {
        const playerB = players[j];
        
        // Skip if either player has a shield
        if (playerA.hasEffect(PowerUpType.SHIELD) && playerB.hasEffect(PowerUpType.SHIELD)) {
          continue;
        }
        
        // Check each cell of player A against each cell of player B
        for (let a = 0; a < playerA.cells.length; a++) {
          const cellA = playerA.cells[a];
          
          for (let b = 0; b < playerB.cells.length; b++) {
            const cellB = playerB.cells[b];
            
            // Check if cells are colliding
            if (checkCollision(cellA, cellB)) {
              // If either player has a shield, they bounce instead of eating
              if (playerA.hasEffect(PowerUpType.SHIELD) || playerB.hasEffect(PowerUpType.SHIELD)) {
                this.cellsBounce(cellA, cellB);
                continue;
              }
              
              // Determine which cell is larger
              if (cellA.mass > cellB.mass * 1.1) {
                // Cell A eats Cell B
                this.cellEatsCell(cellA, cellB, playerA, playerB);
                
                // Remove cell B from player B
                playerB.cells.splice(b, 1);
                b--; // Adjust index after removal
                
                // Check if player B is eliminated
                if (playerB.cells.length === 0) {
                  this.eliminatePlayer(playerB);
                }
              } else if (cellB.mass > cellA.mass * 1.1) {
                // Cell B eats Cell A
                this.cellEatsCell(cellB, cellA, playerB, playerA);
                
                // Remove cell A from player A
                playerA.cells.splice(a, 1);
                a--; // Adjust index after removal
                
                // Check if player A is eliminated
                if (playerA.cells.length === 0) {
                  this.eliminatePlayer(playerA);
                }
                
                // Break inner loop since cell A no longer exists
                break;
              }
              // If cells are similar in size, they bounce off each other
              else {
                this.cellsBounce(cellA, cellB);
              }
            }
          }
        }
      }
    }
  }
  
  private cellEatsCell(eater: any, eaten: any, eaterPlayer: Player, eatenPlayer: Player): void {
    // Transfer mass
    eater.mass += eaten.mass * 0.8; // 80% efficiency in mass transfer
    eater.radius = radiusFromMass(eater.mass);
    
    // Create particle effect
    this.particleSystem.createExplosion(
      eaten.position,
      eaten.color,
      15,
      eaten.radius * 0.3
    );
    
    // Create splash effect in the direction of consumption
    const direction = {
      x: eater.position.x - eaten.position.x,
      y: eater.position.y - eaten.position.y
    };
    this.particleSystem.createSplash(eaten.position, eaten.color, direction, 10);
  }
  
  private cellsBounce(cellA: any, cellB: any): void {
    // Calculate direction vector
    const dx = cellB.position.x - cellA.position.x;
    const dy = cellB.position.y - cellA.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) return; // Prevent division by zero
    
    // Normalize direction
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Calculate relative velocity
    const dvx = cellB.velocity.x - cellA.velocity.x;
    const dvy = cellB.velocity.y - cellA.velocity.y;
    
    // Calculate impulse
    const impulse = 2 * (dvx * nx + dvy * ny) / (cellA.mass + cellB.mass);
    
    // Apply impulse to both cells
    cellA.velocity.x += impulse * cellB.mass * nx;
    cellA.velocity.y += impulse * cellB.mass * ny;
    cellB.velocity.x -= impulse * cellA.mass * nx;
    cellB.velocity.y -= impulse * cellA.mass * ny;
    
    // Move cells apart to prevent sticking
    const overlap = cellA.radius + cellB.radius - dist;
    if (overlap > 0) {
      const moveX = nx * overlap * 0.5;
      const moveY = ny * overlap * 0.5;
      
      cellA.position.x -= moveX;
      cellA.position.y -= moveY;
      cellB.position.x += moveX;
      cellB.position.y += moveY;
    }
    
    // Create particle effect at collision point
    const collisionPoint = {
      x: cellA.position.x + nx * cellA.radius,
      y: cellA.position.y + ny * cellA.radius
    };
    
    this.particleSystem.createSplash(
      collisionPoint,
      '#ffffff',
      { x: nx, y: ny },
      5
    );
  }
  
  private eliminatePlayer(player: Player): void {
    // Create explosion effect
    const position = player.getAveragePosition();
    this.particleSystem.createExplosion(position, player.color, 30, 10);
    
    // Remove player from game state
    this.gameState.players.delete(player.id);
    
    // Remove AI controller if it's an AI player
    if (player.isAI) {
      this.aiControllers.delete(player.id);
      
      // Spawn a new AI to replace the eliminated one
      setTimeout(() => this.spawnAI(), 2000);
    }
  }
  
  private checkPlayerVirusCollisions(): void {
    // For each player
    this.gameState.players.forEach(player => {
      // Skip players with shield
      if (player.hasEffect(PowerUpType.SHIELD)) return;
      
      // For each cell of the player
      for (let i = 0; i < player.cells.length; i++) {
        const cell = player.cells[i];
        
        // Check collision with each virus
        for (let j = this.gameState.viruses.length - 1; j >= 0; j--) {
          const virus = this.gameState.viruses[j];
          
          if (checkCollision(cell, virus)) {
            // Check if cell is large enough to be split by virus
            if (virus.canSplit(cell)) {
              // Split the cell into multiple smaller cells
              this.virusSplitCell(cell, player, virus);
              
              // Remove virus
              this.gameState.viruses.splice(j, 1);
              
              // Spawn a new virus elsewhere
              setTimeout(() => this.spawnVirus(), 5000);
              
              // Break since this cell has been processed
              break;
            }
          }
        }
      }
    });
  }
  
  private virusSplitCell(cell: any, player: Player, virus: any): void {
    // Remove the original cell
    const cellIndex = player.cells.indexOf(cell);
    if (cellIndex === -1) return;
    
    player.cells.splice(cellIndex, 1);
    
    // Calculate how many cells to split into
    const cellMass = cell.mass;
    const newCellCount = Math.min(Math.floor(cellMass / 20), 16); // Max 16 cells
    const newCellMass = cellMass / newCellCount;
    const newCellRadius = radiusFromMass(newCellMass);
    
    // Create explosion effect
    this.particleSystem.createExplosion(
      cell.position,
      cell.color,
      20,
      cell.radius * 0.3
    );
    
    // Create new cells in random directions
    for (let i = 0; i < newCellCount; i++) {
      const angle = (i / newCellCount) * Math.PI * 2;
      const distance = cell.radius;
      
      const newPos = {
        x: cell.position.x + Math.cos(angle) * distance,
        y: cell.position.y + Math.sin(angle) * distance
      };
      
      // Add new cell to player
      const newCell = player.addCell(newPos, newCellRadius);
      
      // Apply velocity in the direction of the split
      if (newCell) {
        newCell.velocity = {
          x: Math.cos(angle) * 200,
          y: Math.sin(angle) * 200
        };
        
        // Set merge timer
        newCell.canMerge = false;
        newCell.mergeTime = 10;
      }
    }
  }
  
  private checkPlayerPowerUpCollisions(): void {
    // For each player
    this.gameState.players.forEach(player => {
      // For each cell of the player
      for (const cell of player.cells) {
        // Check collision with each power-up
        for (let i = this.gameState.powerUps.length - 1; i >= 0; i--) {
          const powerUp = this.gameState.powerUps[i];
          
          if (checkCollision(cell, powerUp)) {
            // Apply power-up effect
            powerUp.apply(player);
            
            // Create particle effect
            this.particleSystem.createPowerUpEffect(powerUp.position, powerUp.color);
            
            // Remove power-up
            this.gameState.powerUps.splice(i, 1);
          }
        }
      }
    });
  }
  private enforceWorldBounds(): void {
    const worldWidth = this.gameState.worldSize.x;
    const worldHeight = this.gameState.worldSize.y;
    
    // For each player
    this.gameState.players.forEach(player => {
      // For each cell of the player
      for (const cell of player.cells) {
        // Keep cell within world bounds
        if (cell.position.x - cell.radius < 0) {
          cell.position.x = cell.radius;
          cell.velocity.x = Math.abs(cell.velocity.x) * 0.5; // Bounce
        } else if (cell.position.x + cell.radius > worldWidth) {
          cell.position.x = worldWidth - cell.radius;
          cell.velocity.x = -Math.abs(cell.velocity.x) * 0.5; // Bounce
        }
        
        if (cell.position.y - cell.radius < 0) {
          cell.position.y = cell.radius;
          cell.velocity.y = Math.abs(cell.velocity.y) * 0.5; // Bounce
        } else if (cell.position.y + cell.radius > worldHeight) {
          cell.position.y = worldHeight - cell.radius;
          cell.velocity.y = -Math.abs(cell.velocity.y) * 0.5; // Bounce
        }
      }
    });
    
    // Also enforce bounds for viruses
    for (const virus of this.gameState.viruses) {
      if (virus.position.x - virus.radius < 0) {
        virus.position.x = virus.radius;
      } else if (virus.position.x + virus.radius > worldWidth) {
        virus.position.x = worldWidth - virus.radius;
      }
      
      if (virus.position.y - virus.radius < 0) {
        virus.position.y = virus.radius;
      } else if (virus.position.y + virus.radius > worldHeight) {
        virus.position.y = worldHeight - virus.radius;
      }
    }
    
    // Enforce bounds for food
    for (const food of this.gameState.food) {
      if (food.position.x - food.radius < 0) {
        food.position.x = food.radius;
      } else if (food.position.x + food.radius > worldWidth) {
        food.position.x = worldWidth - food.radius;
      }
      
      if (food.position.y - food.radius < 0) {
        food.position.y = food.radius;
      } else if (food.position.y + food.radius > worldHeight) {
        food.position.y = worldHeight - food.radius;
      }
    }
    
    // Enforce bounds for power-ups
    for (const powerUp of this.gameState.powerUps) {
      if (powerUp.position.x - powerUp.radius < 0) {
        powerUp.position.x = powerUp.radius;
      } else if (powerUp.position.x + powerUp.radius > worldWidth) {
        powerUp.position.x = worldWidth - powerUp.radius;
      }
      
      if (powerUp.position.y - powerUp.radius < 0) {
        powerUp.position.y = powerUp.radius;
      } else if (powerUp.position.y + powerUp.radius > worldHeight) {
        powerUp.position.y = worldHeight - powerUp.radius;
      }
    }
  }
  
  private updateLeaderboard(): void {
    // Convert players to array and sort by score
    const players = Array.from(this.gameState.players.values())
      .map(player => ({
        id: player.id,
        name: player.name,
        score: player.score
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10 players
    
    this.gameState.leaderboard = players;
  }
  
  private getAllEntities(): Entity[] {
    // Combine all entities for AI decision making
    return [
      ...Array.from(this.gameState.players.values()),
      ...this.gameState.food,
      ...this.gameState.viruses,
      ...this.gameState.powerUps
    ];
  }
  
  private setupEventListeners(): void {
    // Listen for player split event
    window.addEventListener('player-split', () => {
      if (this.humanPlayer) {
        this.humanPlayer.split();
      }
    });
    
    // Listen for player eject event
    window.addEventListener('player-eject', () => {
      if (this.humanPlayer) {
        this.humanPlayer.eject();
      }
    });
    
    // Listen for ejected mass event
    window.addEventListener('player-ejected-mass', (e: any) => {
      const detail = e.detail;
      
      // Create food item for ejected mass
      const food = new GameFood(detail.position);
      food.velocity = detail.velocity;
      food.radius = detail.radius;
      food.color = detail.color;
      food.value = Math.PI * detail.radius * detail.radius;
      
      this.gameState.food.push(food);
      
      // Create trail effect
      this.particleSystem.createTrail(detail.position, detail.color, detail.radius * 0.5);
    });
    
    // Listen for virus split event
    window.addEventListener('virus-split', (e: any) => {
      const detail = e.detail;
      
      // Create new virus
      const virus = new GameVirus(detail.position);
      virus.velocity = detail.velocity;
      
      this.gameState.viruses.push(virus);
    });
    
    // Listen for power-up collected event
    window.addEventListener('power-up-collected', (e: any) => {
      const detail = e.detail;
      
      // Create particle effect
      this.particleSystem.createPowerUpEffect(detail.position, detail.color);
    });
    
    // Listen for window resize
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.camera.resize(window.innerWidth, window.innerHeight);
    });
    
    // Listen for new custom events
    window.addEventListener('player-split-success', (e: any) => {
      // Could add sound effects or additional visual feedback here
      console.log("Player split successfully:", e.detail.newCellCount, "new cells");
    });
    
    window.addEventListener('player-eject-success', (e: any) => {
      // Could add sound effects or additional visual feedback here
      console.log("Player ejected mass:", e.detail.ejectedCount, "pieces");
    });
    
    window.addEventListener('player-powerup-applied', (e: any) => {
      // Could add sound effects or additional visual feedback here
      console.log("Player got power-up:", PowerUpType[e.detail.type], "for", e.detail.duration, "seconds");
    });
  }
}
