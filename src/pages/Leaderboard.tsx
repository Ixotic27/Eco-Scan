import React from 'react';
import { Trophy, Medal, Crown, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Leaderboard: React.FC = () => {
  const { leaderboard, user } = useAppContext();

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={18} className="text-yellow-500" />;
    if (rank === 2) return <Medal size={18} className="text-gray-400" />;
    if (rank === 3) return <Medal size={18} className="text-amber-600" />;
    return <span className="text-sm font-bold text-gray-500 dark:text-gray-400">#{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-gray-200 dark:border-gray-700';
    if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800';
    return 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy size={22} className="text-yellow-500" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Leaderboard</h1>
        <span className="ml-auto flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Live
        </span>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Be the first on the leaderboard!</p>
          <p className="text-gray-400 text-sm mt-1">Scan waste items to earn points.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map(entry => (
            <div
              key={entry.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${getRankBg(entry.rank)} ${entry.id === user?.id ? 'ring-2 ring-green-500 ring-offset-1' : ''}`}
            >
              {/* Rank */}
              <div className="w-8 flex-shrink-0 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0">
                {entry.avatar ? (
                  <img src={entry.avatar} alt={entry.name} className="w-10 h-10 rounded-full border-2 border-white shadow" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-white truncate">
                  {entry.name}
                  {entry.id === user?.id && (
                    <span className="ml-2 text-xs text-green-600 font-normal">(you)</span>
                  )}
                </p>
              </div>

              {/* Points */}
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-green-700 dark:text-green-400">{entry.points.toLocaleString()}</p>
                <p className="text-xs text-gray-400">points</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-4">
        Leaderboard updates in real-time via Firebase 🔥
      </p>
    </div>
  );
};

export default Leaderboard;