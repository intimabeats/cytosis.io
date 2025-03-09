// src/virus.ts
import { Virus, Cell, Vector2D, Camera } from './types';
import { generateId, radiusFromMass } from './utils';

export class GameVirus implements Virus {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  mass: number;
  color: string;
  splitThreshold: number;
  spikes: number;
  spikeLength: number;
  pulseTime: number;
  pulseAmount: number;
  rotationAngle: number;
  rotationSpeed: number;
  growthStage: number;
  maxGrowthStage: number;
  
  constructor(position: Vector2D) {
    this.id = generateId();
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.radius = 40;
    this.mass = Math.PI * this.radius * this.radius;
    this.color = '#00ff00'; // Viruses are typically green
    this.splitThreshold = 150; // Minimum cell radius to trigger splitting
    this.spikes = 12; // Number of spikes
    this.spikeLength = 10; // Length of spikes
    this.pulseTime = 0;
    this.pulseAmount = 0.1;
// src/virus.ts (continuação)
    this.rotationAngle = 0;
    this.rotationSpeed = 0.2 + Math.random() * 0.3; // Slow rotation
    this.growthStage = 1;
    this.maxGrowthStage = 5; // Virus splits after reaching max growth
  }
  
  update(deltaTime: number): void {
    // Safety check for deltaTime
    if (typeof deltaTime !== 'number' || deltaTime <= 0 || deltaTime > 1) {
      deltaTime = 0.016; // Default to 60fps
    }
    
    // Viruses don't move on their own, but we could add some slight movement
    // for visual interest if desired
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    
    // Apply friction to gradually stop movement
    this.velocity.x *= 0.95;
    this.velocity.y *= 0.95;
    
    // Update pulse animation
    this.pulseTime += deltaTime;
    if (this.pulseTime > Math.PI * 2) {
      this.pulseTime -= Math.PI * 2;
    }
    
    // Update rotation
    this.rotationAngle += this.rotationSpeed * deltaTime;
    if (this.rotationAngle > Math.PI * 2) {
      this.rotationAngle -= Math.PI * 2;
    }
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // Safety check for camera
    if (!camera || !camera.isInView) {
      return;
    }
    
    if (!camera.isInView(this.position, this.radius + this.spikeLength)) return;
    
    const screenPos = camera.worldToScreen(this.position);
    const screenRadius = this.radius * camera.scale;
    const screenSpikeLength = this.spikeLength * camera.scale;
    
    // Calculate pulse effect
    const pulse = Math.sin(this.pulseTime * 2) * this.pulseAmount;
    const pulsedRadius = screenRadius * (1 + pulse);
    const pulsedSpikeLength = screenSpikeLength * (1 + pulse);
    
    // Draw virus glow
    const glowRadius = pulsedRadius * 1.5;
    const glowGradient = ctx.createRadialGradient(
      screenPos.x, screenPos.y, pulsedRadius,
      screenPos.x, screenPos.y, glowRadius
    );
    glowGradient.addColorStop(0, 'rgba(0, 255, 0, 0.3)');
    glowGradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
    
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();
    
    // Draw virus body
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, pulsedRadius, 0, Math.PI * 2);
    
