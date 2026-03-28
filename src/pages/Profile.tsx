import React from 'react';
import { User, Camera, Recycle, Trophy, LogOut, Leaf, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Profile: React.FC = () => {
  const { user, scannedItems, signOut, firebaseUser } = useAppContext();

  const stats = [
    { icon: <Trophy size={18} className="text-yellow-500" />, label: 'Total Points', value: user?.points ?? 0, color: 'text-yellow-600 dark:text-yellow-400' },
    { icon: <Camera size={18} className="text-blue-500" />, label: 'Items Scanned', value: user?.scannedItems ?? 0, color: 'text-blue-600 dark:text-blue-400' },
    { icon: <Recycle size={18} className="text-green-500" />, label: 'Items Recycled', value: user?.recycledItems ?? 0, color: 'text-green-600 dark:text-green-400' },
    { icon: <Leaf size={18} className="text-emerald-500" />, label: 'CO₂ Saved', value: `~${((user?.recycledItems ?? 0) * 0.3).toFixed(1)}kg`, color: 'text-emerald-600 dark:text-emerald-400' },
  ];

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-6 text-white text-center shadow-xl">
        <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-4 border-white/30 bg-white/20">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={32} className="text-white" />
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold">{user?.name ?? 'Eco Explorer'}</h2>
        <p className="text-white/70 text-sm">{user?.email ?? ''}</p>
        {firebaseUser?.providerData?.[0]?.providerId === 'google.com' && (
          <span className="inline-flex items-center gap-1.5 mt-2 bg-white/15 px-3 py-1 rounded-full text-xs font-medium">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Signed in with Google
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span></div>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Scan History */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700">
          <Clock size={16} className="text-gray-500" />
          <h3 className="font-bold text-gray-800 dark:text-white text-sm">Scan History</h3>
          <span className="ml-auto text-xs text-gray-400">{scannedItems.length} items</span>
        </div>
        {scannedItems.length === 0 ? (
          <div className="p-8 text-center">
            <Camera size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-gray-400 text-sm">No scans yet. Start scanning!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-72 overflow-y-auto">
            {scannedItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3">
                <img
                  src={item.imageUrl}
                  alt="waste"
                  className="w-11 h-11 rounded-lg object-cover bg-gray-100 dark:bg-gray-900 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{item.result.material}</p>
                  <p className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.result.isRecyclable ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {item.result.isRecyclable ? '♻️' : '🚫'} {item.result.category}
                  </span>
                  <span className="text-xs text-green-600">+{item.result.points} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sign Out */}
      <button
        id="sign-out-btn"
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 py-3 px-4 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors"
      >
        <LogOut size={17} />
        Sign Out
      </button>
    </div>
  );
};

export default Profile;