import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { useAppContext } from './context/AppContext';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Scan from './pages/Scan';
import Map from './pages/Map';
import Rewards from './pages/Rewards';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Auth from './pages/Auth';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthLoading } = useAppContext();
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-green-300 text-lg font-medium">Loading EcoScan...</p>
        </div>
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}

function AppRoutes() {
  const { user, isAuthLoading } = useAppContext();
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-green-300 text-lg font-medium">Loading EcoScan...</p>
        </div>
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/" element={<PrivateRoute><Layout><Home /></Layout></PrivateRoute>} />
      <Route path="/scan" element={<PrivateRoute><Layout><Scan /></Layout></PrivateRoute>} />
      <Route path="/map" element={<PrivateRoute><Layout><Map /></Layout></PrivateRoute>} />
      <Route path="/rewards" element={<PrivateRoute><Layout><Rewards /></Layout></PrivateRoute>} />
      <Route path="/leaderboard" element={<PrivateRoute><Layout><Leaderboard /></Layout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
}

export default App;