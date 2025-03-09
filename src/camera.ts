// src/camera.ts - Updated for more responsive following
import { Camera, Vector2D } from './types';
import { lerp } from './utils';

export class GameCamera implements Camera {
  position: Vector2D;
  targetPosition: Vector2D;
  scale: number;
  targetScale: number;
  width: number;
  height: number;
  minScale: number;
  maxScale: number;
  smoothFactor: number;
  
  constructor(width: number, height: number) {
    this.position = { x: 0, y: 0 };
    this.targetPosition = { x: 0, y: 0 };
    this.scale = 1;
    this.targetScale = 1;
    this.width = width;
    this.height = height;
    this.minScale = 0.1;  // Minimum zoom level
    this.maxScale = 2.0;  // Maximum zoom level
    // IMPROVED: Much faster camera response for better gameplay
    this.smoothFactor = 0.5; // Increased from 0.2 to 0.5 for near-instant camera movement
  }

  update(deltaTime: number): void {
    // Safety check for deltaTime
    if (typeof deltaTime !== 'number' || deltaTime <= 0 || deltaTime > 1) {
      deltaTime = 0.016; // Default to 60fps
    }
    
    // IMPROVED: Much faster camera movement with higher lerp factor
    // Adjust lerp factor based on deltaTime for consistent smoothness
    const lerpFactor = 1 - Math.pow(1 - this.smoothFactor, deltaTime * 60);
    
    this.position.x = lerp(this.position.x, this.targetPosition.x, lerpFactor);
    this.position.y = lerp(this.position.y, this.targetPosition.y, lerpFactor);
    this.scale = lerp(this.scale, this.targetScale, lerpFactor);
    
    // Validate position to prevent NaN
    if (isNaN(this.position.x) || isNaN(this.position.y)) {
      console.error("Camera position is NaN, resetting");
      this.position = { ...this.targetPosition };
    }
    
    if (isNaN(this.scale)) {
      console.error("Camera scale is NaN, resetting");
      this.scale = this.targetScale;
    }
    
    // Clamp scale to min/max values
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale));
  }

  follow(target: Vector2D, playerRadius: number): void {
    // Safety check for target
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
      return;
    }
    
    this.targetPosition = { ...target };
    
    // Scale based on player size (zoom out as player gets bigger)
    // Adjusted formula for better visibility
    const baseScale = 1;
    const scaleFactor = Math.max(0.3, 40 / (playerRadius + 40));
    this.targetScale = baseScale * scaleFactor;
    
    // Clamp target scale to min/max values
    this.targetScale = Math.max(this.minScale, Math.min(this.maxScale, this.targetScale));
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  worldToScreen(worldPos: Vector2D): Vector2D {
    // Safety check for worldPos
    if (!worldPos || typeof worldPos.x !== 'number' || typeof worldPos.y !== 'number') {
      return { x: 0, y: 0 };
    }
    
    return {
      x: (worldPos.x - this.position.x) * this.scale + this.width / 2,
      y: (worldPos.y - this.position.y) * this.scale + this.height / 2
    };
  }

  screenToWorld(screenPos: Vector2D): Vector2D {
    // Safety check for screenPos
    if (!screenPos || typeof screenPos.x !== 'number' || typeof screenPos.y !== 'number') {
      return { x: 0, y: 0 };
    }
    
    return {
      x: (screenPos.x - this.width / 2) / this.scale + this.position.x,
      y: (screenPos.y - this.height / 2) / this.scale + this.position.y
    };
  }

  isInView(worldPos: Vector2D, radius: number): boolean {
    // Safety check for worldPos and radius
    if (!worldPos || typeof worldPos.x !== 'number' || typeof worldPos.y !== 'number' || 
        typeof radius !== 'number') {
      return false;
    }
    
    const screenPos = this.worldToScreen(worldPos);
    const scaledRadius = radius * this.scale;
    
    // Add a margin to prevent pop-in/pop-out at screen edges
    const margin = 100;
    
    return (
      screenPos.x + scaledRadius >= -margin &&
      screenPos.x - scaledRadius <= this.width + margin &&
      screenPos.y + scaledRadius >= -margin &&
      screenPos.y - scaledRadius <= this.height + margin
    );
  }
}
