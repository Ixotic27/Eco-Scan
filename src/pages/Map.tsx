import React from 'react';
import { MapPin } from 'lucide-react';
import RecyclingMap from '../components/RecyclingMap/RecyclingMap';

const Map: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={22} className="text-green-600" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Recycling Centers</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Real-time recycling &amp; waste disposal locations near you, powered by OpenStreetMap.
        </p>
      </div>
      <RecyclingMap />
    </div>
  );
};

export default Map;