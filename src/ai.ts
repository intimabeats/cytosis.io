// [v1.0-Part1] AI Controller for computer-controlled players
// #=== 20% ===#

import { Entity, Vector2D, Player } from './types';
import { 
  distance, 
  subtract, 
  normalize, 
  multiply, 
  add,
  randomPosition
} from './utils';

// Different AI behavior types
export enum AIBehaviorType {
  WANDER,
  CHASE,
  FLEE,
  FEED,
  SPLIT_AND_CHASE
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
  
  constructor(player: Player, worldSize: Vector2D) {
    this.player = player;
    this.behaviorType = AIBehaviorType.WANDER;
    this.targetEntity = null;
    this.wanderTarget = randomPosition(worldSize);
    this.wanderTimer = 0;
    this.decisionTimer = 0;
    this.worldSize = worldSize;
    this.lastDecisionTime = 0;
  }
  
  update(deltaTime: number, entities: Entity[]): void {
    // Safety check for player
    if (!this.player || !this.player.cells || this.player.cells.length === 0) {
      return;
    }
    
    // Update timers
    this.wanderTimer -= deltaTime;
    this.decisionTimer -= deltaTime;
    
    // Make a new decision periodically
    if (this.decisionTimer <= 0) {
      try {
        this.makeDecision(entities);
      } catch (error) {
        console.error("Error in AI decision making:", error);
        // Fallback to wandering behavior
        this.behaviorType = AIBehaviorType.WANDER;
        this.targetEntity = null;
        this.wanderTarget = randomPosition(this.worldSize);
      }
      this.decisionTimer = 1 + Math.random() * 2; // 1-3 seconds between decisions
      this.lastDecisionTime = Date.now();
    }
    
    // Execute current behavior
    try {
      switch (this.behaviorType) {
        case AIBehaviorType.WANDER:
          this.executeWander(deltaTime);
          break;
        case AIBehaviorType.CHASE:
          this.executeChase(deltaTime);
          break;
        case AIBehaviorType.FLEE:
          this.executeFlee(deltaTime);
          break;
        case AIBehaviorType.FEED:
          this.executeFeed(deltaTime);
          break;
        case AIBehaviorType.SPLIT_AND_CHASE:
          this.executeSplitAndChase(deltaTime);
          break;
      }
    } catch (error) {
      console.error("Error in AI behavior execution:", error);
      // Fallback to simple wandering
      this.wanderTarget = randomPosition(this.worldSize);
      const playerPos = this.player.getAveragePosition();
      const direction = subtract(this.wanderTarget, playerPos);
      this.player.setTargetDirection(normalize(direction));
    }
  }
  
  private makeDecision(entities: Entity[]): void {
    // Safety check for player
    if (!this.player || !this.player.cells || this.player.cells.length === 0) {
      this.behaviorType = AIBehaviorType.WANDER;
      this.targetEntity = null;
      return;
    }
    
    const playerPos = this.player.getAveragePosition();
    const playerMass = this.player.getTotalMass();
    
    // Filter out invalid entities
    const validEntities = entities.filter(entity => {
      return entity && entity.position && 
             typeof entity.position.x === 'number' && 
             typeof entity.position.y === 'number' &&
             entity !== this.player; // Skip self
    });
    
    // Find nearby entities
    const nearbyEntities = validEntities.filter(entity => {
      // Check if entity is within detection range
      const detectionRange = 500 + playerMass / 10;
      const dist = distance(playerPos, entity.position);
      return !isNaN(dist) && dist < detectionRange;
    });
    
    // Sort entities by distance
    nearbyEntities.sort((a, b) => {
      const distA = distance(playerPos, a.position);
      const distB = distance(playerPos, b.position);
      return distA - distB;
    });
    
    // Find threats (larger players)
    const threats = nearbyEntities.filter(entity => {
      if ('cells' in entity && entity.cells && entity.cells.length > 0) {
        const otherPlayer = entity as Player;
        return otherPlayer.getTotalMass() > playerMass * 1.2;
      }
      return false;
    });
    
    // Find prey (smaller players)
    const prey = nearbyEntities.filter(entity => {
      if ('cells' in entity && entity.cells && entity.cells.length > 0) {
        const otherPlayer = entity as Player;
        return otherPlayer.getTotalMass() < playerMass * 0.8;
      }
      return false;
    });
    
    // Find food
    const food = nearbyEntities.filter(entity => {
      return 'value' in entity && !('cells' in entity);
    });
    
    // Decision making logic
    if (threats.length > 0 && Math.random() < 0.8) {
      // Flee from threats
      this.behaviorType = AIBehaviorType.FLEE;
      this.targetEntity = threats[0];
    } else if (prey.length > 0 && Math.random() < 0.7) {
      // Chase prey
      this.behaviorType = AIBehaviorType.CHASE;
      this.targetEntity = prey[0];
      
      // Sometimes decide to split to catch prey
      if (playerMass > 200 && Math.random() < 0.3) {
        this.behaviorType = AIBehaviorType.SPLIT_AND_CHASE;
      }
    } else if (food.length > 0 && Math.random() < 0.6) {
      // Feed on nearby food
      this.behaviorType = AIBehaviorType.FEED;
      this.targetEntity = food[0];
    } else {
      // Wander around
      this.behaviorType = AIBehaviorType.WANDER;
      this.targetEntity = null;
      
      // Set a new wander target if needed
      if (this.wanderTimer <= 0) {
        this.wanderTarget = randomPosition(this.worldSize);
        this.wanderTimer = 5 + Math.random() * 5; // 5-10 seconds of wandering
      }
    }
  }
  
