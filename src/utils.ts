// [v1.0-Part1] Utility functions for the game
// #=== 10% ===#

import { Vector2D } from './types';

// Generate a random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Generate a random color
export function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}

// Calculate distance between two points
export function distance(a: Vector2D, b: Vector2D): number {
  // Safety check to prevent NaN errors
  if (!a || !b || typeof a.x !== 'number' || typeof a.y !== 'number' || 
      typeof b.x !== 'number' || typeof b.y !== 'number') {
    console.warn('Invalid vectors in distance calculation', a, b);
    return Infinity; // Return a safe value
  }
  
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Check if two circles are colliding
export function checkCollision(a: { position: Vector2D, radius: number }, b: { position: Vector2D, radius: number }): boolean {
  // Safety check to prevent NaN errors
  if (!a || !b || !a.position || !b.position || 
      typeof a.radius !== 'number' || typeof b.radius !== 'number') {
    return false;
  }
  
  const dist = distance(a.position, b.position);
  return dist < a.radius + b.radius;
}

// Normalize a vector
export function normalize(vector: Vector2D): Vector2D {
  // Safety check to prevent NaN errors
  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number') {
    return { x: 0, y: 0 };
  }
  
  const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: vector.x / mag, y: vector.y / mag };
}

// Calculate magnitude of a vector
export function magnitude(vector: Vector2D): number {
  // Safety check to prevent NaN errors
  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number') {
    return 0;
  }
  
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

// Limit the magnitude of a vector
export function limit(vector: Vector2D, max: number): Vector2D {
  // Safety check to prevent NaN errors
  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number' || typeof max !== 'number') {
    return { x: 0, y: 0 };
  }
  
  const mag = magnitude(vector);
  if (mag > max) {
    const normalized = normalize(vector);
    return { x: normalized.x * max, y: normalized.y * max };
  }
  return { ...vector };
}

// Add two vectors
export function add(a: Vector2D, b: Vector2D): Vector2D {
  // Safety check to prevent NaN errors
  if (!a || !b || typeof a.x !== 'number' || typeof a.y !== 'number' || 
      typeof b.x !== 'number' || typeof b.y !== 'number') {
    return { x: 0, y: 0 };
  }
  
  return { x: a.x + b.x, y: a.y + b.y };
}

// Subtract vector b from vector a
export function subtract(a: Vector2D, b: Vector2D): Vector2D {
  // Safety check to prevent NaN errors
  if (!a || !b || typeof a.x !== 'number' || typeof a.y !== 'number' || 
      typeof b.x !== 'number' || typeof b.y !== 'number') {
    return { x: 0, y: 0 };
  }
  
  return { x: a.x - b.x, y: a.y - b.y };
}

// Multiply a vector by a scalar
export function multiply(vector: Vector2D, scalar: number): Vector2D {
  // Safety check to prevent NaN errors
  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number' || typeof scalar !== 'number') {
    return { x: 0, y: 0 };
  }
  
  return { x: vector.x * scalar, y: vector.y * scalar };
}

// Divide a vector by a scalar
export function divide(vector: Vector2D, scalar: number): Vector2D {
  // Safety check to prevent NaN errors
  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number' || typeof scalar !== 'number') {
    return { ...vector };
  }
  
  if (scalar === 0) return { ...vector };
  return { x: vector.x / scalar, y: vector.y / scalar };
}

// Clamp a value between min and max
export function clamp(value: number, min: number, max: number): number {
  // Safety check to prevent NaN errors
  if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
    return 0;
  }
  
  return Math.max(min, Math.min(max, value));
}

// Linear interpolation between two values
export function lerp(a: number, b: number, t: number): number {
  // Safety check to prevent NaN errors
  if (typeof a !== 'number' || typeof b !== 'number' || typeof t !== 'number') {
    return 0;
  }
  
  return a + (b - a) * t;
}

// Linear interpolation between two vectors
export function lerpVector(a: Vector2D, b: Vector2D, t: number): Vector2D {
  // Safety check to prevent NaN errors
  if (!a || !b || typeof a.x !== 'number' || typeof a.y !== 'number' || 
      typeof b.x !== 'number' || typeof b.y !== 'number' || typeof t !== 'number') {
    return { x: 0, y: 0 };
  }
  
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t)
  };
}

// Calculate mass from radius
export function massFromRadius(radius: number): number {
  // Safety check to prevent NaN errors
  if (typeof radius !== 'number' || radius < 0) {
    return 0;
  }
  
  return Math.PI * radius * radius;
}

// Calculate radius from mass
export function radiusFromMass(mass: number): number {
  // Safety check to prevent NaN errors
  if (typeof mass !== 'number' || mass < 0) {
    return 0;
  }
  
  return Math.sqrt(mass / Math.PI);
}

// Generate points for a circle with noise (for cell membrane)
export function generateMembranePoints(center: Vector2D, radius: number, points: number = 20): Vector2D[] {
  // Safety check to prevent NaN errors
  if (!center || typeof center.x !== 'number' || typeof center.y !== 'number' || 
      typeof radius !== 'number' || typeof points !== 'number') {
    console.warn("Invalid parameters in generateMembranePoints", { center, radius, points });
    
    // Return a default circle with 10 points
    const result: Vector2D[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      result.push({ 
        x: 0 + Math.cos(angle) * 10, 
        y: 0 + Math.sin(angle) * 10 
      });
    }
    return result;
  }
  
  // Ensure points is a reasonable number
  points = Math.max(6, Math.min(points, 100));
  
  const result: Vector2D[] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;
    result.push({ x, y });
  }
  
  // Verify the result
  if (!Array.isArray(result) || result.length === 0) {
    console.warn("generateMembranePoints produced invalid result");
    
    // Return a default circle with 10 points
    const fallback: Vector2D[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      fallback.push({ 
        x: center.x + Math.cos(angle) * radius, 
        y: center.y + Math.sin(angle) * radius 
      });
    }
    return fallback;
  }
  
  return result;
}

// Check if a value is NaN and provide a default
export function validateNumber(value: number, defaultValue: number): number {
  return isNaN(value) ? defaultValue : value;
}

// Validate a position vector to prevent NaN
export function validatePosition(position: Vector2D, defaultPosition: Vector2D): Vector2D {
  if (!position) return { ...defaultPosition };
  
  return {
    x: validateNumber(position.x, defaultPosition.x),
    y: validateNumber(position.y, defaultPosition.y)
  };
}

// Get a random position within bounds
export function randomPosition(bounds: { x: number, y: number } | { width: number, height: number }): Vector2D {
  // Verificar se estamos recebendo o formato correto de limites
  if ('width' in bounds && 'height' in bounds) {
    return {
      x: Math.random() * bounds.width,
      y: Math.random() * bounds.height
    };
  } else if ('x' in bounds && 'y' in bounds) {
    return {
      x: Math.random() * bounds.x,
      y: Math.random() * bounds.y
    };
  }
  
  // Fallback para evitar erros
  console.warn('Invalid bounds in randomPosition', bounds);
  return { x: 100, y: 100 };
}

// Get a random velocity with maximum speed
export function randomVelocity(maxSpeed: number): Vector2D {
  // Safety check to prevent NaN errors
  if (typeof maxSpeed !== 'number') {
    return { x: 0, y: 0 };
  }
  
  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * maxSpeed;
  return {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed
  };
}

// Ease in out function for smooth transitions
export function easeInOut(t: number): number {
  // Safety check to prevent NaN errors
  if (typeof t !== 'number') {
    return 0;
  }
  
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
