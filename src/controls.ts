// [v1.0-Part1] Controls for handling user input
// #=== 30% ===#

import { InputState, Vector2D } from './types';
import { GameCamera } from './camera';

export class Controls {
  inputState: InputState;
  canvas: HTMLCanvasElement;
  camera: GameCamera;
  lastSplitTime: number;
  lastEjectTime: number;
  splitCooldown: number;
  ejectCooldown: number;
  touchStartPos: Vector2D | null;
  
  constructor(canvas: HTMLCanvasElement, camera: GameCamera) {
    this.canvas = canvas;
    this.camera = camera;
    this.inputState = {
      mousePosition: { x: 0, y: 0 },
      keys: new Map<string, boolean>()
    };
    
    this.lastSplitTime = 0;
    this.lastEjectTime = 0;
    this.splitCooldown = 300; // 300ms cooldown for split
    this.ejectCooldown = 100; // 100ms cooldown for eject
    this.touchStartPos = null;
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
  // Mouse move event
  this.canvas.addEventListener('mousemove', (e) => {
    const rect = this.canvas.getBoundingClientRect();
    const screenPos: Vector2D = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // Convert screen position to world position
    this.inputState.mousePosition = this.camera.screenToWorld(screenPos);
    console.log("Mouse moved to world position:", this.inputState.mousePosition);
  });
  
  // Key down event
  window.addEventListener('keydown', (e) => {
    this.inputState.keys.set(e.key.toLowerCase(), true);
    console.log("Key pressed:", e.key.toLowerCase());
    
    // Handle space key for splitting
    if (e.key === ' ' || e.key.toLowerCase() === 'space') {
      const now = Date.now();
      if (now - this.lastSplitTime > this.splitCooldown) {
        this.lastSplitTime = now;
        const splitEvent = new CustomEvent('player-split');
        window.dispatchEvent(splitEvent);
        console.log("Split event dispatched");
      }
    }
    
    // Handle W key for ejecting mass
    if (e.key.toLowerCase() === 'w') {
      const now = Date.now();
      if (now - this.lastEjectTime > this.ejectCooldown) {
        this.lastEjectTime = now;
        const ejectEvent = new CustomEvent('player-eject');
        window.dispatchEvent(ejectEvent);
        console.log("Eject event dispatched");
      }
    }
  });
  
  // Key up event
  window.addEventListener('keyup', (e) => {
    this.inputState.keys.set(e.key.toLowerCase(), false);
  });
  
  // Touch events for mobile
  this.canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    this.touchStartPos = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  });
  
  this.canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const screenPos: Vector2D = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
    
    this.inputState.mousePosition = this.camera.screenToWorld(screenPos);
  });
  
  this.canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    
    // Check if it was a quick tap (for splitting)
    if (this.touchStartPos) {
      const now = Date.now();
      if (now - this.lastSplitTime > this.splitCooldown) {
        this.lastSplitTime = now;
        const splitEvent = new CustomEvent('player-split');
        window.dispatchEvent(splitEvent);
      }
      this.touchStartPos = null;
    }
  });
  
  // Double tap for ejecting mass
  let lastTap = 0;
  this.canvas.addEventListener('touchend', (e) => {
    const now = Date.now();
    const doubleTapDelay = 300;
    if (now - lastTap < doubleTapDelay) {
      // Double tap detected
      if (now - this.lastEjectTime > this.ejectCooldown) {
        this.lastEjectTime = now;
        const ejectEvent = new CustomEvent('player-eject');
        window.dispatchEvent(ejectEvent);
      }
    }
    lastTap = now;
  });
  
  // Prevent context menu on right click
  this.canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
}
  
  isKeyPressed(key: string): boolean {
    return this.inputState.keys.get(key.toLowerCase()) === true;
  }
  
  getMousePosition(): Vector2D {
    return { ...this.inputState.mousePosition };
  }
  
  update(): void {
  // Check for split (space)
  if (this.isKeyPressed(' ') || this.isKeyPressed('space')) {
    const now = Date.now();
    if (now - this.lastSplitTime > this.splitCooldown) {
      this.lastSplitTime = now;
      
      // Dispatch a custom event for splitting
      const splitEvent = new CustomEvent('player-split');
      window.dispatchEvent(splitEvent);
      
      // Reset the key to prevent continuous splitting
      this.inputState.keys.set(' ', false);
      this.inputState.keys.set('space', false);
    }
  }
  
  // Check for eject mass (w)
  if (this.isKeyPressed('w')) {
    const now = Date.now();
    if (now - this.lastEjectTime > this.ejectCooldown) {
      this.lastEjectTime = now;
      
      // Dispatch a custom event for ejecting mass
      const ejectEvent = new CustomEvent('player-eject');
      window.dispatchEvent(ejectEvent);
      
      // Reset the key to prevent continuous ejection
      this.inputState.keys.set('w', false);
    }
  }
}
}
