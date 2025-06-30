import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import GameControls from './components/GameControls';
import GameStats from './components/GameStats';

function App() {
  const [gameStats, setGameStats] = useState({
    score: 0,
    level: 1,
    lives: 3,
    blocksRemaining: 0,
    gameStatus: 'menu' as const
  });
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [screenShake, setScreenShake] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('breakout-highscore');
    return saved ? parseInt(saved) : 0;
  });

  const [canvasSize, setCanvasSize] = useState({
    width: 800,
    height: 800
  });

  // Responsive canvas sizing with mobile optimization
  useEffect(() => {
    const updateCanvasSize = () => {
      const isMobile = window.innerWidth <= 768;
      const maxWidth = window.innerWidth - (isMobile ? 20 : 40);
      const maxHeight = window.innerHeight - (isMobile ? 200 : 300); // Less space for UI on mobile
      
      // Use the smaller dimension to maintain square aspect ratio
      const baseSize = Math.min(Math.min(800, maxWidth), Math.min(800, maxHeight));
      
      // Ensure minimum playable size, smaller for mobile
      const minSize = isMobile ? 400 : 600;
      const finalSize = Math.max(baseSize, minSize);
      
      setCanvasSize({ width: finalSize, height: finalSize });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Update high score
  useEffect(() => {
    if (gameStats.score > highScore) {
      setHighScore(gameStats.score);
      localStorage.setItem('breakout-highscore', gameStats.score.toString());
    }
  }, [gameStats.score, highScore]);

  // Screen shake effect
  const triggerScreenShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 500);
  }, []);

  const handlePlayPause = useCallback(() => {
    setGameStats(prev => ({
      ...prev,
      gameStatus: prev.gameStatus === 'playing' ? 'paused' : 'playing'
    }));
  }, []);

  const handleRestart = useCallback(() => {
    window.location.reload();
  }, []);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  const handleGameStatsUpdate = useCallback((newStats: typeof gameStats) => {
    setGameStats(newStats);
    
    // Trigger screen shake on life lost or game over
    if (newStats.lives < gameStats.lives || newStats.gameStatus === 'gameOver') {
      triggerScreenShake();
    }
  }, [gameStats.lives, triggerScreenShake]);

  const isMobile = canvasSize.width <= 500;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-2 md:p-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'grid-move 20s linear infinite'
        }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(isMobile ? 10 : 20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="text-center mb-3 md:mb-6 relative z-10">
        <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl md:text-7xl'} font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2 md:mb-4 tracking-wider`}>
          BREAKOUT
        </h1>
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-3 md:p-6 max-w-md mx-auto">
          <p className={`text-gray-300 ${isMobile ? 'text-xs' : 'text-sm md:text-lg'} font-medium`}>
            {isMobile ? 'Touch & drag to control the paddle!' : 'A futuristic take on the classic arcade game. Break all the blocks and advance through levels!'}
          </p>
        </div>
      </div>

      <GameStats
        score={gameStats.score}
        level={gameStats.level}
        lives={gameStats.lives}
        blocksRemaining={gameStats.blocksRemaining}
        highScore={highScore}
      />

      <div className={`relative ${screenShake ? 'screen-shake' : ''} mb-3 md:mb-0`}>
        <GameCanvas
          width={canvasSize.width}
          height={canvasSize.height}
          soundEnabled={soundEnabled}
          onGameStatsUpdate={handleGameStatsUpdate}
        />
        
        {/* Enhanced glow effect */}
        <div 
          className="absolute inset-0 rounded-2xl blur-2xl opacity-40 pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, #00ffff, #0080ff, #8000ff, #ff00ff)',
            animation: 'glow-pulse 4s ease-in-out infinite'
          }}
        />
      </div>

      <GameControls
        gameStatus={gameStats.gameStatus}
        onPlayPause={handlePlayPause}
        onRestart={handleRestart}
        onToggleSound={handleToggleSound}
        soundEnabled={soundEnabled}
      />

      {!isMobile && (
        <div className="mt-6 max-w-4xl relative z-10">
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-4 text-center tracking-wide">HOW TO PLAY</h3>
            <div className="grid md:grid-cols-2 gap-4 text-gray-300">
              <div className="backdrop-blur-sm bg-white/5 border border-cyan-500/20 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
                <h4 className="font-bold text-cyan-400 mb-2 text-sm md:text-lg tracking-wide">CONTROLS</h4>
                <p className="font-medium text-xs md:text-base">Move your mouse to control the paddle. Press SPACE to pause. Keep the ball in play!</p>
              </div>
              <div className="backdrop-blur-sm bg-white/5 border border-purple-500/20 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
                <h4 className="font-bold text-purple-400 mb-2 text-sm md:text-lg tracking-wide">OBJECTIVE</h4>
                <p className="font-medium text-xs md:text-base">Break all blocks to advance levels. Chain hits for massive combo multipliers!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
}

export default App;