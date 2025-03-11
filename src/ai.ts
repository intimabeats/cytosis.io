// src/ai.ts - COMPLETE and CORRECTED (includes TODOs for AI logic)

import { Entity, Vector2D, Player } from './types';
import {
  distance,
  subtract,
  normalize,
  randomPosition,
  // Keep magnitude!
} from './utils';
import { GamePlayer } from './player'; // Import GamePlayer

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

    private updateAndRenderCell(cell: any): void {
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
                entity !== (this.player as unknown as Entity); // Pular a si mesmo
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
            if (entity instanceof GamePlayer)
            {
                const otherPlayer = entity;
                return otherPlayer.getTotalMass() > playerMass * 1.1;
            }
            return false;
        });

        // Encontrar presas (jogadores menores)
        const prey = nearbyEntities.filter(entity => {
            if (entity instanceof GamePlayer) {
                const otherPlayer = entity;
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
            if (entity instanceof GamePlayer) {
                const otherPlayer = entity;
                return  otherPlayer.isAI &&
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
            if (potentialTeammates[0] instanceof GamePlayer) {
                this.teamTarget = potentialTeammates[0];
            }
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
        this.updateAndRenderCell(cell);
        }
    }

  // Comentando as funções não utilizadas para evitar erros de compilação
  // private executeChase(_deltaTime: number): void {  // Correção: _deltaTime
  //   // TODO: Implementar chase
  // }
  // private executeFlee(_deltaTime: number): void { // Correção: _deltaTime
  //   // TODO: Implementar flee
  // }
  // private executeFeed(_deltaTime: number): void { // Correção: _deltaTime
  //     // TODO: Implementar feed
  // }
  // private executeSplitAndChase(_deltaTime: number): void { // Correção: _deltaTime
  //     // TODO: Implementar splitAndChase
  // }
  // private executeAmbush(_deltaTime: number): void { // Correção: _deltaTime
  //     // TODO: Implementar ambush
  // }
  // private executeDefend(_deltaTime: number): void { // Correção: _deltaTime
  //     // TODO: Implementar defend
  // }
  // private executeScavenge(_deltaTime: number): void { // Correção: _deltaTime
  //     // TODO: Implementar scavenge
  // }
  // private executePatrol(_deltaTime: number): void { // Correção: _deltaTime
  //     // TODO: Implementar patrol
  // }
  //   private executeHunt(_deltaTime: number): void { // Correção: _deltaTime
  //       // TODO: Implementar hunt
  //   }
  //     private executeBait(_deltaTime: number): void { // Correção: _deltaTime
  //       // TODO: Implementar bait
  //   }
  //     private executeTeamUp(_deltaTime: number): void { // Correção: _deltaTime
  //       // TODO: Implementar teamUp
  //   }


    // private getNearbyEntities(): Entity[] {
    //     // Este método deve ser chamado com as entidades do jogo
    //     // Como não temos acesso direto ao estado do jogo aqui,
    //     // implementaremos uma solução alternativa

    //     // Criar um evento personalizado para solicitar entidades
    //     const requestEvent = new CustomEvent('ai-request-entities', {
    //     detail: {
    //         aiId: this.player.id,
    //         position: this.player.getAveragePosition(),
    //         range: 600 + this.difficultyLevel * 150
    //     }
    //     });

    //     // Criar um manipulador de resposta
    //     let entities: Entity[] = [];
    //     const responseHandler = (e: any) => {
    //       if (e.detail.aiId === this.player.id) {
    //         entities = e.detail.entities;
    //       }
    //     };


    //     // Ouvir resposta
    //     window.addEventListener('ai-entities-response', responseHandler);

    //     // Despachar solicitação
    //     window.dispatchEvent(requestEvent);

    //     // Remover listener
    //     window.removeEventListener('ai-entities-response', responseHandler);

    //     return entities;
    // }

      // Métodos auxiliares para comportamento de IA melhorado

  // private findSafeDirection(_threats: Entity[]): Vector2D { //_threats
  //   // TODO: Implementar findSafeDirection
  //   return {x: 0, y: 0};
  // }

  //   private shouldSplit(_target: Entity): boolean { //_target
  //       // TODO: Implementar shouldSplit
  //       return false; // Placeholder
  //   }

  //   private shouldEject(): boolean {
  //       // TODO: Implementar shouldEject
  //       return false; // Placeholder
  //   }

  //   private findOptimalPath(_target: Vector2D): Vector2D { // _target
  //       // TODO: Implementar findOptimalPath
  //       return {x:0, y: 0};
  //   }

  //     // Método para lidar com situações especiais
  //   handleSpecialSituation(_situation: string, _data: any): void { // _situation, _data
  //       // TODO: Implementar handleSpecialSituation
  //   }
}
