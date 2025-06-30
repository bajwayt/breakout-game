import React from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface GameControlsProps {
  gameStatus: string;
  onPlayPause: () => void;
  onRestart: () => void;
  onToggleSound: () => void;
  soundEnabled: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
  gameStatus,
  onPlayPause,
  onRestart,
  onToggleSound,
  soundEnabled
}) => {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 mt-4 md:mt-8 flex-wrap px-2">
      <button
        onClick={onPlayPause}
        disabled={gameStatus === 'menu' || gameStatus === 'gameOver'}
        className="flex items-center gap-1 md:gap-3 px-3 md:px-8 py-2 md:py-4 backdrop-blur-md bg-white/10 border border-cyan-500/30 text-white rounded-lg md:rounded-xl hover:bg-white/20 hover:border-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold tracking-wide shadow-lg hover:shadow-cyan-500/25 text-xs md:text-base"
      >
        {gameStatus === 'playing' ? <Pause size={14} /> : <Play size={14} />}
        <span className="hidden sm:inline">
          {gameStatus === 'playing' ? 'PAUSE' : 'RESUME'}
        </span>
      </button>

      <button
        onClick={onRestart}
        className="flex items-center gap-1 md:gap-3 px-3 md:px-8 py-2 md:py-4 backdrop-blur-md bg-white/10 border border-green-500/30 text-white rounded-lg md:rounded-xl hover:bg-white/20 hover:border-green-400/50 transition-all duration-300 font-bold tracking-wide shadow-lg hover:shadow-green-500/25 text-xs md:text-base"
      >
        <RotateCcw size={14} />
        <span className="hidden sm:inline">RESTART</span>
      </button>

      <button
        onClick={onToggleSound}
        className="flex items-center gap-1 md:gap-3 px-3 md:px-8 py-2 md:py-4 backdrop-blur-md bg-white/10 border border-purple-500/30 text-white rounded-lg md:rounded-xl hover:bg-white/20 hover:border-purple-400/50 transition-all duration-300 font-bold tracking-wide shadow-lg hover:shadow-purple-500/25 text-xs md:text-base"
      >
        {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        <span className="hidden sm:inline">SOUND</span>
      </button>
    </div>
  );
};

export default GameControls;