import React from 'react';
import ScannerView from '../components/WasteScanner/ScannerView';

const Scan: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">AI Waste Scanner</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Powered by Gemini 1.5 Flash — upload a photo and get instant waste classification
        </p>
      </div>
      <ScannerView />
    </div>
  );
};

export default Scan;