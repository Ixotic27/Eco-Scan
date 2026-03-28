import React from 'react';
import Navbar from './Navbar';
import { useAppContext } from '../../context/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme } = useAppContext();

  return (
    <div className={`${theme} flex min-h-screen w-full bg-gray-50 dark:bg-gray-900`}>
      <Navbar />
      {/* Offset for fixed sidebar on desktop, top/bottom bars on mobile */}
      <main className="flex-1 w-full md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-8 w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;