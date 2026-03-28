import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Map, Gift, Trophy, ArrowRight, Zap, Leaf, Recycle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Home: React.FC = () => {
  const { user, scannedItems } = useAppContext();

  const features = [
    { icon: <Camera size={22} className="text-white" />, title: 'AI Scan', description: 'Gemini AI classifies your waste instantly', path: '/scan', gradient: 'from-green-500 to-emerald-600' },
    { icon: <Map size={22} className="text-white" />, title: 'Find Centers', description: 'Real recycling centers near your location', path: '/map', gradient: 'from-blue-500 to-cyan-600' },
    { icon: <Gift size={22} className="text-white" />, title: 'Rewards', description: 'Redeem eco-friendly products', path: '/rewards', gradient: 'from-purple-500 to-indigo-600' },
    { icon: <Trophy size={22} className="text-white" />, title: 'Leaderboard', description: 'Compete for top eco-champion', path: '/leaderboard', gradient: 'from-orange-500 to-amber-600' },
  ];

  const recentItems = scannedItems.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 border-2 border-white/30">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {user?.name?.charAt(0) ?? 'E'}
                </div>
              )}
            </div>
            <div>
              <p className="text-white/70 text-xs">Welcome back</p>
              <p className="font-bold">{user?.name ?? 'Eco Explorer'}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Zap size={13} className="text-yellow-300" />
              <span className="text-sm font-semibold">Gemini AI</span>
            </div>
          </div>

          <h1 className="text-2xl font-black mb-1">EcoScan</h1>
          <p className="text-white/80 text-sm mb-5">Scan, recycle, and earn rewards for your impact 🌍</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Points', value: user?.points ?? 0, icon: <Trophy size={14} /> },
              { label: 'Scanned', value: user?.scannedItems ?? 0, icon: <Camera size={14} /> },
              { label: 'Recycled', value: user?.recycledItems ?? 0, icon: <Recycle size={14} /> },
            ].map(stat => (
              <div key={stat.label} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                <div className="flex justify-center mb-1 opacity-80">{stat.icon}</div>
                <p className="text-xl font-black">{stat.value}</p>
                <p className="text-white/70 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {features.map(f => (
            <Link
              key={f.title}
              to={f.path}
              className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white text-sm">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{f.description}</p>
              <ArrowRight size={14} className="text-gray-400 mt-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Scans */}
      {recentItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-700 dark:text-gray-300">Recent Scans</h2>
            <Link to="/profile" className="text-xs text-green-600 font-medium hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {recentItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <img src={item.imageUrl} alt="waste" className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-900" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-white text-sm truncate">{item.result.material}</p>
                  <p className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.result.isRecyclable ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {item.result.isRecyclable ? '♻️ Recyclable' : '🚫 Non-recyclable'}
                  </span>
                  <span className="text-xs text-green-600 font-medium">+{item.result.points} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works (only if no scans yet) */}
      {recentItems.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Leaf size={18} className="text-blue-600" />
            <h3 className="font-bold text-blue-800 dark:text-blue-300">How It Works</h3>
          </div>
          <ol className="space-y-2">
            {[
              'Take a photo of a waste item',
              'Gemini AI classifies it in seconds',
              'Get disposal tips & earn points',
              'Find a recycling center near you',
              'Redeem points for eco rewards!',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-blue-700 dark:text-blue-400">
                <span className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <Link to="/scan" className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium text-sm mt-4 hover:underline">
            Start Scanning <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
};

export default Home;