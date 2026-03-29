import React from 'react';
import { LogOut } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ProfileView from '../components/Profile/ProfileView';

const Profile: React.FC = () => {
  const { signOut } = useAppContext();

  return (
    <div className="space-y-5">
      <ProfileView />

      {/* Sign Out */}
      <div className="max-w-lg mx-auto">
        <button
          id="sign-out-btn"
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 py-3 px-4 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Profile;