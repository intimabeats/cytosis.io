import { PowerUp, PowerUpType, Player, Vector2D, Camera } from './types';
import { generateId } from './utils';

export class GamePowerUp implements PowerUp {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  type: PowerUpType;
  duration: number;
  pulseAmount: number;
  pulseSpeed: number;
  pulseValue: number;
  pulseDirection: number;
  
  constructor(position: Vector2D, type: PowerUpType) {
    this.id = generateId();
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.radius = 15;
    this.type = type;
    this.duration = 10; // 10 seconds by default
    
    // Visual properties
    this.pulseAmount = 0.2;
    this.pulseSpeed = 2;
    this.pulseValue = 0;
    this.pulseDirection = 1;
    
    // Set color based on power-up type
    switch (type) {
      case PowerUpType.SPEED:
        this.color = '#00ffff'; // Cyan
        this.duration = 8;
        break;
      case PowerUpType.SHIELD:
        this.color = '#ffff00'; // Yellow
        this.duration = 12;
        break;
      case PowerUpType.MASS_BOOST:
        this.color = '#ff00ff'; // Magenta
        this.duration = 6;
        break;
      case PowerUpType.INVISIBILITY:
        this.color = '#888888'; // Gray
        this.duration = 5;
        break;
      default:
        this.color = '#ffffff'; // White
    }
  }
  
  update(deltaTime: number): void {
    // Update pulsing animation
    this.pulseValue += this.pulseDirection * this.pulseSpeed * deltaTime;
    
    if (this.pulseValue > 1) {
      this.pulseValue = 1;
      this.pulseDirection = -1;
    } else if (this.pulseValue < 0) {
      this.pulseValue = 0;
      this.pulseDirection = 1;
    }
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!camera.isInView(this.position, this.radius * 1.5)) return;
    
    const screenPos = camera.worldToScreen(this.position);
    const pulseRadius = this.radius * (1 + this.pulseValue * this.pulseAmount);
    const screenRadius = pulseRadius * camera.scale;
    
    // Draw power-up
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
    
    // Create gradient
    const gradient = ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, screenRadius
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw icon based on power-up type
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${screenRadius}px Arial`;
    
    let icon = '';
    switch (this.type) {
      case PowerUpType.SPEED:
        icon = '⚡'; // Lightning bolt
        break;
      case PowerUpType.SHIELD:
        icon = '🛡️'; // Shield
        break;
      case PowerUpType.MASS_BOOST:
        icon = '⬆️'; // Up arrow
        break;
      case PowerUpType.INVISIBILITY:
        icon = '👁️'; // Eye
        break;
    }
    
    ctx.fillText(icon, screenPos.x, screenPos.y);
    
    // Draw outer glow
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, screenRadius * 1.3, 0, Math.PI * 2);
    ctx.strokeStyle = `${this.color}88`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  apply(player: Player): void {
    player.applyPowerUp(this.type, this.duration);
    
    // Create visual effect
    const effectEvent = new CustomEvent('power-up-collected', {
      detail: {
        position: { ...this.position },
        color: this.color,
        type: this.type
      }
    });
    window.dispatchEvent(effectEvent);
  }
}
