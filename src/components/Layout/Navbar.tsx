import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, Map, Gift, Trophy, User, Users, Menu, X, Moon, Sun, Leaf } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, theme, toggleTheme } = useAppContext();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/scan', icon: <Camera size={20} />, label: 'Scan' },
    { path: '/map', icon: <Map size={20} />, label: 'Find Centers' },
    { path: '/rewards', icon: <Gift size={20} />, label: 'Rewards' },
    { path: '/leaderboard', icon: <Trophy size={20} />, label: 'Leaderboard' },
    { path: '/community', icon: <Users size={20} />, label: 'Community' },
    { path: '/profile', icon: <User size={20} />, label: 'Profile' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col h-screen fixed left-0 top-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 shadow-sm">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-green-500/30">
              <Leaf size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-800 dark:text-white leading-none">EcoScan</h1>
              <p className="text-xs text-green-600 font-medium">AI Waste Assistant</p>
            </div>
          </Link>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-sm">
                  {user?.name?.charAt(0) ?? 'E'}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-green-600 font-medium">{user?.points ?? 0} points</p>
            </div>
            <button
              onClick={toggleTheme}
              className="ml-auto p-1.5 text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>

        {/* Nav links */}
        <nav className="p-3 flex-1">
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                    isActive(item.path)
                      ? 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {isActive(item.path) && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 text-center">Powered by Gemini AI · Firebase</p>
        </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md z-20 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Leaf size={14} className="text-white" />
            </div>
            <span className="font-black text-gray-800 dark:text-white">EcoScan</span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/40 rounded-xl mb-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {user?.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center font-bold text-gray-600 text-sm">{user?.name?.charAt(0) ?? 'E'}</div>
                }
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{user?.name ?? 'User'}</p>
                <p className="text-xs text-green-600">{user?.points ?? 0} points</p>
              </div>
            </div>
            <ul className="space-y-1">
              {navItems.map(item => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive(item.path)
                        ? 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-20">
        <div className="flex justify-around py-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${
                isActive(item.path)
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <div className={isActive(item.path) ? 'scale-110' : ''}>{item.icon}</div>
              <span className="text-xs mt-0.5 font-medium">{item.label.split(' ')[0]}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;