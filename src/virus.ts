// [v1.0-Part3] Virus implementation
// #=== 80% ===#

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
    
    // Draw virus body
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, pulsedRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#003300'; // Dark green center
    ctx.fill();
    
    // Draw spikes
    ctx.beginPath();
    for (let i = 0; i < this.spikes; i++) {
      const angle = (i / this.spikes) * Math.PI * 2;
      const innerRadius = pulsedRadius;
      const outerRadius = pulsedRadius + pulsedSpikeLength;
      
      const innerX = screenPos.x + Math.cos(angle) * innerRadius;
      const innerY = screenPos.y + Math.sin(angle) * innerRadius;
      const outerX = screenPos.x + Math.cos(angle) * outerRadius;
      const outerY = screenPos.y + Math.sin(angle) * outerRadius;
      
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
      const x = screenPos.x + Math.cos(angle) * pulsedRadius * 0.6;
      const y = screenPos.y + Math.sin(angle) * pulsedRadius * 0.6;
      
      ctx.moveTo(screenPos.x, screenPos.y);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#006600';
    ctx.lineWidth = 2;
    ctx.stroke();
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
    
    // If virus gets too big, it splits
    if (this.radius > 80) {
      this.splitVirus();
    }
  }
  
  private splitVirus(): void {
    // Reset size
    this.mass = Math.PI * 40 * 40;
    this.radius = 40;
    
    // Dispatch event for creating a new virus
    const splitEvent = new CustomEvent('virus-split', {
      detail: {
        position: { ...this.position },
        velocity: { x: Math.random() * 100 - 50, y: Math.random() * 100 - 50 }
      }
    });
    window.dispatchEvent(splitEvent);
  }
}
