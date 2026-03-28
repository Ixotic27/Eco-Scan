import React from 'react';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  let contextValue;
  
  try {
    contextValue = useAppContext();
  } catch (error) {
    // If context is not available yet, show loading state
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }
  
  const { theme } = contextValue;
  const contentClass = "min-h-screen bg-gray-50 dark:bg-gray-900 md:pl-64 pt-16 md:pt-0 pb-16 md:pb-0";
  
  return (
    <div className={`flex flex-col md:flex-row ${theme}`}>
      <Navbar />
      <main className={contentClass}>
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;