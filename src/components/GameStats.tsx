import React from 'react';
import { Trophy, Target, Heart, Zap } from 'lucide-react';

interface GameStatsProps {
  score: number;
  level: number;
  lives: number;
  blocksRemaining: number;
  highScore: number;
}

const GameStats: React.FC<GameStatsProps> = ({
  score,
  level,
  lives,
  blocksRemaining,
  highScore
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-1 md:gap-4 mb-4 md:mb-8 w-full max-w-6xl px-2">
      <div className="backdrop-blur-md bg-white/10 border border-yellow-500/30 rounded-lg md:rounded-xl p-2 md:p-4 text-center hover:bg-white/15 transition-all duration-300 shadow-lg hover:shadow-yellow-500/25">
        <div className="flex items-center justify-center mb-1 md:mb-2">
          <Trophy className="text-yellow-400" size={16} />
        </div>
        <div className="text-sm md:text-2xl font-black text-white tracking-wider">{score.toLocaleString()}</div>
        <div className="text-yellow-400 text-xs font-bold tracking-wide">SCORE</div>
      </div>

      <div className="backdrop-blur-md bg-white/10 border border-cyan-500/30 rounded-lg md:rounded-xl p-2 md:p-4 text-center hover:bg-white/15 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25">
        <div className="flex items-center justify-center mb-1 md:mb-2">
          <Zap className="text-cyan-400" size={16} />
        </div>
        <div className="text-sm md:text-2xl font-black text-white tracking-wider">{level}</div>
        <div className="text-cyan-400 text-xs font-bold tracking-wide">LEVEL</div>
      </div>

      <div className="backdrop-blur-md bg-white/10 border border-red-500/30 rounded-lg md:rounded-xl p-2 md:p-4 text-center hover:bg-white/15 transition-all duration-300 shadow-lg hover:shadow-red-500/25">
        <div className="flex items-center justify-center mb-1 md:mb-2">
          <Heart className="text-red-400" size={16} />
        </div>
        <div className="text-sm md:text-2xl font-black text-white tracking-wider">{lives}</div>
        <div className="text-red-400 text-xs font-bold tracking-wide">LIVES</div>
      </div>

      <div className="backdrop-blur-md bg-white/10 border border-green-500/30 rounded-lg md:rounded-xl p-2 md:p-4 text-center hover:bg-white/15 transition-all duration-300 shadow-lg hover:shadow-green-500/25">
        <div className="flex items-center justify-center mb-1 md:mb-2">
          <Target className="text-green-400" size={16} />
        </div>
        <div className="text-sm md:text-2xl font-black text-white tracking-wider">{blocksRemaining}</div>
        <div className="text-green-400 text-xs font-bold tracking-wide">BLOCKS</div>
      </div>

      <div className="backdrop-blur-md bg-white/10 border border-purple-500/30 rounded-lg md:rounded-xl p-2 md:p-4 text-center hover:bg-white/15 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 col-span-2 md:col-span-1">
        <div className="flex items-center justify-center mb-1 md:mb-2">
          <Trophy className="text-purple-400" size={16} />
        </div>
        <div className="text-sm md:text-2xl font-black text-white tracking-wider">{highScore.toLocaleString()}</div>
        <div className="text-purple-400 text-xs font-bold tracking-wide">BEST</div>
      </div>
    </div>
  );
};

export default GameStats;