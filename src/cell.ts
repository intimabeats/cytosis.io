// [v1.0-Part2] Base cell implementation
// #=== 70% ===#

import { Cell, Vector2D, Camera } from './types';
import { 
  generateId, 
  generateMembranePoints, 
  lerpVector, 
  validatePosition, 
  limit,
  add
} from './utils';

export class BaseCell implements Cell {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  mass: number;
  color: string;
  membranePoints: Vector2D[];
  membraneTargetPoints: Vector2D[];
  membraneNoiseTime: number;
  membraneNoiseSpeed: number;
  friction: number;
  lastUpdateTime: number;
  
  constructor(position: Vector2D, radius: number, color: string) {
    this.id = generateId();
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.radius = radius;
    this.mass = Math.PI * radius * radius;
    this.color = color;
    
    // Membrane properties
    const numPoints = Math.max(10, Math.floor(radius * 0.8));
    this.membranePoints = generateMembranePoints(this.position, this.radius, numPoints);
    this.membraneTargetPoints = [...this.membranePoints];
    this.membraneNoiseTime = 0;
    this.membraneNoiseSpeed = 0.5;
    this.friction = 0.05;
    this.lastUpdateTime = Date.now();
    
    this.updateMembranePoints();
  }
  
  update(deltaTime: number): void {
    // Safety check for deltaTime
    if (typeof deltaTime !== 'number' || deltaTime <= 0 || deltaTime > 1) {
      const now = Date.now();
      deltaTime = (now - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = now;
      
      // Still need a valid deltaTime
      if (deltaTime <= 0 || deltaTime > 1) {
        deltaTime = 0.016; // Default to 60fps
      }
    } else {
      this.lastUpdateTime = Date.now();
    }
    
    // Apply friction
    this.velocity.x *= (1 - this.friction * deltaTime);
    this.velocity.y *= (1 - this.friction * deltaTime);
    
    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    
    // Validate position to prevent NaN
    const defaultPos = { x: 0, y: 0 };
    this.position = validatePosition(this.position, defaultPos);
    
    // Update membrane
    this.membraneNoiseTime += deltaTime * this.membraneNoiseSpeed;
    this.updateMembranePoints();
  }
  
  updateMembranePoints(): void {
    const numPoints = this.membranePoints.length;
    
    // Generate new target points with some noise
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const noise = Math.sin(angle * 3 + this.membraneNoiseTime) * 0.1 + 0.9;
      const x = this.position.x + Math.cos(angle) * this.radius * noise;
      const y = this.position.y + Math.sin(angle) * this.radius * noise;
      
      this.membraneTargetPoints[i] = { x, y };
    }
    
    // Smoothly interpolate current points toward target points
    for (let i = 0; i < numPoints; i++) {
      this.membranePoints[i] = lerpVector(
        this.membranePoints[i],
        this.membraneTargetPoints[i],
        0.1
      );
    }
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // Safety check for camera
    if (!camera || !camera.isInView) {
      return;
    }
    
    if (!camera.isInView(this.position, this.radius * 1.2)) return;
    
    const screenPos = camera.worldToScreen(this.position);
    const screenRadius = this.radius * camera.scale;
    
    // Draw cell membrane (outer edge)
    ctx.beginPath();
    
    // Safety check for membrane points
    if (!this.membranePoints || this.membranePoints.length === 0) {
      // Fallback to simple circle if membrane points are missing
      ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
    } else {
      const screenMembranePoints = this.membranePoints.map(p => camera.worldToScreen(p));
      
      ctx.moveTo(screenMembranePoints[0].x, screenMembranePoints[0].y);
      for (let i = 1; i < screenMembranePoints.length; i++) {
        ctx.lineTo(screenMembranePoints[i].x, screenMembranePoints[i].y);
      }
      ctx.closePath();
    }
    
    // Fill with gradient
    try {
      const gradient = ctx.createRadialGradient(
        screenPos.x, screenPos.y, 0,
        screenPos.x, screenPos.y, screenRadius
      );
      gradient.addColorStop(0, this.color);
      gradient.addColorStop(1, this.adjustColor(this.color, -30));
      
      ctx.fillStyle = gradient;
    } catch (error) {
      // Fallback to solid color if gradient fails
      ctx.fillStyle = this.color;
    }
    
    ctx.fill();
    
    // Draw cell nucleus
    const nucleusRadius = screenRadius * 0.4;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, nucleusRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.adjustColor(this.color, -50);
    ctx.fill();
    
    // Draw nucleus highlight
    ctx.beginPath();
    ctx.arc(
      screenPos.x - nucleusRadius * 0.2,
      screenPos.y - nucleusRadius * 0.2,
      nucleusRadius * 0.4,
      0, Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
  }
  
  applyForce(force: Vector2D): void {
    // Safety check for force
    if (!force || typeof force.x !== 'number' || typeof force.y !== 'number') {
      return;
    }
    
    // F = ma, but we'll simplify by dividing by mass
    const acceleration = {
      x: force.x / this.mass,
      y: force.y / this.mass
    };
    
    this.velocity = add(this.velocity, acceleration);
    
    // Limit maximum velocity based on cell size (smaller cells can move faster)
    const maxSpeed = 200 / (this.radius * 0.5);
    this.velocity = limit(this.velocity, maxSpeed);
  }
  
  // Helper to darken/lighten a color
  private adjustColor(color: string, amount: number): string {
    try {
      // For HSL colors
      if (color.startsWith('hsl')) {
        const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (match) {
          const h = parseInt(match[1]);
          const s = parseInt(match[2]);
          const l = Math.max(0, Math.min(100, parseInt(match[3]) + amount));
          return `hsl(${h}, ${s}%, ${l}%)`;
        }
      }
      
      // Fallback for other color formats
      return color;
    } catch (error) {
      // Return original color if adjustment fails
      return color;
    }
  }
}
