// src/powerup.ts
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
  rotationAngle: number;
  rotationSpeed: number;
  glowIntensity: number;
  glowDirection: number;
  
  constructor(position: Vector2D, type: PowerUpType) {
    this.id = generateId();
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.radius = 15;
    this.type = type;
    
    // Visual properties
    this.pulseAmount = 0.2;
    this.pulseSpeed = 2;
    this.pulseValue = 0;
    this.pulseDirection = 1;
    this.rotationAngle = 0;
    this.rotationSpeed = 1 + Math.random() * 0.5;
    this.glowIntensity = 0;
    this.glowDirection = 1;
    
    // Set properties based on power-up type
    switch (type) {
      case PowerUpType.SPEED:
        this.color = '#00ffff'; // Cyan
        this.duration = 8;
        this.pulseSpeed = 3; // Faster pulse for speed
        this.rotationSpeed = 2;
        break;
      case PowerUpType.SHIELD:
        this.color = '#ffff00'; // Yellow
        this.duration = 12;
        this.pulseAmount = 0.3; // Stronger pulse for shield
        break;
      case PowerUpType.MASS_BOOST:
        this.color = '#ff00ff'; // Magenta
        this.duration = 6;
        this.radius = 18; // Larger radius for mass boost
        break;
      case PowerUpType.INVISIBILITY:
        this.color = '#888888'; // Gray
        this.duration = 5;
        this.pulseAmount = 0.4; // Strong pulse for invisibility
        this.pulseSpeed = 1.5;
        break;
      default:
        this.color = '#ffffff'; // White
        this.duration = 10;
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
    
    // Update rotation
    this.rotationAngle += this.rotationSpeed * deltaTime;
    if (this.rotationAngle > Math.PI * 2) {
      this.rotationAngle -= Math.PI * 2;
    }
    
    // Update glow effect
    this.glowIntensity += this.glowDirection * 0.5 * deltaTime;
    if (this.glowIntensity > 1) {
      this.glowIntensity = 1;
      this.glowDirection = -1;
    } else if (this.glowIntensity < 0.5) {
      this.glowIntensity = 0.5;
      this.glowDirection = 1;
    }
    
    // Add slight movement
    this.position.x += Math.sin(this.rotationAngle) * 0.5;
    this.position.y += Math.cos(this.rotationAngle) * 0.5;
  }
  
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!camera.isInView(this.position, this.radius * 1.5)) return;
    
    const screenPos = camera.worldToScreen(this.position);
    const pulseRadius = this.radius * (1 + this.pulseValue * this.pulseAmount);
    const screenRadius = pulseRadius * camera.scale;
    
    // Draw outer glow
    const glowSize = screenRadius * 1.5;
    const gradient1 = ctx.createRadialGradient(
      screenPos.x, screenPos.y, screenRadius * 0.8,
      screenPos.x, screenPos.y, glowSize
    );
    gradient1.addColorStop(0, `${this.color}${Math.floor(this.glowIntensity * 99).toString(16)}`);
    gradient1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, glowSize, 0, Math.PI * 2);
    ctx.fillStyle = gradient1;
    ctx.fill();
    
    // Draw power-up
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
    
    // Create gradient
    const gradient2 = ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, screenRadius
    );
    gradient2.addColorStop(0, this.color);
    gradient2.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
    
    ctx.fillStyle = gradient2;
    ctx.fill();
    
    // Draw icon based on power-up type
    this.drawPowerUpIcon(ctx, screenPos, screenRadius);
    
    // Draw rotating particles around the power-up
    this.drawOrbitingParticles(ctx, screenPos, screenRadius);
  }
  
  drawPowerUpIcon(ctx: CanvasRenderingContext2D, screenPos: Vector2D, screenRadius: number): void {
    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate(this.rotationAngle * 0.5); // Rotate icon slowly
    
    // Draw different shapes based on power-up type
    switch (this.type) {
      case PowerUpType.SPEED:
        // Draw lightning bolt
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(-screenRadius * 0.3, -screenRadius * 0.5);
        ctx.lineTo(screenRadius * 0.1, -screenRadius * 0.1);
        ctx.lineTo(-screenRadius * 0.1, screenRadius * 0.1);
        ctx.lineTo(screenRadius * 0.3, screenRadius * 0.5);
        ctx.lineTo(screenRadius * 0.1, 0);
        ctx.lineTo(screenRadius * 0.3, -screenRadius * 0.3);
        ctx.closePath();
        ctx.fill();
        break;
        
      case PowerUpType.SHIELD:
        // Draw shield
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(0, 0, screenRadius * 0.6, Math.PI, 0);
        ctx.lineTo(screenRadius * 0.4, screenRadius * 0.3);
        ctx.lineTo(0, screenRadius * 0.5);
        ctx.lineTo(-screenRadius * 0.4, screenRadius * 0.3);
        ctx.closePath();
        ctx.fill();
        break;
        
      case PowerUpType.MASS_BOOST:
        // Draw plus sign
        ctx.fillStyle = 'white';
        ctx.fillRect(-screenRadius * 0.5, -screenRadius * 0.1, screenRadius, screenRadius * 0.2);
        ctx.fillRect(-screenRadius * 0.1, -screenRadius * 0.5, screenRadius * 0.2, screenRadius);
        break;
        
      case PowerUpType.INVISIBILITY:
        // Draw eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(0, 0, screenRadius * 0.5, screenRadius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, screenRadius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw slash through eye
        ctx.strokeStyle = 'white';
        ctx.lineWidth = screenRadius * 0.1;
        ctx.beginPath();
        ctx.moveTo(-screenRadius * 0.6, -screenRadius * 0.3);
        ctx.lineTo(screenRadius * 0.6, screenRadius * 0.3);
        ctx.stroke();
        break;
    }
    
    ctx.restore();
  }
  
  drawOrbitingParticles(ctx: CanvasRenderingContext2D, screenPos: Vector2D, screenRadius: number): void {
    const particleCount = 5;
    const orbitRadius = screenRadius * 1.3;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + this.rotationAngle;
      const x = screenPos.x + Math.cos(angle) * orbitRadius;
      const y = screenPos.y + Math.sin(angle) * orbitRadius;
      
      const particleSize = screenRadius * 0.15 * (0.8 + this.pulseValue * 0.4);
      
      ctx.beginPath();
      ctx.arc(x, y, particleSize, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fill();
    }
  }
  
  apply(player: Player): void {
    // Apply power-up effect with improved durations and effects
    let effectDuration = this.duration;
    
    // Adjust duration based on player size (smaller players get longer durations)
    const playerMass = player.getTotalMass();
    if (playerMass < 100) {
      effectDuration *= 1.5; // 50% longer for small players
    } else if (playerMass > 500) {
      effectDuration *= 0.8; // 20% shorter for large players
    }
    
    // Apply the power-up with the adjusted duration
    player.applyPowerUp(this.type, effectDuration);
    
    // Create visual effect
    const effectEvent = new CustomEvent('power-up-collected', {
      detail: {
        position: { ...this.position },
        color: this.color,
        type: this.type,
        duration: effectDuration
      }
    });
    window.dispatchEvent(effectEvent);
    
    // Create text popup
    const popupEvent = new CustomEvent('create-text-popup', {
      detail: {
        position: { ...this.position },
        text: `${PowerUpType[this.type]}!`,
        color: this.color,
        duration: 2,
        size: 20
      }
    });
    window.dispatchEvent(popupEvent);
  }
  
  // Get a description of the power-up effect
  getDescription(): string {
    switch (this.type) {
      case PowerUpType.SPEED:
        return `Speed Boost: Move 50% faster for ${this.duration} seconds`;
      case PowerUpType.SHIELD:
        return `Shield: Protect from being eaten for ${this.duration} seconds`;
      case PowerUpType.MASS_BOOST:
        return `Mass Boost: Increase mass by 50% for ${this.duration} seconds`;
      case PowerUpType.INVISIBILITY:
        return `Invisibility: Become invisible to other players for ${this.duration} seconds`;
      default:
        return "Unknown power-up";
    }
  }
}
