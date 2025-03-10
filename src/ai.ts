// src/ai.ts - Versão melhorada para IA mais inteligente e responsiva
import { Entity, Vector2D, Player } from './types';
import {
  distance,
  subtract,
  normalize,
  multiply,
  add,
  randomPosition,
  magnitude
} from './utils';

// Diferentes tipos de comportamento de IA
export enum AIBehaviorType {
  WANDER,
  CHASE,
  FLEE,
  FEED,
  SPLIT_AND_CHASE,
  AMBUSH,
  DEFEND,
  SCAVENGE,
  // MELHORIA: Novos comportamentos de IA
  PATROL,
  HUNT,
  BAIT,
  TEAM_UP
}

export class AIController {
  player: Player;
  behaviorType: AIBehaviorType;
  targetEntity: Entity | null;
  wanderTarget: Vector2D;
  wanderTimer: number;
  decisionTimer: number;
  worldSize: Vector2D;
  lastDecisionTime: number;
  difficultyLevel: number;
  personalityType: number;
  stuckDetectionTimer: number;
  lastPosition: Vector2D;
  stuckThreshold: number;

  // MELHORIA: Novas variáveis para IA melhorada
  patrolPoints: Vector2D[];
  currentPatrolIndex: number;
  teamTarget: Player | null;
  lastBehaviorChange: number;
  behaviorDuration: number;
  threatMemory: Map<string, number>; // Lembrar ameaças por ID e tempo
  preyMemory: Map<string, number>; // Lembrar presas por ID e tempo
  lastSplitTime: number;
  splitCooldown: number;

  constructor(player: Player, worldSize: Vector2D, difficultyLevel: number = 1) {
    this.player = player;
    this.behaviorType = AIBehaviorType.WANDER;
    this.targetEntity = null;
    this.wanderTarget = randomPosition(worldSize);
    this.wanderTimer = 0;
    this.decisionTimer = 0;
    this.worldSize = worldSize;
    this.lastDecisionTime = 0;
    this.difficultyLevel = difficultyLevel;

    // Tipo de personalidade (0-3) afeta a tomada de decisão
    this.personalityType = Math.floor(Math.random() * 4);

    // Detecção de travamento
    this.stuckDetectionTimer = 0;
    this.lastPosition = { x: 0, y: 0 };
    this.stuckThreshold = 5; // Segundos para considerar a IA travada

    // MELHORIA: Inicializar novas variáveis
    this.patrolPoints = this.generatePatrolPoints();
    this.currentPatrolIndex = 0;
    this.teamTarget = null;
    this.lastBehaviorChange = Date.now();
    this.behaviorDuration = 5 + Math.random() * 5; // 5-10 segundos por comportamento
    this.threatMemory = new Map();
    this.preyMemory = new Map();
    this.lastSplitTime = 0;
    // MELHORIA: Cooldown de divisão baseado na dificuldade (mais curto para IAs mais difíceis)
    this.splitCooldown = 10000 - (difficultyLevel * 1000); // 10s a 1s
  }

  // MELHORIA: Gerar pontos de patrulha aleatórios
  private generatePatrolPoints(): Vector2D[] {
    const points: Vector2D[] = [];
    const numPoints = 3 + Math.floor(Math.random() * 3); // 3-5 pontos

    for (let i = 0; i < numPoints; i++) {
      points.push(randomPosition(this.worldSize));
    }

    return points;
  }
    
    private updateAndRenderCell(cell: any, deltaTime: number): void {
    if (cell && typeof cell.updateMembranePoints === 'function') {
        cell.updateMembranePoints();
    }
}


update(deltaTime: number, entities: Entity[]): void {
  // Verificação de segurança para o jogador
  if (!this.player || !this.player.cells || this.player.cells.length === 0) {
    return;
  }

  // CORREÇÃO: Garantir que o deltaTime seja válido
  if (typeof deltaTime !== 'number' || deltaTime <= 0 || deltaTime > 1) {
    deltaTime = 0.016; // Padrão para 60fps
  }

  // Atualizar temporizadores
  this.wanderTimer -= deltaTime;
  this.decisionTimer -= deltaTime;

  // Atualizar detecção de travamento
  this.updateStuckDetection(deltaTime);

  // Atualizar memória de ameaças e presas
  this.updateMemory(deltaTime);

  // CORREÇÃO: Forçar uma decisão inicial se não houver comportamento definido
  if (this.behaviorType === undefined) {
    this.behaviorType = AIBehaviorType.WANDER;
    this.wanderTarget = randomPosition(this.worldSize);
  }

  // Tomar uma nova decisão periodicamente ou se estiver travado
  if (this.decisionTimer <= 0 || this.isStuck() || this.shouldChangeBehavior()) {
    try {
      this.makeDecision(entities);
    } catch (error) {
      console.error("Erro na tomada de decisão da IA:", error);
      // Fallback para comportamento de perambulação
      this.behaviorType = AIBehaviorType.WANDER;
      this.targetEntity = null;
      this.wanderTarget = randomPosition(this.worldSize);
    }
    // CORREÇÃO: Tempo de decisão baseado na dificuldade (mais rápido para IAs mais difíceis)
    this.decisionTimer = 2 - (this.difficultyLevel * 0.15); // 2s a 0.5s
    this.lastDecisionTime = Date.now();
    this.lastBehaviorChange = Date.now();
  }

  // CORREÇÃO: Garantir que sempre haja um comportamento definido
  if (this.behaviorType === undefined) {
    this.behaviorType = AIBehaviorType.WANDER;
    this.wanderTarget = randomPosition(this.worldSize);
  }

  // Executar comportamento atual
  try {
    switch (this.behaviorType) {
      case AIBehaviorType.WANDER:
        this.executeWander(deltaTime);
        break;
      // [Manter os outros casos]
      default:
        // CORREÇÃO: Fallback para perambulação se o comportamento não for reconhecido
        this.executeWander(deltaTime);
        break;
    }
  } catch (error) {
    console.error("Erro na execução do comportamento da IA:", error);
    // Fallback para perambulação simples
    this.wanderTarget = randomPosition(this.worldSize);
    const playerPos = this.player.getAveragePosition();
    const direction = subtract(this.wanderTarget, playerPos);
    this.player.setTargetDirection(normalize(direction));
  }
}

  // MELHORIA: Verificar se deve mudar de comportamento com base na duração
  private shouldChangeBehavior(): boolean {
    const now = Date.now();
    const timeInCurrentBehavior = (now - this.lastBehaviorChange) / 1000;

    // Chance aleatória de mudar comportamento baseada na dificuldade
    const changeChance = 0.1 * this.difficultyLevel * timeInCurrentBehavior / this.behaviorDuration;

    return Math.random() < changeChance;
  }

