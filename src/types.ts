// Common types used throughout the application

export interface Vector2D {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D, camera: Camera): void;
}

export interface Camera {
  position: Vector2D;
  scale: number;
  width: number;
  height: number;
  worldToScreen(worldPos: Vector2D): Vector2D;
  screenToWorld(screenPos: Vector2D): Vector2D;
}

export interface Cell {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  mass: number;
  color: string;
  membranePoints: Vector2D[];
  membraneTargetPoints: Vector2D[];
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D, camera: Camera): void;
  applyForce(force: Vector2D): void;
}

export interface PlayerCell extends Cell {
  owner: string;
  canMerge: boolean;
  mergeTime: number;
}

export interface AIBehavior {
  update(entity: Entity, deltaTime: number, targets: Entity[]): void;
}

export enum PowerUpType {
  SPEED,
  SHIELD,
  MASS_BOOST,
  INVISIBILITY
}

export interface PowerUp extends Entity {
  type: PowerUpType;
  duration: number;
  apply(player: Player): void;
}

export interface Player {
  id: string;
  name: string;
  cells: PlayerCell[];
  score: number;
  color: string;
  isAI: boolean;
  activeEffects: Map<PowerUpType, number>;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D, camera: Camera): void;
  split(): void;
  eject(): void;
  applyPowerUp(type: PowerUpType, duration: number): void;
  getTotalMass(): number;
  getAveragePosition(): Vector2D;
}

export interface Virus extends Entity {
  mass: number;
  splitThreshold: number;
  canSplit(cell: Cell): boolean;
  split(cell: Cell): void;
}

export interface Particle extends Entity {
  lifetime: number;
  maxLifetime: number;
  alpha: number;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D, camera: Camera): void;
}

export interface Food extends Entity {
  value: number;
  pulse: number;
  pulseDirection: number;
  pulseSpeed: number;
  pulseAmount: number;
}

export interface GameState {
  players: Map<string, Player>;
  food: Food[];
  viruses: Virus[];
  powerUps: PowerUp[];
  particles: Particle[];
  worldSize: Vector2D;
  leaderboard: { id: string; name: string; score: number }[];
}

export interface InputState {
  mousePosition: Vector2D;
  keys: Map<string, boolean>;
}
