import { Food, Vector2D, Camera } from './types';
import { generateId, randomColor } from './utils';

export class GameFood implements Food {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  value: number;
  pulse: number;
  pulseDirection: number;
  pulseSpeed: number;
  pulseAmount: number;
  
  constructor(position: Vector2D) {
    this.id = generateId();
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.radius = 5 + Math.random() * 3;
    this.color = randomColor();
    this.value = Math.PI * this.radius * this.radius;
    
    // Pulsing animation properties
    this.pulse = 0;
    this.pulseDirection = 1;
    this.pulseSpeed = 1 + Math.random() * 2;
    this.pulseAmount = 0.1 + Math.random() * 0.2;
  }
  
  update(deltaTime: number): void {
    // Update pulsing animation
    this.pulse += this.pulseDirection * this.pulseSpeed * deltaTime;
    
    if (this.pulse > 1) {
      this.pulse = 1;
      this.pulseDirection = -1;
    } else if (this.pulse < 0) {
      this.pulse = 0;
      this.pulseDirection = 1;
    }
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!camera.isInView(this.position, this.radius * 1.2)) return;
    
    const screenPos = camera.worldToScreen(this.position);
    const pulseRadius = this.radius * (1 + this.pulse * this.pulseAmount);
    const screenRadius = pulseRadius * camera.scale;
    
    // Draw food particle
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
    
    // Create gradient
    const gradient = ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, screenRadius
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, this.adjustColor(this.color, -30));
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add highlight
    ctx.beginPath();
    ctx.arc(
      screenPos.x - screenRadius * 0.3,
      screenPos.y - screenRadius * 0.3,
      screenRadius * 0.3,
      0, Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
  }
  
  // Helper to darken/lighten a color
  private adjustColor(color: string, amount: number): string {
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
  }
}
