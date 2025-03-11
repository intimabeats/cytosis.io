// src/game.ts - Completo e Atualizado (Correções Finais)
import { GameCamera } from './camera';
import { Controls } from './controls';
import { Renderer } from './renderer';
import { GamePlayer } from './player';
import { GameFood } from './food';
import { GameVirus } from './virus';
import { GamePowerUp } from './powerup';
import { ParticleSystem } from './particles';
import { AIController } from './ai';
import {
  GameState,
  Player,
  PowerUpType,
  Vector2D,
} from './types';
import {
  randomPosition,
  randomColor,
  checkCollision,
  distance,
  radiusFromMass,
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
  playerColor: string;
  humanPlayer: GamePlayer | null;
  aiControllers: Map<string, AIController>;
  particleSystem: ParticleSystem;
  debugMode: boolean;
  foodSpawnTimer: number;
  virusSpawnTimer: number;
  powerUpSpawnTimer: number;
  aiSpawnTimer: number;
  gameTime: number;
  difficultyLevel: number;
  lastFoodEatenTime: number;
  comboCounter: number;
  comboTimer: number;
  comboMultiplier: number;
  scorePopups: {position: Vector2D, text: string, color: string, time: number}[];

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.camera = new GameCamera(window.innerWidth, window.innerHeight);
    this.controls = new Controls(this.canvas, this.camera);
    this.renderer = new Renderer(this.canvas, this.camera);
    this.particleSystem = new ParticleSystem();
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
    this.playerColor = "#ff4655";
    this.humanPlayer = null;
    this.aiControllers = new Map();
    this.debugMode = false;
    this.foodSpawnTimer = 0;
    this.virusSpawnTimer = 0;
    this.powerUpSpawnTimer = 0;
    this.aiSpawnTimer = 0;
    this.gameTime = 0;
    this.difficultyLevel = 1;
    this.lastFoodEatenTime = 0;
    this.comboCounter = 0;
    this.comboTimer = 0;
    this.comboMultiplier = 1;
    this.scorePopups = [];
    this.setupEventListeners();
      window.addEventListener('game-mouse-move', (e: any) => {
    if (this.humanPlayer) {
      this.humanPlayer.mousePosition = e.detail.position;
      this.humanPlayer.setTargetDirection(e.detail.position);
      const controls = this.controls;
      if ('isMouseInCenter' in controls && typeof controls.isMouseInCenter === 'function') {
        this.humanPlayer.isMouseInCenter = controls.isMouseInCenter();
      }
      const avgPos = this.humanPlayer.getAveragePosition();
      const dir = {
        x: e.detail.position.x - avgPos.x,
        y: e.detail.position.y - avgPos.y
      };
      const mag = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
      if (mag > 0) {
        dir.x /= mag;
        dir.y /= mag;
      }
      this.humanPlayer.targetDirection = dir;
    }
  });
  }

  start(): void {
    console.log("Iniciando jogo...");
    const playerPos = {
      x: this.gameState.worldSize.x / 2,
      y: this.gameState.worldSize.y / 2
    };
    console.log("Criando jogador humano na posição:", playerPos);
    this.humanPlayer = new GamePlayer(this.playerName, playerPos, false, 30, this.playerColor);
        this.gameState.players.set(this.humanPlayer.id, this.humanPlayer);
    this.initializeWorld();
    this.running = true;
    this.lastTime = performance.now();
    this.gameTime = 0;
    this.difficultyLevel = 1;
    this.camera.position = { ...playerPos };
    this.camera.targetPosition = { ...playerPos };
    console.log("Jogo iniciado com sucesso");
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  restart(): void {
    this.gameState.players.clear();
    this.gameState.food = [];
    this.gameState.viruses = [];
    this.gameState.powerUps = [];
    this.gameState.particles = [];
    this.aiControllers.clear();
    const playerPos = {
      x: this.gameState.worldSize.x / 2,
      y: this.gameState.worldSize.y / 2
    };
    this.humanPlayer = new GamePlayer(this.playerName, playerPos, false, 30, this.playerColor);
    this.gameState.players.set(this.humanPlayer.id, this.humanPlayer);
    this.initializeWorld();
    this.camera.position = { ...playerPos };
    this.camera.targetPosition = { ...playerPos };
    this.camera.scale = 1;
    this.camera.targetScale = 1;
    this.foodSpawnTimer = 0;
    this.virusSpawnTimer = 0;
    this.powerUpSpawnTimer = 0;
    this.aiSpawnTimer = 0;
    this.gameTime = 0;
    this.difficultyLevel = 1;
    this.lastFoodEatenTime = 0;
    this.comboCounter = 0;
    this.comboTimer = 0;
    this.comboMultiplier = 1;
    this.scorePopups = [];
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }

  showGameOver(): void {
    const finalScoreElement = document.getElementById('final-score');
    if (finalScoreElement && this.humanPlayer) {
      finalScoreElement.textContent = this.humanPlayer.score.toString();
    }
    const gameOverScreen = document.getElementById('game-over');
    if (gameOverScreen) {
      gameOverScreen.style.display = 'block';
    }
  }

  handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.resize(window.innerWidth, window.innerHeight);
    this.renderer.resize();
  }

  private gameLoop(timestamp: number): void {
    try {
      const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Limitar a 100ms
      this.lastTime = timestamp;
      this.gameTime += deltaTime;
      this.updateDifficulty();
      this.update(deltaTime);
      this.renderer.render(this.gameState);
      if (this.running) {
        requestAnimationFrame(this.gameLoop.bind(this));
      }
    } catch (error) {
      console.error("Erro no loop do jogo:", error);
      this.lastTime = performance.now();
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }

  private updateDifficulty(): void {
    const newLevel = Math.floor(this.gameTime / 90) + 1;

    if (newLevel > this.difficultyLevel) {
      this.difficultyLevel = newLevel;
      console.log(`Dificuldade aumentada para nível ${this.difficultyLevel}`);
      if (this.difficultyLevel > 1) {
        for (let i = 0; i < this.difficultyLevel - 1; i++) {
          this.spawnVirus();
        }
        if (this.difficultyLevel % 2 === 0) {
          this.spawnAI();
        }
      }
      this.renderer.drawMessage(`Dificuldade aumentada para nível ${this.difficultyLevel}!`, 3);
    }
  }

  private update(deltaTime: number): void {
    this.controls.update();
    if (this.humanPlayer && this.humanPlayer.cells.length > 0) {
      const mousePos = this.controls.getMousePosition();
      this.humanPlayer.setTargetDirection(mousePos);
    }
    this.gameState.players.forEach(player => {
      try {
        player.update(deltaTime);
      } catch (error) {
        console.error("Erro ao atualizar jogador:", error);
      }
    });
    this.aiControllers.forEach(controller => {
      try {
        const validEntities = this.getAllEntities().filter(entity =>
          entity && entity.position &&
          typeof entity.position.x === 'number' &&
          typeof entity.position.y === 'number'
        );
        controller.update(deltaTime, validEntities);
      } catch (error) {
        console.error("Erro ao atualizar controlador de IA:", error);
      }
    });
    for (let i = 0; i < this.gameState.food.length; i++) {
      try {
        this.gameState.food[i].update(deltaTime);
      } catch (error) {
        console.error("Erro ao atualizar comida:", error);
        this.gameState.food.splice(i, 1);
        i--;
      }
    }
    for (let i = 0; i < this.gameState.viruses.length; i++) {
      try {
        this.gameState.viruses[i].update(deltaTime);
      } catch (error) {
        console.error("Erro ao atualizar vírus:", error);
        this.gameState.viruses.splice(i, 1);
        i--;
      }
    }
    for (let i = 0; i < this.gameState.powerUps.length; i++) {
      try {
        this.gameState.powerUps[i].update(deltaTime);
      } catch (error) {
        console.error("Erro ao atualizar power-up:", error);
        this.gameState.powerUps.splice(i, 1);
        i--;
      }
    }
    try {
      this.particleSystem.update(deltaTime);
      this.gameState.particles = this.particleSystem.particles;
    } catch (error) {
      console.error("Erro ao atualizar partículas:", error);
      this.particleSystem = new ParticleSystem();
      this.gameState.particles = [];
    }
    this.updateComboSystem(deltaTime);
    this.checkCollisions();
    if (this.humanPlayer && this.humanPlayer.cells.length > 0) {
      const playerPos = this.humanPlayer.getAveragePosition();
      const maxRadius = this.humanPlayer.getMaxRadius();
      this.camera.follow(playerPos, maxRadius);
    }
    this.camera.update(deltaTime);
    this.updateSpawnTimers(deltaTime);
    this.updateLeaderboard();
    if (this.humanPlayer && this.humanPlayer.cells.length === 0) {
      this.handlePlayerDeath();
    }
    this.enforceWorldBounds();
    if (this.debugMode) {
      this.showDebugInfo();
    }
  }
  private updateComboSystem(deltaTime: number): void {
    if (this.comboCounter > 0) {
      this.comboTimer -= deltaTime;
      if (this.comboTimer <= 0) {
        this.comboCounter = 0;
        this.comboMultiplier = 1;
      }
    }
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const popup = this.scorePopups[i];
      popup.time -= deltaTime;
      if (popup.time <= 0) {
        this.scorePopups.splice(i, 1);
      }
    }
  }

  private updateSpawnTimers(deltaTime: number): void {
    this.foodSpawnTimer -= deltaTime;
    if (this.foodSpawnTimer <= 0) {
      this.spawnFood();
      this.foodSpawnTimer = 0.5 / this.difficultyLevel;
    }
    this.virusSpawnTimer -= deltaTime;
    if (this.virusSpawnTimer <= 0 && this.gameState.viruses.length < 20 + this.difficultyLevel * 2) {
      this.spawnVirus();
      this.virusSpawnTimer = 15 - this.difficultyLevel;
    }
    this.powerUpSpawnTimer -= deltaTime;
    if (this.powerUpSpawnTimer <= 0) {
      this.spawnPowerUp();
      this.powerUpSpawnTimer = 20 - this.difficultyLevel * 2;
    }
    this.aiSpawnTimer -= deltaTime;
    if (this.aiSpawnTimer <= 0 && this.gameState.players.size < 15 + this.difficultyLevel) {
      this.spawnAI();
      this.aiSpawnTimer = 30 - this.difficultyLevel * 3;
    }
  }

  private handlePlayerDeath(): void {
    this.showGameOver();
    if (this.humanPlayer) {
      const lastPosition = this.humanPlayer.getAveragePosition();
      this.particleSystem.createExplosion(
        lastPosition,
        this.humanPlayer.color,
        50,
        20
      );
    }
  }

  private showDebugInfo(): void {
    console.log({
      players: this.gameState.players.size,
      food: this.gameState.food.length,
      viruses: this.gameState.viruses.length,
      powerUps: this.gameState.powerUps.length,
      particles: this.gameState.particles.length,
      fps: Math.round(1 / ((performance.now() - this.lastTime) / 1000)),
      gameTime: Math.floor(this.gameTime),
      difficulty: this.difficultyLevel
    });
  }

  private initializeWorld(): void {
    console.log("Inicializando mundo com tamanho:", this.gameState.worldSize);
    for (let i = 0; i < 1000; i++) {
      this.spawnFoodItem();
    }
    for (let i = 0; i < 20; i++) {
      this.spawnVirus();
    }
    for (let i = 0; i < 10; i++) {
      this.spawnAI();
    }
    for (let i = 0; i < 5; i++) {
      this.spawnPowerUp();
    }
    this.foodSpawnTimer = 0.5;
    this.virusSpawnTimer = 15;
    this.powerUpSpawnTimer = 20;
    this.aiSpawnTimer = 30;
  }

  private spawnFood(): void {
    const minFood = 1000 + this.difficultyLevel * 100;
    const maxSpawnPerFrame = 5 + this.difficultyLevel;

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
      console.error("Erro ao gerar comida:", error);
    }
  }

  private spawnVirus(): void {
    try {
      let position;
      let tooClose = true;
      let attempts = 0;

      while (tooClose && attempts < 10) {
        position = randomPosition(this.gameState.worldSize);
        tooClose = false;
        if (this.humanPlayer) {
          const playerPos = this.humanPlayer.getAveragePosition();
          const dist = distance(playerPos, position);
          if (dist < 500) {
            tooClose = true;
          }
        }
        attempts++;
      }
      const virus = new GameVirus(position || randomPosition(this.gameState.worldSize));
      this.gameState.viruses.push(virus);
    } catch (error) {
      console.error("Erro ao gerar vírus:", error);
    }
  }

  private spawnPowerUp(): void {
    try {
      const position = randomPosition(this.gameState.worldSize);
      const type = Math.floor(Math.random() * 4) as PowerUpType;
      const powerUp = new GamePowerUp(position, type);
      this.gameState.powerUps.push(powerUp);
    } catch (error) {
      console.error("Erro ao gerar power-up:", error);
    }
  }

  private spawnAI(): void {
    try {
      const position = randomPosition(this.gameState.worldSize);
      const aiNames = [
        ["Amoeba", "Blob", "Cell", "Dot", "Eater", "Feeder", "Germ", "Hunter"],
        ["Predator", "Stalker", "Tracker", "Virus", "Watcher", "Xenophage", "Yapper", "Zapper"],
        ["Devourer", "Eliminator", "Frenzy", "Glutton", "Harvester", "Impaler", "Juggernaut", "Killer"]
      ];
      const nameList = aiNames[Math.min(this.difficultyLevel - 1, aiNames.length - 1)];
      const aiName = nameList[Math.floor(Math.random() * nameList.length)] + Math.floor(Math.random() * 100);
      const startingRadius = 30 + (this.difficultyLevel - 1) * 5;
      const aiColor = randomColor();
      const aiPlayer = new GamePlayer(aiName, position, true, startingRadius, aiColor);
      this.gameState.players.set(aiPlayer.id, aiPlayer);
      const aiController = new AIController(aiPlayer, this.gameState.worldSize, this.difficultyLevel);
      this.aiControllers.set(aiPlayer.id, aiController);
    } catch (error) {
      console.error("Erro ao gerar IA:", error);
    }
  }

  private checkCollisions(): void {
    try {
      this.checkPlayerFoodCollisions();
      this.checkPlayerPlayerCollisions();
      this.checkPlayerVirusCollisions();
      this.checkPlayerPowerUpCollisions();
      this.checkEjectedMassVirusCollisions();
    } catch (error) {
      console.error("Erro ao verificar colisões:", error);
    }
  }

  private checkPlayerFoodCollisions(): void {
    this.gameState.players.forEach(player => {
      if (!player.cells || player.cells.length === 0) return;
      for (const cell of player.cells) {
        if (!cell || !cell.position || typeof cell.radius !== 'number') continue;
        for (let i = this.gameState.food.length - 1; i >= 0; i--) {
          const food = this.gameState.food[i];
          if (!food || !food.position || typeof food.radius !== 'number') {
            this.gameState.food.splice(i, 1);
            continue;
          }
          if (checkCollision(cell, food)) {
            cell.mass += food.value;
            cell.radius = radiusFromMass(cell.mass);
            if (!player.isAI) {
              const now = Date.now();
              const timeSinceLastFood = (now - this.lastFoodEatenTime) / 1000;
              this.lastFoodEatenTime = now;
              if (timeSinceLastFood < 1.0) {
                this.comboCounter++;
                this.comboMultiplier = Math.min(5, 1 + this.comboCounter * 0.1);
                this.comboTimer = 2.0;
              } else {
                this.comboCounter = 1;
                this.comboMultiplier = 1;
                this.comboTimer = 2.0;
              }
              const baseScore = Math.ceil(food.value);
              const comboScore = Math.ceil(baseScore * this.comboMultiplier);
              player.score += comboScore;
              player.recordFoodEaten();
              this.createScorePopup(food.position, comboScore, this.comboCounter > 1);
            }
            this.particleSystem.createSplash(
              food.position,
              food.color,
              { x: cell.position.x - food.position.x, y: cell.position.y - food.position.y },
              5
            );
            this.gameState.food.splice(i, 1);
          }
        }
      }
    });
  }
  private createScorePopup(position: Vector2D, score: number, isCombo: boolean = false): void {
    const screenPos = this.camera.worldToScreen(position);
    const color = isCombo ? '#ffff00' : '#ffffff';
    const text = isCombo ? `+${score} x${this.comboCounter}` : `+${score}`;
    this.scorePopups.push({
      position: { ...position },
      text: text,
      color: color,
      time: 1.5
    });
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = text;
    popup.style.left = `${screenPos.x}px`;
    popup.style.top = `${screenPos.y}px`;
    popup.style.color = color;
    document.body.appendChild(popup);
    setTimeout(() => {
            if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    }, 1500);
  }

  private checkPlayerPlayerCollisions(): void {
    const players = Array.from(this.gameState.players.values());
    for (let i = 0; i < players.length; i++) {
      const playerA = players[i];
      for (let j = i + 1; j < players.length; j++) {
        const playerB = players[j];
        if (playerA.hasEffect(PowerUpType.SHIELD) && playerB.hasEffect(PowerUpType.SHIELD)) {
          continue;
        }
        for (let a = 0; a < playerA.cells.length; a++) {
          const cellA = playerA.cells[a];
          for (let b = 0; b < playerB.cells.length; b++) {
            const cellB = playerB.cells[b];
            if (checkCollision(cellA, cellB)) {
              if (playerA.hasEffect(PowerUpType.SHIELD) || playerB.hasEffect(PowerUpType.SHIELD)) {
                this.cellsBounce(cellA, cellB);
                continue;
              }
              if (cellA.mass > cellB.mass * 1.05) {
                this.cellEatsCell(cellA, cellB, playerA, playerB);
                playerB.cells.splice(b, 1);
                b--;
                if (playerB.cells.length === 0) {
                  this.eliminatePlayer(playerB, playerA);
                }
              } else if (cellB.mass > cellA.mass * 1.05) {
                this.cellEatsCell(cellB, cellA, playerB, playerA);
                playerA.cells.splice(a, 1);
                a--;
                if (playerA.cells.length === 0) {
                  this.eliminatePlayer(playerA, playerB);
                }
                break;
              }
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
    const sizeDifference = eater.mass / eaten.mass;
    const efficiencyFactor = Math.min(0.95, 0.8 + (sizeDifference - 1.05) * 0.05);
    eater.mass += eaten.mass * efficiencyFactor;
    eater.radius = radiusFromMass(eater.mass);
    if (!eaterPlayer.isAI) {
      const scoreGain = Math.ceil(eaten.mass);
      eaterPlayer.score += scoreGain;
      if (!eatenPlayer.isAI) {
        const bonusScore = Math.ceil(scoreGain * 0.5);
        eaterPlayer.score += bonusScore;
        this.createScorePopup(eaten.position, scoreGain + bonusScore, true);
      } else {
        this.createScorePopup(eaten.position, scoreGain, false);
      }
    }
    this.particleSystem.createExplosion(
      eaten.position,
      eaten.color,
      15,
      eaten.radius * 0.3
    );
    const direction = {
      x: eater.position.x - eaten.position.x,
      y: eater.position.y - eaten.position.y
    };
    this.particleSystem.createSplash(eaten.position, eaten.color, direction, 10);
  }

  private cellsBounce(cellA: any, cellB: any): void {
    const dx = cellB.position.x - cellA.position.x;
    const dy = cellB.position.y - cellA.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;
    const nx = dx / dist;
    const ny = dy / dist;
    const dvx = cellB.velocity.x - cellA.velocity.x;
    const dvy = cellB.velocity.y - cellA.velocity.y;
    const impulse = 2 * (dvx * nx + dvy * ny) / (cellA.mass + cellB.mass);
    const boostFactor = 1.5;
    cellA.velocity.x += impulse * cellB.mass * nx * boostFactor;
    cellA.velocity.y += impulse * cellB.mass * ny * boostFactor;
    cellB.velocity.x -= impulse * cellA.mass * nx * boostFactor;
    cellB.velocity.y -= impulse * cellA.mass * ny * boostFactor;
    const overlap = cellA.radius + cellB.radius - dist;
    if (overlap > 0) {
      const moveX = nx * overlap * 0.5;
      const moveY = ny * overlap * 0.5;
      cellA.position.x -= moveX;
      cellA.position.y -= moveY;
      cellB.position.x += moveX;
      cellB.position.y += moveY;
    }
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

  private eliminatePlayer(eliminated: Player, eliminator: Player): void {
    const position = eliminated.getAveragePosition();
    this.particleSystem.createExplosion(position, eliminated.color, 30, 10);
    if (!eliminator.isAI) {
      const bonusScore = 1000 + Math.floor(eliminated.score * 0.3);
      eliminator.score += bonusScore;
      this.createScorePopup(position, bonusScore, true);
      if (!eliminated.isAI) {
        this.renderer.drawMessage(`Você eliminou ${eliminated.name}!`, 3);
      }
    } else if (!eliminated.isAI) {
      this.renderer.drawMessage(`Você foi eliminado por ${eliminator.name}!`, 3);
    }
    this.gameState.players.delete(eliminated.id);
    if (eliminated.isAI) {
      this.aiControllers.delete(eliminated.id);
      setTimeout(() => this.spawnAI(), 2000);
    }
  }

  private checkPlayerVirusCollisions(): void {
    this.gameState.players.forEach(player => {
      if (player.hasEffect(PowerUpType.SHIELD)) return;
      for (let i = 0; i < player.cells.length; i++) {
        const cell = player.cells[i];
        for (let j = this.gameState.viruses.length - 1; j >= 0; j--) {
          const virus = this.gameState.viruses[j];
          if (checkCollision(cell, virus)) {
            if (virus.canSplit(cell)) {
              this.virusSplitCell(cell, player);
              this.gameState.viruses.splice(j, 1);
              setTimeout(() => this.spawnVirus(), 5000);
              break;
            }
          }
        }
      }
    });
  }

  private virusSplitCell(cell: any, player: Player): void {
    const cellIndex = player.cells.indexOf(cell);
    if (cellIndex === -1) return;
    player.cells.splice(cellIndex, 1);
    const cellMass = cell.mass;
    const newCellCount = Math.min(Math.floor(cellMass / 15), 16);
    const newCellMass = cellMass / newCellCount;
    const newCellRadius = radiusFromMass(newCellMass);
    this.particleSystem.createExplosion(
      cell.position,
      cell.color,
      20,
      cell.radius * 0.3
    );
    for (let i = 0; i < newCellCount; i++) {
      const angle = (i / newCellCount) * Math.PI * 2;
      const distance = cell.radius;
      const newPos = {
        x: cell.position.x + Math.cos(angle) * distance,
        y: cell.position.y + Math.sin(angle) * distance
      };
      const newCell = player.addCell(newPos, newCellRadius);
      if (newCell) {
        newCell.velocity = {
          x: Math.cos(angle) * 300,
          y: Math.sin(angle) * 300
        };
        newCell.canMerge = false;
        newCell.mergeTime = 10;
      }
    }
    if (!player.isAI) {
      player.recordVirusHit();
      this.renderer.drawMessage("Seu célula foi dividida por um vírus!", 2);
    }
  }

  private checkPlayerPowerUpCollisions(): void {
    this.gameState.players.forEach(player => {
      for (const cell of player.cells) {
        for (let i = this.gameState.powerUps.length - 1; i >= 0; i--) {
          const powerUp = this.gameState.powerUps[i];
          if (checkCollision(cell, powerUp)) {
            powerUp.apply(player);
            this.particleSystem.createPowerUpEffect(powerUp.position, powerUp.color);
            this.gameState.powerUps.splice(i, 1);
            if (!player.isAI) {
              const powerUpNames = [
                "Impulso de Velocidade",
                "Escudo",
                "Impulso de Massa",
                "Invisibilidade"
              ];
              this.renderer.drawMessage(`${powerUpNames[powerUp.type]} ativado!`, 2);
            }
          }
        }
      }
    });
  }

  private checkEjectedMassVirusCollisions(): void {
    for (let i = 0; i < this.gameState.food.length; i++) {
      const food = this.gameState.food[i];
      if (food.velocity.x === 0 && food.velocity.y === 0) continue;
      for (let j = 0; j < this.gameState.viruses.length; j++) {
        const virus = this.gameState.viruses[j];
        if (checkCollision(food, virus)) {
          virus.grow();
          this.gameState.food.splice(i, 1);
          i--;
          break;
        }
      }
    }
  }

  private enforceWorldBounds(): void {
    const worldWidth = this.gameState.worldSize.x;
    const worldHeight = this.gameState.worldSize.y;
    if (typeof worldWidth !== 'number' || typeof worldHeight !== 'number' ||
        worldWidth <= 0 || worldHeight <= 0) {
      console.error("Dimensões de mundo inválidas:", this.gameState.worldSize);
      return;
    }
    this.gameState.players.forEach(player => {
      if (!player.cells || player.cells.length === 0) return;
      for (const cell of player.cells) {
        if (!cell || !cell.position || typeof cell.radius !== 'number') continue;
        if (cell.position.x - cell.radius < 0) {
          cell.position.x = cell.radius;
          cell.velocity.x = Math.abs(cell.velocity.x) * 0.8;
        } else if (cell.position.x + cell.radius > worldWidth) {
          cell.position.x = worldWidth - cell.radius;
          cell.velocity.x = -Math.abs(cell.velocity.x) * 0.8;
        }
        if (cell.position.y - cell.radius < 0) {
          cell.position.y = cell.radius;
          cell.velocity.y = Math.abs(cell.velocity.y) * 0.8;
        } else if (cell.position.y + cell.radius > worldHeight) {
          cell.position.y = worldHeight - cell.radius;
          cell.velocity.y = -Math.abs(cell.velocity.y) * 0.8;
        }
      }
    });
    for (const virus of this.gameState.viruses) {
      if (!virus || !virus.position || typeof virus.radius !== 'number') continue;
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
    for (const food of this.gameState.food) {
      if (!food || !food.position || typeof food.radius !== 'number') continue;
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
    for (const powerUp of this.gameState.powerUps) {
      if (!powerUp || !powerUp.position || typeof powerUp.radius !== 'number') continue;
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
    const players = Array.from(this.gameState.players.values())
      .map(player => ({
        id: player.id,
        name: player.name,
        score: player.score,
        isHuman: !player.isAI,
        color: player.color,
        cells: player.cells.length
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    this.gameState.leaderboard = players;
    const leaderboardElement = document.getElementById('leaderboard-content');
    if (leaderboardElement) {
      leaderboardElement.innerHTML = '';
      players.forEach((player, index) => {
        const entry = document.createElement('div');
        if (player.isHuman) {
          entry.style.color = '#ffff00';
          entry.style.fontWeight = 'bold';
        }
        const colorDot = document.createElement('span');
        colorDot.style.display = 'inline-block';
        colorDot.style.width = '10px';
        colorDot.style.height = '10px';
        colorDot.style.borderRadius = '50%';
        colorDot.style.backgroundColor = player.color;
        colorDot.style.marginRight = '5px';
        entry.appendChild(colorDot);
        entry.appendChild(document.createTextNode(`${index + 1}. ${player.name}: ${player.score}`));
        leaderboardElement.appendChild(entry);
      });
    }
    if (this.humanPlayer) {
      const scoreElement = document.getElementById('score');
      const sizeElement = document.getElementById('size');
      if (scoreElement) scoreElement.textContent = this.humanPlayer.score.toString();
      if (sizeElement) sizeElement.textContent = this.humanPlayer.cells.length.toString();
      if (this.comboCounter > 1) {
        const statsElement = document.getElementById('stats');
        if (statsElement) {
          let comboElement = document.getElementById('combo-multiplier');
          if (!comboElement) {
            comboElement = document.createElement('div');
            comboElement.id = 'combo-multiplier';
            statsElement.appendChild(comboElement);
          }
          comboElement.textContent = `Combo: x${this.comboMultiplier.toFixed(1)}`;
          comboElement.style.color = '#ffff00';
        }
      } else {
        const comboElement = document.getElementById('combo-multiplier');
        if (comboElement && comboElement.parentNode) {
          comboElement.parentNode.removeChild(comboElement);
        }
      }
    }
  }

  private getAllEntities(): (GamePlayer | GameFood | GameVirus | GamePowerUp)[] {
    return [
      ...(Array.from(this.gameState.players.values()) as GamePlayer[]),
      ...(this.gameState.food as GameFood[]),
      ...(this.gameState.viruses as GameVirus[]),
      ...(this.gameState.powerUps as GamePowerUp[])
    ];
  }

  private setupEventListeners(): void {
    window.addEventListener('player-split', () => {
      if (this.humanPlayer) {
        this.humanPlayer.split();
      }
    });
    window.addEventListener('player-eject', () => {
      if (this.humanPlayer) {
        this.humanPlayer.eject();
      }
    });
    window.addEventListener('player-ejected-mass', (e: any) => {
      const detail = e.detail;
      const food = new GameFood(detail.position);
      food.velocity = detail.velocity;
      food.radius = detail.radius;
      food.color = detail.color;
      food.value = Math.PI * detail.radius * detail.radius;
      this.gameState.food.push(food);
      this.particleSystem.createTrail(detail.position, detail.color, detail.radius * 0.5);
    });
    window.addEventListener('virus-split', (e: any) => {
      const detail = e.detail;
      const virus = new GameVirus(detail.position);
      virus.velocity = detail.velocity;
      this.gameState.viruses.push(virus);
    });
    window.addEventListener('power-up-collected', (e: any) => {
      const detail = e.detail;
      this.particleSystem.createPowerUpEffect(detail.position, detail.color);
      setTimeout(() => this.spawnPowerUp(), 10000);
    });
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    window.addEventListener('player-split-success', (e: any) => {
      console.log("Jogador dividiu com sucesso:", e.detail.newCellCount, "novas células");
    });
    window.addEventListener('player-eject-success', (e: any) => {
      console.log("Jogador ejetou massa:", e.detail.ejectedCount, "peças");
    });
    window.addEventListener('player-powerup-applied', (e: any) => {
      console.log("Jogador obteve power-up:", PowerUpType[e.detail.type], "por", e.detail.duration, "segundos");
    });
    window.addEventListener('ai-request-entities', (e: any) => {
      const detail = e.detail;
      const aiId = detail.aiId;
      const position = detail.position;
      const range = detail.range;
      const entities = this.getAllEntities().filter(entity => {
        if (entity.id === aiId) return false;
        const dist = distance(position, entity.position);
        return dist < range;
      });
      const responseEvent = new CustomEvent('ai-entities-response', {
        detail: {
          aiId: aiId,
          entities: entities
        }
      });
      window.dispatchEvent(responseEvent);
    });
    window.addEventListener('cells-merged', (e: any) => {
      const detail = e.detail;
      this.particleSystem.createCellMergeEffect(
        detail.position1,
        detail.position2,
        detail.color
      );
    });
    window.addEventListener('virus-grew', (e: any) => {
      const detail = e.detail;
      this.particleSystem.createVirusGrowthEffect(
        detail.position,
        detail.stage
      );
    });
    window.addEventListener('create-text-popup', (e: any) => {
      const detail = e.detail;
      this.particleSystem.createScorePopup(
        detail.position,
        detail.text,
        detail.color
      );
    });
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'm') {
        this.renderer.toggleMinimap();
      }
      if (e.key.toLowerCase() === 'f') {
        this.renderer.toggleFPS();
      }
      if (e.key.toLowerCase() === 'r' && this.humanPlayer && this.humanPlayer.cells.length === 0) {
        const gameOverScreen = document.getElementById('game-over');
        if (gameOverScreen) {
          gameOverScreen.style.display = 'none';
        }
        this.restart();
      }
    });
  }
  createFoodCluster(position: Vector2D, radius: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const foodPos = {
        x: position.x + Math.cos(angle) * distance,
        y: position.y + Math.sin(angle) * distance
      };
      foodPos.x = Math.max(10, Math.min(this.gameState.worldSize.x - 10, foodPos.x));
      foodPos.y = Math.max(10, Math.min(this.gameState.worldSize.y - 10, foodPos.y));
            const food = new GameFood(foodPos);
      food.value *= 1.5;
      food.radius *= 1.2;
      this.gameState.food.push(food);
    }
    this.particleSystem.createExplosion(position, '#ffffff', 20, 30);
  }
  createRandomEvent(): void {
    const eventType = Math.floor(Math.random() * 5);
    switch (eventType) {
      case 0:
        const position = randomPosition(this.gameState.worldSize);
        this.createFoodCluster(position, 500, 100);
        this.renderer.drawMessage("Chuva de comida detectada!", 3);
        break;
      case 1:
        for (let i = 0; i < 5; i++) {
          this.spawnVirus();
        }
        this.renderer.drawMessage("Surto de vírus detectado!", 3);
        break;
      case 2:
        for (let i = 0; i < 3; i++) {
          this.spawnPowerUp();
        }
        this.renderer.drawMessage("Power-ups detectados!", 3);
        break;
      case 3:
        const dangerPos = randomPosition(this.gameState.worldSize);
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const virusPos = {
            x: dangerPos.x + Math.cos(angle) * 300,
            y: dangerPos.y + Math.sin(angle) * 300
          };
          const virus = new GameVirus(virusPos);
          this.gameState.viruses.push(virus);
        }
        this.renderer.drawMessage("Zona de perigo detectada!", 3);
        break;
      case 4:
        for (let i = 0; i < 3; i++) {
          this.spawnAI();
        }
        this.renderer.drawMessage("Invasão de células detectada!", 3);
        break;
    }
  }
  createSafeZone(position: Vector2D, radius: number): void {
    for (let i = this.gameState.viruses.length - 1; i >= 0; i--) {
      const virus = this.gameState.viruses[i];
      if (distance(virus.position, position) < radius) {
        this.gameState.viruses.splice(i, 1);
      }
    }
    this.gameState.players.forEach((player, _id) => {
      if (player.isAI) {
        const playerPos = player.getAveragePosition();
        if (distance(playerPos, position) < radius) {
          const angle = Math.random() * Math.PI * 2;
          const newPos = {
            x: position.x + Math.cos(angle) * (radius + 500),
            y: position.y + Math.sin(angle) * (radius + 500)
          };
          newPos.x = Math.max(100, Math.min(this.gameState.worldSize.x - 100, newPos.x));
          newPos.y = Math.max(100, Math.min(this.gameState.worldSize.y - 100, newPos.y));
          for (const cell of player.cells) {
            cell.position = { ...newPos };
          }
        }
      }
    });
    this.createFoodCluster(position, radius * 0.8, 50);
    this.particleSystem.createExplosion(position, '#00ff00', 30, 20);
    this.renderer.drawMessage("Zona segura criada!", 3);
  }
  helpStrugglingPlayer(): void {
    if (!this.humanPlayer || this.humanPlayer.cells.length === 0) return;
    if (this.humanPlayer.score < 100 && this.gameTime > 60) {
      this.createSafeZone(this.humanPlayer.getAveragePosition(), 500);
      const powerUpType = Math.floor(Math.random() * 4) as PowerUpType;
      this.humanPlayer.applyPowerUp(powerUpType, 15);
      this.renderer.drawMessage("Reforços chegaram! Você recebeu ajuda.", 3);
    }
  }
  spawnBossAI(): void {
    if (!this.humanPlayer || this.humanPlayer.score < 5000) return;
    const playerPos = this.humanPlayer.getAveragePosition();
    const angle = Math.random() * Math.PI * 2;
    const distance = 1000 + Math.random() * 500;
    const bossPos = {
      x: playerPos.x + Math.cos(angle) * distance,
      y: playerPos.y + Math.sin(angle) * distance
    };
    bossPos.x = Math.max(100, Math.min(this.gameState.worldSize.x - 100, bossPos.x));
    bossPos.y = Math.max(100, Math.min(this.gameState.worldSize.y - 100, bossPos.y));
    const bossNames = ["Devorador", "Aniquilador", "Predador Alfa", "Ceifador", "Titã"];
    const bossName = bossNames[Math.floor(Math.random() * bossNames.length)];
    const bossRadius = 100;
    const bossColor = "#ff0000";
    const bossPlayer = new GamePlayer(bossName, bossPos, true, bossRadius, bossColor);
    this.gameState.players.set(bossPlayer.id, bossPlayer);
    const bossController = new AIController(bossPlayer, this.gameState.worldSize, 10);
    this.aiControllers.set(bossPlayer.id, bossController);
    this.renderer.drawMessage(`${bossName} entrou no jogo! Cuidado!`, 5);
    this.particleSystem.createExplosion(bossPos, bossColor, 50, 30);
  }
}
