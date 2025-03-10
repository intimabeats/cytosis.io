// src/game.ts - Parte 1: Melhorias na jogabilidade e colisões
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
  massFromRadius,
  normalize,
  subtract,
  add,
  multiply
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
  
  // MELHORIA: Adicionar variáveis para melhor jogabilidade
  lastFoodEatenTime: number;
  comboCounter: number;
  comboTimer: number;
  comboMultiplier: number;
  scorePopups: {position: Vector2D, text: string, color: string, time: number}[];
  
  constructor() {
    // Inicializar canvas
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    
    // Configurar componentes do jogo
    this.camera = new GameCamera(window.innerWidth, window.innerHeight);
    this.controls = new Controls(this.canvas, this.camera);
    this.renderer = new Renderer(this.canvas, this.camera);
    this.particleSystem = new ParticleSystem();
    
    // Inicializar estado do jogo
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
    this.playerColor = "#ff4655"; // Cor padrão do jogador
    this.humanPlayer = null;
    this.aiControllers = new Map();
    this.debugMode = false;
    
    // Temporizadores para geração de entidades
    this.foodSpawnTimer = 0;
    this.virusSpawnTimer = 0;
    this.powerUpSpawnTimer = 0;
    this.aiSpawnTimer = 0;
    this.gameTime = 0;
    this.difficultyLevel = 1;
    
    // MELHORIA: Inicializar variáveis de jogabilidade
    this.lastFoodEatenTime = 0;
    this.comboCounter = 0;
    this.comboTimer = 0;
    this.comboMultiplier = 1;
    this.scorePopups = [];
    
    // Configurar event listeners
    this.setupEventListeners();
    
    // Adicionar listener para atualizações imediatas da posição do mouse
      window.addEventListener('game-mouse-move', (e: any) => {
    if (this.humanPlayer) {
      // Sempre atualizar a posição do mouse
      this.humanPlayer.mousePosition = e.detail.position;
      this.humanPlayer.setTargetDirection(e.detail.position);
      
      // Verificar se o mouse está no centro para fusão automática
      const controls = this.controls;
      if ('isMouseInCenter' in controls && typeof controls.isMouseInCenter === 'function') {
        this.humanPlayer.isMouseInCenter = controls.isMouseInCenter();
      }
      
      // Forçar atualização da direção alvo para garantir movimento
      const avgPos = this.humanPlayer.getAveragePosition();
      const dir = {
        x: e.detail.position.x - avgPos.x,
        y: e.detail.position.y - avgPos.y
      };
      
      // Normalizar direção
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
    
    // Criar jogador humano com a cor selecionada
    const playerPos = {
      x: this.gameState.worldSize.x / 2,
      y: this.gameState.worldSize.y / 2
    };
    console.log("Criando jogador humano na posição:", playerPos);
    this.humanPlayer = new GamePlayer(this.playerName, playerPos, false, 30, this.playerColor);
        this.gameState.players.set(this.humanPlayer.id, this.humanPlayer);
    
    // Inicializar mundo do jogo
    this.initializeWorld();
    
    // Iniciar loop do jogo
    this.running = true;
    this.lastTime = performance.now();
    this.gameTime = 0;
    this.difficultyLevel = 1;
    
    // Definir posição inicial da câmera
    this.camera.position = { ...playerPos };
    this.camera.targetPosition = { ...playerPos };
    
    console.log("Jogo iniciado com sucesso");
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  restart(): void {
    // Limpar estado do jogo existente
    this.gameState.players.clear();
    this.gameState.food = [];
    this.gameState.viruses = [];
    this.gameState.powerUps = [];
    this.gameState.particles = [];
    this.aiControllers.clear();
    
    // Criar novo jogador humano
    const playerPos = {
      x: this.gameState.worldSize.x / 2,
      y: this.gameState.worldSize.y / 2
    };
    this.humanPlayer = new GamePlayer(this.playerName, playerPos, false, 30, this.playerColor);
    this.gameState.players.set(this.humanPlayer.id, this.humanPlayer);
    
    // Inicializar mundo do jogo
    this.initializeWorld();
    
    // Redefinir câmera
    this.camera.position = { ...playerPos };
    this.camera.targetPosition = { ...playerPos };
    this.camera.scale = 1;
    this.camera.targetScale = 1;
    
    // Redefinir temporizadores
    this.foodSpawnTimer = 0;
    this.virusSpawnTimer = 0;
    this.powerUpSpawnTimer = 0;
    this.aiSpawnTimer = 0;
    this.gameTime = 0;
    this.difficultyLevel = 1;
    
    // MELHORIA: Redefinir variáveis de jogabilidade
    this.lastFoodEatenTime = 0;
    this.comboCounter = 0;
    this.comboTimer = 0;
    this.comboMultiplier = 1;
    this.scorePopups = [];
    
    // Garantir que o jogo esteja em execução
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }
  
  showGameOver(): void {
    // Atualizar pontuação final
    const finalScoreElement = document.getElementById('final-score');
    if (finalScoreElement && this.humanPlayer) {
      finalScoreElement.textContent = this.humanPlayer.score.toString();
    }
    
    // Mostrar tela de fim de jogo
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
      // Calcular delta time
      const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Limitar a 100ms
      this.lastTime = timestamp;
      
      // Atualizar tempo do jogo
      this.gameTime += deltaTime;
      
      // Atualizar nível de dificuldade com base no tempo do jogo
      this.updateDifficulty();
      
      // Atualizar estado do jogo
      this.update(deltaTime);
      
      // Renderizar jogo
      this.renderer.render(this.gameState);
      
      // Continuar loop do jogo
      if (this.running) {
        requestAnimationFrame(this.gameLoop.bind(this));
      }
    } catch (error) {
      console.error("Erro no loop do jogo:", error);
      // Tentar recuperar e continuar
      this.lastTime = performance.now();
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }
  
  private updateDifficulty(): void {
    // MELHORIA: Progressão de dificuldade mais rápida
    // Aumentar dificuldade a cada 1,5 minutos (em vez de 2 minutos)
    const newLevel = Math.floor(this.gameTime / 90) + 1;
    
    if (newLevel > this.difficultyLevel) {
      this.difficultyLevel = newLevel;
      console.log(`Dificuldade aumentada para nível ${this.difficultyLevel}`);
      
      // Gerar mais vírus e jogadores de IA em dificuldades mais altas
      if (this.difficultyLevel > 1) {
        for (let i = 0; i < this.difficultyLevel - 1; i++) {
          this.spawnVirus();
        }
        
        if (this.difficultyLevel % 2 === 0) {
          this.spawnAI();
        }
      }
      
      // MELHORIA: Mostrar mensagem de aumento de dificuldade
      this.renderer.drawMessage(`Dificuldade aumentada para nível ${this.difficultyLevel}!`, 3);
    }
  }
  
  private update(deltaTime: number): void {
    // Atualizar controles
    this.controls.update();
    
    // Atualizar direção do jogador humano com base na posição do mouse
    if (this.humanPlayer && this.humanPlayer.cells.length > 0) {
      const mousePos = this.controls.getMousePosition();
      this.humanPlayer.setTargetDirection(mousePos);
    }
    
    // Atualizar todos os jogadores
    this.gameState.players.forEach(player => {
      try {
        player.update(deltaTime);
      } catch (error) {
        console.error("Erro ao atualizar jogador:", error);
      }
    });
    
    // Atualizar controladores de IA
    this.aiControllers.forEach(controller => {
      try {
        // Passar uma lista filtrada de entidades para evitar problemas indefinidos
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
    
    // Atualizar comida
    for (let i = 0; i < this.gameState.food.length; i++) {
      try {
        this.gameState.food[i].update(deltaTime);
      } catch (error) {
        console.error("Erro ao atualizar comida:", error);
        // Remover comida problemática
        this.gameState.food.splice(i, 1);
        i--;
      }
    }
    
    // Atualizar vírus
    for (let i = 0; i < this.gameState.viruses.length; i++) {
      try {
        this.gameState.viruses[i].update(deltaTime);
      } catch (error) {
        console.error("Erro ao atualizar vírus:", error);
        // Remover vírus problemático
        this.gameState.viruses.splice(i, 1);
        i--;
      }
    }
    
    // Atualizar power-ups
    for (let i = 0; i < this.gameState.powerUps.length; i++) {
      try {
        this.gameState.powerUps[i].update(deltaTime);
      } catch (error) {
        console.error("Erro ao atualizar power-up:", error);
        // Remover power-up problemático
        this.gameState.powerUps.splice(i, 1);
        i--;
      }
    }
    
    // Atualizar partículas
    try {
      this.particleSystem.update(deltaTime);
      this.gameState.particles = this.particleSystem.particles;
    } catch (error) {
      console.error("Erro ao atualizar partículas:", error);
      // Limpar partículas em caso de erro
      this.particleSystem = new ParticleSystem();
      this.gameState.particles = [];
    }
    
    // MELHORIA: Atualizar sistema de combo
    this.updateComboSystem(deltaTime);
    
    // Verificar colisões
    this.checkCollisions();
    
    // Atualizar câmera para seguir o jogador humano
    if (this.humanPlayer && this.humanPlayer.cells.length > 0) {
      const playerPos = this.humanPlayer.getAveragePosition();
      const maxRadius = this.humanPlayer.getMaxRadius();
      this.camera.follow(playerPos, maxRadius);
    }
    
    // Atualizar câmera
    this.camera.update(deltaTime);
    
    // Atualizar temporizadores de geração
    this.updateSpawnTimers(deltaTime);
    
    // Atualizar leaderboard
    this.updateLeaderboard();
    
    // Verificar se o jogador humano está morto
    if (this.humanPlayer && this.humanPlayer.cells.length === 0) {
      this.handlePlayerDeath();
    }
    
    // Manter entidades dentro dos limites do mundo
    this.enforceWorldBounds();
    
    // Informações de depuração
    if (this.debugMode) {
      this.showDebugInfo();
    }
  }
  
  // MELHORIA: Sistema de combo para pontuação
  private updateComboSystem(deltaTime: number): void {
    // Atualizar temporizador de combo
    if (this.comboCounter > 0) {
      this.comboTimer -= deltaTime;
      
      if (this.comboTimer <= 0) {
        // Redefinir combo
        this.comboCounter = 0;
        this.comboMultiplier = 1;
      }
    }
    
    // Atualizar popups de pontuação
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const popup = this.scorePopups[i];
      popup.time -= deltaTime;
      
      if (popup.time <= 0) {
        this.scorePopups.splice(i, 1);
      }
    }
  }
  
  private updateSpawnTimers(deltaTime: number): void {
    // Atualizar temporizador de geração de comida
    this.foodSpawnTimer -= deltaTime;
    if (this.foodSpawnTimer <= 0) {
      this.spawnFood();
      // Redefinir temporizador (geração mais rápida em dificuldades mais altas)
      this.foodSpawnTimer = 0.5 / this.difficultyLevel;
    }
    
    // Atualizar temporizador de geração de vírus
    this.virusSpawnTimer -= deltaTime;
    if (this.virusSpawnTimer <= 0 && this.gameState.viruses.length < 20 + this.difficultyLevel * 2) {
      this.spawnVirus();
      // Redefinir temporizador
      this.virusSpawnTimer = 15 - this.difficultyLevel;
    }
    
    // Atualizar temporizador de geração de power-up
    this.powerUpSpawnTimer -= deltaTime;
    if (this.powerUpSpawnTimer <= 0) {
      this.spawnPowerUp();
      // Redefinir temporizador
      this.powerUpSpawnTimer = 20 - this.difficultyLevel * 2;
    }
    
    // Atualizar temporizador de geração de IA
    this.aiSpawnTimer -= deltaTime;
    if (this.aiSpawnTimer <= 0 && this.gameState.players.size < 15 + this.difficultyLevel) {
      this.spawnAI();
      // Redefinir temporizador
      this.aiSpawnTimer = 30 - this.difficultyLevel * 3;
    }
  }
  
  private handlePlayerDeath(): void {
    // Mostrar tela de fim de jogo
    this.showGameOver();
    
    // Criar efeito de explosão na última posição do jogador
    if (this.humanPlayer) {
      const lastPosition = this.humanPlayer.getAveragePosition();
      this.particleSystem.createExplosion(
        lastPosition,
        this.humanPlayer.color,
        50,  // Mais partículas para efeito dramático
        20   // Partículas maiores
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
    
    // Gerar comida inicial
    for (let i = 0; i < 1000; i++) {
      this.spawnFoodItem();
    }
    
    // Gerar vírus
    for (let i = 0; i < 20; i++) {
      this.spawnVirus();
    }
    
    // Gerar jogadores de IA
    for (let i = 0; i < 10; i++) {
      this.spawnAI();
    }
    
    // Gerar power-ups iniciais
    for (let i = 0; i < 5; i++) {
      this.spawnPowerUp();
    }
    
    // Inicializar temporizadores
    this.foodSpawnTimer = 0.5;
    this.virusSpawnTimer = 15;
    this.powerUpSpawnTimer = 20;
    this.aiSpawnTimer = 30;
  }
  
  private spawnFood(): void {
    // Manter uma quantidade mínima de comida
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
      // Garantir que estamos usando o formato correto para randomPosition
      const position = randomPosition(this.gameState.worldSize);
      const food = new GameFood(position);
      this.gameState.food.push(food);
    } catch (error) {
      console.error("Erro ao gerar comida:", error);
    }
  }
  
  private spawnVirus(): void {
    try {
      // Evitar gerar vírus muito próximos ao jogador
      let position;
      let tooClose = true;
      let attempts = 0;
      
      while (tooClose && attempts < 10) {
        position = randomPosition(this.gameState.worldSize);
        tooClose = false;
        
        // Verificar distância até o jogador humano
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
      const type = Math.floor(Math.random() * 4) as PowerUpType; // 0-3 para diferentes tipos
      const powerUp = new GamePowerUp(position, type);
      this.gameState.powerUps.push(powerUp);
    } catch (error) {
      console.error("Erro ao gerar power-up:", error);
    }
  }
  
  private spawnAI(): void {
    try {
      // Criar jogador de IA com posição e nome aleatórios
      const position = randomPosition(this.gameState.worldSize);
      
      // Nomes de IA baseados no nível de dificuldade
      const aiNames = [
        ["Amoeba", "Blob", "Cell", "Dot", "Eater", "Feeder", "Germ", "Hunter"],
        ["Predator", "Stalker", "Tracker", "Virus", "Watcher", "Xenophage", "Yapper", "Zapper"],
        ["Devourer", "Eliminator", "Frenzy", "Glutton", "Harvester", "Impaler", "Juggernaut", "Killer"]
      ];
      
      const nameList = aiNames[Math.min(this.difficultyLevel - 1, aiNames.length - 1)];
      const aiName = nameList[Math.floor(Math.random() * nameList.length)] + Math.floor(Math.random() * 100);
      
      // Massa inicial maior para IAs em dificuldades mais altas
      const startingRadius = 30 + (this.difficultyLevel - 1) * 5;
      
      // Cor aleatória para IA
      const aiColor = randomColor();
      
      const aiPlayer = new GamePlayer(aiName, position, true, startingRadius, aiColor);
      
      // Adicionar ao estado do jogo
      this.gameState.players.set(aiPlayer.id, aiPlayer);
      
      // Criar controlador de IA com agressividade baseada na dificuldade
      const aiController = new AIController(aiPlayer, this.gameState.worldSize, this.difficultyLevel);
      this.aiControllers.set(aiPlayer.id, aiController);
    } catch (error) {
      console.error("Erro ao gerar IA:", error);
    }
  }
  
  private checkCollisions(): void {
    try {
      // Verificar colisões jogador-comida
      this.checkPlayerFoodCollisions();
      
      // Verificar colisões jogador-jogador
      this.checkPlayerPlayerCollisions();
      
      // Verificar colisões jogador-vírus
      this.checkPlayerVirusCollisions();
      
      // Verificar colisões jogador-powerup
      this.checkPlayerPowerUpCollisions();
      
      // Verificar colisões de massa ejetada com vírus
      this.checkEjectedMassVirusCollisions();
    } catch (error) {
      console.error("Erro ao verificar colisões:", error);
    }
  }
  
  private checkPlayerFoodCollisions(): void {
    // Para cada jogador
    this.gameState.players.forEach(player => {
      // Pular se o jogador não tiver células
      if (!player.cells || player.cells.length === 0) return;
      
      // Para cada célula do jogador
      for (const cell of player.cells) {
        // Pular se a célula for inválida
        if (!cell || !cell.position || typeof cell.radius !== 'number') continue;
        
        // Verificar colisão com cada item de comida
        for (let i = this.gameState.food.length - 1; i >= 0; i--) {
          const food = this.gameState.food[i];
          
          // Pular se a comida for inválida
          if (!food || !food.position || typeof food.radius !== 'number') {
            this.gameState.food.splice(i, 1);
            continue;
          }
          
          if (checkCollision(cell, food)) {
            // Jogador come comida
            cell.mass += food.value;
            cell.radius = radiusFromMass(cell.mass);
            
            // Atualizar pontuação do jogador
            if (!player.isAI) {
              // MELHORIA: Sistema de combo para pontuação
              const now = Date.now();
              const timeSinceLastFood = (now - this.lastFoodEatenTime) / 1000;
              this.lastFoodEatenTime = now;
              
              // Se comeu comida rapidamente, aumentar combo
              if (timeSinceLastFood < 1.0) {
                this.comboCounter++;
                this.comboMultiplier = Math.min(5, 1 + this.comboCounter * 0.1);
                this.comboTimer = 2.0; // 2 segundos para manter o combo
              } else {
                // Redefinir combo se demorou muito
                this.comboCounter = 1;
                this.comboMultiplier = 1;
                this.comboTimer = 2.0;
              }
              
              // Calcular pontuação com multiplicador de combo
              const baseScore = Math.ceil(food.value);
              const comboScore = Math.ceil(baseScore * this.comboMultiplier);
              player.score += comboScore;
              player.recordFoodEaten();
              
              // Criar popup de pontuação
              this.createScorePopup(food.position, comboScore, this.comboCounter > 1);
            }
            
            // Criar efeito de partícula
            this.particleSystem.createSplash(
              food.position,
              food.color,
              { x: cell.position.x - food.position.x, y: cell.position.y - food.position.y },
              5
            );
            
            // Remover comida
            this.gameState.food.splice(i, 1);
          }
        }
      }
    });
  }
  
  // MELHORIA: Popup de pontuação melhorado
  private createScorePopup(position: Vector2D, score: number, isCombo: boolean = false): void {
    const screenPos = this.camera.worldToScreen(position);
    
    // Adicionar ao array de popups para renderização
    const color = isCombo ? '#ffff00' : '#ffffff'; // Amarelo para combos
    const text = isCombo ? `+${score} x${this.comboCounter}` : `+${score}`;
    
    this.scorePopups.push({
      position: { ...position },
      text: text,
      color: color,
      time: 1.5 // 1.5 segundos de duração
    });
    
    // Criar elemento DOM para popup de pontuação
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = text;
    popup.style.left = `${screenPos.x}px`;
    popup.style.top = `${screenPos.y}px`;
    popup.style.color = color;
    
    // Adicionar ao documento
    document.body.appendChild(popup);
    
    // Remover após a animação ser concluída
    setTimeout(() => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    }, 1500);
  }
// src/game.ts - Parte 2: Melhorias na jogabilidade e colisões (continuação)
  
  private checkPlayerPlayerCollisions(): void {
    const players = Array.from(this.gameState.players.values());
    
    // Verificar cada jogador contra todos os outros jogadores
    for (let i = 0; i < players.length; i++) {
      const playerA = players[i];
      
      for (let j = i + 1; j < players.length; j++) {
        const playerB = players[j];
        
        // Pular se ambos os jogadores tiverem um escudo
        if (playerA.hasEffect(PowerUpType.SHIELD) && playerB.hasEffect(PowerUpType.SHIELD)) {
          continue;
        }
        
        // Verificar cada célula do jogador A contra cada célula do jogador B
        for (let a = 0; a < playerA.cells.length; a++) {
          const cellA = playerA.cells[a];
          
          for (let b = 0; b < playerB.cells.length; b++) {
            const cellB = playerB.cells[b];
            
            // Verificar se as células estão colidindo
            if (checkCollision(cellA, cellB)) {
              // Se algum jogador tiver um escudo, eles quicam em vez de comer
              if (playerA.hasEffect(PowerUpType.SHIELD) || playerB.hasEffect(PowerUpType.SHIELD)) {
                this.cellsBounce(cellA, cellB);
                continue;
              }
              
              // MELHORIA: Ajustar a diferença de tamanho necessária para comer
              // Determinar qual célula é maior (reduzido de 1.1 para 1.05 para facilitar comer)
              if (cellA.mass > cellB.mass * 1.05) {
                // Célula A come Célula B
                this.cellEatsCell(cellA, cellB, playerA, playerB);
                
                // Remover célula B do jogador B
                playerB.cells.splice(b, 1);
                b--; // Ajustar índice após remoção
                
                // Verificar se o jogador B foi eliminado
                if (playerB.cells.length === 0) {
                  this.eliminatePlayer(playerB, playerA);
                }
              } else if (cellB.mass > cellA.mass * 1.05) {
                // Célula B come Célula A
                this.cellEatsCell(cellB, cellA, playerB, playerA);
                
                // Remover célula A do jogador A
                playerA.cells.splice(a, 1);
                a--; // Ajustar índice após remoção
                
                // Verificar se o jogador A foi eliminado
                if (playerA.cells.length === 0) {
                  this.eliminatePlayer(playerA, playerB);
                }
                
                // Quebrar loop interno já que a célula A não existe mais
                break;
              }
              // Se as células forem semelhantes em tamanho, elas quicam uma na outra
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
    // MELHORIA: Transferir massa com eficiência baseada na diferença de tamanho
    // Transferir massa com eficiência baseada na diferença de tamanho
    const sizeDifference = eater.mass / eaten.mass;
    // Aumentar eficiência para tornar o crescimento mais rápido
    const efficiencyFactor = Math.min(0.95, 0.8 + (sizeDifference - 1.05) * 0.05);
    
    eater.mass += eaten.mass * efficiencyFactor;
    eater.radius = radiusFromMass(eater.mass);
    
    // Conceder pontuação ao comedor
    if (!eaterPlayer.isAI) {
      const scoreGain = Math.ceil(eaten.mass);
      eaterPlayer.score += scoreGain;
      
      // MELHORIA: Bônus de pontuação para comer outros jogadores
      if (!eatenPlayer.isAI) {
        // Bônus extra para comer jogadores humanos
        const bonusScore = Math.ceil(scoreGain * 0.5);
        eaterPlayer.score += bonusScore;
        this.createScorePopup(eaten.position, scoreGain + bonusScore, true);
      } else {
        this.createScorePopup(eaten.position, scoreGain, false);
      }
    }
    
    // Criar efeito de partícula
    this.particleSystem.createExplosion(
      eaten.position,
      eaten.color,
      15,
      eaten.radius * 0.3
    );
    
    // Criar efeito de respingo na direção do consumo
    const direction = {
      x: eater.position.x - eaten.position.x,
      y: eater.position.y - eaten.position.y
    };
    this.particleSystem.createSplash(eaten.position, eaten.color, direction, 10);
  }
  
  private cellsBounce(cellA: any, cellB: any): void {
    // MELHORIA: Física de colisão melhorada
    // Calcular vetor de direção
    const dx = cellB.position.x - cellA.position.x;
    const dy = cellB.position.y - cellA.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) return; // Evitar divisão por zero
    
    // Normalizar direção
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Calcular velocidade relativa
    const dvx = cellB.velocity.x - cellA.velocity.x;
    const dvy = cellB.velocity.y - cellA.velocity.y;
    
    // Calcular impulso com física melhorada
    const impulse = 2 * (dvx * nx + dvy * ny) / (cellA.mass + cellB.mass);
    
    // MELHORIA: Aplicar impulso a ambas as células com um fator de impulso para quicar mais responsivo
    const boostFactor = 1.5; // Aumentado para quicar mais responsivo
    cellA.velocity.x += impulse * cellB.mass * nx * boostFactor;
    cellA.velocity.y += impulse * cellB.mass * ny * boostFactor;
    cellB.velocity.x -= impulse * cellA.mass * nx * boostFactor;
    cellB.velocity.y -= impulse * cellA.mass * ny * boostFactor;
    
    // Mover células para evitar que fiquem presas
    const overlap = cellA.radius + cellB.radius - dist;
    if (overlap > 0) {
      const moveX = nx * overlap * 0.5;
      const moveY = ny * overlap * 0.5;
      
      cellA.position.x -= moveX;
      cellA.position.y -= moveY;
      cellB.position.x += moveX;
      cellB.position.y += moveY;
    }
    
    // Criar efeito de partícula no ponto de colisão
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
    // Criar efeito de explosão
    const position = eliminated.getAveragePosition();
    this.particleSystem.createExplosion(position, eliminated.color, 30, 10);
    
    // Conceder pontuação bônus ao eliminador se for o jogador humano
    if (!eliminator.isAI) {
      // MELHORIA: Bônus de pontuação maior para eliminar jogadores
      const bonusScore = 1000 + Math.floor(eliminated.score * 0.3); // Aumentado de 0.2 para 0.3
      eliminator.score += bonusScore;
      
      // Criar popup de pontuação
      this.createScorePopup(position, bonusScore, true);
      
      // MELHORIA: Mostrar mensagem de eliminação
      if (!eliminated.isAI) {
        this.renderer.drawMessage(`Você eliminou ${eliminated.name}!`, 3);
      }
    } else if (!eliminated.isAI) {
      // MELHORIA: Mostrar quem eliminou o jogador humano
      this.renderer.drawMessage(`Você foi eliminado por ${eliminator.name}!`, 3);
    }
    
    // Remover jogador do estado do jogo
    this.gameState.players.delete(eliminated.id);
    
    // Remover controlador de IA se for um jogador de IA
    if (eliminated.isAI) {
      this.aiControllers.delete(eliminated.id);
      
      // Gerar uma nova IA para substituir a eliminada
      setTimeout(() => this.spawnAI(), 2000);
    }
  }
  
  private checkPlayerVirusCollisions(): void {
    // Para cada jogador
    this.gameState.players.forEach(player => {
      // Pular jogadores com escudo
      if (player.hasEffect(PowerUpType.SHIELD)) return;
      
      // Para cada célula do jogador
      for (let i = 0; i < player.cells.length; i++) {
        const cell = player.cells[i];
        
        // Verificar colisão com cada vírus
        for (let j = this.gameState.viruses.length - 1; j >= 0; j--) {
          const virus = this.gameState.viruses[j];
          
          if (checkCollision(cell, virus)) {
            // Verificar se a célula é grande o suficiente para ser dividida pelo vírus
            if (virus.canSplit(cell)) {
              // Dividir a célula em várias células menores
              this.virusSplitCell(cell, player, virus);
              
              // Remover vírus
              this.gameState.viruses.splice(j, 1);
              
              // Gerar um novo vírus em outro lugar
              setTimeout(() => this.spawnVirus(), 5000);
              
              // Quebrar já que esta célula foi processada
              break;
            }
          }
        }
      }
    });
  }
  
  private virusSplitCell(cell: any, player: Player, virus: any): void {
    // Remover a célula original
    const cellIndex = player.cells.indexOf(cell);
    if (cellIndex === -1) return;
    
    player.cells.splice(cellIndex, 1);
    
    // MELHORIA: Ajustar o número de células para divisão mais explosiva
    // Calcular quantas células dividir
    const cellMass = cell.mass;
    const newCellCount = Math.min(Math.floor(cellMass / 15), 16); // Reduzido de 20 para 15 para mais células
    const newCellMass = cellMass / newCellCount;
    const newCellRadius = radiusFromMass(newCellMass);
    
    // Criar efeito de explosão
    this.particleSystem.createExplosion(
      cell.position,
      cell.color,
      20,
      cell.radius * 0.3
    );
    
    // Criar novas células em direções aleatórias
    for (let i = 0; i < newCellCount; i++) {
      const angle = (i / newCellCount) * Math.PI * 2;
      const distance = cell.radius;
      
      const newPos = {
        x: cell.position.x + Math.cos(angle) * distance,
        y: cell.position.y + Math.sin(angle) * distance
      };
      
      // Adicionar nova célula ao jogador
      const newCell = player.addCell(newPos, newCellRadius);
      
      // Aplicar velocidade na direção da divisão
      if (newCell) {
        // MELHORIA: Velocidade de ejeção mais alta para divisão mais explosiva
        newCell.velocity = {
          x: Math.cos(angle) * 300, // Aumentado de 200 para 300
          y: Math.sin(angle) * 300  // Aumentado de 200 para 300
        };
        
        // Definir temporizador de fusão
        newCell.canMerge = false;
        newCell.mergeTime = 10;
      }
    }
    
    // MELHORIA: Atualizar estatísticas e mostrar mensagem
    if (!player.isAI) {
      player.recordVirusHit();
      this.renderer.drawMessage("Seu célula foi dividida por um vírus!", 2);
    }
  }
  
  private checkPlayerPowerUpCollisions(): void {
    // Para cada jogador
    this.gameState.players.forEach(player => {
      // Para cada célula do jogador
      for (const cell of player.cells) {
        // Verificar colisão com cada power-up
        for (let i = this.gameState.powerUps.length - 1; i >= 0; i--) {
          const powerUp = this.gameState.powerUps[i];
          
          if (checkCollision(cell, powerUp)) {
            // Aplicar efeito de power-up
            powerUp.apply(player);
            
            // MELHORIA: Efeito de partícula melhorado
            this.particleSystem.createPowerUpEffect(powerUp.position, powerUp.color);
            
            // Remover power-up
            this.gameState.powerUps.splice(i, 1);
            
            // MELHORIA: Mostrar mensagem de power-up
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
    // Verificar colisões de massa ejetada (comida com velocidade) com vírus
    for (let i = 0; i < this.gameState.food.length; i++) {
      const food = this.gameState.food[i];
      
      // Só verificar comida que está se movendo (massa ejetada)
      if (food.velocity.x === 0 && food.velocity.y === 0) continue;
      
      for (let j = 0; j < this.gameState.viruses.length; j++) {
        const virus = this.gameState.viruses[j];
        
        if (checkCollision(food, virus)) {
          // Vírus cresce quando atingido por massa ejetada
          virus.grow();
          
          // Remover a massa ejetada
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
    
    // Verificação de segurança para dimensões do mundo
    if (typeof worldWidth !== 'number' || typeof worldHeight !== 'number' ||
        worldWidth <= 0 || worldHeight <= 0) {
      console.error("Dimensões de mundo inválidas:", this.gameState.worldSize);
      return;
    }
    
    // Para cada jogador
    this.gameState.players.forEach(player => {
      // Pular se o jogador não tiver células
      if (!player.cells || player.cells.length === 0) return;
      
      // Para cada célula do jogador
      for (const cell of player.cells) {
        // Pular se a célula for inválida
        if (!cell || !cell.position || typeof cell.radius !== 'number') continue;
        
        // MELHORIA: Manter célula dentro dos limites do mundo com quique mais responsivo
        if (cell.position.x - cell.radius < 0) {
          cell.position.x = cell.radius;
          cell.velocity.x = Math.abs(cell.velocity.x) * 0.8; // Quicar com 80% da velocidade
        } else if (cell.position.x + cell.radius > worldWidth) {
          cell.position.x = worldWidth - cell.radius;
          cell.velocity.x = -Math.abs(cell.velocity.x) * 0.8; // Quicar com 80% da velocidade
        }
        
        if (cell.position.y - cell.radius < 0) {
          cell.position.y = cell.radius;
          cell.velocity.y = Math.abs(cell.velocity.y) * 0.8; // Quicar com 80% da velocidade
        } else if (cell.position.y + cell.radius > worldHeight) {
          cell.position.y = worldHeight - cell.radius;
          cell.velocity.y = -Math.abs(cell.velocity.y) * 0.8; // Quicar com 80% da velocidade
        }
      }
    });
    
    // Também aplicar limites para vírus
    for (const virus of this.gameState.viruses) {
      // Pular se o vírus for inválido
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
    
    // Aplicar limites para comida
    for (const food of this.gameState.food) {
      // Pular se a comida for inválida
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
    
    // Aplicar limites para power-ups
    for (const powerUp of this.gameState.powerUps) {
      // Pular se o powerUp for inválido
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
    // Converter jogadores para array e ordenar por pontuação
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
      .slice(0, 10); // Top 10 jogadores
    
    this.gameState.leaderboard = players;
    
    // Atualizar UI do leaderboard
    const leaderboardElement = document.getElementById('leaderboard-content');
    if (leaderboardElement) {
      leaderboardElement.innerHTML = '';
      
      players.forEach((player, index) => {
        const entry = document.createElement('div');
        
        // Destacar jogador humano
        if (player.isHuman) {
          entry.style.color = '#ffff00'; // Amarelo para jogador humano
          entry.style.fontWeight = 'bold';
        }
        
        // Adicionar indicador de cor
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
    
    // Atualizar estatísticas para jogador humano
    if (this.humanPlayer) {
      const scoreElement = document.getElementById('score');
      const sizeElement = document.getElementById('size');
      
      if (scoreElement) scoreElement.textContent = this.humanPlayer.score.toString();
      if (sizeElement) sizeElement.textContent = this.humanPlayer.cells.length.toString();
      
      // MELHORIA: Mostrar multiplicador de combo se ativo
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
          comboElement.style.color = '#ffff00'; // Amarelo para destacar
        }
      } else {
        // Remover elemento de combo se não estiver ativo
        const comboElement = document.getElementById('combo-multiplier');
        if (comboElement && comboElement.parentNode) {
          comboElement.parentNode.removeChild(comboElement);
        }
      }
    }
  }
  
  private getAllEntities(): Entity[] {
    // Combinar todas as entidades para tomada de decisão da IA
    return [
      ...Array.from(this.gameState.players.values()),
      ...this.gameState.food,
      ...this.gameState.viruses,
      ...this.gameState.powerUps
    ];
  }
  
  private setupEventListeners(): void {
    // Ouvir evento de divisão do jogador
    window.addEventListener('player-split', () => {
      if (this.humanPlayer) {
        this.humanPlayer.split();
      }
    });
    
    // Ouvir evento de ejeção do jogador
    window.addEventListener('player-eject', () => {
      if (this.humanPlayer) {
        this.humanPlayer.eject();
      }
    });
    
    // Ouvir evento de massa ejetada
    window.addEventListener('player-ejected-mass', (e: any) => {
      const detail = e.detail;
      
      // Criar item de comida para massa ejetada
      const food = new GameFood(detail.position);
      food.velocity = detail.velocity;
      food.radius = detail.radius;
      food.color = detail.color;
      food.value = Math.PI * detail.radius * detail.radius;
      
      this.gameState.food.push(food);
      
      // Criar efeito de rastro
      this.particleSystem.createTrail(detail.position, detail.color, detail.radius * 0.5);
    });
    
    // Ouvir evento de divisão de vírus
    window.addEventListener('virus-split', (e: any) => {
      const detail = e.detail;
      
      // Criar novo vírus
      const virus = new GameVirus(detail.position);
      virus.velocity = detail.velocity;
      
      this.gameState.viruses.push(virus);
    });
    
    // Ouvir evento de power-up coletado
    window.addEventListener('power-up-collected', (e: any) => {
      const detail = e.detail;
      
      // Criar efeito de partícula
      this.particleSystem.createPowerUpEffect(detail.position, detail.color);
      
      // Gerar um novo power-up para substituir o coletado
      setTimeout(() => this.spawnPowerUp(), 10000);
    });
    
    // Ouvir redimensionamento da janela
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    // Ouvir novos eventos personalizados
    window.addEventListener('player-split-success', (e: any) => {
      // Poderia adicionar efeitos sonoros ou feedback visual adicional aqui
      console.log("Jogador dividiu com sucesso:", e.detail.newCellCount, "novas células");
    });
    
    window.addEventListener('player-eject-success', (e: any) => {
      // Poderia adicionar efeitos sonoros ou feedback visual adicional aqui
      console.log("Jogador ejetou massa:", e.detail.ejectedCount, "peças");
    });
    
    window.addEventListener('player-powerup-applied', (e: any) => {
      // Poderia adicionar efeitos sonoros ou feedback visual adicional aqui
      console.log("Jogador obteve power-up:", PowerUpType[e.detail.type], "por", e.detail.duration, "segundos");
    });
    
    // Ouvir solicitações de entidades da IA
    window.addEventListener('ai-request-entities', (e: any) => {
      const detail = e.detail;
      const aiId = detail.aiId;
      const position = detail.position;
      const range = detail.range;
      
      // Obter entidades dentro do alcance
      const entities = this.getAllEntities().filter(entity => {
        if (entity.id === aiId) return false; // Pular a si mesmo
        
        const dist = distance(position, entity.position);
        return dist < range;
      });
      
      // Despachar evento de resposta
      const responseEvent = new CustomEvent('ai-entities-response', {
        detail: {
          aiId: aiId,
          entities: entities
        }
      });
      window.dispatchEvent(responseEvent);
    });
    
    // Ouvir evento de células fundidas
    window.addEventListener('cells-merged', (e: any) => {
      const detail = e.detail;
      
      // Criar efeito de fusão
      this.particleSystem.createCellMergeEffect(
        detail.position1,
        detail.position2,
        detail.color
      );
    });
    
    // Ouvir evento de crescimento de vírus
    window.addEventListener('virus-grew', (e: any) => {
      const detail = e.detail;
      
      // Criar efeito de crescimento
      this.particleSystem.createVirusGrowthEffect(
        detail.position,
        detail.stage
      );
    });
    
    // Ouvir evento de popup de texto
    window.addEventListener('create-text-popup', (e: any) => {
      const detail = e.detail;
      
      // Criar popup de texto
      this.particleSystem.createScorePopup(
        detail.position,
        detail.text,
        detail.color
      );
    });
    
    // MELHORIA: Adicionar eventos para teclas de atalho
    window.addEventListener('keydown', (e) => {
      // Tecla 'M' para alternar minimapa
      if (e.key.toLowerCase() === 'm') {
        this.renderer.toggleMinimap();
      }
      
      // Tecla 'F' para alternar exibição de FPS
      if (e.key.toLowerCase() === 'f') {
        this.renderer.toggleFPS();
      }
      
      // Tecla 'R' para reiniciar rapidamente após a morte
      if (e.key.toLowerCase() === 'r' && this.humanPlayer && this.humanPlayer.cells.length === 0) {
        const gameOverScreen = document.getElementById('game-over');
        if (gameOverScreen) {
          gameOverScreen.style.display = 'none';
        }
        this.restart();
      }
    });
  }
  
  // MELHORIA: Métodos adicionais para melhorar a jogabilidade
  
  // Método para adicionar comida em uma área específica (útil para criar áreas de alto valor)
  createFoodCluster(position: Vector2D, radius: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      
      const foodPos = {
        x: position.x + Math.cos(angle) * distance,
        y: position.y + Math.sin(angle) * distance
      };
      
      // Garantir que a posição está dentro dos limites do mundo
      foodPos.x = Math.max(10, Math.min(this.gameState.worldSize.x - 10, foodPos.x));
      foodPos.y = Math.max(10, Math.min(this.gameState.worldSize.y - 10, foodPos.y));
      
            const food = new GameFood(foodPos);
      // Tornar a comida do cluster mais valiosa
      food.value *= 1.5;
      food.radius *= 1.2;
      this.gameState.food.push(food);
    }
    
    // Criar efeito visual para indicar o cluster
    this.particleSystem.createExplosion(position, '#ffffff', 20, 30);
  }
  
  // Método para criar eventos aleatórios para tornar o jogo mais interessante
  createRandomEvent(): void {
    const eventType = Math.floor(Math.random() * 5);
    
    switch (eventType) {
      case 0: // Chuva de comida
        const position = randomPosition(this.gameState.worldSize);
        this.createFoodCluster(position, 500, 100);
        this.renderer.drawMessage("Chuva de comida detectada!", 3);
        break;
        
      case 1: // Surto de vírus
        for (let i = 0; i < 5; i++) {
          this.spawnVirus();
        }
        this.renderer.drawMessage("Surto de vírus detectado!", 3);
        break;
        
      case 2: // Onda de power-ups
        for (let i = 0; i < 3; i++) {
          this.spawnPowerUp();
        }
        this.renderer.drawMessage("Power-ups detectados!", 3);
        break;
        
      case 3: // Zona de perigo (área com muitos vírus)
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
        
      case 4: // Invasão de IA
        for (let i = 0; i < 3; i++) {
          this.spawnAI();
        }
        this.renderer.drawMessage("Invasão de células detectada!", 3);
        break;
    }
  }
  
  // Método para criar uma zona segura para o jogador (útil para jogadores novos)
  createSafeZone(position: Vector2D, radius: number): void {
    // Remover vírus na área
    for (let i = this.gameState.viruses.length - 1; i >= 0; i--) {
      const virus = this.gameState.viruses[i];
      if (distance(virus.position, position) < radius) {
        this.gameState.viruses.splice(i, 1);
      }
    }
    
    // Remover jogadores de IA agressivos na área
    this.gameState.players.forEach((player, id) => {
      if (player.isAI) {
        const playerPos = player.getAveragePosition();
        if (distance(playerPos, position) < radius) {
          // Mover o jogador de IA para longe
          const angle = Math.random() * Math.PI * 2;
          const newPos = {
            x: position.x + Math.cos(angle) * (radius + 500),
            y: position.y + Math.sin(angle) * (radius + 500)
          };
          
          // Garantir que a nova posição está dentro dos limites do mundo
          newPos.x = Math.max(100, Math.min(this.gameState.worldSize.x - 100, newPos.x));
          newPos.y = Math.max(100, Math.min(this.gameState.worldSize.y - 100, newPos.y));
          
          // Teleportar cada célula do jogador de IA
          for (const cell of player.cells) {
            cell.position = { ...newPos };
          }
        }
      }
    });
    
    // Adicionar comida na área
    this.createFoodCluster(position, radius * 0.8, 50);
    
    // Efeito visual
    this.particleSystem.createExplosion(position, '#00ff00', 30, 20);
    
    // Mostrar mensagem
    this.renderer.drawMessage("Zona segura criada!", 3);
  }
  
  // Método para ajudar jogadores que estão tendo dificuldades
  helpStrugglingPlayer(): void {
    if (!this.humanPlayer || this.humanPlayer.cells.length === 0) return;
    
    // Verificar se o jogador está lutando (pontuação baixa, poucas células)
    if (this.humanPlayer.score < 100 && this.gameTime > 60) {
      // Criar uma zona segura ao redor do jogador
      this.createSafeZone(this.humanPlayer.getAveragePosition(), 500);
      
      // Dar um power-up aleatório
      const powerUpType = Math.floor(Math.random() * 4) as PowerUpType;
      this.humanPlayer.applyPowerUp(powerUpType, 15); // 15 segundos de duração
      
      // Mostrar mensagem de ajuda
      this.renderer.drawMessage("Reforços chegaram! Você recebeu ajuda.", 3);
    }
  }
  
  // Método para criar um chefe para desafiar jogadores avançados
  spawnBossAI(): void {
    // Só criar chefe se o jogador humano for forte o suficiente
    if (!this.humanPlayer || this.humanPlayer.score < 5000) return;
    
    // Posição longe do jogador, mas não muito longe
    const playerPos = this.humanPlayer.getAveragePosition();
    const angle = Math.random() * Math.PI * 2;
    const distance = 1000 + Math.random() * 500;
    
    const bossPos = {
      x: playerPos.x + Math.cos(angle) * distance,
      y: playerPos.y + Math.sin(angle) * distance
    };
    
    // Garantir que a posição está dentro dos limites do mundo
    bossPos.x = Math.max(100, Math.min(this.gameState.worldSize.x - 100, bossPos.x));
    bossPos.y = Math.max(100, Math.min(this.gameState.worldSize.y - 100, bossPos.y));
    
    // Criar jogador de IA do chefe
    const bossNames = ["Devorador", "Aniquilador", "Predador Alfa", "Ceifador", "Titã"];
    const bossName = bossNames[Math.floor(Math.random() * bossNames.length)];
    
    // Chefe começa grande
    const bossRadius = 100;
    const bossColor = "#ff0000"; // Vermelho para indicar perigo
    
    const bossPlayer = new GamePlayer(bossName, bossPos, true, bossRadius, bossColor);
    
    // Adicionar ao estado do jogo
    this.gameState.players.set(bossPlayer.id, bossPlayer);
    
    // Criar controlador de IA com dificuldade máxima
    const bossController = new AIController(bossPlayer, this.gameState.worldSize, 10); // Dificuldade 10 (muito alta)
    this.aiControllers.set(bossPlayer.id, bossController);
    
    // Mostrar mensagem de aviso
    this.renderer.drawMessage(`${bossName} entrou no jogo! Cuidado!`, 5);
    
    // Criar efeito visual
    this.particleSystem.createExplosion(bossPos, bossColor, 50, 30);
  }
}
