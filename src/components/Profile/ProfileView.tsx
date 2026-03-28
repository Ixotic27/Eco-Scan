import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { User, Award, Camera, MapPin, BarChart, Moon, Sun, Edit2, X, Check } from 'lucide-react';

const ProfileView: React.FC = () => {
  const { user, scannedItems, theme, toggleTheme, updateUser } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user.name,
    email: user.email,
  });
  
  const recentItems = scannedItems.slice(0, 3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(editForm);
    setIsEditing(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="bg-green-600 dark:bg-green-700 h-32 relative">
          <button
            onClick={toggleTheme}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            {theme === 'light' ? (
              <Moon size={20} className="text-white" />
            ) : (
              <Sun size={20} className="text-white" />
            )}
          </button>
          <div className="absolute bottom-0 left-0 transform translate-y-1/2 ml-6">
            <div className="h-24 w-24 bg-white dark:bg-gray-700 rounded-full p-1 shadow-md">
              <div className="h-full w-full bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <User size={40} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-16 pb-6 px-6">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Check size={16} className="mr-1" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  <X size={16} className="mr-1" />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{user.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <Edit2 size={20} />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Eco Enthusiast</p>
            </>
          )}
          
          <div className="mt-6 flex justify-between">
            <div className="text-center">
              <div className="flex flex-col items-center">
                <Award size={24} className="text-green-600 dark:text-green-400 mb-1" />
                <span className="font-bold text-xl text-gray-900 dark:text-white">{user.points}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Points</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex flex-col items-center">
                <Camera size={24} className="text-blue-600 dark:text-blue-400 mb-1" />
                <span className="font-bold text-xl text-gray-900 dark:text-white">{user.scannedItems}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Scanned</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex flex-col items-center">
                <MapPin size={24} className="text-red-600 dark:text-red-400 mb-1" />
                <span className="font-bold text-xl text-gray-900 dark:text-white">{user.recycledItems}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Recycled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
          <BarChart size={20} className="mr-2 text-blue-600 dark:text-blue-400" />
          Your Recycling Impact
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-1">CO₂ Reduced</h4>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {(user.recycledItems * 2.5).toFixed(1)} kg
            </p>
          </div>
          
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Water Saved</h4>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {(user.recycledItems * 13).toFixed(0)} L
            </p>
          </div>
          
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Energy Saved</h4>
            <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
              {(user.recycledItems * 7.5).toFixed(1)} kWh
            </p>
          </div>
          
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Trees Saved</h4>
            <p className="text-xl font-bold text-green-700 dark:text-green-400">
              {Math.max(1, Math.floor(user.recycledItems / 2))}
            </p>
          </div>
        </div>
      </div>
      
      {recentItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Recently Scanned Items</h3>
          
          <div className="space-y-4">
            {recentItems.map(item => (
              <div key={item.id} className="flex border dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                  <img 
                    src={item.imageUrl} 
                    alt="Scanned item" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 flex-1">
                  <div className="flex justify-between">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.result.isRecyclable 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {item.result.isRecyclable ? 'Recyclable' : 'Not Recyclable'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-sm font-medium mt-1 text-gray-900 dark:text-white">
                    {item.result.material}
                  </p>
                  {item.recycled && (
                    <div className="mt-1 flex items-center text-green-600 dark:text-green-400 text-xs">
                      <MapPin size={12} className="mr-1" />
                      <span>Recycled</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {scannedItems.length > 3 && (
            <button className="mt-4 w-full py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              View All Items ({scannedItems.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileView;