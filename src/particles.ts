import { Particle, Vector2D, Camera } from './types';
import { generateId } from './utils';

export class GameParticle implements Particle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  alpha: number;
  
  constructor(position: Vector2D, velocity: Vector2D, radius: number, color: string, lifetime: number = 2) {
    this.id = generateId();
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.radius = radius;
    this.color = color;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.alpha = 1;
  }
  
  update(deltaTime: number): void {
    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    
    // Apply friction
    this.velocity.x *= 0.95;
    this.velocity.y *= 0.95;
    
    // Update lifetime and alpha
    this.lifetime -= deltaTime;
    this.alpha = this.lifetime / this.maxLifetime;
    
    // Shrink particle as it ages
    this.radius = this.radius * (0.9 + 0.1 * (this.lifetime / this.maxLifetime));
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!camera.isInView(this.position, this.radius) || this.alpha <= 0) return;
    
    const screenPos = camera.worldToScreen(this.position);
    const screenRadius = this.radius * camera.scale;
    
    // Draw particle
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
    
    // Parse color to add alpha
    let colorWithAlpha = this.color;
    if (this.color.startsWith('#')) {
      // Convert hex to rgba
      const r = parseInt(this.color.slice(1, 3), 16);
      const g = parseInt(this.color.slice(3, 5), 16);
      const b = parseInt(this.color.slice(5, 7), 16);
      colorWithAlpha = `rgba(${r}, ${g}, ${b}, ${this.alpha})`;
    } else if (this.color.startsWith('rgb')) {
      // Convert rgb to rgba
      colorWithAlpha = this.color.replace('rgb', 'rgba').replace(')', `, ${this.alpha})`);
    } else if (this.color.startsWith('hsl')) {
      // Convert hsl to hsla
      colorWithAlpha = this.color.replace('hsl', 'hsla').replace(')', `, ${this.alpha})`);
    }
    
    ctx.fillStyle = colorWithAlpha;
    ctx.fill();
  }
  
  isExpired(): boolean {
    return this.lifetime <= 0;
  }
}

export class ParticleSystem {
  particles: GameParticle[];
  
  constructor() {
    this.particles = [];
  }
  
  update(deltaTime: number): void {
    // Update all particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(deltaTime);
      
      // Remove expired particles
      if (particle.isExpired()) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // Render all particles
    for (const particle of this.particles) {
      particle.render(ctx, camera);
    }
  }
  
  createExplosion(position: Vector2D, color: string, count: number = 20, radius: number = 5): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      const velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      };
      
      const particleRadius = radius * (0.5 + Math.random() * 0.5);
      const lifetime = 0.5 + Math.random() * 1.5;
      
      const particle = new GameParticle(
        { ...position },
        velocity,
        particleRadius,
        color,
        lifetime
      );
      
      this.particles.push(particle);
    }
  }
  
  createSplash(position: Vector2D, color: string, direction: Vector2D, count: number = 10): void {
    // Create particles in a cone shape in the direction of movement
    const baseAngle = Math.atan2(direction.y, direction.x);
    const spreadAngle = Math.PI / 3; // 60 degrees spread
    
    for (let i = 0; i < count; i++) {
      const angle = baseAngle - spreadAngle/2 + Math.random() * spreadAngle;
      const speed = 50 + Math.random() * 200;
      const velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      };
      
      const particleRadius = 2 + Math.random() * 4;
      const lifetime = 0.3 + Math.random() * 0.7;
      
      const particle = new GameParticle(
        { ...position },
        velocity,
        particleRadius,
        color,
        lifetime
      );
      
      this.particles.push(particle);
    }
  }
  
  createTrail(position: Vector2D, color: string, radius: number = 3): void {
    // Create a single particle that stays in place and fades out
    const particle = new GameParticle(
      { ...position },
      { x: 0, y: 0 },
      radius,
      color,
      0.5 + Math.random() * 0.5
    );
    
    this.particles.push(particle);
  }
  
  createPowerUpEffect(position: Vector2D, color: string): void {
    // Create a circular burst of particles
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const speed = 100 + Math.random() * 100;
      const velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      };
      
      const particleRadius = 3 + Math.random() * 3;
      const lifetime = 0.8 + Math.random() * 0.8;
      
      const particle = new GameParticle(
        { ...position },
        velocity,
        particleRadius,
        color,
        lifetime
      );
      
      this.particles.push(particle);
    }
    
    // Add a central burst
    this.createExplosion(position, color, 20, 5);
  }
}
