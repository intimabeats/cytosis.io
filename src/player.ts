// src/player.ts - Parte 1: Atualização para movimento contínuo e exibição de nome por célula
import { Player, PlayerCell, Vector2D, PowerUpType, Camera } from './types';
import { BaseCell } from './cell';
import { 
  generateId, 
  randomColor, 
  subtract, 
  normalize, 
  multiply, 
  distance,
  validatePosition,
  radiusFromMass,
  add,
  massFromRadius,
  generateMembranePoints
} from './utils';

export class PlayerCell extends BaseCell implements PlayerCell {
  owner: string;
  canMerge: boolean;
  mergeTime: number;
  playerName: string; // NOVO: Armazenar o nome do jogador para exibição
  
  constructor(position: Vector2D, radius: number, color: string, owner: string, playerName: string) {
    super(position, radius, color);
    this.owner = owner;
    this.canMerge = false;
    this.mergeTime = 10; // 10 segundos antes que as células possam se fundir
    this.playerName = playerName; // NOVO: Armazenar o nome do jogador
    
    // Garantir que os pontos da membrana sejam inicializados corretamente
    const numPoints = Math.max(10, Math.floor(this.radius * 0.8));
    this.membranePoints = generateMembranePoints(this.position, this.radius, numPoints);
    this.membraneTargetPoints = [...this.membranePoints];
  }
  
  update(deltaTime: number): void {
    // Verificação de segurança para pontos de membrana antes de chamar super.update
    if (!this.membranePoints || !Array.isArray(this.membranePoints)) {
      const numPoints = Math.max(10, Math.floor(this.radius * 0.8));
      this.membranePoints = generateMembranePoints(this.position, this.radius, numPoints);
    }
    
    if (!this.membraneTargetPoints || !Array.isArray(this.membraneTargetPoints)) {
      this.membraneTargetPoints = [...this.membranePoints];
    }
    
    try {
      // Chamar método de atualização pai
      super.update(deltaTime);
      
      // Atualizar temporizador de fusão
      if (!this.canMerge && this.mergeTime > 0) {
        this.mergeTime -= deltaTime;
        if (this.mergeTime <= 0) {
          this.canMerge = true;
          this.mergeTime = 0;
        }
      }
    } catch (error) {
      console.error("Erro na atualização da PlayerCell:", error);
      
      // Tentativa de recuperação
      if (!this.membranePoints || !Array.isArray(this.membranePoints)) {
        const numPoints = Math.max(10, Math.floor(this.radius * 0.8));
        this.membranePoints = generateMembranePoints(this.position, this.radius, numPoints);
      }
      
      if (!this.membraneTargetPoints || !Array.isArray(this.membraneTargetPoints)) {
        this.membraneTargetPoints = [...this.membranePoints];
      }
      
      // Aplicar atualizações básicas sem membrana
      this.position.x += this.velocity.x * deltaTime;
      this.position.y += this.velocity.y * deltaTime;
      
      // Aplicar fricção
      this.velocity.x *= (1 - 0.05 * deltaTime);
      this.velocity.y *= (1 - 0.05 * deltaTime);
      
      // Atualizar temporizador de fusão
      if (!this.canMerge && this.mergeTime > 0) {
        this.mergeTime -= deltaTime;
        if (this.mergeTime <= 0) {
          this.canMerge = true;
          this.mergeTime = 0;
        }
      }
    }
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    try {
      // Verificação de segurança para pontos de membrana antes de renderizar
      if (!this.membranePoints || !Array.isArray(this.membranePoints)) {
        const numPoints = Math.max(10, Math.floor(this.radius * 0.8));
        this.membranePoints = generateMembranePoints(this.position, this.radius, numPoints);
      }
      
      if (!this.membraneTargetPoints || !Array.isArray(this.membraneTargetPoints)) {
        this.membraneTargetPoints = [...this.membranePoints];
      }
      
      // Chamar método de renderização pai
      super.render(ctx, camera);
      
      // NOVO: Renderizar nome do jogador acima de cada célula individual
      const screenPos = camera.worldToScreen(this.position);
      const screenRadius = this.radius * camera.scale;
      
      // Ajustar tamanho da fonte com base no tamanho da célula
      const fontSize = Math.max(10, Math.min(16, screenRadius * 0.3));
      ctx.font = `bold ${fontSize}px Rajdhani`;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.strokeText(this.playerName, screenPos.x, screenPos.y - screenRadius - 5);
      ctx.fillText(this.playerName, screenPos.x, screenPos.y - screenRadius - 5);
      
      // Se esta célula ainda não puder se fundir, mostrar um indicador de temporizador
      if (!this.canMerge && this.mergeTime > 0) {
        // Desenhar temporizador de fusão como um contorno de círculo
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius * 1.1, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Desenhar arco de progresso
        const progress = this.mergeTime / 10; // Assumindo 10 segundos de tempo de fusão
        ctx.beginPath();
        ctx.arc(
          screenPos.x, 
          screenPos.y, 
          screenRadius * 1.1, 
          -Math.PI / 2, 
          -Math.PI / 2 + (1 - progress) * Math.PI * 2
        );
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.stroke();
      }
    } catch (error) {
      console.error("Erro na renderização da PlayerCell:", error);
      
      // Renderização de fallback se os pontos de membrana falharem
      if (camera.isInView(this.position, this.radius)) {
        const screenPos = camera.worldToScreen(this.position);
        const screenRadius = this.radius * camera.scale;
        
        // Desenhar círculo simples
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Desenhar contorno
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Ainda renderizar o nome
        const fontSize = Math.max(10, Math.min(16, screenRadius * 0.3));
        ctx.font = `bold ${fontSize}px Rajdhani`;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.strokeText(this.playerName, screenPos.x, screenPos.y - screenRadius - 5);
        ctx.fillText(this.playerName, screenPos.x, screenPos.y - screenRadius - 5);
      }
    }
  }
}