  private executeWander(deltaTime: number): void {
    // Safety check for player
    if (!this.player || !this.player.cells || this.player.cells.length === 0) {
      return;
    }
    
    // Move toward wander target
    const playerPos = this.player.getAveragePosition();
    const direction = subtract(this.wanderTarget, playerPos);
    
    // Check if we're close to the target
    if (Math.abs(direction.x) < 10 && Math.abs(direction.y) < 10) {
      // Set a new wander target
      this.wanderTarget = randomPosition(this.worldSize);
      this.wanderTimer = 5 + Math.random() * 5;
    }
    
    // Set player direction
    this.player.setTargetDirection(normalize(direction));
  }
  
  private executeChase(deltaTime: number): void {
    // Safety check for player and target
    if (!this.player || !this.player.cells || this.player.cells.length === 0 || 
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }
    
    // Move toward target
    const playerPos = this.player.getAveragePosition();
    const direction = subtract(this.targetEntity.position, playerPos);
    
    // Set player direction
    this.player.setTargetDirection(normalize(direction));
  }
  
  private executeFlee(deltaTime: number): void {
    // Safety check for player and target
    if (!this.player || !this.player.cells || this.player.cells.length === 0 || 
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }
    
    // Move away from target
    const playerPos = this.player.getAveragePosition();
    const direction = subtract(playerPos, this.targetEntity.position);
    
    // Set player direction
    this.player.setTargetDirection(normalize(direction));
    
    // Eject mass to move faster if being chased closely
    const dist = distance(playerPos, this.targetEntity.position);
    if (dist < 200 && Math.random() < 0.1) {
      this.player.eject();
    }
  }
  
  private executeFeed(deltaTime: number): void {
    // Safety check for player and target
    if (!this.player || !this.player.cells || this.player.cells.length === 0 || 
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }
    
    // Move toward food
    const playerPos = this.player.getAveragePosition();
    const direction = subtract(this.targetEntity.position, playerPos);
    
    // Set player direction
    this.player.setTargetDirection(normalize(direction));
  }
  
  private executeSplitAndChase(deltaTime: number): void {
    // Safety check for player and target
    if (!this.player || !this.player.cells || this.player.cells.length === 0 || 
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }
    
    // Move toward target
    const playerPos = this.player.getAveragePosition();
    const direction = subtract(this.targetEntity.position, playerPos);
    
    // Set player direction
    this.player.setTargetDirection(normalize(direction));
    
    // Split if close enough and big enough
    const dist = distance(playerPos, this.targetEntity.position);
    if (dist < 200 && this.player.getTotalMass() > 200) {
      this.player.split();
      this.behaviorType = AIBehaviorType.CHASE; // Switch to regular chase after splitting
    }
  }
}
