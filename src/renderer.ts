// src/renderer.ts - Versão melhorada para melhor desempenho visual
import { Camera, GameState, PowerUpType } from './types';
//import { lerpColor } from './utils'; // Import lerpColor //Comentando para evitar erros

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
  showFPS: boolean;

  // MELHORIA: Novas variáveis para efeitos visuais
  gridVisible: boolean;
  backgroundStyle: string; // 'pattern', 'gradient', 'solid'
  useBloom: boolean;
  bloomIntensity: number;
  messageQueue: {text: string, duration: number, startTime: number, color: string}[];
  particleEffects: {x: number, y: number, radius: number, color: string, life: number}[];

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!; // alpha: false para melhor desempenho
    this.camera = camera;
    this.gridSize = 50;
    this.gridColor = 'rgba(200, 200, 200, 0.2)';
    this.backgroundColor = '#0a0a1a'; // Fundo mais escuro para melhor contraste
    this.lastFrameTime = performance.now();
    this.fps = 60;

    // Configurações do minimapa
    this.showMinimap = true;
    this.minimapSize = 150;
    this.minimapOpacity = 0.7;

    // Padrão de fundo
    this.backgroundPattern = null;
    this.createBackgroundPattern();

    // Configurações de depuração
    this.showFPS = false;

    // MELHORIA: Inicializar novas variáveis
    this.gridVisible = true;
    this.backgroundStyle = 'pattern'; // Padrão inicial
    this.useBloom = true;
    this.bloomIntensity = 0.3;
    this.messageQueue = [];
    this.particleEffects = [];

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    // Definir tamanho do canvas para corresponder à janela
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Atualizar dimensões da câmera
    if ('resize' in this.camera) {
      (this.camera as any).resize(this.canvas.width, this.canvas.height);
    }

    // Recriar padrão de fundo após redimensionamento
    this.createBackgroundPattern();

    // MELHORIA: Configurar contexto para melhor qualidade
    this.setupContext();
  }

  // MELHORIA: Configurar contexto para melhor qualidade
  setupContext(): void {
    // Desativar suavização para pixels nítidos em células pequenas
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Configurar fonte padrão
    this.ctx.font = '14px Rajdhani';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center';
  }

  createBackgroundPattern(): void {
    try {
      // Criar um pequeno canvas para o padrão
      const patternCanvas = document.createElement('canvas');
      const patternCtx = patternCanvas.getContext('2d');

      if (!patternCtx) return;

      // Definir tamanho do padrão
      patternCanvas.width = 100;
      patternCanvas.height = 100;

      // Preencher com cor de fundo
      patternCtx.fillStyle = this.backgroundColor;
      patternCtx.fillRect(0, 0, 100, 100);

      // MELHORIA: Padrão de fundo mais interessante
      // Adicionar textura sutil
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 2 + 1;

        patternCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        patternCtx.beginPath();
        patternCtx.arc(x, y, size, 0, Math.PI * 2);
        patternCtx.fill();
      }

      // Adicionar grade sutil
      patternCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      patternCtx.lineWidth = 0.5;

      // Linhas verticais
      for (let x = 0; x <= 100; x += 20) {
        patternCtx.beginPath();
        patternCtx.moveTo(x, 0);
        patternCtx.lineTo(x, 100);
        patternCtx.stroke();
      }

      // Linhas horizontais
      for (let y = 0; y <= 100; y += 20) {
        patternCtx.beginPath();
        patternCtx.moveTo(0, y);
        patternCtx.lineTo(100, y);
        patternCtx.stroke();
      }

      // Adicionar alguns pontos brilhantes
      for (let i = 0; i < 5; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const radius = Math.random() * 1 + 0.5;

        const gradient = patternCtx.createRadialGradient(x, y, 0, x, y, radius * 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        patternCtx.fillStyle = gradient;
                patternCtx.beginPath();
        patternCtx.arc(x, y, radius * 2, 0, Math.PI * 2);
        patternCtx.fill();
      }

      // Criar padrão
      this.backgroundPattern = this.ctx.createPattern(patternCanvas, 'repeat');
    } catch (error) {
      console.error("Erro ao criar padrão de fundo:", error);
      this.backgroundPattern = null;
    }
  }

  render(gameState: GameState): void {
    try {
      // Calcular FPS
      const now = performance.now();
      const deltaTime = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.fps = Math.round(1000 / deltaTime);

      const ctx = this.ctx;

      // Limpar canvas
      ctx.fillStyle = this.backgroundPattern || this.backgroundColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Desenhar grade
      if (this.gridVisible) {
        this.drawGrid();
      }

      // Desenhar borda do mundo
      this.drawWorldBorder(gameState.worldSize);

      // MELHORIA: Usar camadas para renderização mais eficiente

      // 1. Desenhar comida (camada inferior)
      this.renderFoodLayer(gameState);

      // 2. Desenhar vírus
      this.renderVirusLayer(gameState);

      // 3. Desenhar power-ups
      this.renderPowerUpLayer(gameState);

      // 4. Desenhar jogadores (IA primeiro, depois jogador humano por cima)
      this.renderPlayerLayer(gameState);

      // 5. Desenhar partículas por cima
      this.renderParticleLayer(gameState);

      // 6. Desenhar efeitos de bloom se ativado
      if (this.useBloom) {
        this.applyBloomEffect();
      }

      // Desenhar minimapa
      if (this.showMinimap) {
        this.drawMinimap(gameState);
      }

      // Desenhar contador de FPS (se no modo de depuração)
      if ((window as any).debugMode || this.showFPS) {
        this.drawFPS();
      }

      // Desenhar mensagens na fila
      this.renderMessages();

      // Atualizar e renderizar efeitos de partículas
      this.updateParticleEffects(deltaTime / 1000);
    } catch (error) {
      console.error("Erro no renderizador:", error);
    }
  }

  // MELHORIA: Renderizar em camadas para melhor organização e desempenho

  private renderFoodLayer(gameState: GameState): void {
    // Otimização: Agrupar comida próxima para menos chamadas de desenho
    const foodClusters: Map<string, {count: number, avgX: number, avgY: number, color: string}> = new Map();
    const clusterSize = 30; // Tamanho de cada cluster em unidades do mundo

    // Apenas renderizar comida visível
    for (const food of gameState.food) {
      if (!this.camera.isInView(food.position, food.radius)) continue;

      try {
        // Para comida em movimento (massa ejetada), renderizar individualmente
        if (food.velocity.x !== 0 || food.velocity.y !== 0) {
          food.render(this.ctx, this.camera);
          continue;
        }

        // Agrupar comida estática em clusters
        const clusterX = Math.floor(food.position.x / clusterSize);
        const clusterY = Math.floor(food.position.y / clusterSize);
        const clusterKey = `${clusterX},${clusterY}`;

        if (!foodClusters.has(clusterKey)) {
          foodClusters.set(clusterKey, {
            count: 0,
            avgX: 0,
            avgY: 0,
            color: food.color
          });
        }

        const cluster = foodClusters.get(clusterKey)!;
        cluster.avgX += food.position.x;
        cluster.avgY += food.position.y;
        cluster.count++;
      } catch (error) {
        console.error("Erro ao renderizar comida:", error);
      }
    }

    // Renderizar clusters de comida
    foodClusters.forEach((cluster) => { // , key
      if (cluster.count === 0) return;

      const avgPos = {
        x: cluster.avgX / cluster.count,
        y: cluster.avgY / cluster.count
      };

      const screenPos = this.camera.worldToScreen(avgPos);

      // Desenhar cluster como uma única forma
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, 5 * this.camera.scale, 0, Math.PI * 2);

      // Usar gradiente para cluster
      try {
        const gradient = this.ctx.createRadialGradient(
          screenPos.x, screenPos.y, 0,
          screenPos.x, screenPos.y, 5 * this.camera.scale
        );
        gradient.addColorStop(0, cluster.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)');

        this.ctx.fillStyle = gradient;
      } catch (error) {
        this.ctx.fillStyle = cluster.color;
      }

      this.ctx.fill();

      // Indicar quantidade de comida no cluster
      if (cluster.count > 5 && this.camera.scale > 0.5) {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '10px Rajdhani';
        this.ctx.fillText(cluster.count.toString(), screenPos.x, screenPos.y);
      }
    });
  }

  private renderVirusLayer(gameState: GameState): void {
    for (const virus of gameState.viruses) {
      try {
        virus.render(this.ctx, this.camera);

        // MELHORIA: Adicionar efeito de brilho aos vírus
        if (this.useBloom) {
          const screenPos = this.camera.worldToScreen(virus.position);
          const screenRadius = virus.radius * this.camera.scale;

          this.ctx.beginPath();
          this.ctx.arc(screenPos.x, screenPos.y, screenRadius * 1.2, 0, Math.PI * 2);

          const gradient = this.ctx.createRadialGradient(
            screenPos.x, screenPos.y, screenRadius * 0.8,
            screenPos.x, screenPos.y, screenRadius * 1.2
          );
          gradient.addColorStop(0, 'rgba(0, 255, 0, 0.2)');
          gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');

          this.ctx.fillStyle = gradient;
          this.ctx.fill();
        }
      } catch (error) {
        console.error("Erro ao renderizar vírus:", error);
      }
    }
  }

  private renderPowerUpLayer(gameState: GameState): void {
    for (const powerUp of gameState.powerUps) {
      try {
        powerUp.render(this.ctx, this.camera);

        // MELHORIA: Adicionar efeito de brilho aos power-ups
        if (this.useBloom) {
          const screenPos = this.camera.worldToScreen(powerUp.position);
          const screenRadius = powerUp.radius * this.camera.scale;

          this.ctx.beginPath();
          this.ctx.arc(screenPos.x, screenPos.y, screenRadius * 1.5, 0, Math.PI * 2);

          const gradient = this.ctx.createRadialGradient(
            screenPos.x, screenPos.y, screenRadius,
            screenPos.x, screenPos.y, screenRadius * 1.5
          );
          gradient.addColorStop(0, `${powerUp.color}40`); // 25% opacidade
          gradient.addColorStop(1, `${powerUp.color}00`); // 0% opacidade

          this.ctx.fillStyle = gradient;
          this.ctx.fill();
        }
      } catch (error) {
        console.error("Erro ao renderizar power-up:", error);
      }
    }
  }

  private renderPlayerLayer(gameState: GameState): void {
    const players = Array.from(gameState.players.values());
    const aiPlayers = players.filter(p => p.isAI);
    const humanPlayers = players.filter(p => !p.isAI);

    // Renderizar jogadores de IA primeiro
    for (const player of aiPlayers) {
      try {
        // Pular jogadores invisíveis
        if (player.hasEffect(PowerUpType.INVISIBILITY)) continue;
        player.render(this.ctx, this.camera);
      } catch (error) {
        console.error("Erro ao renderizar jogador de IA:", error);
      }
    }

    // Renderizar jogadores humanos por cima
    for (const player of humanPlayers) {
      try {
        player.render(this.ctx, this.camera);

        // MELHORIA: Adicionar efeito de destaque ao jogador humano
        if (!player.hasEffect(PowerUpType.INVISIBILITY)) {
          const avgPos = player.getAveragePosition();
          const screenPos = this.camera.worldToScreen(avgPos);
          const maxRadius = player.getMaxRadius() * this.camera.scale;

          // Desenhar círculo de destaque sutil
          this.ctx.beginPath();
          this.ctx.arc(screenPos.x, screenPos.y, maxRadius * 1.1, 0, Math.PI * 2);
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        }
      } catch (error) {
        console.error("Erro ao renderizar jogador humano:", error);
      }
    }
  }

  private renderParticleLayer(gameState: GameState): void {
    for (const particle of gameState.particles) {
      try {
        particle.render(this.ctx, this.camera);
      } catch (error) {
        console.error("Erro ao renderizar partícula:", error);
      }
    }
  }

  // MELHORIA: Efeito de bloom para elementos brilhantes
  private applyBloomEffect(): void {
    // Implementação simplificada de bloom
    // Em uma implementação completa, usaríamos múltiplos passes e shaders

    // Reduzir intensidade do bloom com base na escala da câmera
    //const bloomScale = Math.min(1.0, this.camera.scale * 2) * this.bloomIntensity;

    // Aplicar blur ao canvas inteiro seria muito caro
    // Em vez disso, adicionamos efeitos de brilho a elementos específicos durante a renderização
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const camera = this.camera;

    // Calcular limites da grade com base na visualização da câmera
    const topLeft = camera.screenToWorld({ x: 0, y: 0 });
    const bottomRight = camera.screenToWorld({ x: this.canvas.width, y: this.canvas.height });

    const startX = Math.floor(topLeft.x / this.gridSize) * this.gridSize;
    const startY = Math.floor(topLeft.y / this.gridSize) * this.gridSize;
    const endX = Math.ceil(bottomRight.x / this.gridSize) * this.gridSize;
    const endY = Math.ceil(bottomRight.y / this.gridSize) * this.gridSize;

    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;

    // MELHORIA: Otimizar desenho da grade
    // Desenhar menos linhas quando afastado
    const skipFactor = Math.max(1, Math.floor(1 / camera.scale));

    // Desenhar linhas verticais
    for (let x = startX; x <= endX; x += this.gridSize * skipFactor) {
      const screenX = camera.worldToScreen({ x, y: 0 }).x;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, this.canvas.height);
      ctx.stroke();
    }

    // Desenhar linhas horizontais
    for (let y = startY; y <= endY; y += this.gridSize * skipFactor) {
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

    // Converter coordenadas do mundo para coordenadas da tela
    const topLeft = camera.worldToScreen({ x: 0, y: 0 });
    const bottomRight = camera.worldToScreen({ x: worldSize.x, y: worldSize.y });

    // Desenhar borda
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    ctx.stroke();

    // MELHORIA: Zona de perigo mais visível perto das bordas
    const dangerZoneSize = 100 * camera.scale;

    // Zona de perigo superior
    const gradient1 = ctx.createLinearGradient(0, topLeft.y, 0, topLeft.y + dangerZoneSize);
    gradient1.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradient1.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = gradient1;
    ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, dangerZoneSize);

    // Zona de perigo inferior
    const gradient2 = ctx.createLinearGradient(0, bottomRight.y - dangerZoneSize, 0, bottomRight.y);
    gradient2.addColorStop(0, 'rgba(255, 0, 0, 0)');
    gradient2.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
    ctx.fillStyle = gradient2;
    ctx.fillRect(topLeft.x, bottomRight.y - dangerZoneSize, bottomRight.x - topLeft.x, dangerZoneSize);

    // Zona de perigo esquerda
    const gradient3 = ctx.createLinearGradient(topLeft.x, 0, topLeft.x + dangerZoneSize, 0);
    gradient3.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradient3.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = gradient3;
    ctx.fillRect(topLeft.x, topLeft.y, dangerZoneSize, bottomRight.y - topLeft.y);

    // Zona de perigo direita
    const gradient4 = ctx.createLinearGradient(bottomRight.x - dangerZoneSize, 0, bottomRight.x, 0);
    gradient4.addColorStop(0, 'rgba(255, 0, 0, 0)');
    gradient4.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
    ctx.fillStyle = gradient4;
    ctx.fillRect(bottomRight.x - dangerZoneSize, topLeft.y, dangerZoneSize, bottomRight.y - topLeft.y);
  }

  private drawMinimap(gameState: GameState): void {
    const ctx = this.ctx;
    const worldSize = gameState.worldSize;

    // Calcular posição e tamanho do minimapa
    const padding = 10;
    const size = this.minimapSize;
    const x = this.canvas.width - size - padding;
    const y = this.canvas.height - size - padding;

    // MELHORIA: Minimapa mais atraente
    // Desenhar fundo do minimapa com borda arredondada
    ctx.fillStyle = `rgba(10, 10, 26, ${this.minimapOpacity})`;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;

    // Desenhar retângulo arredondado
    ctx.beginPath();
    ctx.moveTo(x + 5, y);
    ctx.lineTo(x + size - 5, y);
    ctx.quadraticCurveTo(x + size, y, x + size, y + 5);
    ctx.lineTo(x + size, y + size - 5);
    ctx.quadraticCurveTo(x + size, y + size, x + size - 5, y + size);
    ctx.lineTo(x + 5, y + size);
    ctx.quadraticCurveTo(x, y + size, x, y + size - 5);
    ctx.lineTo(x, y + 5);
    ctx.quadraticCurveTo(x, y, x + 5, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Calcular fator de escala
    const scaleX = size / worldSize.x;
    const scaleY = size / worldSize.y;

    // Desenhar grade no minimapa
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;

    // Linhas verticais da grade
    for (let gridX = 0; gridX <= worldSize.x; gridX += 500) {
      const minimapX = x + gridX * scaleX;
      ctx.beginPath();
      ctx.moveTo(minimapX, y);
      ctx.lineTo(minimapX, y + size);
      ctx.stroke();
    }

    // Linhas horizontais da grade
    for (let gridY = 0; gridY <= worldSize.y; gridY += 500) {
      const minimapY = y + gridY * scaleY;
      ctx.beginPath();
      ctx.moveTo(x, minimapY);
      ctx.lineTo(x + size, minimapY);
      ctx.stroke();
    }

    // MELHORIA: Renderizar clusters de comida no minimapa (para desempenho)
    const foodClusters: { [key: string]: { count: number, color: string } } = {};
    const clusterSize = 100; // Tamanho de cada cluster em unidades do mundo

    for (const food of gameState.food) {
      const clusterX = Math.floor(food.position.x / clusterSize);
      const clusterY = Math.floor(food.position.y / clusterSize);
      const clusterKey = `${clusterX},${clusterY}`;

      if (!foodClusters[clusterKey]) {
        foodClusters[clusterKey] = { count: 0, color: food.color };
      }

      foodClusters[clusterKey].count++;
    }

    // Desenhar clusters de comida
    for (const key in foodClusters) {
      const [clusterX, clusterY] = key.split(',').map(Number);
      const cluster = foodClusters[key];

      const minimapX = x + (clusterX * clusterSize + clusterSize / 2) * scaleX;
      const minimapY = y + (clusterY * clusterSize + clusterSize / 2) * scaleY;

      // Tamanho baseado na contagem de comida no cluster
      const dotSize = Math.min(3, 1 + Math.sqrt(cluster.count) * 0.2);

      ctx.beginPath();
      ctx.arc(minimapX, minimapY, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();
    }

    // Desenhar vírus no minimapa
    for (const virus of gameState.viruses) {
      const minimapX = x + virus.position.x * scaleX;
      const minimapY = y + virus.position.y * scaleY;

      ctx.beginPath();
      ctx.arc(minimapX, minimapY, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff00';
      ctx.fill();
    }

    // Desenhar power-ups no minimapa
    for (const powerUp of gameState.powerUps) {
      const minimapX = x + powerUp.position.x * scaleX;
      const minimapY = y + powerUp.position.y * scaleY;

      ctx.beginPath();
      ctx.arc(minimapX, minimapY, 3, 0, Math.PI * 2);
      ctx.fillStyle = powerUp.color;
      ctx.fill();
    }

    // Desenhar jogadores no minimapa
    const players = Array.from(gameState.players.values());

    for (const player of players) {
      // Pular jogadores invisíveis (exceto jogador humano)
      if (player.hasEffect(PowerUpType.INVISIBILITY) && player.isAI) continue;

      const pos = player.getAveragePosition();
      const minimapX = x + pos.x * scaleX;
      const minimapY = y + pos.y * scaleY;

      // MELHORIA: Tamanho do ponto baseado no tamanho do jogador
      const playerSize = Math.sqrt(player.getTotalMass()) * 0.05;
      const dotSize = Math.max(3, Math.min(6, playerSize));

      // Desenhar ponto do jogador
      ctx.beginPath();
      ctx.arc(minimapX, minimapY, player.isAI ? dotSize : dotSize + 1, 0, Math.PI * 2);
      ctx.fillStyle = player.color;
      ctx.fill();

      // Adicionar contorno para jogador humano
      if (!player.isAI) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Desenhar retângulo de visualização da câmera
    const cameraTopLeft = this.camera.screenToWorld({ x: 0, y: 0 });
    const cameraBottomRight = this.camera.screenToWorld({ x: this.canvas.width, y: this.canvas.height });

    const viewX = x + cameraTopLeft.x * scaleX;
    const viewY = y + cameraTopLeft.y * scaleY;
    const viewWidth = (cameraBottomRight.x - cameraTopLeft.x) * scaleX;
    const viewHeight = (cameraBottomRight.y - cameraTopLeft.y) * scaleY;

    // MELHORIA: Retângulo de visualização mais atraente
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]); // Linha tracejada
    ctx.strokeRect(viewX, viewY, viewWidth, viewHeight);
    ctx.setLineDash([]); // Restaurar linha sólida
  }

  private drawFPS(): void {
    const ctx = this.ctx;

    // MELHORIA: Exibição de FPS mais atraente
    ctx.font = 'bold 14px Rajdhani';
    ctx.fillStyle = this.fps > 50 ? '#00ff00' : this.fps > 30 ? '#ffff00' : '#ff0000';
    ctx.textAlign = 'left';
    ctx.fillText(`FPS: ${this.fps}`, 10, 20);
  }

  // MELHORIA: Sistema de mensagens na tela
  drawMessage(message: string, duration: number = 3, color: string = '#ffffff'): void {
    // Adicionar mensagem à fila
    this.messageQueue.push({
      text: message,
      duration: duration,
      startTime: Date.now() / 1000,
      color: color
    });
  }

  private renderMessages(): void {
    const ctx = this.ctx;
    const currentTime = Date.now() / 1000;

    // Remover mensagens expiradas
    this.messageQueue = this.messageQueue.filter(msg =>
      currentTime - msg.startTime < msg.duration
    );

    // Renderizar mensagens ativas
    let yOffset = 50;
    for (const msg of this.messageQueue) {
      const elapsedTime = currentTime - msg.startTime;
      const remainingTime = msg.duration - elapsedTime;

      // Calcular opacidade (fade in/out)
      let opacity = 1.0;
      if (elapsedTime < 0.5) {
        // Fade in
        opacity = elapsedTime / 0.5;
      } else if (remainingTime < 0.5) {
        // Fade out
        opacity = remainingTime / 0.5;
      }

      // Desenhar fundo da mensagem
      const textWidth = ctx.measureText(msg.text).width;
      const padding = 10;
      const boxWidth = textWidth + padding * 2;
      const boxHeight = 30;
      const boxX = (this.canvas.width - boxWidth) / 2;
      const boxY = yOffset - boxHeight / 2;

      ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.7})`;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 5);
      ctx.fill();

      // Desenhar borda
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Desenhar texto da mensagem
      ctx.font = 'bold 16px Rajdhani';
      ctx.fillStyle = `rgba(${msg.color}, ${opacity})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(msg.text, this.canvas.width / 2, yOffset);

      yOffset += 40;
    }
  }

  // MELHORIA: Efeitos de partículas personalizados
  addParticleEffect(x: number, y: number, radius: number, color: string, life: number = 1.0): void {
    this.particleEffects.push({
      x, y, radius, color, life
    });
  }