  // MELHORIA: Atualizar memória de ameaças e presas
  private updateMemory(deltaTime: number): void {
    // Reduzir tempo de memória
    this.threatMemory.forEach((time, id) => {
      const newTime = time - deltaTime;
      if (newTime <= 0) {
        this.threatMemory.delete(id);
      } else {
        this.threatMemory.set(id, newTime);
      }
    });

    this.preyMemory.forEach((time, id) => {
      const newTime = time - deltaTime;
      if (newTime <= 0) {
        this.preyMemory.delete(id);
      } else {
        this.preyMemory.set(id, newTime);
      }
    });
  }

  private updateStuckDetection(deltaTime: number): void {
    this.stuckDetectionTimer += deltaTime;

    // Verificar posição a cada segundo
    if (this.stuckDetectionTimer >= 1) {
      const currentPos = this.player.getAveragePosition();

      // Inicializar última posição se não estiver definida
      if (!this.lastPosition.x && !this.lastPosition.y) {
        this.lastPosition = { ...currentPos };
      }

      // Redefinir temporizador
      this.stuckDetectionTimer = 0;

      // Atualizar última posição
      this.lastPosition = { ...currentPos };
    }
  }

  private isStuck(): boolean {
    const currentPos = this.player.getAveragePosition();
    const dist = distance(currentPos, this.lastPosition);

    // Se mal se moveu por vários segundos, considerar travado
    return dist < 5 && this.stuckDetectionTimer > this.stuckThreshold;
  }

  private makeDecision(entities: Entity[]): void {
    // Verificação de segurança para o jogador
    if (!this.player || !this.player.cells || this.player.cells.length === 0) {
      this.behaviorType = AIBehaviorType.WANDER;
      this.targetEntity = null;
      return;
    }

    const playerPos = this.player.getAveragePosition();
    const playerMass = this.player.getTotalMass();

    // Filtrar entidades inválidas
    const validEntities = entities.filter(entity => {
      return entity && entity.position &&
             typeof entity.position.x === 'number' &&
             typeof entity.position.y === 'number' &&
             entity !== this.player; // Pular a si mesmo
    });

    // MELHORIA: Alcance de detecção aumentado e baseado na dificuldade
    // Encontrar entidades próximas com alcance de detecção aumentado baseado na dificuldade
    const detectionRange = 600 + playerMass / 10 + (this.difficultyLevel * 150);
    const nearbyEntities = validEntities.filter(entity => {
      const dist = distance(playerPos, entity.position);
      return !isNaN(dist) && dist < detectionRange;
    });

    // Ordenar entidades por distância
    nearbyEntities.sort((a, b) => {
      const distA = distance(playerPos, a.position);
      const distB = distance(playerPos, b.position);
      return distA - distB;
    });

    // Encontrar ameaças (jogadores maiores)
    const threats = nearbyEntities.filter(entity => {
      if ('cells' in entity && entity.cells && entity.cells.length > 0) {
        const otherPlayer = entity as Player;
        // MELHORIA: Considerar jogadores ligeiramente maiores como ameaças
        return otherPlayer.getTotalMass() > playerMass * 1.1;
      }
      return false;
    });

    // Encontrar presas (jogadores menores)
    const prey = nearbyEntities.filter(entity => {
      if ('cells' in entity && entity.cells && entity.cells.length > 0) {
        const otherPlayer = entity as Player;
        // MELHORIA: Considerar jogadores ligeiramente menores como presas
        return otherPlayer.getTotalMass() < playerMass * 0.9;
      }
      return false;
    });

    // Encontrar comida
    const food = nearbyEntities.filter(entity => {
      return 'value' in entity && !('cells' in entity);
    });

    // Encontrar vírus
    const viruses = nearbyEntities.filter(entity => {
      return 'splitThreshold' in entity;
    });

    // Encontrar power-ups
    const powerUps = nearbyEntities.filter(entity => {
      return 'type' in entity && 'duration' in entity;
    });

    // MELHORIA: Encontrar possíveis companheiros de equipe (IAs de tamanho similar)
    const potentialTeammates = nearbyEntities.filter(entity => {
      if ('cells' in entity && entity.cells && entity.cells.length > 0 && 'isAI' in entity) {
        const otherPlayer = entity as Player;
        return otherPlayer.isAI &&
               Math.abs(otherPlayer.getTotalMass() - playerMass) / playerMass < 0.3; // Dentro de 30% do tamanho
      }
      return false;
    });

    // Lógica de tomada de decisão baseada na personalidade e dificuldade
    this.decideBasedOnPersonality(threats, prey, food, viruses, powerUps, playerMass, potentialTeammates);
  }

