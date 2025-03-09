// src/ai.ts
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

// Different AI behavior types
export enum AIBehaviorType {
  WANDER,
  CHASE,
  FLEE,
  FEED,
  SPLIT_AND_CHASE,
  AMBUSH,
  DEFEND,
  SCAVENGE
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
    
    // Personality type (0-3) affects decision making
    this.personalityType = Math.floor(Math.random() * 4);
    
    // Stuck detection
    this.stuckDetectionTimer = 0;
    this.lastPosition = { x: 0, y: 0 };
    this.stuckThreshold = 5; // Seconds to consider AI stuck
  }
  
  update(deltaTime: number, entities: Entity[]): void {
    // Safety check for player
    if (!this.player || !this.player.cells || this.player.cells.length === 0) {
      return;
    }
    
    // Update timers
    this.wanderTimer -= deltaTime;
    this.decisionTimer -= deltaTime;
    
    // Update stuck detection
    this.updateStuckDetection(deltaTime);
    
    // Make a new decision periodically or if stuck
    if (this.decisionTimer <= 0 || this.isStuck()) {
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
        case AIBehaviorType.AMBUSH:
          this.executeAmbush(deltaTime);
          break;
        case AIBehaviorType.DEFEND:
          this.executeDefend(deltaTime);
          break;
        case AIBehaviorType.SCAVENGE:
          this.executeScavenge(deltaTime);
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
  
  private updateStuckDetection(deltaTime: number): void {
    this.stuckDetectionTimer += deltaTime;
    
    // Check position every second
    if (this.stuckDetectionTimer >= 1) {
      const currentPos = this.player.getAveragePosition();
      
      // Initialize last position if not set
      if (!this.lastPosition.x && !this.lastPosition.y) {
        this.lastPosition = { ...currentPos };
      }
      
      // Reset timer
      this.stuckDetectionTimer = 0;
      
      // Update last position
      this.lastPosition = { ...currentPos };
    }
  }
  
  private isStuck(): boolean {
    const currentPos = this.player.getAveragePosition();
    const dist = distance(currentPos, this.lastPosition);
    
    // If barely moved for several seconds, consider stuck
    return dist < 5 && this.stuckDetectionTimer > this.stuckThreshold;
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
    
    // Find nearby entities with increased detection range based on difficulty
    const detectionRange = 500 + playerMass / 10 + (this.difficultyLevel * 100);
    const nearbyEntities = validEntities.filter(entity => {
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
    
    // Find viruses
    const viruses = nearbyEntities.filter(entity => {
      return 'splitThreshold' in entity;
    });
    
    // Find power-ups
    const powerUps = nearbyEntities.filter(entity => {
      return 'type' in entity && 'duration' in entity;
    });
    
    // Decision making logic based on personality and difficulty
    this.decideBasedOnPersonality(threats, prey, food, viruses, powerUps, playerMass);
  }
  
  private decideBasedOnPersonality(
    threats: Entity[], 
    prey: Entity[], 
    food: Entity[], 
    viruses: Entity[], 
    powerUps: Entity[],
    playerMass: number
  ): void {
    // Base probabilities
    let fleeProb = 0.8;
    let chaseProb = 0.7;
    let feedProb = 0.6;
    let splitProb = 0.3;
    let ambushProb = 0.2;
    let defendProb = 0.4;
    let scavengeProb = 0.5;
    
    // Adjust based on personality type
    switch (this.personalityType) {
      case 0: // Aggressive
        chaseProb += 0.2;
        splitProb += 0.3;
        fleeProb -= 0.3;
        ambushProb += 0.3;
        break;
      case 1: // Cautious
        fleeProb += 0.2;
        chaseProb -= 0.2;
        defendProb += 0.3;
        break;
      case 2: // Opportunistic
        feedProb += 0.2;
        scavengeProb += 0.3;
        powerUps.length > 0 && (ambushProb += 0.2);
        break;
      case 3: // Balanced
        // No adjustments
        break;
    }
    
    // Adjust based on difficulty level
    fleeProb -= 0.1 * this.difficultyLevel;
    chaseProb += 0.1 * this.difficultyLevel;
    splitProb += 0.1 * this.difficultyLevel;
    ambushProb += 0.1 * this.difficultyLevel;
    
    // Make decision
    if (threats.length > 0 && Math.random() < fleeProb) {
      // Flee from threats
      this.behaviorType = AIBehaviorType.FLEE;
      this.targetEntity = threats[0];
    } else if (prey.length > 0 && Math.random() < chaseProb) {
      // Chase prey
      this.behaviorType = AIBehaviorType.CHASE;
      this.targetEntity = prey[0];
      
      // Sometimes decide to split to catch prey
      if (playerMass > 200 && Math.random() < splitProb) {
        this.behaviorType = AIBehaviorType.SPLIT_AND_CHASE;
      }
    } else if (powerUps.length > 0 && Math.random() < 0.8) {
      // Go for power-ups with high priority
      this.behaviorType = AIBehaviorType.FEED;
      this.targetEntity = powerUps[0];
    } else if (viruses.length > 0 && playerMass > 200 && Math.random() < defendProb) {
      // Defend against viruses when large
      this.behaviorType = AIBehaviorType.DEFEND;
      this.targetEntity = viruses[0];
    } else if (food.length > 0 && Math.random() < feedProb) {
      // Feed on nearby food
      this.behaviorType = AIBehaviorType.FEED;
      this.targetEntity = food[0];
    } else if (prey.length > 0 && Math.random() < ambushProb) {
      // Try to ambush prey
      this.behaviorType = AIBehaviorType.AMBUSH;
      this.targetEntity = prey[0];
    } else if (food.length > 0 && Math.random() < scavengeProb) {
      // Scavenge for food in a wider area
      this.behaviorType = AIBehaviorType.SCAVENGE;
      // Pick a random food item, not necessarily the closest
      const randomIndex = Math.floor(Math.random() * Math.min(food.length, 5));
      this.targetEntity = food[randomIndex];
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
    
    // Check if close enough to split
    const dist = distance(playerPos, this.targetEntity.position);
    if (dist < 200 && this.player.getTotalMass() > 200 && Math.random() < 0.1 * this.difficultyLevel) {
      this.player.split();
    }
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
    if (dist < 200 && Math.random() < 0.1 * this.difficultyLevel) {
      this.player.eject();
    }
    
    // Split to escape if large enough and very close
    if (dist < 100 && this.player.getTotalMass() > 200 && Math.random() < 0.05 * this.difficultyLevel) {
      this.player.split();
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
  
  private executeAmbush(deltaTime: number): void {
    // Safety check for player and target
    if (!this.player || !this.player.cells || this.player.cells.length === 0 || 
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }
    
    // Get positions
    const playerPos = this.player.getAveragePosition();
    const targetPos = this.targetEntity.position;
    
    // Calculate ambush position (try to get ahead of the target)
    if ('velocity' in this.targetEntity && this.targetEntity.velocity) {
      const targetVelocity = this.targetEntity.velocity;
      const targetSpeed = magnitude(targetVelocity);
      
      if (targetSpeed > 0) {
        // Predict where the target will be
        const predictionFactor = 2.0; // Look ahead factor
        const predictedPos = {
          x: targetPos.x + targetVelocity.x * predictionFactor,
          y: targetPos.y + targetVelocity.y * predictionFactor
        };
        
        // Move toward the predicted position
        const direction = subtract(predictedPos, playerPos);
        this.player.setTargetDirection(normalize(direction));
        
        // If we're close to the ambush position and the target is approaching, split
        const distToTarget = distance(playerPos, targetPos);
        if (distToTarget < 150 && this.player.getTotalMass() > 200) {
          this.player.split();
          this.behaviorType = AIBehaviorType.CHASE;
        }
        
        return;
      }
    }
    
    // Fallback if target has no velocity: just chase directly
    const direction = subtract(targetPos, playerPos);
    this.player.setTargetDirection(normalize(direction));
  }
  
  private executeDefend(deltaTime: number): void {
    // Safety check for player and target
    if (!this.player || !this.player.cells || this.player.cells.length === 0 || 
        !this.targetEntity || !this.targetEntity.position) {
      this.behaviorType = AIBehaviorType.WANDER;
      return;
    }
    
    // Get positions
    const playerPos = this.player.getAveragePosition();
    const virusPos = this.targetEntity.position;
    
    // Calculate distance to virus
    const distToVirus = distance(playerPos, virusPos);
    
    if (distToVirus < 200) {
      // Too close to virus, move away
      const direction = subtract(playerPos, virusPos);
      this.player.setTargetDirection(normalize(direction));
    } else {
      // Look for prey near the virus to ambush
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
        // Move to position between virus and prey
        const prey = preyNearVirus[0];
        const midPoint = {
          x: (virusPos.x + prey.position.x) / 2,
          y: (virusPos.y + prey.position.y) / 2
        };
        
        const direction = subtract(midPoint, playerPos);
        this.player.setTargetDirection(normalize(direction));
        
        // Eject mass toward virus if prey is close to it
        const preyToVirus = distance(prey.position, virusPos);
        if (preyToVirus < 100 && Math.random() < 0.2 * this.difficultyLevel) {
          // Calculate direction to virus
          const virusDirection = subtract(virusPos, playerPos);
          this.player.setTargetDirection(normalize(virusDirection));
          this.player.eject();
          
          // Reset direction after ejecting
          this.player.setTargetDirection(normalize(direction));
        }
      } else {
        // No prey near virus, just wander
        this.behaviorType = AIBehaviorType.WANDER;
      }
    }
  }
  
  private executeScavenge(deltaTime: number): void {
    // Safety check for player
    if (!this.player || !this.player.cells || this.player.cells.length === 0) {
      return;
    }
    
    // If we have a target, move toward it
    if (this.targetEntity && this.targetEntity.position) {
      const playerPos = this.player.getAveragePosition();
      const direction = subtract(this.targetEntity.position, playerPos);
      
      // Check if we're close to the target
      if (distance(playerPos, this.targetEntity.position) < 10) {
        // Find a new food target
        const nearbyEntities = this.getNearbyEntities();
        const foodEntities = nearbyEntities.filter(entity => 
          'value' in entity && !('cells' in entity)
        );
        
        if (foodEntities.length > 0) {
          // Pick a random food item within range
          const randomIndex = Math.floor(Math.random() * Math.min(foodEntities.length, 10));
          this.targetEntity = foodEntities[randomIndex];
        } else {
          // No food nearby, switch to wander
          this.behaviorType = AIBehaviorType.WANDER;
          this.wanderTarget = randomPosition(this.worldSize);
        }
      } else {
        // Continue moving toward target
        this.player.setTargetDirection(normalize(direction));
      }
    } else {
      // No target, switch to wander
      this.behaviorType = AIBehaviorType.WANDER;
      this.wanderTarget = randomPosition(this.worldSize);
    }
  }
  
  // src/ai.ts (continuação)
  private getNearbyEntities(): Entity[] {
    // This method should be called with the entities from the game
    // Since we don't have direct access to the game state here,
    // we'll implement a workaround
    
    // Create a custom event to request entities
    const requestEvent = new CustomEvent('ai-request-entities', {
      detail: {
        aiId: this.player.id,
        position: this.player.getAveragePosition(),
        range: 500 + this.difficultyLevel * 100
      }
    });
    
    // Create a response handler
    let entities: Entity[] = [];
    const responseHandler = (e: any) => {
      if (e.detail.aiId === this.player.id) {
        entities = e.detail.entities;
      }
    };
    
    // Listen for response
    window.addEventListener('ai-entities-response', responseHandler);
    
    // Dispatch request
    window.dispatchEvent(requestEvent);
    
    // Remove listener
    window.removeEventListener('ai-entities-response', responseHandler);
    
    return entities;
  }
  
  // Helper methods for improved AI behavior
  
  private findSafeDirection(threats: Entity[]): Vector2D {
    const playerPos = this.player.getAveragePosition();
    
    // If no threats, move toward center
    if (threats.length === 0) {
      const centerDirection = subtract(
        { x: this.worldSize.x / 2, y: this.worldSize.y / 2 },
        playerPos
      );
      return normalize(centerDirection);
    }
    
    // Calculate average threat direction
    let threatDirection = { x: 0, y: 0 };
    for (const threat of threats) {
      const direction = subtract(playerPos, threat.position);
      threatDirection = add(threatDirection, normalize(direction));
    }
    
    // Normalize the resulting direction
    return normalize(threatDirection);
  }
  
  private shouldSplit(target: Entity): boolean {
    // Only split if:
    // 1. We're big enough
    // 2. Target is smaller than us
    // 3. We're close enough to the target
    // 4. We don't have too many cells already
    
    if (this.player.cells.length >= this.player.maxCells / 2) {
      return false;
    }
    
    const playerMass = this.player.getTotalMass();
    if (playerMass < 200) {
      return false;
    }
    
    // Check if target is a player
    if ('cells' in target) {
      const targetPlayer = target as Player;
      if (targetPlayer.getTotalMass() * 1.5 > playerMass) {
        return false;
      }
    }
    
    // Check distance
    const playerPos = this.player.getAveragePosition();
    const dist = distance(playerPos, target.position);
    
    // Higher difficulty AIs are more aggressive with splitting
    const splitDistance = 200 + (this.difficultyLevel * 50);
    
    return dist < splitDistance;
  }
  
  private shouldEject(): boolean {
    // Eject mass if:
    // 1. We're big enough
    // 2. We're not in immediate danger
    // 3. Random chance based on difficulty
    
    const playerMass = this.player.getTotalMass();
    if (playerMass < 100) {
      return false;
    }
    
    // Check for nearby threats
    const nearbyEntities = this.getNearbyEntities();
    const threats = nearbyEntities.filter(entity => {
      if ('cells' in entity && entity.cells && entity.cells.length > 0) {
        const otherPlayer = entity as Player;
        return otherPlayer.getTotalMass() > playerMass * 1.2;
      }
      return false;
    });
    
    if (threats.length > 0) {
      // Don't eject if there are threats nearby
      return false;
    }
    
    // Random chance based on difficulty and personality
    let ejectChance = 0.01;
    
    // Aggressive personalities eject more
    if (this.personalityType === 0) {
      ejectChance *= 2;
    }
    
    // Higher difficulty AIs eject more strategically
    ejectChance *= this.difficultyLevel;
    
    return Math.random() < ejectChance;
  }
  
  private findOptimalPath(target: Vector2D): Vector2D {
    // Implement pathfinding to avoid obstacles
    const playerPos = this.player.getAveragePosition();
    
    // Get nearby entities
    const nearbyEntities = this.getNearbyEntities();
    
    // Find viruses and larger players to avoid
    const obstacles = nearbyEntities.filter(entity => {
      // Avoid viruses if we're big
      if ('splitThreshold' in entity && this.player.getTotalMass() > 150) {
        return true;
      }
      
      // Avoid larger players
      if ('cells' in entity && entity.cells && entity.cells.length > 0) {
        const otherPlayer = entity as Player;
        return otherPlayer.getTotalMass() > this.player.getTotalMass() * 1.2;
      }
      
      return false;
    });
    
    // If no obstacles, go directly to target
    if (obstacles.length === 0) {
      return normalize(subtract(target, playerPos));
    }
    
    // Calculate direct path
    const directPath = subtract(target, playerPos);
    const directDistance = magnitude(directPath);
    
    // Check if any obstacle is in the way
    let obstacleInPath = false;
    for (const obstacle of obstacles) {
      // Calculate perpendicular distance from obstacle to path
      const obstacleVector = subtract(obstacle.position, playerPos);
      const projection = (obstacleVector.x * directPath.x + obstacleVector.y * directPath.y) / directDistance;
      
      // Skip obstacles behind us
      if (projection < 0) continue;
      
      // Skip obstacles beyond the target
      if (projection > directDistance) continue;
      
      // Calculate closest point on path to obstacle
      const closestPoint = {
        x: playerPos.x + (directPath.x * projection / directDistance),
        y: playerPos.y + (directPath.y * projection / directDistance)
      };
      
      // Check if obstacle is close enough to the path to be a concern
      const obstacleRadius = 'radius' in obstacle ? obstacle.radius : 30;
      const safeDistance = obstacleRadius + this.player.getMaxRadius() * 1.5;
      
      if (distance(closestPoint, obstacle.position) < safeDistance) {
        obstacleInPath = true;
        break;
      }
    }
    
    // If no obstacle in path, go directly
    if (!obstacleInPath) {
      return normalize(directPath);
    }
    
    // Find alternative path
    // Try several angles and pick the one with least obstacles
    const angles = [Math.PI/6, -Math.PI/6, Math.PI/3, -Math.PI/3, Math.PI/2, -Math.PI/2];
    let bestAngle = 0;
    let minObstacles = Infinity;
    
    for (const angle of angles) {
      // Rotate the direct path
      const rotatedPath = {
        x: directPath.x * Math.cos(angle) - directPath.y * Math.sin(angle),
        y: directPath.x * Math.sin(angle) + directPath.y * Math.cos(angle)
      };
      
      // Count obstacles in this path
      let obstacleCount = 0;
      for (const obstacle of obstacles) {
        // Similar calculation as above
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
      
      // Update best angle if this one has fewer obstacles
      if (obstacleCount < minObstacles) {
        minObstacles = obstacleCount;
        bestAngle = angle;
      }
    }
    
    // Rotate the direct path by the best angle
    const bestPath = {
      x: directPath.x * Math.cos(bestAngle) - directPath.y * Math.sin(bestAngle),
      y: directPath.x * Math.sin(bestAngle) + directPath.y * Math.cos(bestAngle)
    };
    
    return normalize(bestPath);
  }
  
  // Method to handle special situations
  handleSpecialSituation(situation: string, data: any): void {
    switch (situation) {
      case 'nearVirus':
        // Handle being near a virus
        if (this.player.getTotalMass() > 150) {
          // If we're big, avoid the virus
          this.behaviorType = AIBehaviorType.FLEE;
          this.targetEntity = data.virus;
        } else {
          // If we're small, we can use the virus as protection
          this.behaviorType = AIBehaviorType.DEFEND;
          this.targetEntity = data.virus;
        }
        break;
        
      case 'cornerTrapped':
        // Handle being trapped in a corner
        this.behaviorType = AIBehaviorType.FLEE;
        // Move toward center
        this.wanderTarget = {
          x: this.worldSize.x / 2,
          y: this.worldSize.y / 2
        };
        break;
        
      case 'powerUpAvailable':
        // Go for power-up
        this.behaviorType = AIBehaviorType.FEED;
        this.targetEntity = data.powerUp;
        break;
        
      case 'beingChased':
        // Handle being chased by a larger player
        this.behaviorType = AIBehaviorType.FLEE;
        this.targetEntity = data.threat;
        
        // If we're near a virus, try to use it
        if (data.nearbyVirus) {
          const playerPos = this.player.getAveragePosition();
          const virusPos = data.nearbyVirus.position;
          const threatPos = data.threat.position;
          
          // Calculate direction that puts virus between us and threat
          const virusToThreat = subtract(threatPos, virusPos);
          const normalizedVirusToThreat = normalize(virusToThreat);
          
          // Position ourselves on the opposite side of the virus
          const targetPos = {
            x: virusPos.x - normalizedVirusToThreat.x * 100,
            y: virusPos.y - normalizedVirusToThreat.y * 100
          };
          
          const direction = subtract(targetPos, playerPos);
          this.player.setTargetDirection(normalize(direction));
          return;
        }
        break;
    }
  }
}
