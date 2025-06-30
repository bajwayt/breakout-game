import { Block, Particle, Position } from '../types/game';

export const createBlocks = (canvasWidth: number, level: number): Block[] => {
  const blocks: Block[] = [];
  const isMobile = canvasWidth < 600;
  const blockWidth = isMobile ? 45 : 60;  // Smaller blocks for mobile
  const blockHeight = isMobile ? 20 : 25; // Smaller blocks for mobile
  const padding = isMobile ? 3 : 4;
  const rows = Math.min(6 + Math.floor(level / 2), isMobile ? 6 : 8);
  const cols = Math.floor((canvasWidth - (isMobile ? 20 : 40)) / (blockWidth + padding));
  const startX = (canvasWidth - (cols * (blockWidth + padding) - padding)) / 2;
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#FFB347', '#87CEEB', '#F0E68C',
    '#FF8A80', '#80CBC4', '#81C784', '#FFD54F', '#FFAB91'
  ];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const colorIndex = (row + col) % colors.length;
      blocks.push({
        id: `${row}-${col}`,
        position: {
          x: startX + col * (blockWidth + padding),
          y: (isMobile ? 60 : 80) + row * (blockHeight + padding)
        },
        width: blockWidth,
        height: blockHeight,
        color: colors[colorIndex],
        destroyed: false,
        points: (rows - row) * 10
      });
    }
  }
  
  return blocks;
};

export const createParticles = (position: Position, color: string, count: number = 8): Particle[] => {
  const particles: Particle[] = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 100 + Math.random() * 150;
    
    particles.push({
      id: `particle-${Date.now()}-${i}`,
      position: { ...position },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      },
      life: 1,
      maxLife: 1,
      color,
      size: 3 + Math.random() * 3
    });
  }
  
  return particles;
};

export const updateParticles = (particles: Particle[], deltaTime: number): Particle[] => {
  return particles
    .map(particle => ({
      ...particle,
      position: {
        x: particle.position.x + particle.velocity.x * deltaTime,
        y: particle.position.y + particle.velocity.y * deltaTime
      },
      velocity: {
        x: particle.velocity.x * 0.98,
        y: particle.velocity.y * 0.98 + 300 * deltaTime // gravity
      },
      life: particle.life - deltaTime * 2
    }))
    .filter(particle => particle.life > 0);
};

export const calculateScore = (blockPoints: number, comboMultiplier: number): number => {
  return Math.floor(blockPoints * comboMultiplier);
};