  private decideBasedOnPersonality(
    threats: Entity[],
    prey: Entity[],
    food: Entity[],
    viruses: Entity[],
    powerUps: Entity[],
    playerMass: number,
    potentialTeammates: Entity[]
  ): void {
    // Probabilidades base
    let fleeProb = 0.8;
    let chaseProb = 0.7;
    let feedProb = 0.6;
    let splitProb = 0.3;
    let ambushProb = 0.2;
    let defendProb = 0.4;
    let scavengeProb = 0.5;
    // MELHORIA: Probabilidades para novos comportamentos
    let patrolProb = 0.3;
    let huntProb = 0.4;
    let baitProb = 0.2;
    let teamUpProb = 0.3;

    // Ajustar com base no tipo de personalidade
    switch (this.personalityType) {
      case 0: // Agressivo
        chaseProb += 0.2;
        splitProb += 0.3;
        fleeProb -= 0.3;
        ambushProb += 0.3;
        huntProb += 0.3;
        break;
      case 1: // Cauteloso
        fleeProb += 0.2;
        chaseProb -= 0.2;
        defendProb += 0.3;
        patrolProb += 0.2;
        baitProb += 0.2;
        break;
      case 2: // Oportunista
        feedProb += 0.2;
        scavengeProb += 0.3;
        powerUps.length > 0 && (ambushProb += 0.2);
        teamUpProb += 0.2;
        break;
      case 3: // Equilibrado
        // Sem ajustes
        break;
    }

    // Ajustar com base no nível de dificuldade
    fleeProb -= 0.1 * this.difficultyLevel;
    chaseProb += 0.1 * this.difficultyLevel;
    splitProb += 0.1 * this.difficultyLevel;
    ambushProb += 0.1 * this.difficultyLevel;
    huntProb += 0.1 * this.difficultyLevel;
    teamUpProb += 0.05 * this.difficultyLevel;

    // MELHORIA: Ajustar com base na memória
    // Se lembrar de ameaças, aumentar probabilidade de fuga
    if (this.threatMemory.size > 0) {
      fleeProb += 0.2;
      defendProb += 0.1;
    }

    // Se lembrar de presas, aumentar probabilidade de caça
    if (this.preyMemory.size > 0) {
      chaseProb += 0.2;
      huntProb += 0.1;
    }

    // Tomar decisão
    // MELHORIA: Lógica de decisão mais complexa

    // Verificar power-ups primeiro (alta prioridade)
    if (powerUps.length > 0 && Math.random() < 0.9) {
      this.behaviorType = AIBehaviorType.FEED;
      this.targetEntity = powerUps[0];
      return;
    }

    // Verificar ameaças imediatas
    if (threats.length > 0) {
      // Adicionar ameaça à memória
      threats.forEach(threat => {
        if ('id' in threat) {
          this.threatMemory.set(threat.id, 10); // Lembrar por 10 segundos
        }
      });

      if (Math.random() < fleeProb) {
        // Fugir de ameaças
        this.behaviorType = AIBehaviorType.FLEE;
        this.targetEntity = threats[0];
        return;
      }
    }

    // Verificar presas potenciais
    if (prey.length > 0) {
      // Adicionar presa à memória
      prey.forEach(p => {
        if ('id' in p) {
          this.preyMemory.set(p.id, 15); // Lembrar por 15 segundos
        }
      });

      // Decidir entre diferentes táticas de caça
      const now = Date.now();
      const canSplit = playerMass > 200 && (now - this.lastSplitTime > this.splitCooldown);

      if (canSplit && Math.random() < splitProb) {
        // Dividir e perseguir
        this.behaviorType = AIBehaviorType.SPLIT_AND_CHASE;
        this.targetEntity = prey[0];
        this.lastSplitTime = now;
      } else if (Math.random() < ambushProb) {
        // Emboscar
        this.behaviorType = AIBehaviorType.AMBUSH;
        this.targetEntity = prey[0];
      } else if (Math.random() < huntProb) {
        // Caçar (perseguição mais estratégica)
        this.behaviorType = AIBehaviorType.HUNT;
        this.targetEntity = prey[0];
      } else if (Math.random() < chaseProb) {
        // Perseguição direta
        this.behaviorType = AIBehaviorType.CHASE;
        this.targetEntity = prey[0];
      } else if (Math.random() < baitProb && playerMass > 150) {
        // Usar isca (fingir ser vulnerável)
        this.behaviorType = AIBehaviorType.BAIT;
        this.targetEntity = prey[0];
      }

      if (this.behaviorType !== AIBehaviorType.WANDER) {
        return;
      }
    }

    // Verificar companheiros de equipe potenciais
    if (potentialTeammates.length > 0 && Math.random() < teamUpProb) {
      this.behaviorType = AIBehaviorType.TEAM_UP;
      this.teamTarget = potentialTeammates[0] as Player;
      return;
    }

    // Verificar vírus para defesa
    if (viruses.length > 0 && playerMass > 150 && Math.random() < defendProb) {
      this.behaviorType = AIBehaviorType.DEFEND;
      this.targetEntity = viruses[0];
      return;
    }

    // Verificar comida
    if (food.length > 0) {
      if (Math.random() < scavengeProb) {
        // Vasculhar por comida em uma área mais ampla
        this.behaviorType = AIBehaviorType.SCAVENGE;
        // Escolher um item de comida aleatório, não necessariamente o mais próximo
        const randomIndex = Math.floor(Math.random() * Math.min(food.length, 5));
        this.targetEntity = food[randomIndex];
        return;
      } else if (Math.random() < feedProb) {
        // Alimentar-se de comida próxima
        this.behaviorType = AIBehaviorType.FEED;
        this.targetEntity = food[0];
        return;
      }
    }

    // Se nenhuma decisão foi tomada, patrulhar ou perambular
    if (Math.random() < patrolProb) {
      this.behaviorType = AIBehaviorType.PATROL;
      this.currentPatrolIndex = 0;
    } else {
      // Perambular
      this.behaviorType = AIBehaviorType.WANDER;
      this.targetEntity = null;

      // Definir um novo alvo de perambulação se necessário
      if (this.wanderTimer <= 0) {
        this.wanderTarget = randomPosition(this.worldSize);
        this.wanderTimer = 5 + Math.random() * 5; // 5-10 segundos de perambulação
      }
    }
  }

private executeWander(deltaTime: number): void {
  // Verificação de segurança para o jogador
  if (!this.player || !this.player.cells || this.player.cells.length === 0) {
    return;
  }

  // CORREÇÃO: Garantir que wanderTarget esteja definido
  if (!this.wanderTarget || typeof this.wanderTarget.x !== 'number' || typeof this.wanderTarget.y !== 'number') {
    this.wanderTarget = randomPosition(this.worldSize);
  }

  // Mover em direção ao alvo de perambulação
  const playerPos = this.player.getAveragePosition();
  const direction = subtract(this.wanderTarget, playerPos);

  // Verificar se estamos próximos do alvo
  if (Math.abs(direction.x) < 10 && Math.abs(direction.y) < 10) {
    // Definir um novo alvo de perambulação
    this.wanderTarget = randomPosition(this.worldSize);
    this.wanderTimer = 5 + Math.random() * 5;
  }

  // Normalizar direção
  const dirMag = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
  let normalizedDir;
  if (dirMag > 0) {
    normalizedDir = {
      x: direction.x / dirMag,
      y: direction.y / dirMag
    };
  } else {
    // Se não houver direção (estamos exatamente no alvo), escolher uma direção aleatória
    const randomAngle = Math.random() * Math.PI * 2;
    normalizedDir = {
      x: Math.cos(randomAngle),
      y: Math.sin(randomAngle)
    };
  }

  // Definir direção do jogador
  this.player.setTargetDirection(normalizedDir);

  // CORREÇÃO: Aplicar força adicional para movimento mais rápido da IA
  // Aplicar força adicional para movimento mais rápido da IA
  for (const cell of this.player.cells) {
    // Força EXTREMAMENTE AUMENTADA para movimento da IA
    const forceMagnitude = 300000 * deltaTime;
    const force = {
      x: normalizedDir.x * forceMagnitude,
      y: normalizedDir.y * forceMagnitude
    };
    cell.applyForce(force);
    this.updateAndRenderCell(cell, deltaTime);
  }
}

private executeChase(deltaTime: number): void {
    // Verificação de segurança para jogador e alvo
    if (!this.player || !this.player.cells || this.player.cells.length === 0 ||
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }

    // Mover em direção ao alvo
    const playerPos = this.player.getAveragePosition();
    const direction = subtract(this.targetEntity.position, playerPos);

    // Definir direção do jogador
    this.player.setTargetDirection(normalize(direction));

    // MELHORIA: Aplicar força adicional para movimento mais rápido da IA
    for (const cell of this.player.cells) {
      // Força EXTREMAMENTE AUMENTADA para comportamento de perseguição
      const forceMagnitude = 220000 * deltaTime; // Aumentado para perseguição mais agressiva
      const force = {
        x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
        y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
      };
      cell.applyForce(force);
      this.updateAndRenderCell(cell, deltaTime);
    }

    // Verificar se está próximo o suficiente para dividir
    const dist = distance(playerPos, this.targetEntity.position);
    // MELHORIA: Divisão mais inteligente baseada na dificuldade e tamanho
    const now = Date.now();
    const canSplit = this.player.getTotalMass() > 200 && (now - this.lastSplitTime > this.splitCooldown);

    if (dist < 200 && canSplit && Math.random() < 0.1 * this.difficultyLevel) {
      this.player.split();
      this.lastSplitTime = now;
    }
  }