// Continuação de src/renderer.ts (Parte 2)

  private updateParticleEffects(deltaTime: number): void {
    const ctx = this.ctx;

    // Atualizar e renderizar efeitos de partículas
    for (let i = this.particleEffects.length - 1; i >= 0; i--) {
      const effect = this.particleEffects[i];

      // Atualizar vida
      effect.life -= deltaTime;

      // Remover efeitos expirados
      if (effect.life <= 0) {
        this.particleEffects.splice(i, 1);
        continue;
      }

      // Calcular opacidade baseada na vida restante
      const opacity = effect.life;

      // Renderizar efeito
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${effect.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
      ctx.fill();
    }
  }

  // MELHORIA: Métodos para alternar configurações visuais

  toggleMinimap(): void {
    this.showMinimap = !this.showMinimap;
    this.drawMessage(`Minimapa ${this.showMinimap ? 'ativado' : 'desativado'}`, 2);
  }

  toggleFPS(): void {
    this.showFPS = !this.showFPS;
    this.drawMessage(`FPS ${this.showFPS ? 'visível' : 'oculto'}`, 2);
  }

  toggleGrid(): void {
    this.gridVisible = !this.gridVisible;
    this.drawMessage(`Grade ${this.gridVisible ? 'visível' : 'oculta'}`, 2);
  }

  toggleBloom(): void {
    this.useBloom = !this.useBloom;
    this.drawMessage(`Efeito de brilho ${this.useBloom ? 'ativado' : 'desativado'}`, 2);
  }

  cycleBackgroundStyle(): void {
    const styles = ['pattern', 'gradient', 'solid'];
    const currentIndex = styles.indexOf(this.backgroundStyle);
    this.backgroundStyle = styles[(currentIndex + 1) % styles.length];

    // Atualizar fundo com base no novo estilo
    switch (this.backgroundStyle) {
      case 'pattern':
        this.createBackgroundPattern();
        break;
      case 'gradient':
        this.backgroundPattern = null;
        this.backgroundColor = 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)';
        break;
      case 'solid':
                this.backgroundPattern = null;
        this.backgroundColor = '#0a0a1a';
        break;
    }

    this.drawMessage(`Estilo de fundo: ${this.backgroundStyle}`, 2);
  }

  // MELHORIA: Método para desenhar contagem regressiva
  drawCountdown(seconds: number, callback: () => void): void {
    let remaining = seconds;

    const updateCountdown = () => {
      if (remaining <= 0) {
        callback();
        return;
      }

      // Desenhar contagem regressiva
      this.drawMessage(remaining.toString(), 1, '#ffff00');

      // Decrementar e continuar
      remaining--;
      setTimeout(updateCountdown, 1000);
    };

    updateCountdown();
  }

  // MELHORIA: Método para desenhar notificações de eventos
  drawEventNotification(event: string, position: {x: number, y: number}): void {
    const screenPos = this.camera.worldToScreen(position);

    // Adicionar efeito de partícula no local do evento
    this.addParticleEffect(
      screenPos.x,
      screenPos.y,
      30,
      '#ffffff',
      1.0
    );

    // Adicionar texto flutuante
    const ctx = this.ctx;
    ctx.font = 'bold 16px Rajdhani';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(event, screenPos.x, screenPos.y - 50);
  }

  // MELHORIA: Método para desenhar indicador de direção para objetos fora da tela
  drawOffscreenIndicator(worldPos: {x: number, y: number}, color: string): void {
    const ctx = this.ctx;
    const screenPos = this.camera.worldToScreen(worldPos);

    // Verificar se a posição está fora da tela
    if (screenPos.x >= 0 && screenPos.x <= this.canvas.width &&
        screenPos.y >= 0 && screenPos.y <= this.canvas.height) {
      return; // Objeto está na tela, não precisa de indicador
    }

    // Calcular ângulo para o objeto
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const angle = Math.atan2(screenPos.y - centerY, screenPos.x - centerX);

    // Calcular posição do indicador na borda da tela
    const borderPadding = 30;
    const indicatorRadius = 10;

    // Encontrar interseção com a borda da tela
    let indicatorX, indicatorY;

    // Verificar interseção com bordas horizontais
    if (screenPos.y < 0) {
      // Borda superior
      indicatorY = borderPadding;
      indicatorX = centerX + (indicatorY - centerY) * Math.cos(angle) / Math.sin(angle);
    } else if (screenPos.y > this.canvas.height) {
      // Borda inferior
      indicatorY = this.canvas.height - borderPadding;
      indicatorX = centerX + (indicatorY - centerY) * Math.cos(angle) / Math.sin(angle);
    }

    // Verificar se o indicador está fora das bordas horizontais
    if (indicatorX === undefined || indicatorX < borderPadding || indicatorX > this.canvas.width - borderPadding) {
      if (screenPos.x < 0) {
        // Borda esquerda
        indicatorX = borderPadding;
        indicatorY = centerY + (indicatorX - centerX) * Math.sin(angle) / Math.cos(angle);
      } else {
        // Borda direita
        indicatorX = this.canvas.width - borderPadding;
        indicatorY = centerY + (indicatorX - centerX) * Math.sin(angle) / Math.cos(angle);
      }
    }

    // Desenhar indicador, usando operador de coalescência nula para evitar undefined
    ctx.beginPath();
    ctx.arc(indicatorX ?? 0, indicatorY ?? 0, indicatorRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Desenhar seta apontando na direção do objeto
    ctx.beginPath();
    ctx.moveTo(
      (indicatorX ?? 0) + Math.cos(angle) * indicatorRadius * 1.5,
      (indicatorY ?? 0) + Math.sin(angle) * indicatorRadius * 1.5
    );
    ctx.lineTo(
      (indicatorX ?? 0) + Math.cos(angle + 2.5) * indicatorRadius,
      (indicatorY ?? 0) + Math.sin(angle + 2.5) * indicatorRadius
    );
    ctx.lineTo(
      (indicatorX ?? 0) + Math.cos(angle - 2.5) * indicatorRadius,
      (indicatorY ?? 0) + Math.sin(angle - 2.5) * indicatorRadius
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // MELHORIA: Método para desenhar efeito de dano/cura
  drawDamageEffect(intensity: number = 0.5): void {
    const ctx = this.ctx;

    // Desenhar overlay vermelho para efeito de dano
    ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.3})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Adicionar vinheta
    const gradient = ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 1.5
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.7})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawHealEffect(intensity: number = 0.5): void {
    const ctx = this.ctx;

    // Desenhar overlay verde para efeito de cura
    ctx.fillStyle = `rgba(0, 255, 0, ${intensity * 0.2})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Adicionar brilho no centro
    const gradient = ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.3})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // MELHORIA: Método para desenhar tutorial/dicas
  drawTutorialTip(tip: string, position: {x: number, y: number} = {x: this.canvas.width / 2, y: 100}): void {
    const ctx = this.ctx;

    // Medir texto para dimensionar o fundo
    ctx.font = '16px Rajdhani';
    const textWidth = ctx.measureText(tip).width;

    // Desenhar fundo do balão de dica
    const padding = 15;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = 40;
    const boxX = position.x - boxWidth / 2;
    const boxY = position.y - boxHeight / 2;

    // Desenhar balão com ponta
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 5);
    ctx.fill();

    // Desenhar ponta do balão
    ctx.beginPath();
    ctx.moveTo(position.x, boxY + boxHeight);
    ctx.lineTo(position.x - 10, boxY + boxHeight + 10);
    ctx.lineTo(position.x + 10, boxY + boxHeight + 10);
    ctx.closePath();
    ctx.fill();

    // Desenhar borda
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 5);
    ctx.stroke();

    // Desenhar texto da dica
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tip, position.x, position.y);
  }

  // MELHORIA: Método para desenhar efeito de transição de tela
  drawScreenTransition(progress: number): void {
    const ctx = this.ctx;

    // Efeito de fade in/out
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - progress})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Adicionar efeito de círculo se estiver no meio da transição
    if (progress > 0.3 && progress < 0.7) {
      const radius = this.canvas.width * (progress - 0.3) / 0.4;

      ctx.beginPath();
      ctx.arc(this.canvas.width / 2, this.canvas.height / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fill();
    }
  }
}
