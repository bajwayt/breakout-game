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
  const touchStartXRef = useRef<number>(0);
  const isTouchingRef = useRef<boolean>(false);
  const lastTouchXRef = useRef<number>(0);
  
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

  const updatePaddlePosition = useCallback((clientX: number) => {
    if (gameState.gameStatus !== 'playing') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const relativeX = clientX - rect.left;
      const scaleX = width / rect.width;
      const gameX = relativeX * scaleX;
      
      mouseXRef.current = gameX;
      
      setPaddle(prev => ({
        ...prev,
        position: {
          ...prev.position,
          x: Math.max(0, Math.min(width - prev.width, gameX - prev.width / 2))
        }
      }));
    }
  }, [gameState.gameStatus, width]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    updatePaddlePosition(event.clientX);
  }, [updatePaddlePosition]);

  // Enhanced touch controls for mobile
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      touchStartXRef.current = touch.clientX;
      lastTouchXRef.current = touch.clientX;
      isTouchingRef.current = true;
      
      // Update paddle position immediately on touch start
      updatePaddlePosition(touch.clientX);
    }
  }, [updatePaddlePosition]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.touches.length > 0 && isTouchingRef.current) {
      const touch = event.touches[0];
      lastTouchXRef.current = touch.clientX;
      updatePaddlePosition(touch.clientX);
    }
  }, [updatePaddlePosition]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    isTouchingRef.current = false;
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
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

  // Handle touch tap for game state changes
  const handleTouchTap = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Only handle tap if it's a quick touch (not a drag)
    const touchDuration = Date.now() - (event.timeStamp || 0);
    const touchDistance = Math.abs(lastTouchXRef.current - touchStartXRef.current);
    
    if (touchDistance < 20) { // Small movement threshold
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
      } else if (gameState.gameStatus === 'playing') {
        // Pause on tap during gameplay
        setGameState(prev => ({ ...prev, gameStatus: 'paused' }));
      }
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

    // Draw UI with responsive font sizes
    const isMobile = width < 600;
    const fontSize = isMobile ? 12 : 16;
    const topMargin = isMobile ? 25 : 35;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
    ctx.textAlign = 'left';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText(`SCORE: ${gameState.score}`, 20, topMargin);
    
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL: ${gameState.level}`, width / 2, topMargin);
    
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${gameState.lives}`, width - 20, topMargin);
    ctx.shadowBlur = 0;

    // Combo multiplier with responsive sizing
    if (comboMultiplier > 1 && (gameState.gameStatus === 'playing' || gameState.gameStatus === 'paused')) {
      ctx.fillStyle = '#ffff00';
      ctx.font = `bold ${isMobile ? 10 : 14}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 15;
      ctx.fillText(`${comboMultiplier.toFixed(1)}X COMBO!`, width / 2, height - (isMobile ? 60 : 80));
      ctx.shadowBlur = 0;
    }

    // Game status messages with responsive sizing
    if (gameState.gameStatus === 'menu') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${isMobile ? 20 : 32}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 20;
      ctx.fillText('BREAKOUT', width / 2, height / 2 - (isMobile ? 40 : 60));
      
      ctx.font = `${isMobile ? 10 : 16}px "Press Start 2P", monospace`;
      ctx.shadowBlur = 10;
      ctx.fillText('TAP TO START', width / 2, height / 2 + 20);
      
      ctx.font = `${isMobile ? 8 : 12}px "Press Start 2P", monospace`;
      ctx.shadowBlur = 5;
      if (isMobile) {
        ctx.fillText('TOUCH & DRAG TO CONTROL', width / 2, height / 2 + 40);
        ctx.fillText('TAP TO PAUSE', width / 2, height / 2 + 55);
      } else {
        ctx.fillText('MOVE MOUSE TO CONTROL', width / 2, height / 2 + 50);
        ctx.fillText('SPACE TO PAUSE', width / 2, height / 2 + 70);
      }
      ctx.shadowBlur = 0;
    } else if (gameState.gameStatus === 'paused') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${isMobile ? 16 : 24}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 15;
      ctx.fillText('PAUSED', width / 2, height / 2);
      
      ctx.font = `${isMobile ? 8 : 12}px "Press Start 2P", monospace`;
      ctx.shadowBlur = 8;
      ctx.fillText(isMobile ? 'TAP TO RESUME' : 'SPACE OR CLICK TO RESUME', width / 2, height / 2 + 40);
      ctx.shadowBlur = 0;
    } else if (gameState.gameStatus === 'gameOver') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#ff0040';
      ctx.font = `bold ${isMobile ? 16 : 24}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff0040';
      ctx.shadowBlur = 20;
      ctx.fillText('GAME OVER', width / 2, height / 2 - 30);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `${isMobile ? 10 : 16}px "Press Start 2P", monospace`;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillText(`FINAL SCORE: ${gameState.score}`, width / 2, height / 2 + 10);
      
      ctx.font = `${isMobile ? 8 : 12}px "Press Start 2P", monospace`;
      ctx.shadowBlur = 8;
      ctx.fillText('TAP TO PLAY AGAIN', width / 2, height / 2 + 50);
      ctx.shadowBlur = 0;
    } else if (gameState.gameStatus === 'levelComplete') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#00ff88';
      ctx.font = `bold ${isMobile ? 14 : 24}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 20;
      ctx.fillText('LEVEL COMPLETE!', width / 2, height / 2 - 30);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `${isMobile ? 10 : 16}px "Press Start 2P", monospace`;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillText(`NEXT LEVEL: ${gameState.level + 1}`, width / 2, height / 2 + 10);
      
      ctx.font = `${isMobile ? 8 : 12}px "Press Start 2P", monospace`;
      ctx.shadowBlur = 8;
      ctx.fillText('TAP TO CONTINUE', width / 2, height / 2 + 50);
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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchTap}
      className="border border-white/20 rounded-2xl cursor-crosshair backdrop-blur-sm bg-black/50 touch-none select-none"
      style={{ 
        boxShadow: '0 0 60px rgba(0, 255, 255, 0.3), inset 0 0 60px rgba(0, 255, 255, 0.1)',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    />
  );
};

export default GameCanvas;