  private executeFlee(deltaTime: number): void {
    // Verificação de segurança para jogador e alvo
    if (!this.player || !this.player.cells || this.player.cells.length === 0 ||
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }

    // Mover para longe do alvo
    const playerPos = this.player.getAveragePosition();
    const direction = subtract(playerPos, this.targetEntity.position);

    // Definir direção do jogador
    this.player.setTargetDirection(normalize(direction));

    // MELHORIA: Aplicar força adicional para movimento mais rápido da IA
    for (const cell of this.player.cells) {
      // Força EXTREMAMENTE AUMENTADA para comportamento de fuga
      const forceMagnitude = 250000 * deltaTime; // Ainda mais força para fugir
      const force = {
        x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
        y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
      };
      cell.applyForce(force);
       this.updateAndRenderCell(cell, deltaTime);
    }

    // Ejetar massa para mover mais rápido se estiver sendo perseguido de perto
    const dist = distance(playerPos, this.targetEntity.position);
    // MELHORIA: Ejeção mais inteligente baseada na dificuldade
    if (dist < 200 && Math.random() < 0.15 * this.difficultyLevel) {
      this.player.eject();
    }

    // Dividir para escapar se for grande o suficiente e estiver muito próximo
    const now = Date.now();
    const canSplit = this.player.getTotalMass() > 200 && (now - this.lastSplitTime > this.splitCooldown);
    if (dist < 100 && canSplit && Math.random() < 0.1 * this.difficultyLevel) {
      this.player.split();
      this.lastSplitTime = now;
    }
  }

  private executeFeed(deltaTime: number): void {
    // Verificação de segurança para jogador e alvo
    if (!this.player || !this.player.cells || this.player.cells.length === 0 ||
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }

    // Mover em direção à comida
    const playerPos = this.player.getAveragePosition();
    const direction = subtract(this.targetEntity.position, playerPos);

    // Definir direção do jogador
    this.player.setTargetDirection(normalize(direction));

    // MELHORIA: Aplicar força adicional para movimento mais rápido da IA
    for (const cell of this.player.cells) {
      // Força AUMENTADA para comportamento de alimentação
      const forceMagnitude = 180000 * deltaTime; // Ajustado para alimentação mais eficiente
      const force = {
        x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
        y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
      };
      cell.applyForce(force);
      this.updateAndRenderCell(cell, deltaTime);
    }
  }

  private executeSplitAndChase(deltaTime: number): void {
    // Verificação de segurança para jogador e alvo
    if (!this.player || !this.player.cells || this.player.cells.length === 0 ||
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }

    // Mover em direção ao alvo
    const playerPos = this.player.getAveragePosition();
    const direction = subtract(this.targetEntity.position, playerPos);

    // Definir direção do jogador
    this.player.setTargetDirection(normalize(direction));

    // MELHORIA: Aplicar força adicional para movimento mais rápido da IA
    for (const cell of this.player.cells) {
      // Força AUMENTADA para comportamento de dividir e perseguir
      const forceMagnitude = 220000 * deltaTime; // Ajustado para perseguição mais agressiva
      const force = {
        x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
        y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
      };
      cell.applyForce(force);
      this.updateAndRenderCell(cell, deltaTime);
    }

    // Dividir se estiver próximo o suficiente e for grande o suficiente
    const dist = distance(playerPos, this.targetEntity.position);
    const now = Date.now();
    const canSplit = this.player.getTotalMass() > 200 && (now - this.lastSplitTime > this.splitCooldown);

   if (dist < 200 && canSplit) {
      this.player.split();
      this.lastSplitTime = now;
      this.behaviorType = AIBehaviorType.CHASE; // Mudar para perseguição regular após dividir
    }
  } // <-- Esta chave estava faltando!

  private executeAmbush(deltaTime: number): void {
    // Verificação de segurança para jogador e alvo
    if (!this.player || !this.player.cells || this.player.cells.length === 0 ||
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }

    // Obter posições
    const playerPos = this.player.getAveragePosition();
    const targetPos = this.targetEntity.position;

    // Calcular posição de emboscada (tentar ficar à frente do alvo)
    if ('velocity' in this.targetEntity && this.targetEntity.velocity) {
      const targetVelocity = this.targetEntity.velocity;
      const targetSpeed = magnitude(targetVelocity);

      if (targetSpeed > 0) {
        // Prever onde o alvo estará
        // MELHORIA: Fator de previsão baseado na dificuldade
        const predictionFactor = 2.0 + (this.difficultyLevel * 0.3); // Olhar mais à frente para dificuldades mais altas
        const predictedPos = {
          x: targetPos.x + targetVelocity.x * predictionFactor,
          y: targetPos.y + targetVelocity.y * predictionFactor
        };

        // Mover em direção à posição prevista
        const direction = subtract(predictedPos, playerPos);
        this.player.setTargetDirection(normalize(direction));

        // MELHORIA: Aplicar força adicional para movimento mais rápido da IA
        for (const cell of this.player.cells) {
          // Força AUMENTADA para comportamento de emboscada
          const forceMagnitude = 200000 * deltaTime;
          const force = {
            x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
            y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
          };
          cell.applyForce(force);
          this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
        }

        // Se estivermos próximos da posição de emboscada e o alvo estiver se aproximando, dividir
        const distToTarget = distance(playerPos, targetPos);
        const now = Date.now();
        const canSplit = this.player.getTotalMass() > 200 && (now - this.lastSplitTime > this.splitCooldown);

        if (distToTarget < 150 && canSplit) {
          this.player.split();
          this.lastSplitTime = now;
          this.behaviorType = AIBehaviorType.CHASE;
        }

        return;
      }
    }

    // Fallback se o alvo não tiver velocidade: apenas perseguir diretamente
    const direction = subtract(targetPos, playerPos);
    this.player.setTargetDirection(normalize(direction));

    // MELHORIA: Aplicar força adicional para movimento mais rápido da IA
    for (const cell of this.player.cells) {
      // Força AUMENTADA para perseguição de fallback
      const forceMagnitude = 180000 * deltaTime;
      const force = {
        x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
        y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
      };
      cell.applyForce(force);
      this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
    }
  }

