// src/cell.ts
import { Cell, Vector2D, Camera } from './types';
import { 
  generateId, 
  generateMembranePoints, 
  lerpVector, 
  validatePosition, 
  limit,
  add,
  distance,
  normalize,
  multiply
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
  elasticity: number;
  pulseEffect: number;
  pulseDirection: number;
  pulseSpeed: number;
  
  constructor(position: Vector2D, radius: number, color: string) {
  this.id = generateId();
  this.position = { ...position };
  this.velocity = { x: 0, y: 0 };
  this.radius = radius;
  this.mass = Math.PI * radius * radius;
  this.color = color;
  
  // Membrane properties - ensure proper initialization
  const numPoints = Math.max(10, Math.floor(radius * 0.8));
  try {
    this.membranePoints = generateMembranePoints(this.position, this.radius, numPoints);
    this.membraneTargetPoints = JSON.parse(JSON.stringify(this.membranePoints)); // Deep copy
  } catch (error) {
    console.error("Error initializing membrane points:", error);
    // Fallback to simple points
    this.membranePoints = [];
    this.membraneTargetPoints = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const x = this.position.x + Math.cos(angle) * this.radius;
      const y = this.position.y + Math.sin(angle) * this.radius;
      this.membranePoints.push({ x, y });
      this.membraneTargetPoints.push({ x, y });
    }
  }
  
  this.membraneNoiseTime = 0;
  this.membraneNoiseSpeed = 0.5;
  this.friction = 0.05;
  this.lastUpdateTime = Date.now();
  
  // Visual effects
  this.elasticity = 0.3; // How much the cell stretches when moving
  this.pulseEffect = 0;
  this.pulseDirection = 1;
  this.pulseSpeed = 0.5 + Math.random() * 0.5;
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
  
  // Update membrane - ensure membranePoints and membraneTargetPoints are initialized
  if (!this.membranePoints || !this.membraneTargetPoints || 
      !Array.isArray(this.membranePoints) || !Array.isArray(this.membraneTargetPoints)) {
    const numPoints = Math.max(10, Math.floor(this.radius * 0.8));
    this.membranePoints = generateMembranePoints(this.position, this.radius, numPoints);
    this.membraneTargetPoints = [...this.membranePoints];
  }
  
  this.membraneNoiseTime += deltaTime * this.membraneNoiseSpeed;
  this.updateMembranePoints();
  
  // Update pulse effect
  this.updatePulseEffect(deltaTime);
}
  
  updatePulseEffect(deltaTime: number): void {
    // Update pulse animation
    this.pulseEffect += this.pulseDirection * this.pulseSpeed * deltaTime;
    
    if (this.pulseEffect > 1) {
      this.pulseEffect = 1;
      this.pulseDirection = -1;
    } else if (this.pulseEffect < 0) {
      this.pulseEffect = 0;
      this.pulseDirection = 1;
    }
  }
  
  updateMembranePoints(): void {
  // Safety check for membrane points
  if (!this.membranePoints || !this.membraneTargetPoints || 
      !Array.isArray(this.membranePoints) || !Array.isArray(this.membraneTargetPoints)) {
    const numPoints = Math.max(10, Math.floor(this.radius * 0.8));
    this.membranePoints = generateMembranePoints(this.position, this.radius, numPoints);
    this.membraneTargetPoints = [...this.membranePoints];
    return;
  }
  
  const numPoints = this.membranePoints.length;
  
  // Calculate velocity magnitude for stretching effect
  const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
  const stretchFactor = Math.min(0.3, speed * 0.001); // Cap stretching
  
  // Calculate stretch direction
  let stretchX = 0;
  let stretchY = 0;
  
  if (speed > 0) {
    stretchX = this.velocity.x / speed;
    stretchY = this.velocity.y / speed;
  }
  
  // Generate new target points with noise and stretching
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    
    // Basic noise effect
    const noise = Math.sin(angle * 3 + this.membraneNoiseTime) * 0.1 + 0.9;
    
    // Pulse effect
    const pulseNoise = 1 + (this.pulseEffect * 0.05);
    
    // Stretching effect based on velocity
    const stretch = 1 + stretchFactor * Math.cos(angle - Math.atan2(stretchY, stretchX)) * this.elasticity;
    
    // Combine effects
    const totalEffect = noise * pulseNoise * stretch;
    
    const x = this.position.x + Math.cos(angle) * this.radius * totalEffect;
    const y = this.position.y + Math.sin(angle) * this.radius * totalEffect;
    
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
    
    // Draw inner details (organelles)
    this.drawCellDetails(ctx, screenPos, screenRadius);
  }
  
  drawCellDetails(ctx: CanvasRenderingContext2D, screenPos: Vector2D, screenRadius: number): void {
    // Draw small organelles inside the cell
    const organelleCount = Math.floor(this.radius / 10);
    
    for (let i = 0; i < organelleCount; i++) {
      // Random position within the cell
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * screenRadius * 0.6;
      
      const x = screenPos.x + Math.cos(angle) * distance;
      const y = screenPos.y + Math.sin(angle) * distance;
      
      // Draw organelle
      ctx.beginPath();
      ctx.arc(x, y, screenRadius * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = this.adjustColor(this.color, -20);
      ctx.fill();
    }
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
  
  // Apply a repulsion force from another cell or object
  applyRepulsion(otherPos: Vector2D, strength: number = 1): void {
    const direction = subtract(this.position, otherPos);
    const dist = distance(this.position, otherPos);
    
    // Avoid division by zero
    if (dist < 0.1) return;
    
    // Calculate repulsion force (stronger when closer)
    const forceMagnitude = strength * (1 / dist);
    const force = multiply(normalize(direction), forceMagnitude);
    
    this.applyForce(force);
  }
  
  // Helper to darken/lighten a color
  adjustColor(color: string, amount: number): string {
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
      
      // For hex colors
      if (color.startsWith('#')) {
        // Convert hex to rgb
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        // Adjust rgb values
        const newR = Math.max(0, Math.min(255, r + amount));
        const newG = Math.max(0, Math.min(255, g + amount));
        const newB = Math.max(0, Math.min(255, b + amount));
        
        // Convert back to hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      }
      
      // Fallback for other color formats
      return color;
    } catch (error) {
      // Return original color if adjustment fails
      return color;
    }
  }
  
  // Helper function to subtract vectors
  subtract(a: Vector2D, b: Vector2D): Vector2D {
    return {
      x: a.x - b.x,
      y: a.y - b.y
    };
  }
  
  // Helper function to normalize a vector
  normalize(vector: Vector2D): Vector2D {
    const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (mag === 0) return { x: 0, y: 0 };
    return {
      x: vector.x / mag,
      y: vector.y / mag
    };
  }
  
  // Helper function to multiply a vector by a scalar
  multiply(vector: Vector2D, scalar: number): Vector2D {
    return {
      x: vector.x * scalar,
      y: vector.y * scalar
    };
  }
}