    // Create gradient for body
    const bodyGradient = ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, pulsedRadius
    );
    bodyGradient.addColorStop(0, '#006600');
    bodyGradient.addColorStop(0.7, '#004400');
    bodyGradient.addColorStop(1, '#003300');
    
    ctx.fillStyle = bodyGradient;
    ctx.fill();
    
    // Draw spikes with rotation
    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate(this.rotationAngle);
    
    ctx.beginPath();
    for (let i = 0; i < this.spikes; i++) {
      const angle = (i / this.spikes) * Math.PI * 2;
      const innerRadius = pulsedRadius;
      const outerRadius = pulsedRadius + pulsedSpikeLength;
      
      const innerX = Math.cos(angle) * innerRadius;
      const innerY = Math.sin(angle) * innerRadius;
      const outerX = Math.cos(angle) * outerRadius;
      const outerY = Math.sin(angle) * outerRadius;
      
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
    }
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw inner pattern
    ctx.beginPath();
    for (let i = 0; i < this.spikes / 2; i++) {
      const angle = (i / (this.spikes / 2)) * Math.PI * 2;
      const x = Math.cos(angle) * pulsedRadius * 0.6;
      const y = Math.sin(angle) * pulsedRadius * 0.6;
      
      ctx.moveTo(0, 0);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#006600';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw growth indicator
    if (this.growthStage > 1) {
      ctx.beginPath();
      ctx.arc(0, 0, pulsedRadius * 0.3, 0, Math.PI * 2);
      
      // Color based on growth stage
      const stageColors = ['#006600', '#00aa00', '#00ff00', '#aaff00', '#ffff00'];
      ctx.fillStyle = stageColors[Math.min(this.growthStage - 1, stageColors.length - 1)];
      ctx.fill();
      
      // Draw growth stage number
      ctx.fillStyle = '#000000';
      ctx.font = `${pulsedRadius * 0.3}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.growthStage.toString(), 0, 0);
    }
    
    ctx.restore();
    
    // Draw danger indicator if virus is about to split
    if (this.growthStage >= this.maxGrowthStage - 1) {
      const warningOpacity = 0.5 + 0.5 * Math.sin(this.pulseTime * 4);
      
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, pulsedRadius * 1.3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 0, 0, ${warningOpacity})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  
  canSplit(cell: Cell): boolean {
    // Safety check for cell
    if (!cell || typeof cell.radius !== 'number') {
      return false;
    }
    
    return cell.radius >= this.splitThreshold;
  }
  
  split(cell: Cell): void {
    // This is just a placeholder - the actual splitting logic
    // will be handled in the game class when a collision is detected
    console.log(`Virus splitting cell ${cell.id}`);
  }
  
  grow(): void {
    // Viruses grow when they absorb ejected mass
    this.mass += 10;
    this.radius = radiusFromMass(this.mass);
    
    // Update growth stage
    const newGrowthStage = Math.floor(this.radius / 20);
    if (newGrowthStage > this.growthStage) {
      this.growthStage = newGrowthStage;
      
      // Create growth effect
      const growthEvent = new CustomEvent('virus-grew', {
        detail: {
          position: { ...this.position },
          stage: this.growthStage
        }
      });
      window.dispatchEvent(growthEvent);
    }
    
    // If virus gets too big or reaches max growth stage, it splits
    if (this.radius > 80 || this.growthStage >= this.maxGrowthStage) {
      this.splitVirus();
    }
  }
  
  private splitVirus(): void {
    // Reset size
    this.mass = Math.PI * 40 * 40;
    this.radius = 40;
    this.growthStage = 1;
    
    // Dispatch event for creating a new virus
    const splitEvent = new CustomEvent('virus-split', {
      detail: {
        position: { ...this.position },
        velocity: { 
          x: Math.random() * 100 - 50, 
          y: Math.random() * 100 - 50 
        }
      }
    });
    window.dispatchEvent(splitEvent);
    
    // Create explosion effect
    const explosionEvent = new CustomEvent('virus-explosion', {
      detail: {
        position: { ...this.position },
        color: this.color,
        radius: this.radius
      }
    });
    window.dispatchEvent(explosionEvent);
  }
  
  // New methods for enhanced virus behavior
  
  eject(direction: Vector2D): void {
    // Eject a small virus in the given direction
    // This could be triggered when a virus is hit by multiple ejected masses
    
    // Create a new virus
    const ejectedVirusEvent = new CustomEvent('virus-ejected', {
      detail: {
        position: { ...this.position },
        velocity: { 
          x: direction.x * 150, 
          y: direction.y * 150 
        },
        radius: this.radius * 0.7
      }
    });
    window.dispatchEvent(ejectedVirusEvent);
    
    // Reduce size of this virus
    this.mass *= 0.7;
    this.radius = radiusFromMass(this.mass);
    this.growthStage = Math.max(1, this.growthStage - 1);
  }
  
  // Method to make virus appear more dangerous as it grows
  updateAppearance(): void {
    // Adjust visual properties based on growth stage
    this.spikes = 12 + (this.growthStage - 1) * 2; // More spikes as it grows
    this.spikeLength = 10 + (this.growthStage - 1) * 2; // Longer spikes
    this.pulseAmount = 0.1 + (this.growthStage - 1) * 0.05; // Stronger pulse
    
    // Change color as it grows
    const greenValue = Math.max(0, 255 - (this.growthStage - 1) * 50);
    const redValue = Math.min(255, (this.growthStage - 1) * 50);
    this.color = `rgb(${redValue}, ${greenValue}, 0)`;
  }
  
  // Method to make virus attract or repel cells based on size
  getForceVector(cell: Cell): Vector2D {
    // If cell is much larger than virus, virus repels it
    if (cell.radius > this.radius * 1.5) {
      return {
        x: (cell.position.x - this.position.x) * 0.1,
        y: (cell.position.y - this.position.y) * 0.1
      };
    }
    
    // If cell is similar size or smaller, virus attracts it
    return {
      x: (this.position.x - cell.position.x) * 0.05,
      y: (this.position.y - cell.position.y) * 0.05
    };
  }
}