  private executeDefend(deltaTime: number): void {
    // Verificação de segurança para jogador e alvo
    if (!this.player || !this.player.cells || this.player.cells.length === 0 ||
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }

    // Obter posições
    const playerPos = this.player.getAveragePosition();
    const virusPos = this.targetEntity.position;

    // Calcular distância até o vírus
    const distToVirus = distance(playerPos, virusPos);

    if (distToVirus < 200) {
      // Muito próximo do vírus, afastar-se
      const direction = subtract(playerPos, virusPos);
      this.player.setTargetDirection(normalize(direction));

      // MELHORIA: Aplicar força adicional para movimento mais rápido da IA
      for (const cell of this.player.cells) {
        // Força AUMENTADA para afastar-se do vírus
        const forceMagnitude = 220000 * deltaTime;
        const force = {
          x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
          y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
        };
        cell.applyForce(force);
        this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
      }
    } else {
      // Procurar presas perto do vírus para emboscar
      const nearbyEntities = this.getNearbyEntities();
      const preyNearVirus = nearbyEntities.filter(entity => {
        if ('cells' in entity && entity.cells && entity.cells.length > 0) {
          const otherPlayer = entity as Player;
          const distToVirus = distance(entity.position, virusPos);
          return otherPlayer.getTotalMass() < this.player.getTotalMass() * 0.8 && distToVirus < 300;
        }
        return false;
      });

      if (preyNearVirus.length > 0) {
        // Mover para posição entre vírus e presa
        const prey = preyNearVirus[0];
        const midPoint = {
          x: (virusPos.x + prey.position.x) / 2,
          y: (virusPos.y + prey.position.y) / 2
        };

        const direction = subtract(midPoint, playerPos);
        this.player.setTargetDirection(normalize(direction));

        // MELHORIA: Aplicar força adicional para movimento mais rápido da IA
        for (const cell of this.player.cells) {
          // Força AUMENTADA para posicionamento
          const forceMagnitude = 180000 * deltaTime;
          const force = {
            x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
            y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
          };
          cell.applyForce(force);
          this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
        }

        // Ejetar massa em direção ao vírus se a presa estiver próxima dele
        const preyToVirus = distance(prey.position, virusPos);
        // MELHORIA: Ejeção mais inteligente baseada na dificuldade
        if (preyToVirus < 100 && Math.random() < 0.3 * this.difficultyLevel) {
          // Calcular direção para o vírus
          const virusDirection = subtract(virusPos, playerPos);
          this.player.setTargetDirection(normalize(virusDirection));
          this.player.eject();

          // Redefinir direção após ejetar
          this.player.setTargetDirection(normalize(direction));
        }
      } else {
        // Nenhuma presa perto do vírus, apenas perambular
        this.behaviorType = AIBehaviorType.WANDER;
      }
    }
  }

  private executeScavenge(deltaTime: number): void {
    // Verificação de segurança para o jogador
    if (!this.player || !this.player.cells || this.player.cells.length === 0) {
      return;
    }

    // Se tivermos um alvo, mover em direção a ele
    if (this.targetEntity && this.targetEntity.position) {
      const playerPos = this.player.getAveragePosition();
      const direction = subtract(this.targetEntity.position, playerPos);

      // Verificar se estamos próximos do alvo
      if (distance(playerPos, this.targetEntity.position) < 10) {
        // Encontrar um novo alvo de comida
        const nearbyEntities = this.getNearbyEntities();
        const foodEntities = nearbyEntities.filter(entity =>
          'value' in entity && !('cells' in entity)
        );

        if (foodEntities.length > 0) {
          // Escolher um item de comida aleatório dentro do alcance
          const randomIndex = Math.floor(Math.random() * Math.min(foodEntities.length, 10));
          this.targetEntity = foodEntities[randomIndex];
        } else {
          // Nenhuma comida por perto, mudar para perambular
          this.behaviorType = AIBehaviorType.WANDER;
          this.wanderTarget = randomPosition(this.worldSize);
        }
      } else {
        // Continuar movendo em direção ao alvo
        this.player.setTargetDirection(normalize(direction));

        // MELHORIA: Aplicar força adicional para movimento mais rápido da IA
        for (const cell of this.player.cells) {
          // Força AUMENTADA para vasculhar
          const forceMagnitude = 180000 * deltaTime;
          const force = {
            x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
            y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
          };
          cell.applyForce(force);
          this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
        }
      }
    } else {
      // Nenhum alvo, mudar para perambular
      this.behaviorType = AIBehaviorType.WANDER;
      this.wanderTarget = randomPosition(this.worldSize);
    }
  }

  // MELHORIA: Implementar novos comportamentos

  private executePatrol(deltaTime: number): void {
    // Verificação de segurança para o jogador
    if (!this.player || !this.player.cells || this.player.cells.length === 0) {
      return;
    }

    // Verificar se temos pontos de patrulha
    if (!this.patrolPoints || this.patrolPoints.length === 0) {
      this.patrolPoints = this.generatePatrolPoints();
    }

    // Obter o ponto de patrulha atual
    const currentPoint = this.patrolPoints[this.currentPatrolIndex];
    const playerPos = this.player.getAveragePosition();

    // Mover em direção ao ponto de patrulha atual
    const direction = subtract(currentPoint, playerPos);
    this.player.setTargetDirection(normalize(direction));

    // MELHORIA: Aplicar força adicional para movimento mais rápido da IA
    for (const cell of this.player.cells) {
      // Força para patrulha
      const forceMagnitude = 150000 * deltaTime;
      const force = {
        x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
        y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
      };
      cell.applyForce(force);
      this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
    }

    // Verificar se chegamos ao ponto de patrulha atual
    if (distance(playerPos, currentPoint) < 50) {
      // Avançar para o próximo ponto
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
    }

    // Verificar por ameaças ou oportunidades durante a patrulha
    const nearbyEntities = this.getNearbyEntities();

    // Verificar por presas fáceis
    const easyPrey = nearbyEntities.filter(entity => {
      if ('cells' in entity && entity.cells && entity.cells.length > 0) {
        const otherPlayer = entity as Player;
        return otherPlayer.getTotalMass() < this.player.getTotalMass() * 0.6; // Muito menor
      }
      return false;
    });

    // Verificar por ameaças sérias
    const seriousThreats = nearbyEntities.filter(entity => {
      if ('cells' in entity && entity.cells && entity.cells.length > 0) {
        const otherPlayer = entity as Player;
        return otherPlayer.getTotalMass() > this.player.getTotalMass() * 1.4; // Muito maior
      }
      return false;
    });

    // Reagir a ameaças ou oportunidades
    if (seriousThreats.length > 0 && Math.random() < 0.8) {
      // Mudar para fuga
      this.behaviorType = AIBehaviorType.FLEE;
      this.targetEntity = seriousThreats[0];
    } else if (easyPrey.length > 0 && Math.random() < 0.7) {
      // Mudar para perseguição
      this.behaviorType = AIBehaviorType.CHASE;
      this.targetEntity = easyPrey[0];
    }
  }

