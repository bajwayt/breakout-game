export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Ball {
  position: Position;
  velocity: Velocity;
  radius: number;
  trail: Position[];
}

export interface Paddle {
  position: Position;
  width: number;
  height: number;
  velocity: number;
}

export interface Block {
  id: string;
  position: Position;
  width: number;
  height: number;
  color: string;
  destroyed: boolean;
  points: number;
}

export interface Particle {
  id: string;
  position: Position;
  velocity: Velocity;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  score: number;
  level: number;
  lives: number;
  blocks: Block[];
  particles: Particle[];
  gameStatus: 'menu' | 'playing' | 'paused' | 'gameOver' | 'levelComplete';
}