export class GamePlayer implements Player {
  id: string;
  name: string;
  cells: PlayerCell[];
  score: number;
  color: string;
  isAI: boolean;
  activeEffects: Map<PowerUpType, number>;
  targetDirection: Vector2D;
  mousePosition: Vector2D;
  lastSplitTime: number;
  lastEjectTime: number;
  maxCells: number;
  minSplitMass: number;
  minEjectMass: number;
  highestScore: number;
  totalFoodEaten: number;
  totalPlayersEaten: number;
  totalVirusHit: number;
  totalPowerUpsCollected: number;
  
  // MELHORIA: Adicionado para controle de aceleração
  acceleration: Vector2D;
  maxSpeed: number;
  
  // NOVO: Variáveis para movimento contínuo e fusão automática
  isMouseInCenter: boolean;
  shouldMoveToCenter: boolean;
  
  constructor(name: string, position: Vector2D, isAI: boolean = false, startRadius: number = 30, color: string = '') {
    this.id = generateId();
    this.name = name;
    this.color = color || randomColor();
    this.cells = [];
    this.score = 0;
    this.isAI = isAI;
    this.activeEffects = new Map();
    this.targetDirection = { x: 0, y: 0 };
    this.mousePosition = { x: 0, y: 0 };
    this.lastSplitTime = 0;
    this.lastEjectTime = 0;
    this.maxCells = 16;
    this.minSplitMass = 35;
    this.minEjectMass = 35;
    
    // MELHORIA: Inicializar aceleração e velocidade máxima
    this.acceleration = { x: 0, y: 0 };
    // ATUALIZAÇÃO: Aumentar velocidade máxima base
    this.maxSpeed = 1500; // Aumentado de 800 para 1500
    
    // NOVO: Inicializar variáveis para movimento contínuo e fusão automática
    this.isMouseInCenter = false;
    this.shouldMoveToCenter = false;
    
    // Rastreamento de estatísticas
    this.highestScore = 0;
    this.totalFoodEaten = 0;
    this.totalPlayersEaten = 0;
    this.totalVirusHit = 0;
    this.totalPowerUpsCollected = 0;
    
    // Criar célula inicial
    this.addCell(position, startRadius);
  }
  addCell(position: Vector2D, radius: number): PlayerCell | null {
    // Validar posição e raio
    if (!position || typeof radius !== 'number' || radius <= 0) {
      console.error("Parâmetros inválidos para addCell:", position, radius);
      return null;
    }
    
    // Verificar se atingimos o número máximo de células
    if (this.cells.length >= this.maxCells) {
      return null;
    }
    
    try {
      // MODIFICADO: Passar o nome do jogador para a célula
      const cell = new PlayerCell(
        { x: position.x, y: position.y },
        radius,
        this.color,
        this.id,
        this.name // Passar o nome do jogador para a célula
      );
      
      // Verificar se a célula foi criada corretamente
      if (!cell.membranePoints || !Array.isArray(cell.membranePoints)) {
        console.error("Célula criada com pontos de membrana inválidos");
        
        // Corrigir pontos de membrana
        const numPoints = Math.max(10, Math.floor(radius * 0.8));
        cell.membranePoints = generateMembranePoints(position, radius, numPoints);
        cell.membraneTargetPoints = [...cell.membranePoints];
      }
      
      this.cells.push(cell);
      return cell;
    } catch (error) {
      console.error("Erro ao criar nova célula:", error);
      return null;
    }
  }
  
update(deltaTime: number): void {
  // Verificação de segurança para deltaTime
  if (typeof deltaTime !== 'number' || deltaTime <= 0 || deltaTime > 1) {
    deltaTime = 0.016; // Padrão para 60fps
  }
  
  // CORREÇÃO: Verificar se o mouse está no centro para fusão automática
  if (this.isMouseInCenter && this.cells.length > 1) {
    this.shouldMoveToCenter = true;
  } else {
    this.shouldMoveToCenter = false;
  }
  
  // Atualizar todas as células
  for (let i = this.cells.length - 1; i >= 0; i--) {
    const cell = this.cells[i];
    
    try {
      cell.update(deltaTime);
      
      // CORREÇÃO: Garantir que o movimento seja aplicado sempre
      if (!this.isAI) {
        let targetPos: Vector2D;
        let direction: Vector2D;
        
        if (this.shouldMoveToCenter) {
          // Se o mouse está no centro e temos múltiplas células, mover em direção ao centro
          const avgPos = this.getAveragePosition();
          targetPos = avgPos;
          direction = subtract(targetPos, cell.position);
        } else {
          // Caso contrário, mover em direção ao mouse
          targetPos = this.mousePosition;
          direction = subtract(targetPos, cell.position);
        }
        
        // Normalizar direção
        const dirMag = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (dirMag > 0) {
          direction.x /= dirMag;
          direction.y /= dirMag;
        } else {
          // Se não houver direção (estamos exatamente no alvo), não aplicar força
          continue;
        }
        
        // CORREÇÃO: Sempre aplicar uma força mínima para garantir movimento contínuo
        let speedMultiplier = 1;
        if (this.hasEffect(PowerUpType.SPEED)) {
          speedMultiplier = 2.0;
        }
        
        // ATUALIZAÇÃO: Nova lógica de velocidade baseada no tamanho
        // Velocidade mínima: equivalente a uma célula com 1000 pontos
        // Velocidade máxima: equivalente a uma célula com 200 pontos
        const cellMass = cell.mass;
        
        // Calcular multiplicador de velocidade baseado na massa
        // Quanto menor a massa, maior a velocidade (até o limite de 200)
        // Quanto maior a massa, menor a velocidade (até o limite de 1000)
        let sizeMultiplier;
        
        if (cellMass <= 200) {
          // Massa menor ou igual a 200: velocidade máxima
          sizeMultiplier = 2.0;
        } else if (cellMass >= 1000) {
          // Massa maior ou igual a 1000: velocidade mínima
          sizeMultiplier = 0.8;
        } else {
          // Entre 200 e 1000: interpolação linear
          // Mapear de [200, 1000] para [2.0, 0.8]
          sizeMultiplier = 2.0 - (cellMass - 200) * (1.2 / 800);
        }
        
        // ATUALIZAÇÃO: Aumentar a força base para movimento mais rápido
        const forceMagnitude = 800000 * deltaTime * speedMultiplier * sizeMultiplier;
        
        const force = {
          x: direction.x * forceMagnitude,
          y: direction.y * forceMagnitude
        };
        
        cell.applyForce(force);
        
        // ATUALIZAÇÃO: Ajustar o impulso extra para células distantes
        // Diminuir a margem de distância para aplicar o impulso
        const distanceToTarget = distance(cell.position, targetPos);
        if (distanceToTarget > 150) { // Reduzido de 200 para 150
          // Aumentar o multiplicador de impulso para distâncias maiores
          const boostMultiplier = Math.min(4.0, distanceToTarget / 75); // Ajustado para resposta mais rápida
          const boostForce = {
            x: direction.x * forceMagnitude * boostMultiplier * 0.6, // Aumentado de 0.5 para 0.6
            y: direction.y * forceMagnitude * boostMultiplier * 0.6
          };
          cell.applyForce(boostForce);
        }
      } else {
        // CORREÇÃO: Garantir que os bots também se movam
        if (this.targetDirection.x !== 0 || this.targetDirection.y !== 0) {
          // Aplicar impulso de velocidade se ativo
          let speedMultiplier = 1;
          if (this.hasEffect(PowerUpType.SPEED)) {
            speedMultiplier = 1.5;
          }
          
          // ATUALIZAÇÃO: Nova lógica de velocidade para IA também
          const cellMass = cell.mass;
          
          let sizeMultiplier;
          if (cellMass <= 200) {
            sizeMultiplier = 2.0;
          } else if (cellMass >= 1000) {
            sizeMultiplier = 0.8;
          } else {
            sizeMultiplier = 2.0 - (cellMass - 200) * (1.2 / 800);
          }
          
          // ATUALIZAÇÃO: Aumentar a força para IA também
          const forceMagnitude = 500000 * deltaTime * speedMultiplier * sizeMultiplier;
          
          const force = {
            x: this.targetDirection.x * forceMagnitude,
            y: this.targetDirection.y * forceMagnitude
          };
          
          cell.applyForce(force);
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar célula:", error);
      // Remover célula problemática
      this.cells.splice(i, 1);
    }
  }
    
    // Verificar fusão de células
    this.handleCellMerging();
    
    // Atualizar efeitos de power-up
    this.updatePowerUps(deltaTime);
    
    // Atualizar pontuação com base na massa total
    const newScore = Math.floor(this.getTotalMass());
    if (newScore > this.score) {
      this.score = newScore;
      
      // Atualizar pontuação mais alta
      if (this.score > this.highestScore) {
        this.highestScore = this.score;
      }
    }
    
    // Atualizar UI se este for o jogador humano
    if (!this.isAI) {
      this.updateUI();
    }
  }
  
  updateUI(): void {
    const scoreElement = document.getElementById('score');
    const sizeElement = document.getElementById('size');
    
    if (scoreElement) scoreElement.textContent = this.score.toString();
    if (sizeElement) sizeElement.textContent = this.cells.length.toString();
    
    // Atualizar indicadores de power-up
    this.updatePowerUpIndicators();
  }
  
  updatePowerUpIndicators(): void {
    // Remover indicadores existentes
    const statsElement = document.getElementById('stats');
    if (!statsElement) return;
    
    // Remover indicadores de power-up existentes
    const existingIndicators = statsElement.querySelectorAll('.power-up-indicator');
    existingIndicators.forEach(el => el.remove());
    
    // Adicionar indicadores de power-up atuais
    this.activeEffects.forEach((timeLeft, type) => {
      const indicator = document.createElement('div');
      indicator.className = 'power-up-indicator';
      
      // Definir cor com base no tipo de power-up
      switch (type) {
        case PowerUpType.SPEED:
          indicator.style.backgroundColor = '#00ffff'; // Ciano
          indicator.title = `Impulso de Velocidade: ${timeLeft.toFixed(1)}s`;
          break;
        case PowerUpType.SHIELD:
          indicator.style.backgroundColor = '#ffff00'; // Amarelo
          indicator.title = `Escudo: ${timeLeft.toFixed(1)}s`;
          break;
        case PowerUpType.MASS_BOOST:
          indicator.style.backgroundColor = '#ff00ff'; // Magenta
          indicator.title = `Impulso de Massa: ${timeLeft.toFixed(1)}s`;
          break;
        case PowerUpType.INVISIBILITY:
          indicator.style.backgroundColor = '#888888'; // Cinza
          indicator.title = `Invisibilidade: ${timeLeft.toFixed(1)}s`;
          break;
      }
      
      // Adicionar texto do temporizador
      const timerText = document.createElement('span');
      timerText.textContent = timeLeft.toFixed(1);
      timerText.style.fontSize = '10px';
      timerText.style.position = 'absolute';
      timerText.style.top = '50%';
      timerText.style.left = '50%';
      timerText.style.transform = 'translate(-50%, -50%)';
      indicator.appendChild(timerText);
      
      // Adicionar às estatísticas
      statsElement.appendChild(indicator);
    });
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // Verificar se o jogador está invisível (exceto para o jogador humano)
    if (this.hasEffect(PowerUpType.INVISIBILITY) && this.isAI) {
      return;
    }
    
    // MODIFICADO: Renderizar apenas as células individuais, sem círculo central
    for (const cell of this.cells) {
      try {
        cell.render(ctx, camera);
      } catch (error) {
        console.error("Erro ao renderizar célula:", error);
      }
    }
    
    // Só renderizar efeitos se o jogador tiver células
    if (this.cells.length === 0) return;
    
    // Obter posição média para efeitos
    const avgPos = this.getAveragePosition();
    const screenPos = camera.worldToScreen(avgPos);
    
    // Renderizar efeitos ativos
    let effectOffset = 20;
    this.activeEffects.forEach((timeLeft, type) => {
      const effectName = PowerUpType[type];
      
      // MODIFICADO: Renderizar efeitos acima da célula maior
      const maxRadiusCell = this.cells.reduce((max, cell) => 
        cell.radius > max.radius ? cell : max, this.cells[0]);
      
      const maxCellScreenPos = camera.worldToScreen(maxRadiusCell.position);
      const maxScreenRadius = maxRadiusCell.radius * camera.scale;
      
      ctx.strokeText(
        `${effectName}: ${timeLeft.toFixed(1)}s`,
        maxCellScreenPos.x,
        maxCellScreenPos.y - maxScreenRadius - effectOffset
      );
      ctx.fillText(
        `${effectName}: ${timeLeft.toFixed(1)}s`,
        maxCellScreenPos.x,
        maxCellScreenPos.y - maxScreenRadius - effectOffset
      );
      effectOffset += 20;
    });
    
    // Renderizar escudo se ativo
    if (this.hasEffect(PowerUpType.SHIELD)) {
      // MODIFICADO: Renderizar escudo em cada célula individual
      for (const cell of this.cells) {
        const cellPos = camera.worldToScreen(cell.position);
        const shieldRadius = cell.radius * 1.2;
        const screenShieldRadius = shieldRadius * camera.scale;
        
        ctx.beginPath();
        ctx.arc(cellPos.x, cellPos.y, screenShieldRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // Adicionar efeito pulsante ao escudo
        const pulseRadius = screenShieldRadius * (1 + Math.sin(Date.now() / 200) * 0.05);
        ctx.beginPath();
        ctx.arc(cellPos.x, cellPos.y, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    
    // Renderizar efeito de impulso de velocidade se ativo
    if (this.hasEffect(PowerUpType.SPEED)) {
      // MODIFICADO: Renderizar efeito de velocidade em cada célula individual
      for (const cell of this.cells) {
        const cellPos = camera.worldToScreen(cell.position);
        const cellRadius = cell.radius * camera.scale;
        
        // Calcular direção de movimento para esta célula
        let direction;
        if (this.shouldMoveToCenter) {
          const avgPos = this.getAveragePosition();
          direction = normalize(subtract(avgPos, cell.position));
        } else {
          direction = normalize(subtract(this.mousePosition, cell.position));
        }
        
        // Desenhar linhas de velocidade atrás da célula
        const trailLength = cell.radius * 2;
        const trailWidth = cell.radius * 0.5;
        
        ctx.beginPath();
        ctx.moveTo(
          cellPos.x - direction.x * trailLength * camera.scale,
          cellPos.y - direction.y * trailLength * camera.scale
        );
        ctx.lineTo(cellPos.x, cellPos.y);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = trailWidth * camera.scale;
        ctx.stroke();
      }
    }
    
    // Renderizar efeito de invisibilidade se ativo
    if (this.hasEffect(PowerUpType.INVISIBILITY) && !this.isAI) {
      // Desenhar um contorno fraco para o jogador humano ver suas próprias células
      for (const cell of this.cells) {
        const cellPos = camera.worldToScreen(cell.position);
        const cellRadius = cell.radius * camera.scale;
        
        ctx.beginPath();
        ctx.arc(cellPos.x, cellPos.y, cellRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    
    // MODIFICADO: Renderizar indicador de massa em cada célula individual
    if (!this.isAI) {
      for (const cell of this.cells) {
        const cellPos = camera.worldToScreen(cell.position);
        const cellMass = Math.floor(cell.mass);
        
        ctx.font = '12px Rajdhani';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${cellMass}`,
          cellPos.x,
          cellPos.y + 5
        );
      }
    }
  }
  private handleCellMerging(): void {
    // Verificar células que podem se fundir
    for (let i = 0; i < this.cells.length; i++) {
      const cellA = this.cells[i];
      
      if (!cellA.canMerge) continue;
      
      for (let j = i + 1; j < this.cells.length; j++) {
        const cellB = this.cells[j];
        
        if (!cellB.canMerge) continue;
        
        try {
          // Verificar se as células estão próximas o suficiente para se fundir
          const dist = distance(cellA.position, cellB.position);
          if (dist < cellA.radius + cellB.radius - Math.min(cellA.radius, cellB.radius) * 0.5) {
            // Fundir células
            const totalMass = cellA.mass + cellB.mass;
            const newRadius = radiusFromMass(totalMass);
            
            // A posição é a média ponderada com base na massa
            const newPosition = {
              x: (cellA.position.x * cellA.mass + cellB.position.x * cellB.mass) / totalMass,
              y: (cellA.position.y * cellA.mass + cellB.position.y * cellB.mass) / totalMass
            };
            
            // Atualizar a primeira célula
            cellA.position = newPosition;
            cellA.radius = newRadius;
            cellA.mass = totalMass;
            
            // Remover a segunda célula
            this.cells.splice(j, 1);
            
            // Criar efeito de fusão
            this.createMergeEffect(cellA.position, cellB.position, this.color);
            
            // Reiniciar o loop já que modificamos o array
            i = -1;
            break;
          }
        } catch (error) {
          console.error("Erro na fusão de células:", error);
          // Pular este par de células
          continue;
        }
      }
    }
  }
  private createMergeEffect(pos1: Vector2D, pos2: Vector2D, color: string): void {
    // Despachar evento para efeito de partícula
    const mergeEvent = new CustomEvent('cells-merged', {
      detail: {
        position1: pos1,
        position2: pos2,
        color: color
      }
    });
    window.dispatchEvent(mergeEvent);
  }
  
  private updatePowerUps(deltaTime: number): void {
    // Atualizar temporizadores de efeitos ativos
    this.activeEffects.forEach((timeLeft, type) => {
      const newTime = timeLeft - deltaTime;
      if (newTime <= 0) {
        this.activeEffects.delete(type);
        
        // Lidar com expiração de efeito
        if (type === PowerUpType.MASS_BOOST) {
          // Reduzir massa quando o impulso de massa expira
          for (const cell of this.cells) {
            cell.mass /= 1.5;
            cell.radius = radiusFromMass(cell.mass);
          }
        }
        
        // Criar evento de expiração de efeito
        const expirationEvent = new CustomEvent('power-up-expired', {
          detail: {
            player: this,
            type: type
          }
        });
        window.dispatchEvent(expirationEvent);
      } else {
        this.activeEffects.set(type, newTime);
      }
    });
  }
  
  setTargetDirection(target: Vector2D): void {
    // Verificação de segurança para o alvo
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
      return;
    }
    
    // MELHORIA: Armazenar a posição real do mouse para movimento direto da célula
    this.mousePosition = { ...target };
    
    // Calcular direção da posição média para o alvo
    const avgPos = this.getAveragePosition();
    
    // Verificação de segurança para avgPos
    if (!avgPos || typeof avgPos.x !== 'number' || typeof avgPos.y !== 'number') {
      return;
    }
    
    // Calcular vetor de direção
    const dir = {
      x: target.x - avgPos.x,
      y: target.y - avgPos.y
    };
    
    // Normalizar direção
    const mag = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
    if (mag > 0) {
      dir.x /= mag;
      dir.y /= mag;
    }
    
    this.targetDirection = dir;
    
    // NOVO: Verificar se o mouse está no centro da tela
    // Isso é usado para determinar se devemos mover as células para o centro para fusão
    const centerPos = avgPos;
    const distToCenter = distance(target, centerPos);
    
    // Considerar "no centro" se estiver dentro de um raio pequeno
    this.isMouseInCenter = distToCenter < 50;
  }
  
  split(): void {
    // Verificação de cooldown
    const now = Date.now();
    if (now - this.lastSplitTime < 300) { // 300ms de cooldown
      return;
    }
    this.lastSplitTime = now;
    
    // Só dividir células que são grandes o suficiente
    const newCells: PlayerCell[] = [];
    
    // Limitar células totais para evitar problemas de desempenho
    if (this.cells.length >= this.maxCells) {
      return;
    }
    
    // Contar quantas novas células podemos criar
    const availableSlots = this.maxCells - this.cells.length;
    if (availableSlots <= 0) return;
    
    // Ordenar células por tamanho (maiores primeiro) para priorizar a divisão de células maiores
    const sortedCells = [...this.cells].sort((a, b) => b.mass - a.mass);
    
    let createdCells = 0;
    for (const cell of sortedCells) {
      // Verificar se atingimos o limite
      if (createdCells >= availableSlots) break;
      
      // Só dividir se a célula for grande o suficiente
      if (cell.mass >= this.minSplitMass * 2) { // Precisa do dobro da massa mínima para dividir
        try {
          // Criar uma nova célula com metade da massa
          const newMass = cell.mass / 2;
          const newRadius = radiusFromMass(newMass);
          
          // Atualizar célula original
          cell.mass = newMass;
          cell.radius = newRadius;
          
          // MELHORIA: Criar nova célula na direção do mouse
          // Isso garante que todas as células se movam em direção ao mouse quando divididas
          let dir;
          if (!this.isAI) {
            // Para jogador humano, dividir em direção ao mouse
            const cellToMouse = subtract(this.mousePosition, cell.position);
            dir = normalize(cellToMouse);
          } else {
            // Para IA, usar direção alvo
            dir = normalize(this.targetDirection);
          }
          
          const newPos = {
            x: cell.position.x + dir.x * cell.radius * 2,
            y: cell.position.y + dir.y * cell.radius * 2
          };
          
          // MODIFICADO: Passar o nome do jogador para a nova célula
          const newCell = new PlayerCell(
            newPos, 
            newRadius, 
            this.color, 
            this.id,
            this.name // Passar o nome do jogador
          );
          
          // ATUALIZAÇÃO: Aumentar velocidade de divisão para melhor controle
          const splitSpeed = 4000 + newRadius * 15; // Aumentado de 3000 para 4000
          newCell.velocity = {
            x: dir.x * splitSpeed,
            y: dir.y * splitSpeed
          };
          
          // Redefinir temporizadores de fusão
          cell.canMerge = false;
          cell.mergeTime = 10;
          newCell.canMerge = false;
          newCell.mergeTime = 10;
          
          newCells.push(newCell);
          createdCells++;
        } catch (error) {
          console.error("Erro ao dividir célula:", error);
          // Pular esta célula
          continue;
        }
      }
    }
    
    // Adicionar novas células ao jogador
    this.cells.push(...newCells);
    
    // Criar evento de divisão para efeitos sonoros ou feedback visual
    if (newCells.length > 0) {
      const splitEvent = new CustomEvent('player-split-success', {
        detail: {
          player: this,
          newCellCount: newCells.length
        }
      });
      window.dispatchEvent(splitEvent);
    }
  }
  
  eject(): void {
    // Verificação de cooldown
    const now = Date.now();
    if (now - this.lastEjectTime < 100) { // 100ms de cooldown
      return;
    }
    this.lastEjectTime = now;
    
    // Ejetar massa de cada célula
    const ejectMass = 10;
    const ejectRadius = radiusFromMass(ejectMass);
    let ejectedCount = 0;
    
    for (const cell of this.cells) {
      // Só ejetar se a célula for grande o suficiente
      if (cell.mass > this.minEjectMass) {
        try {
          // Reduzir massa da célula
          cell.mass -= ejectMass;
          cell.radius = radiusFromMass(cell.mass);
          
          // MELHORIA: Ejetar na direção do mouse para jogador humano
          let dir;
          if (!this.isAI) {
            // Para jogador humano, ejetar em direção ao mouse
            const cellToMouse = subtract(this.mousePosition, cell.position);
            dir = normalize(cellToMouse);
          } else {
            // Para IA, usar direção alvo
            dir = normalize(this.targetDirection);
          }
          
          const ejectPos = {
            x: cell.position.x + dir.x * (cell.radius + ejectRadius),
            y: cell.position.y + dir.y * (cell.radius + ejectRadius)
          };
          
          // Despachar evento para criar massa ejetada
          const ejectEvent = new CustomEvent('player-ejected-mass', {
            detail: {
              position: ejectPos,
              // ATUALIZAÇÃO: Ejeção ainda mais rápida para melhor jogabilidade
              velocity: { x: dir.x * 4000, y: dir.y * 4000 }, // Aumentado de 3000 para 4000
              radius: ejectRadius,
              color: this.color
            }
          });
          window.dispatchEvent(ejectEvent);
          
          // Aplicar força de recuo à célula
          cell.applyForce({
            x: -dir.x * 1000,
            y: -dir.y * 1000
          });
          
          ejectedCount++;
        } catch (error) {
          console.error("Erro ao ejetar massa:", error);
          // Pular esta célula
          continue;
        }
      }
    }
    
    // Criar evento de ejeção para efeitos sonoros ou feedback visual
    if (ejectedCount > 0) {
      const ejectSuccessEvent = new CustomEvent('player-eject-success', {
        detail: {
          player: this,
          ejectedCount: ejectedCount
        }
      });
      window.dispatchEvent(ejectSuccessEvent);
    }
  }
  
  applyPowerUp(type: PowerUpType, duration: number): void {
    // Adicionar ou estender efeito de power-up
    const currentDuration = this.activeEffects.get(type) || 0;
    this.activeEffects.set(type, Math.max(currentDuration, duration));
    
    // Aplicar efeito com base no tipo
    switch (type) {
      case PowerUpType.SPEED:
        // Impulso de velocidade é tratado nos cálculos de movimento
        break;
      case PowerUpType.SHIELD:
        // Escudo é tratado na detecção de colisão
        break;
      case PowerUpType.MASS_BOOST:
        // Aumentar massa de todas as células
        for (const cell of this.cells) {
          cell.mass *= 1.5;
          cell.radius = radiusFromMass(cell.mass);
        }
        break;
      case PowerUpType.INVISIBILITY:
        // Invisibilidade é tratada na renderização
        break;
    }
    
    // Atualizar estatísticas
    this.totalPowerUpsCollected++;
    
    // Criar evento de power-up para efeitos sonoros ou feedback visual
    const powerUpEvent = new CustomEvent('player-powerup-applied', {
      detail: {
        player: this,
        type: type,
        duration: duration
      }
    });
    window.dispatchEvent(powerUpEvent);
  }
  
  hasEffect(type: PowerUpType): boolean {
    return this.activeEffects.has(type);
  }
  
  getEffectTimeRemaining(type: PowerUpType): number {
    return this.activeEffects.get(type) || 0;
  }
  
  getTotalMass(): number {
    if (this.cells.length === 0) return 0;
    
    try {
      return this.cells.reduce((total, cell) => total + cell.mass, 0);
    } catch (error) {
      console.error("Erro ao calcular massa total:", error);
      // Fallback: calcular manualmente
      let total = 0;
      for (const cell of this.cells) {
        if (cell && typeof cell.mass === 'number') {
          total += cell.mass;
        }
      }
      return total;
    }
  }
  
  getAveragePosition(): Vector2D {
    if (this.cells.length === 0) return { x: 0, y: 0 };
    
    try {
      let totalX = 0;
      let totalY = 0;
      let totalMass = 0;
      
      // Calcular média ponderada com base na massa da célula
      for (const cell of this.cells) {
        if (!cell.position || typeof cell.position.x !== 'number' || 
            typeof cell.position.y !== 'number' || typeof cell.mass !== 'number') {
          continue;
        }
        
        totalX += cell.position.x * cell.mass;
        totalY += cell.position.y * cell.mass;
        totalMass += cell.mass;
      }
      
      if (totalMass === 0) return { x: 0, y: 0 };
      
      return {
        x: totalX / totalMass,
        y: totalY / totalMass
      };
    } catch (error) {
      console.error("Erro ao calcular posição média:", error);
      // Fallback: média simples
      if (this.cells.length === 0) return { x: 0, y: 0 };
      
      let totalX = 0;
      let totalY = 0;
      let validCells = 0;
      
      for (const cell of this.cells) {
        if (cell && cell.position && typeof cell.position.x === 'number' && 
            typeof cell.position.y === 'number') {
          totalX += cell.position.x;
          totalY += cell.position.y;
          validCells++;
        }
      }
      
      if (validCells === 0) return { x: 0, y: 0 };
      
      return {
        x: totalX / validCells,
        y: totalY / validCells
      };
    }
  }
  
  getMaxRadius(): number {
    if (this.cells.length === 0) return 0;
    
    try {
      let maxRadius = 0;
      for (const cell of this.cells) {
        if (cell && typeof cell.radius === 'number' && cell.radius > maxRadius) {
          maxRadius = cell.radius;
        }
      }
      return maxRadius;
    } catch (error) {
      console.error("Erro ao calcular raio máximo:", error);
      return 30; // Fallback padrão
    }
  }
  
  // Métodos para rastreamento de estatísticas
  
  recordFoodEaten(): void {
    this.totalFoodEaten++;
  }
  
  recordPlayerEaten(): void {
    this.totalPlayersEaten++;
  }
  
  recordVirusHit(): void {
    this.totalVirusHit++;
  }
  
  getStats(): any {
    return {
      score: this.score,
      highestScore: this.highestScore,
      totalFoodEaten: this.totalFoodEaten,
      totalPlayersEaten: this.totalPlayersEaten,
      totalVirusHit: this.totalVirusHit,
      totalPowerUpsCollected: this.totalPowerUpsCollected
    };
  }
  
  // NOVO: Método para verificar se todas as células podem se fundir
  canAllCellsMerge(): boolean {
    return this.cells.every(cell => cell.canMerge);
  }
  
  // NOVO: Método para forçar todas as células a se moverem para o centro
  moveAllCellsToCenter(): void {
    if (this.cells.length <= 1) return;
    
    const centerPos = this.getAveragePosition();
    
    for (const cell of this.cells) {
      const direction = subtract(centerPos, cell.position);
      const normalizedDir = normalize(direction);
      
      // ATUALIZAÇÃO: Aplicar força extra para mover rapidamente para o centro
      const forceMagnitude = 500000; // Aumentado de 300000 para 500000
      const force = {
        x: normalizedDir.x * forceMagnitude,
        y: normalizedDir.y * forceMagnitude
      };
      
      cell.applyForce(force);
    }
  }
}