  private executeHunt(deltaTime: number): void {
    // Verificação de segurança para jogador e alvo
    if (!this.player || !this.player.cells || this.player.cells.length === 0 ||
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }

    // Obter posições
    const playerPos = this.player.getAveragePosition();
    const targetPos = this.targetEntity.position;

    // Calcular distância até o alvo
    const distToTarget = distance(playerPos, targetPos);

    // MELHORIA: Comportamento de caça mais sofisticado
    if (distToTarget > 500) {
      // Alvo está longe, mover diretamente em direção a ele
      const direction = subtract(targetPos, playerPos);
      this.player.setTargetDirection(normalize(direction));

      // Aplicar força para movimento rápido
      for (const cell of this.player.cells) {
        const forceMagnitude = 220000 * deltaTime;
        const force = {
          x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
          y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
        };
        cell.applyForce(force);
        this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
      }
    } else if (distToTarget > 200) {
      // Alvo está a média distância, tentar prever movimento
      if ('velocity' in this.targetEntity && this.targetEntity.velocity) {
        const targetVelocity = this.targetEntity.velocity;
        const targetSpeed = magnitude(targetVelocity);

        if (targetSpeed > 0) {
          // Prever onde o alvo estará
          const predictionFactor = 3.0 + (this.difficultyLevel * 0.5);
          const predictedPos = {
            x: targetPos.x + targetVelocity.x * predictionFactor,
            y: targetPos.y + targetVelocity.y * predictionFactor
          };

          // Mover para interceptar
          const direction = subtract(predictedPos, playerPos);
          this.player.setTargetDirection(normalize(direction));

          // Aplicar força para movimento rápido
          for (const cell of this.player.cells) {
            const forceMagnitude = 250000 * deltaTime;
            const force = {
              x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
              y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
            };
            cell.applyForce(force);
            this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
          }
        }
      }
    } else {
      // Alvo está próximo, preparar para dividir ou atacar diretamente
      const direction = subtract(targetPos, playerPos);
      this.player.setTargetDirection(normalize(direction));

      // Aplicar força para movimento preciso
      for (const cell of this.player.cells) {
        const forceMagnitude = 200000 * deltaTime;
        const force = {
          x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
          y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
        };
        cell.applyForce(force);
        this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
      }

      // Verificar se deve dividir
      const now = Date.now();
      const canSplit = this.player.getTotalMass() > 200 && (now - this.lastSplitTime > this.splitCooldown);

      if (distToTarget < 150 && canSplit && Math.random() < 0.2 * this.difficultyLevel) {
        this.player.split();
        this.lastSplitTime = now;
      }
    }

    // Verificar se o alvo escapou ou está muito longe
    if (distToTarget > 800) {
      // Desistir da caça e voltar a perambular
      this.behaviorType = AIBehaviorType.WANDER;
      this.wanderTarget = randomPosition(this.worldSize);
    }
  }

  private executeBait(deltaTime: number): void {
    // Verificação de segurança para jogador e alvo
    if (!this.player || !this.player.cells || this.player.cells.length === 0 ||
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }

    // Obter posições
    const playerPos = this.player.getAveragePosition();
    const targetPos = this.targetEntity.position;

    // Calcular distância até o alvo
    const distToTarget = distance(playerPos, targetPos);

    // MELHORIA: Comportamento de isca - fingir ser vulnerável
    if (distToTarget > 400) {
      // Alvo está longe, mover em sua direção
      const direction = subtract(targetPos, playerPos);
      this.player.setTargetDirection(normalize(direction));

      // Mover mais lentamente para parecer vulnerável
      for (const cell of this.player.cells) {
        const forceMagnitude = 100000 * deltaTime; // Força reduzida
        const force = {
          x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
          y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
        };
        cell.applyForce(force);
        this.updateAndRenderCell(cell, deltaTime);
      }
    } else if (distToTarget > 200) {
      // Alvo está a média distância, fingir estar distraído
      // Mover em padrão de zigue-zague
      const time = Date.now() / 1000;
      const zigzag = Math.sin(time * 3) * 0.5;

      const baseDirection = subtract(targetPos, playerPos);
      const normalizedDir = normalize(baseDirection);

      // Adicionar componente perpendicular para zigue-zague
      const perpDirection = {
        x: -normalizedDir.y * zigzag,
        y: normalizedDir.x * zigzag
      };

      const finalDirection = {
        x: normalizedDir.x + perpDirection.x,
        y: normalizedDir.y + perpDirection.y
      };

      this.player.setTargetDirection(normalize(finalDirection));

      // Mover com velocidade média
      for (const cell of this.player.cells) {
        const forceMagnitude = 120000 * deltaTime;
        const force = {
          x: finalDirection.x * forceMagnitude / Math.max(1, magnitude(finalDirection)),
          y: finalDirection.y * forceMagnitude / Math.max(1, magnitude(finalDirection))
        };
        cell.applyForce(force);
        this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
      }
    } else {
      // Alvo está próximo, atacar de repente!
      const direction = subtract(targetPos, playerPos);
      this.player.setTargetDirection(normalize(direction));

      // Mover muito rapidamente para surpreender
      for (const cell of this.player.cells) {
        const forceMagnitude = 300000 * deltaTime; // Força muito alta
        const force = {
          x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
          y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
        };
        cell.applyForce(force);
        this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
      }

      // Tentar dividir para capturar
      const now = Date.now();
      const canSplit = this.player.getTotalMass() > 200 && (now - this.lastSplitTime > this.splitCooldown);

      if (distToTarget < 150 && canSplit) {
        this.player.split();
        this.lastSplitTime = now;
        // Mudar para perseguição direta
        this.behaviorType = AIBehaviorType.CHASE;
      }
    }
  }

  private executeTeamUp(deltaTime: number): void {
    // Verificação de segurança para jogador e companheiro de equipe
    if (!this.player || !this.player.cells || this.player.cells.length === 0 ||
        !this.teamTarget || !this.teamTarget.cells || this.teamTarget.cells.length === 0) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }

    // Obter posições
    const playerPos = this.player.getAveragePosition();
    const teammatePos = this.teamTarget.getAveragePosition();

    // Calcular distância até o companheiro
    const distToTeammate = distance(playerPos, teammatePos);

