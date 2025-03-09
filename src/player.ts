// src/player.ts
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
  massFromRadius
} from './utils';

export class PlayerCell extends BaseCell implements PlayerCell {
  owner: string;
  canMerge: boolean;
  mergeTime: number;
  
  constructor(position: Vector2D, radius: number, color: string, owner: string) {
    super(position, radius, color);
    this.owner = owner;
    this.canMerge = false;
    this.mergeTime = 10; // 10 seconds before cells can merge
  }
  
  update(deltaTime: number): void {
    super.update(deltaTime);
    
    // Update merge timer
    if (!this.canMerge && this.mergeTime > 0) {
      this.mergeTime -= deltaTime;
      if (this.mergeTime <= 0) {
        this.canMerge = true;
        this.mergeTime = 0;
      }
    }
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    super.render(ctx, camera);
    
    // If this cell can't merge yet, show a timer indicator
    if (!this.canMerge && this.mergeTime > 0) {
      const screenPos = camera.worldToScreen(this.position);
      const screenRadius = this.radius * camera.scale;
      
      // Draw merge timer as a circle outline
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, screenRadius * 1.1, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw progress arc
      const progress = this.mergeTime / 10; // Assuming 10 seconds merge time
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
  
  constructor(name: string, position: Vector2D, isAI: boolean = false, startRadius: number = 30) {
    this.id = generateId();
    this.name = name;
    this.color = randomColor();
    this.cells = [];
    this.score = 0;
    this.isAI = isAI;
    this.activeEffects = new Map();
    this.targetDirection = { x: 0, y: 0 };
    this.lastSplitTime = 0;
    this.lastEjectTime = 0;
    this.maxCells = 16; // Maximum number of cells a player can have
    this.minSplitMass = 35; // Minimum mass required to split (corresponds to radius ~40)
    this.minEjectMass = 35; // Minimum mass required to eject
    
    // Stats tracking
    this.highestScore = 0;
    this.totalFoodEaten = 0;
    this.totalPlayersEaten = 0;
    this.totalVirusHit = 0;
    this.totalPowerUpsCollected = 0;
    
    // Create initial cell
    this.addCell(position, startRadius);
  }
  
  addCell(position: Vector2D, radius: number): PlayerCell | null {
    // Validate position and radius
    if (!position || typeof radius !== 'number' || radius <= 0) {
      console.error("Invalid parameters for addCell:", position, radius);
      return null;
    }
    
    // Check if we've reached the maximum number of cells
    if (this.cells.length >= this.maxCells) {
      return null;
    }
    
    const cell = new PlayerCell(position, radius, this.color, this.id);
    this.cells.push(cell);
    return cell;
  }
  
  update(deltaTime: number): void {
    // Safety check for deltaTime
    if (typeof deltaTime !== 'number' || deltaTime <= 0 || deltaTime > 1) {
      deltaTime = 0.016; // Default to 60fps
    }
    
    // Update all cells
    for (let i = this.cells.length - 1; i >= 0; i--) {
      const cell = this.cells[i];
      
      try {
        cell.update(deltaTime);
        
        // Move cell toward target direction
        if (this.targetDirection.x !== 0 || this.targetDirection.y !== 0) {
          // Apply speed boost if active
          let speedMultiplier = 1;
          if (this.hasEffect(PowerUpType.SPEED)) {
            speedMultiplier = 1.5;
          }
          
          // Smaller cells move faster
          const sizeMultiplier = Math.max(0.5, 1 - (cell.radius / 200));
          
          const force = multiply(
            this.targetDirection, 
            1000 * deltaTime * speedMultiplier * sizeMultiplier
          );
          cell.applyForce(force);
        }
      } catch (error) {
        console.error("Error updating cell:", error);
        // Remove problematic cell
        this.cells.splice(i, 1);
      }
    }
    
    // Check for cell merging
    this.handleCellMerging();
    
    // Update power-up effects
    this.updatePowerUps(deltaTime);
    
    // Update score based on total mass
    const newScore = Math.floor(this.getTotalMass());
    if (newScore > this.score) {
      this.score = newScore;
      
      // Update highest score
      if (this.score > this.highestScore) {
        this.highestScore = this.score;
      }
    }
    
    // Update UI if this is the human player
    if (!this.isAI) {
      this.updateUI();
    }
  }
  
  updateUI(): void {
    const scoreElement = document.getElementById('score');
    const sizeElement = document.getElementById('size');
    
    if (scoreElement) scoreElement.textContent = this.score.toString();
    if (sizeElement) sizeElement.textContent = this.cells.length.toString();
    
    // Update power-up indicators
    this.updatePowerUpIndicators();
  }
  
  updatePowerUpIndicators(): void {
    // Remove existing indicators
    const statsElement = document.getElementById('stats');
    if (!statsElement) return;
    
    // Remove existing power-up indicators
    const existingIndicators = statsElement.querySelectorAll('.power-up-indicator');
    existingIndicators.forEach(el => el.remove());
    
    // Add current power-up indicators
    this.activeEffects.forEach((timeLeft, type) => {
      const indicator = document.createElement('div');
      indicator.className = 'power-up-indicator';
      
      // Set color based on power-up type
      switch (type) {
        case PowerUpType.SPEED:
          indicator.style.backgroundColor = '#00ffff'; // Cyan
          indicator.title = `Speed Boost: ${timeLeft.toFixed(1)}s`;
          break;
        case PowerUpType.SHIELD:
          indicator.style.backgroundColor = '#ffff00'; // Yellow
          indicator.title = `Shield: ${timeLeft.toFixed(1)}s`;
          break;
        case PowerUpType.MASS_BOOST:
          indicator.style.backgroundColor = '#ff00ff'; // Magenta
          indicator.title = `Mass Boost: ${timeLeft.toFixed(1)}s`;
          break;
        case PowerUpType.INVISIBILITY:
          indicator.style.backgroundColor = '#888888'; // Gray
          indicator.title = `Invisibility: ${timeLeft.toFixed(1)}s`;
          break;
      }
      
      // Add timer text
      const timerText = document.createElement('span');
      timerText.textContent = timeLeft.toFixed(1);
      timerText.style.fontSize = '10px';
      timerText.style.position = 'absolute';
      timerText.style.top = '50%';
      timerText.style.left = '50%';
      timerText.style.transform = 'translate(-50%, -50%)';
      indicator.appendChild(timerText);
      
      // Add to stats
      statsElement.appendChild(indicator);
    });
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // Check if player is invisible (except for human player)
    if (this.hasEffect(PowerUpType.INVISIBILITY) && this.isAI) {
      return;
    }
    
    // Render all cells
    for (const cell of this.cells) {
      try {
        cell.render(ctx, camera);
      } catch (error) {
        console.error("Error rendering cell:", error);
      }
    }
    
    // Only render name and effects if player has cells
    if (this.cells.length === 0) return;
    
    // Get average position for name and effects
    const avgPos = this.getAveragePosition();
    const screenPos = camera.worldToScreen(avgPos);
    
    // Render player name above the cells
    ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, screenPos.x, screenPos.y - this.getMaxRadius() * camera.scale - 10);

    // Render active effects
    let effectOffset = 20;
    this.activeEffects.forEach((timeLeft, type) => {
      const effectName = PowerUpType[type];
      ctx.fillText(
        `${effectName}: ${timeLeft.toFixed(1)}s`,
        screenPos.x,
        screenPos.y - this.getMaxRadius() * camera.scale - effectOffset
      );
      effectOffset += 20;
    });
    
    // Render shield if active
    if (this.hasEffect(PowerUpType.SHIELD)) {
      const shieldRadius = this.getMaxRadius() * 1.2;
      const screenShieldRadius = shieldRadius * camera.scale;
      
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, screenShieldRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.lineWidth = 5;
      ctx.stroke();
      
      // Add pulsing effect to shield
      const pulseRadius = screenShieldRadius * (1 + Math.sin(Date.now() / 200) * 0.05);
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    // Render speed boost effect if active
    if (this.hasEffect(PowerUpType.SPEED)) {
      // Draw speed lines behind the player
      const trailLength = this.getMaxRadius() * 2;
      const trailWidth = this.getMaxRadius() * 0.5;
      
      ctx.beginPath();
      ctx.moveTo(
        screenPos.x - this.targetDirection.x * trailLength,
        screenPos.y - this.targetDirection.y * trailLength
      );
      ctx.lineTo(screenPos.x, screenPos.y);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = trailWidth * camera.scale;
      ctx.stroke();
    }
    
    // Render invisibility effect if active
    if (this.hasEffect(PowerUpType.INVISIBILITY) && !this.isAI) {
      // Draw a faint outline for the human player to see their own cells
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
  }

  private handleCellMerging(): void {
    // Check for cells that can merge
    for (let i = 0; i < this.cells.length; i++) {
      const cellA = this.cells[i];
      
      if (!cellA.canMerge) continue;
      
      for (let j = i + 1; j < this.cells.length; j++) {
        const cellB = this.cells[j];
        
        if (!cellB.canMerge) continue;
        
        try {
          // Check if cells are close enough to merge
          const dist = distance(cellA.position, cellB.position);
          if (dist < cellA.radius + cellB.radius - Math.min(cellA.radius, cellB.radius) * 0.5) {
            // Merge cells
            const totalMass = cellA.mass + cellB.mass;
            const newRadius = radiusFromMass(totalMass);
            
            // Position is weighted average based on mass
            const newPosition = {
              x: (cellA.position.x * cellA.mass + cellB.position.x * cellB.mass) / totalMass,
              y: (cellA.position.y * cellA.mass + cellB.position.y * cellB.mass) / totalMass
            };
            
            // Update the first cell
            cellA.position = newPosition;
            cellA.radius = newRadius;
            cellA.mass = totalMass;
            
            // Remove the second cell
            this.cells.splice(j, 1);
            
            // Create merge effect
            this.createMergeEffect(cellA.position, cellB.position, this.color);
            
            // Restart the loop since we modified the array
            i = -1;
            break;
          }
        } catch (error) {
          console.error("Error in cell merging:", error);
          // Skip this pair of cells
          continue;
        }
      }
    }
  }
  
  private createMergeEffect(pos1: Vector2D, pos2: Vector2D, color: string): void {
    // Dispatch event for particle effect
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
    // Update active effects timers
    this.activeEffects.forEach((timeLeft, type) => {
      const newTime = timeLeft - deltaTime;
      if (newTime <= 0) {
        this.activeEffects.delete(type);
        
        // Handle effect expiration
        if (type === PowerUpType.MASS_BOOST) {
          // Reduce mass when mass boost expires
          for (const cell of this.cells) {
            cell.mass /= 1.5;
            cell.radius = radiusFromMass(cell.mass);
          }
        }
        
        // Create effect expiration event
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
    // Safety check for target
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
      return;
    }
    
    // Calculate direction from average position to target
    const avgPos = this.getAveragePosition();
    let dir = subtract(target, avgPos);
    
    // Normalize direction
    const mag = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
    if (mag > 0) {
      dir.x /= mag;
      dir.y /= mag;
    }
    
    this.targetDirection = dir;
  }
  
  split(): void {
    // Cooldown check
    const now = Date.now();
    if (now - this.lastSplitTime < 300) { // 300ms cooldown
      return;
    }
    this.lastSplitTime = now;
    
    // Only split cells that are large enough
    const newCells: PlayerCell[] = [];
    
    // Limit total cells to prevent performance issues
    if (this.cells.length >= this.maxCells) {
      return;
    }
    
    // Count how many new cells we can create
    const availableSlots = this.maxCells - this.cells.length;
    if (availableSlots <= 0) return;
    
    // Sort cells by size (largest first) to prioritize splitting larger cells
    const sortedCells = [...this.cells].sort((a, b) => b.mass - a.mass);
    
    let createdCells = 0;
    for (const cell of sortedCells) {
      // Check if we've reached the limit
      if (createdCells >= availableSlots) break;
      
      // Only split if cell is large enough
      if (cell.mass >= this.minSplitMass * 2) { // Need double the min mass to split
        try {
          // Create a new cell with half the mass
          const newMass = cell.mass / 2;
          const newRadius = radiusFromMass(newMass);
          
          // Update original cell
          cell.mass = newMass;
          cell.radius = newRadius;
          
          // Create new cell in the direction of movement
          const dir = normalize(this.targetDirection);
          const newPos = {
            x: cell.position.x + dir.x * cell.radius * 2,
            y: cell.position.y + dir.y * cell.radius * 2
          };
          
          const newCell = new PlayerCell(newPos, newRadius, this.color, this.id);
          
          // Apply velocity in the direction of the split with a boost
          const splitSpeed = 300 + newRadius * 2; // Larger cells split faster
          newCell.velocity = {
            x: dir.x * splitSpeed,
            y: dir.y * splitSpeed
          };
          
          // Reset merge timers
          cell.canMerge = false;
          cell.mergeTime = 10;
          newCell.canMerge = false;
          newCell.mergeTime = 10;
          
          newCells.push(newCell);
          createdCells++;
        } catch (error) {
          console.error("Error splitting cell:", error);
          // Skip this cell
          continue;
        }
      }
    }
    
    // Add new cells to the player
    this.cells.push(...newCells);
    
    // Create split event for sound effects or visual feedback
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
    // Cooldown check
    const now = Date.now();
    if (now - this.lastEjectTime < 100) { // 100ms cooldown
      return;
    }
    this.lastEjectTime = now;
    
    // Eject mass from each cell
    const ejectMass = 10;
    const ejectRadius = radiusFromMass(ejectMass);
    let ejectedCount = 0;
    
    for (const cell of this.cells) {
      // Only eject if cell is large enough
      if (cell.mass > this.minEjectMass) {
        try {
          // Reduce cell mass
          cell.mass -= ejectMass;
          cell.radius = radiusFromMass(cell.mass);
          
          // Create ejected mass in the direction of movement
          const dir = normalize(this.targetDirection);
          const ejectPos = {
            x: cell.position.x + dir.x * (cell.radius + ejectRadius),
            y: cell.position.y + dir.y * (cell.radius + ejectRadius)
          };
          
          // Dispatch event for creating ejected mass
          const ejectEvent = new CustomEvent('player-ejected-mass', {
            detail: {
              position: ejectPos,
              velocity: { x: dir.x * 300, y: dir.y * 300 },
              radius: ejectRadius,
              color: this.color
            }
          });
          window.dispatchEvent(ejectEvent);
          
          // Apply recoil force to the cell
          cell.applyForce({
            x: -dir.x * 500,
            y: -dir.y * 500
          });
          
          ejectedCount++;
        } catch (error) {
          console.error("Error ejecting mass:", error);
          // Skip this cell
          continue;
        }
      }
    }
    
    // Create eject event for sound effects or visual feedback
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
    // Add or extend power-up effect
    const currentDuration = this.activeEffects.get(type) || 0;
    this.activeEffects.set(type, Math.max(currentDuration, duration));
    
    // Apply effect based on type
    switch (type) {
      case PowerUpType.SPEED:
        // Speed boost is handled in movement calculations
        break;
      case PowerUpType.SHIELD:
        // Shield is handled in collision detection
        break;
      case PowerUpType.MASS_BOOST:
        // Increase mass of all cells
        for (const cell of this.cells) {
          cell.mass *= 1.5;
          cell.radius = radiusFromMass(cell.mass);
        }
        break;
      case PowerUpType.INVISIBILITY:
        // Invisibility is handled in rendering
        break;
    }
    
    // Update stats
    this.totalPowerUpsCollected++;
    
    // Create power-up event for sound effects or visual feedback
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
      console.error("Error calculating total mass:", error);
      // Fallback: calculate manually
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
      
      // Calculate weighted average based on cell mass
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
      console.error("Error calculating average position:", error);
      // Fallback: simple average
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
      console.error("Error calculating max radius:", error);
      return 30; // Default fallback
    }
  }
  
  // New methods for stats tracking
  
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
}
