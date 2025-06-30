import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Ball, Paddle, GameState, Block, Particle } from '../types/game';
import { updateBallPosition, handlePaddleCollision, checkCollision, getCollisionSide } from '../utils/physics';
import { createBlocks, createParticles, updateParticles, calculateScore } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';

interface GameCanvasProps {
  width: number;
  height: number;
  soundEnabled?: boolean;
  onGameStatsUpdate?: (stats: GameState) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  width, 
  height, 
  soundEnabled = true,
  onGameStatsUpdate 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const mouseXRef = useRef<number>(width / 2);
  const ambientOscillatorRef = useRef<OscillatorNode | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    level: 1,
    lives: 3,
    blocks: [],
    particles: [],
    gameStatus: 'menu'
  });
  
  const [ball, setBall] = useState<Ball>({
    position: { x: width / 2, y: height - 150 },
    velocity: { x: 250, y: -250 },
    radius: 8,
    trail: []
  });
  
  const [paddle, setPaddle] = useState<Paddle>({
    position: { x: width / 2 - 60, y: height - 60 },
    width: 120,
    height: 15,
    velocity: 0
  });
  
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [comboTimer, setComboTimer] = useState(0);

  // Update sound manager when sound setting changes
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Update parent component with game stats
  useEffect(() => {
    if (onGameStatsUpdate) {
      const blocksRemaining = gameState.blocks.filter(block => !block.destroyed).length;
      onGameStatsUpdate({
        ...gameState,
        blocksRemaining
      });
    }
  }, [gameState, onGameStatsUpdate]);

  // Start ambient sound when game is playing
  useEffect(() => {
    if (gameState.gameStatus === 'playing' && soundEnabled) {
      soundManager.playAmbientHum().then(oscillator => {
        if (oscillator) {
          ambientOscillatorRef.current = oscillator;
        }
      });
    } else if (ambientOscillatorRef.current) {
      ambientOscillatorRef.current.stop();
      ambientOscillatorRef.current = null;
    }

    return () => {
      if (ambientOscillatorRef.current) {
        ambientOscillatorRef.current.stop();
        ambientOscillatorRef.current = null;
      }
    };
  }, [gameState.gameStatus, soundEnabled]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (gameState.gameStatus === 'playing') {
          setGameState(prev => ({ ...prev, gameStatus: 'paused' }));
        } else if (gameState.gameStatus === 'paused') {
          setGameState(prev => ({ ...prev, gameStatus: 'playing' }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState.gameStatus]);

  const initializeGame = useCallback(() => {
    const newBlocks = createBlocks(width, gameState.level);
    setBall({
      position: { x: width / 2, y: height - 150 },
      velocity: { x: 250 + gameState.level * 25, y: -250 - gameState.level * 15 },
      radius: 8,
      trail: []
    });
    setPaddle({
      position: { x: width / 2 - 60, y: height - 60 },
      width: 120,
      height: 15,
      velocity: 0
    });
    setGameState(prev => ({
      ...prev,
      blocks: newBlocks,
      particles: [],
      gameStatus: 'playing'
    }));
    setComboMultiplier(1);
    setComboTimer(0);
    
    // Play game start sound
    soundManager.playGameStart();
  }, [width, height, gameState.level]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState.gameStatus !== 'playing') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = event.clientX - rect.left;
      mouseXRef.current = mouseX;
      
      setPaddle(prev => ({
        ...prev,
        position: {
          ...prev.position,
          x: Math.max(0, Math.min(width - prev.width, mouseX - prev.width / 2))
        }
      }));
    }
  }, [gameState.gameStatus, width]);

  const handleClick = useCallback(() => {
    if (gameState.gameStatus === 'menu') {
      initializeGame();
    } else if (gameState.gameStatus === 'paused') {
      setGameState(prev => ({ ...prev, gameStatus: 'playing' }));
    } else if (gameState.gameStatus === 'gameOver') {
      setGameState(prev => ({
        ...prev,
        score: 0,
        level: 1,
        lives: 3,
        gameStatus: 'menu'
      }));
    } else if (gameState.gameStatus === 'levelComplete') {
      setGameState(prev => ({ ...prev, level: prev.level + 1 }));
      setTimeout(() => {
        initializeGame();
      }, 100);
    }
  }, [gameState.gameStatus, initializeGame]);

  const gameLoop = useCallback((currentTime: number) => {
    if (gameState.gameStatus !== 'playing') {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 1/30);
    lastTimeRef.current = currentTime;

    setBall(prevBall => {
      let newBall = updateBallPosition(prevBall, width, height, deltaTime);
      
      // Check paddle collision
      const oldBall = { ...newBall };
      newBall = handlePaddleCollision(newBall, paddle);
      if (oldBall.velocity.y !== newBall.velocity.y) {
        soundManager.playPaddleHit();
      }
      
      // Check wall collisions for sound
      if ((newBall.position.x <= newBall.radius && newBall.velocity.x > 0) ||
          (newBall.position.x >= width - newBall.radius && newBall.velocity.x < 0) ||
          (newBall.position.y <= newBall.radius && newBall.velocity.y > 0)) {
        soundManager.playWallBounce();
      }
      
      // Check block collisions
      const newParticles: Particle[] = [];
      let hitBlock = false;
      let scoreGained = 0;
      
      setGameState(prevState => {
        const updatedBlocks = prevState.blocks.map(block => {
          if (block.destroyed) return block;
          
          if (checkCollision(newBall.position, newBall.radius, block.position, block.width, block.height)) {
            const side = getCollisionSide(newBall.position, newBall.radius, block.position, block.width, block.height);
            
            if (side === 'left' || side === 'right') {
              newBall.velocity.x = -newBall.velocity.x;
            } else {
              newBall.velocity.y = -newBall.velocity.y;
            }
            
            // Create particles
            const blockCenter = {
              x: block.position.x + block.width / 2,
              y: block.position.y + block.height / 2
            };
            newParticles.push(...createParticles(blockCenter, block.color, 8));
            
            hitBlock = true;
            scoreGained += calculateScore(block.points, comboMultiplier);
            
            // Play block hit sound with frequency based on block position
            const frequency = 400 + (block.position.y / height) * 800;
            soundManager.playBlockHit(frequency);
            
            return { ...block, destroyed: true };
          }
          return block;
        });
        
        const newComboMultiplier = hitBlock ? Math.min(comboMultiplier + 0.1, 3) : Math.max(comboMultiplier - deltaTime * 0.5, 1);
        setComboMultiplier(newComboMultiplier);
        setComboTimer(hitBlock ? 2 : Math.max(comboTimer - deltaTime, 0));
        
        const updatedParticles = updateParticles([...prevState.particles, ...newParticles], deltaTime);
        const remainingBlocks = updatedBlocks.filter(block => !block.destroyed);
        
        if (remainingBlocks.length === 0) {
          soundManager.playLevelComplete();
          return {
            ...prevState,
            blocks: updatedBlocks,
            particles: updatedParticles,
            score: prevState.score + scoreGained,
            gameStatus: 'levelComplete'
          };
        }
        
        return {
          ...prevState,
          blocks: updatedBlocks,
          particles: updatedParticles,
          score: prevState.score + scoreGained
        };
      });
      
      // Check if ball is out of bounds
      if (newBall.position.y > height) {
        setGameState(prevState => {
          const newLives = prevState.lives - 1;
          if (newLives <= 0) {
            soundManager.playGameOver();
            return { ...prevState, lives: 0, gameStatus: 'gameOver' };
          } else {
            soundManager.playLifeLost();
            return { ...prevState, lives: newLives };
          }
        });
        
        return {
          position: { x: width / 2, y: height - 150 },
          velocity: { x: 250, y: -250 },
          radius: 8,
          trail: []
        };
      }
      
      return newBall;
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.gameStatus, width, height, paddle, comboMultiplier, comboTimer]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with pure black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    if (gameState.gameStatus === 'playing' || gameState.gameStatus === 'paused') {
      // Draw ball trail with enhanced glow
      ball.trail.forEach((pos, index) => {
        const alpha = (ball.trail.length - index) / ball.trail.length * 0.4;
        const size = ball.radius * (alpha + 0.3);
        
        // Outer glow
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 255, ${alpha * 0.3})`;
        ctx.fill();
      });

      // Draw ball with intense glow
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      
      // Inner bright core
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(ball.position.x, ball.position.y, ball.radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffff';
      ctx.fill();

      // Draw paddle with glassmorphism effect - ALWAYS VISIBLE when playing or paused
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 20;
      
      // Paddle base
      ctx.fillStyle = 'rgba(0, 255, 136, 0.8)';
      ctx.fillRect(paddle.position.x, paddle.position.y, paddle.width, paddle.height);
      
      // Paddle highlight
      const paddleGradient = ctx.createLinearGradient(
        paddle.position.x, paddle.position.y,
        paddle.position.x, paddle.position.y + paddle.height
      );
      paddleGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      paddleGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
      ctx.fillStyle = paddleGradient;
      ctx.fillRect(paddle.position.x, paddle.position.y, paddle.width, paddle.height * 0.5);
      
      ctx.shadowBlur = 0;

      // Draw blocks with glassmorphism
      gameState.blocks.forEach(block => {
        if (!block.destroyed) {
          // Block glow
          ctx.shadowColor = block.color;
          ctx.shadowBlur = 12;
          
          // Main block with transparency
          ctx.fillStyle = block.color + '80'; // 50% opacity
          ctx.fillRect(block.position.x, block.position.y, block.width, block.height);
          
          // Glass highlight
          const blockGradient = ctx.createLinearGradient(
            block.position.x, block.position.y,
            block.position.x, block.position.y + block.height
          );
          blockGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
          blockGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
          blockGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = blockGradient;
          ctx.fillRect(block.position.x, block.position.y, block.width, block.height);
          
          // Border glow
          ctx.strokeStyle = block.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(block.position.x, block.position.y, block.width, block.height);
        }
      });
      ctx.shadowBlur = 0;

      // Draw particles with enhanced effects
      gameState.particles.forEach(particle => {
        ctx.globalAlpha = particle.life * 0.8;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // Draw UI with pixel font
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText(`SCORE: ${gameState.score}`, 20, 35);
    
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL: ${gameState.level}`, width / 2, 35);
    
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${gameState.lives}`, width - 20, 35);
    ctx.shadowBlur = 0;

    // Combo multiplier with intense glow
    if (comboMultiplier > 1 && (gameState.gameStatus === 'playing' || gameState.gameStatus === 'paused')) {
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 15;
      ctx.fillText(`${comboMultiplier.toFixed(1)}X COMBO!`, width / 2, height - 80);
      ctx.shadowBlur = 0;
    }

    // Game status messages with glassmorphism
    if (gameState.gameStatus === 'menu') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 20;
      ctx.fillText('BREAKOUT', width / 2, height / 2 - 60);
      
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.shadowBlur = 10;
      ctx.fillText('CLICK TO START', width / 2, height / 2 + 20);
      
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.shadowBlur = 5;
      ctx.fillText('MOVE MOUSE TO CONTROL', width / 2, height / 2 + 50);
      ctx.fillText('SPACE TO PAUSE', width / 2, height / 2 + 70);
      ctx.shadowBlur = 0;
    } else if (gameState.gameStatus === 'paused') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 15;
      ctx.fillText('PAUSED', width / 2, height / 2);
      
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.shadowBlur = 8;
      ctx.fillText('SPACE OR CLICK TO RESUME', width / 2, height / 2 + 40);
      ctx.shadowBlur = 0;
    } else if (gameState.gameStatus === 'gameOver') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#ff0040';
      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff0040';
      ctx.shadowBlur = 20;
      ctx.fillText('GAME OVER', width / 2, height / 2 - 30);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillText(`FINAL SCORE: ${gameState.score}`, width / 2, height / 2 + 10);
      
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.shadowBlur = 8;
      ctx.fillText('CLICK TO PLAY AGAIN', width / 2, height / 2 + 50);
      ctx.shadowBlur = 0;
    } else if (gameState.gameStatus === 'levelComplete') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 20;
      ctx.fillText('LEVEL COMPLETE!', width / 2, height / 2 - 30);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillText(`NEXT LEVEL: ${gameState.level + 1}`, width / 2, height / 2 + 10);
      
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.shadowBlur = 8;
      ctx.fillText('CLICK TO CONTINUE', width / 2, height / 2 + 50);
      ctx.shadowBlur = 0;
    }
  });

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      className="border border-white/20 rounded-2xl cursor-crosshair backdrop-blur-sm bg-black/50"
      style={{ 
        boxShadow: '0 0 60px rgba(0, 255, 255, 0.3), inset 0 0 60px rgba(0, 255, 255, 0.1)'
      }}
    />
  );
};

export default GameCanvas;