    // MELHORIA: Comportamento de equipe
    if (distToTeammate > 300) {
      // Companheiro está longe, mover em sua direção
      const direction = subtract(teammatePos, playerPos);
      this.player.setTargetDirection(normalize(direction));

      // Mover rapidamente para alcançar o companheiro
      for (const cell of this.player.cells) {
        const forceMagnitude = 200000 * deltaTime;
        const force = {
          x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
          y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
        };
        cell.applyForce(force);
        this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
      }
    } else {
      // Próximo ao companheiro, procurar alvos em conjunto
      const nearbyEntities = this.getNearbyEntities();

      // Procurar por presas potenciais
      const potentialPrey = nearbyEntities.filter(entity => {
        if ('cells' in entity && entity.cells && entity.cells.length > 0) {
          const otherPlayer = entity as Player;
          // Alvo que seria difícil sozinho, mas possível em equipe
          const combinedMass = this.player.getTotalMass() + this.teamTarget.getTotalMass();
          return otherPlayer.getTotalMass() < combinedMass * 0.8 &&
                 otherPlayer.getTotalMass() > this.player.getTotalMass();
        }
        return false;
      });

      if (potentialPrey.length > 0) {
        // Encontrou presa, coordenar ataque
        const prey = potentialPrey[0];

        // Calcular posição para flanquear (ficar do lado oposto ao companheiro)
        const teammateToPreyDir = subtract(prey.position, teammatePos);
        const normalizedDir = normalize(teammateToPreyDir);

        // Posição oposta
        const flankPos = {
          x: prey.position.x - normalizedDir.x * 200,
          y: prey.position.y - normalizedDir.y * 200
        };

        // Mover para posição de flanqueamento
        const direction = subtract(flankPos, playerPos);
        this.player.setTargetDirection(normalize(direction));

        // Mover rapidamente para posição
        for (const cell of this.player.cells) {
          const forceMagnitude = 220000 * deltaTime;
          const force = {
            x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
            y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
          };
          cell.applyForce(force);
          this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
        }

        // Verificar se está em posição para atacar
        const distToPrey = distance(playerPos, prey.position);
        const now = Date.now();
        const canSplit = this.player.getTotalMass() > 200 && (now - this.lastSplitTime > this.splitCooldown);

        if (distToPrey < 150 && canSplit) {
          // Atacar!
          this.player.split();
          this.lastSplitTime = now;
          this.behaviorType = AIBehaviorType.CHASE;
          this.targetEntity = prey;
        }
      } else {
        // Nenhuma presa adequada, manter-se próximo ao companheiro
        // Calcular posição ligeiramente afastada
        const offset = {
          x: Math.cos(Date.now() / 1000) * 100,
          y: Math.sin(Date.now() / 1000) * 100
        };

        const targetPos = {
          x: teammatePos.x + offset.x,
          y: teammatePos.y + offset.y
        };

        const direction = subtract(targetPos, playerPos);
        this.player.setTargetDirection(normalize(direction));

        // Mover suavemente
        for (const cell of this.player.cells) {
          const forceMagnitude = 150000 * deltaTime;
          const force = {
            x: direction.x * forceMagnitude / Math.max(1, magnitude(direction)),
            y: direction.y * forceMagnitude / Math.max(1, magnitude(direction))
          };
          cell.applyForce(force);
          this.updateAndRenderCell(cell, deltaTime); // Atualiza a membrana
        }
      }
    }

