import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { User, Award, Camera, MapPin, BarChart, Moon, Sun, Edit2, X, Check, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { ScannedItem } from '../../types';
import { VerificationModal } from './VerificationModal';
import { deleteScannedItem } from '../../lib/db';

const ProfileView: React.FC = () => {
  const { user, scannedItems, theme, toggleTheme, updateUser, firebaseUser } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [selectedVerify, setSelectedVerify] = useState<ScannedItem | null>(null);

  const handleDeleteScan = async (item: ScannedItem) => {
    if (!firebaseUser) return;
    if (confirm('Are you sure you want to permanently delete this scan from your history?')) {
      await deleteScannedItem(firebaseUser.uid, item.id);
      window.location.reload(); // Quick refresh to sync state
    }
  };
  
  const recentItems = scannedItems.slice(0, 10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(editForm);
    setIsEditing(false);
  };
  
  if (!user) return null;

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
              {(user.co2Saved || 0).toFixed(1)} kg
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
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Your Recent Scans</h3>
          
          <div className="space-y-4">
            {recentItems.map(item => (
              <div key={item.id} className="flex border dark:border-gray-700 rounded-lg overflow-hidden p-3 gap-3">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 flex-shrink-0 rounded-md overflow-hidden border border-gray-100 dark:border-gray-600">
                  <img 
                    src={item.imageUrl} 
                    alt="Scanned item" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' :
                        item.status === 'verified_recycled' ? 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300' :
                        item.status === 'verified_diy' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300' :
                        item.status === 'pending_community' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' :
                        item.result.isRecyclable ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300'
                      }`}>
                        {item.status === 'pending' ? 'Pending Action' :
                         item.status === 'verified_recycled' ? 'Verified Recycled' :
                         item.status === 'verified_diy' ? 'Verified DIY' :
                         item.status === 'pending_community' ? 'In Community Feed' :
                         item.result.isRecyclable ? 'Recyclable' : 'Not Recyclable'}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span>{new Date(item.date).toLocaleDateString()}</span>
                          <button 
                            onClick={() => handleDeleteScan(item)} 
                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                            title="Delete this scan"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <span className="font-semibold text-green-600 dark:text-green-400">+{item.result.points} pts</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold mt-1 text-gray-900 dark:text-white line-clamp-1">
                      {item.result.material}
                    </p>
                  </div>
                  
                  <div>
                    {item.status === 'pending' && item.result.isRecyclable && (
                      <button onClick={() => setSelectedVerify(item)} className="mt-2 w-full border border-green-500 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10 font-semibold text-xs py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                        Verify to Earn Points
                      </button>
                    )}
                    {(item.status === 'verified_recycled' || item.recycled) && (
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-bold flex gap-1 items-center">
                        <CheckCircle size={14} /> Official GPS Verified
                      </div>
                    )}
                    {item.status === 'pending_community' && (
                      <div className="mt-2 text-xs text-blue-500 font-bold flex gap-1 items-center">
                        <Clock size={14} /> Waiting for Community
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {scannedItems.length > 10 && (
            <button className="mt-4 w-full py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              View All Items ({scannedItems.length})
            </button>
          )}
        </div>
      )}

      {selectedVerify && (
        <VerificationModal 
          item={selectedVerify} 
          onClose={() => setSelectedVerify(null)} 
          onSuccess={() => setSelectedVerify(null)} 
        />
      )}
    </div>
  );
};

export default ProfileView;