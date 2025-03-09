// src/particles.ts (melhorias)
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
  rotation: number;
  rotationSpeed: number;
  shape: string; // 'circle', 'square', 'triangle', 'star'
  
  constructor(position: Vector2D, velocity: Vector2D, radius: number, color: string, lifetime: number = 2, shape: string = 'circle') {
    this.id = generateId();
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.radius = radius;
    this.color = color;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.alpha = 1;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 2;
    this.shape = shape;
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
    
    // Update rotation
    this.rotation += this.rotationSpeed * deltaTime;
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!camera.isInView(this.position, this.radius) || this.alpha <= 0) return;
    
    const screenPos = camera.worldToScreen(this.position);
    const screenRadius = this.radius * camera.scale;
    
    // Save context state
    ctx.save();
    
    // Apply rotation for non-circle shapes
    if (this.shape !== 'circle') {
      ctx.translate(screenPos.x, screenPos.y);
      ctx.rotate(this.rotation);
      ctx.translate(-screenPos.x, -screenPos.y);
    }
    
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
    
    // Draw different shapes
    switch (this.shape) {
      case 'square':
        ctx.fillRect(
          screenPos.x - screenRadius,
          screenPos.y - screenRadius,
          screenRadius * 2,
          screenRadius * 2
        );
        break;
        
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - screenRadius);
        ctx.lineTo(screenPos.x + screenRadius * 0.866, screenPos.y + screenRadius * 0.5);
        ctx.lineTo(screenPos.x - screenRadius * 0.866, screenPos.y + screenRadius * 0.5);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'star':
        ctx.beginPath();
        const outerRadius = screenRadius;
        const innerRadius = screenRadius * 0.4;
        const spikes = 5;
        
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i / (spikes * 2)) * Math.PI * 2;
          const x = screenPos.x + Math.cos(angle) * radius;
          const y = screenPos.y + Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'circle':
      default:
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    
    // Restore context state
    ctx.restore();
  }
  
  isExpired(): boolean {
    return this.lifetime <= 0;
  }
}

export class TextParticle extends GameParticle {
  text: string;
  fontSize: number;
  fontFamily: string;
  
  constructor(position: Vector2D, text: string, color: string, lifetime: number = 2, fontSize: number = 16) {
    super(position, { x: 0, y: -20 }, 0, color, lifetime, 'text');
    this.text = text;
    this.fontSize = fontSize;
    this.fontFamily = 'Arial';
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!camera.isInView(this.position, 50) || this.alpha <= 0) return;
    
    const screenPos = camera.worldToScreen(this.position);
    
    // Set text properties
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
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
    
    // Draw text with shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillStyle = colorWithAlpha;
    ctx.fillText(this.text, screenPos.x, screenPos.y);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
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
    const shapes = ['circle', 'square', 'triangle', 'star'];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      const velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      };
      
      const particleRadius = radius * (0.5 + Math.random() * 0.5);
      const lifetime = 0.5 + Math.random() * 1.5;
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      
      const particle = new GameParticle(
        { ...position },
        velocity,
        particleRadius,
        color,
        lifetime,
        shape
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
      const shape = i % 5 === 0 ? 'star' : 'circle';
      
      const particle = new GameParticle(
        { ...position },
        velocity,
        particleRadius,
        color,
        lifetime,
        shape
      );
      
      this.particles.push(particle);
    }
    
    // Add a central burst
    this.createExplosion(position, color, 20, 5);
  }
  
  createScorePopup(position: Vector2D, text: string, color: string): void {
    const textParticle = new TextParticle(
      { ...position },
      text,
      color,
      2,
      20
    );
    
    this.particles.push(textParticle);
  }
  
  createCellMergeEffect(position1: Vector2D, position2: Vector2D, color: string): void {
    // Create particles along the path between the two cells
    const steps = 10;
    
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const pos = {
        x: position1.x + (position2.x - position1.x) * t,
        y: position1.y + (position2.y - position1.y) * t
      };
      
      // Create small explosion at each point
      this.createExplosion(pos, color, 5, 3);
    }
    
    // Create larger explosion at midpoint
    const midpoint = {
      x: (position1.x + position2.x) / 2,
      y: (position1.y + position2.y) / 2
    };
    
    this.createExplosion(midpoint, color, 15, 5);
  }
  
  createVirusGrowthEffect(position: Vector2D, stage: number): void {
    // Create effect based on growth stage
    const color = stage <= 2 ? '#00ff00' : stage <= 4 ? '#aaff00' : '#ffff00';
    const count = 10 + stage * 5;
    
    // Create expanding ring
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 50 + stage * 10;
      const velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      };
      
      const particle = new GameParticle(
        { ...position },
        velocity,
        3 + stage,
        color,
        0.5 + stage * 0.1,
        i % 3 === 0 ? 'triangle' : 'circle'
      );
      
      this.particles.push(particle);
    }
    
    // Add text indicator
    this.createScorePopup(
      { x: position.x, y: position.y - 20 },
      `Stage ${stage}`,
      color
    );
  }
}