    // Verificar se o companheiro ainda é adequado
    if (Math.abs(this.player.getTotalMass() - this.teamTarget.getTotalMass()) / this.player.getTotalMass() > 0.5) {
      // Diferença de tamanho muito grande, abandonar equipe
      this.behaviorType = AIBehaviorType.WANDER;
    }
  }
  // src/ai.ts (continuação - métodos auxiliares)

  private getNearbyEntities(): Entity[] {
    // Este método deve ser chamado com as entidades do jogo
    // Como não temos acesso direto ao estado do jogo aqui,
    // implementaremos uma solução alternativa

    // Criar um evento personalizado para solicitar entidades
    const requestEvent = new CustomEvent('ai-request-entities', {
      detail: {
        aiId: this.player.id,
        position: this.player.getAveragePosition(),
        range: 600 + this.difficultyLevel * 150
      }
    });

    // Criar um manipulador de resposta
    let entities: Entity[] = [];
    const responseHandler = (e: any) => {
      if (e.detail.aiId === this.player.id) {
        entities = e.detail.entities;
      }
    };

    // Ouvir resposta
    window.addEventListener('ai-entities-response', responseHandler);

    // Despachar solicitação
    window.dispatchEvent(requestEvent);

    // Remover listener
    window.removeEventListener('ai-entities-response', responseHandler);

    return entities;
  }

  // Métodos auxiliares para comportamento de IA melhorado

  private findSafeDirection(threats: Entity[]): Vector2D {
    const playerPos = this.player.getAveragePosition();

    // Se não houver ameaças, mover em direção ao centro
    if (threats.length === 0) {
      const centerDirection = subtract(
        { x: this.worldSize.x / 2, y: this.worldSize.y / 2 },
        playerPos
      );
      return normalize(centerDirection);
    }

    // Calcular direção média da ameaça
    let threatDirection = { x: 0, y: 0 };
    for (const threat of threats) {
      const direction = subtract(playerPos, threat.position);
      threatDirection = add(threatDirection, normalize(direction));
    }

    // Normalizar a direção resultante
    return normalize(threatDirection);
  }

  private shouldSplit(target: Entity): boolean {
    // MELHORIA: Lógica de divisão mais inteligente
    // Só dividir se:
    // 1. Somos grandes o suficiente
    // 2. O alvo é menor que nós
    // 3. Estamos próximos o suficiente do alvo
    // 4. Não temos muitas células já
    // 5. O cooldown de divisão passou

    if (this.player.cells.length >= this.player.maxCells / 2) {
      return false;
    }

    const playerMass = this.player.getTotalMass();
    if (playerMass < 200) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastSplitTime < this.splitCooldown) {
      return false;
    }

    // Verificar se o alvo é um jogador
    if ('cells' in target) {
      const targetPlayer = target as Player;
      if (targetPlayer.getTotalMass() * 1.3 > playerMass) {
        return false;
      }
    }

    // Verificar distância
    const playerPos = this.player.getAveragePosition();
    const dist = distance(playerPos, target.position);

    // IAs mais difíceis são mais agressivas com a divisão
    const splitDistance = 200 + (this.difficultyLevel * 50);

    return dist < splitDistance;
  }

  private shouldEject(): boolean {
    // MELHORIA: Lógica de ejeção mais inteligente
    // Ejetar massa se:
    // 1. Somos grandes o suficiente
    // 2. Não estamos em perigo imediato
    // 3. Chance aleatória baseada na dificuldade

    const playerMass = this.player.getTotalMass();
    if (playerMass < 100) {
      return false;
    }

    // Verificar ameaças próximas
    const nearbyEntities = this.getNearbyEntities();
    const threats = nearbyEntities.filter(entity => {
      if ('cells' in entity && entity.cells && entity.cells.length > 0) {
        const otherPlayer = entity as Player;
        return otherPlayer.getTotalMass() > playerMass * 1.2;
      }
      return false;
    });

    if (threats.length > 0) {
      // Não ejetar se houver ameaças próximas
      return false;
    }

    // Chance aleatória baseada na dificuldade e personalidade
    let ejectChance = 0.01;

    // Personalidades agressivas ejetam mais
    if (this.personalityType === 0) {
      ejectChance *= 2;
    }

    // IAs mais difíceis ejetam mais estrategicamente
    ejectChance *= this.difficultyLevel;

    return Math.random() < ejectChance;
  }

  private findOptimalPath(target: Vector2D): Vector2D {
    // MELHORIA: Implementar pathfinding para evitar obstáculos
    const playerPos = this.player.getAveragePosition();

    // Obter entidades próximas
    const nearbyEntities = this.getNearbyEntities();

    // Encontrar vírus e jogadores maiores para evitar
    const obstacles = nearbyEntities.filter(entity => {
      // Evitar vírus se formos grandes
      if ('splitThreshold' in entity && this.player.getTotalMass() > 150) {
        return true;
      }

      // Evitar jogadores maiores
      if ('cells' in entity && entity.cells && entity.cells.length > 0) {
        const otherPlayer = entity as Player;
        return otherPlayer.getTotalMass() > this.player.getTotalMass() * 1.2;
      }

      return false;
    });

    // Se não houver obstáculos, ir diretamente para o alvo
    if (obstacles.length === 0) {
      return normalize(subtract(target, playerPos));
    }

    // Calcular caminho direto
    const directPath = subtract(target, playerPos);
    const directDistance = magnitude(directPath);

    // Verificar se algum obstáculo está no caminho
    let obstacleInPath = false;
    for (const obstacle of obstacles) {
      // Calcular distância perpendicular do obstáculo ao caminho
      const obstacleVector = subtract(obstacle.position, playerPos);
      const projection = (obstacleVector.x * directPath.x + obstacleVector.y * directPath.y) / directDistance;

      // Pular obstáculos atrás de nós
      if (projection < 0) continue;

      // Pular obstáculos além do alvo
      if (projection > directDistance) continue;

      // Calcular ponto mais próximo no caminho ao obstáculo
      const closestPoint = {
        x: playerPos.x + (directPath.x * projection / directDistance),
        y: playerPos.y + (directPath.y * projection / directDistance)
      };

      // Verificar se o obstáculo está próximo o suficiente do caminho para ser uma preocupação
      const obstacleRadius = 'radius' in obstacle ? obstacle.radius : 30;
      const safeDistance = obstacleRadius + this.player.getMaxRadius() * 1.5;

      if (distance(closestPoint, obstacle.position) < safeDistance) {
        obstacleInPath = true;
        break;
      }
    }

    // Se não houver obstáculo no caminho, ir diretamente
    if (!obstacleInPath) {
      return normalize(directPath);
    }

    // Encontrar caminho alternativo
    // Tentar vários ângulos e escolher o que tiver menos obstáculos
    const angles = [Math.PI/6, -Math.PI/6, Math.PI/3, -Math.PI/3, Math.PI/2, -Math.PI/2];
    let bestAngle = 0;
    let minObstacles = Infinity;

    for (const angle of angles) {
      // Rotacionar o caminho direto
      const rotatedPath = {
        x: directPath.x * Math.cos(angle) - directPath.y * Math.sin(angle),
        y: directPath.x * Math.sin(angle) + directPath.y * Math.cos(angle)
      };

      // Contar obstáculos neste caminho
      let obstacleCount = 0;
      for (const obstacle of obstacles) {
        // Cálculo similar ao acima
        const obstacleVector = subtract(obstacle.position, playerPos);
        const projection = (obstacleVector.x * rotatedPath.x + obstacleVector.y * rotatedPath.y) / magnitude(rotatedPath);

        if (projection < 0 || projection > magnitude(rotatedPath)) continue;

        const closestPoint = {
          x: playerPos.x + (rotatedPath.x * projection / magnitude(rotatedPath)),
          y: playerPos.y + (rotatedPath.y * projection / magnitude(rotatedPath))
        };

        const obstacleRadius = 'radius' in obstacle ? obstacle.radius : 30;
        const safeDistance = obstacleRadius + this.player.getMaxRadius() * 1.5;

        if (distance(closestPoint, obstacle.position) < safeDistance) {
          obstacleCount++;
        }
      }

      // Atualizar melhor ângulo se este tiver menos obstáculos
      if (obstacleCount < minObstacles) {
        minObstacles = obstacleCount;
        bestAngle = angle;
      }
    }

    // Rotacionar o caminho direto pelo melhor ângulo
    const bestPath = {
      x: directPath.x * Math.cos(bestAngle) - directPath.y * Math.sin(bestAngle),
      y: directPath.x * Math.sin(bestAngle) + directPath.y * Math.cos(bestAngle)
    };

    return normalize(bestPath);
  }

  // Método para lidar com situações especiais
  handleSpecialSituation(situation: string, data: any): void {
    switch (situation) {
      case 'nearVirus':
        // Lidar com estar perto de um vírus
        if (this.player.getTotalMass() > 150) {
          // Se formos grandes, evitar o vírus
          this.behaviorType = AIBehaviorType.FLEE;
          this.targetEntity = data.virus;
        } else {
          // Se formos pequenos, podemos usar o vírus como proteção
          this.behaviorType = AIBehaviorType.DEFEND;
          this.targetEntity = data.virus;
        }
        break;

      case 'cornerTrapped':
        // Lidar com estar preso em um canto
        this.behaviorType = AIBehaviorType.FLEE;
        // Mover em direção ao centro
        this.wanderTarget = {
          x: this.worldSize.x / 2,
          y: this.worldSize.y / 2
        };
        break;

      case 'powerUpAvailable':
        // Ir para power-up
        this.behaviorType = AIBehaviorType.FEED;
        this.targetEntity = data.powerUp;
        break;

      case 'beingChased':
        // Lidar com ser perseguido por um jogador maior
        this.behaviorType = AIBehaviorType.FLEE;
        this.targetEntity = data.threat;

        // Se estivermos perto de um vírus, tentar usá-lo
        if (data.nearbyVirus) {
          const playerPos = this.player.getAveragePosition();
          const virusPos = data.nearbyVirus.position;
          const threatPos = data.threat.position;

          // Calcular direção que coloca o vírus entre nós e a ameaça
          const virusToThreat = subtract(threatPos, virusPos);
          const normalizedVirusToThreat = normalize(virusToThreat);

          // Posicionar-nos no lado oposto do vírus
          const targetPos = {
            x: virusPos.x - normalizedVirusToThreat.x * 100,
            y: virusPos.y - normalizedVirusToThreat.y * 100
          };

          const direction = subtract(targetPos, playerPos);
          this.player.setTargetDirection(normalize(direction));
          return;
        }
        break;

      // MELHORIA: Novas situações especiais
      case 'foodCluster':
        // Ir para um cluster de comida
        this.behaviorType = AIBehaviorType.FEED;
        this.targetEntity = null;
        this.wanderTarget = data.clusterPosition;
        break;

      case 'teamOpportunity':
        // Oportunidade de formar equipe
        this.behaviorType = AIBehaviorType.TEAM_UP;
        this.teamTarget = data.teammate;
        break;

      case 'ambushOpportunity':
        // Oportunidade de emboscada
        this.behaviorType = AIBehaviorType.AMBUSH;
        this.targetEntity = data.prey;
        break;
    }
  }
}
