import React, { useState, useRef } from 'react';
import { Camera, Upload, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { classifyWaste } from '../../lib/gemini';
import { ScannedItem, ScanResult } from '../../types';
import ResultView from './ResultView';

const ScannerView: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { addScannedItem } = useAppContext();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImage(dataUrl);
        analyzeImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (imageDataUrl: string) => {
    setIsScanning(true);
    setError(null);
    try {
      const result = await classifyWaste(imageDataUrl);
      setScanResult(result);

      const newItem: ScannedItem = {
        id: Date.now().toString(),
        imageUrl: imageDataUrl,
        result,
        date: new Date().toISOString(),
        recycled: false,
      };
      await addScannedItem(newItem);
    } catch (err: any) {
      console.error('Gemini classification error:', err);
      setError(
        err?.message?.includes('API_KEY') 
          ? 'Invalid Gemini API key. Please check your .env file.'
          : 'AI analysis failed. Please try a clearer photo.'
      );
      setImage(null);
    } finally {
      setIsScanning(false);
    }
  };

  const resetScan = () => {
    setImage(null);
    setScanResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="max-w-lg mx-auto">
      {!image ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={20} />
              <span className="text-sm font-medium opacity-90">Powered by Gemini AI</span>
            </div>
            <h2 className="text-2xl font-bold">Scan Waste Item</h2>
            <p className="opacity-80 text-sm mt-1">Upload a photo to get an instant AI analysis</p>
          </div>

          <div className="p-6">
            {/* Drop zone */}
            <div
              className="bg-gray-50 dark:bg-gray-900 rounded-xl p-10 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Camera size={28} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Drop image here or click to upload</p>
              <p className="text-gray-400 text-sm">Supports JPG, PNG, WEBP</p>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                id="camera-btn"
                onClick={() => cameraInputRef.current?.click()}
                className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-0.5"
              >
                <Camera size={18} />
                Take Photo
              </button>
              <button
                id="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5"
              >
                <Upload size={18} />
                Upload
              </button>
            </div>

            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

            {error && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-4">
              💡 Tip: Clear, well-lit photos give more accurate results
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          {isScanning ? (
            <div className="p-6">
              <img src={image} alt="Scanned waste" className="w-full h-64 object-contain rounded-xl bg-gray-50 dark:bg-gray-900 mb-6" />
              <div className="flex flex-col items-center py-6">
                <div className="relative mb-4">
                  <div className="w-16 h-16 border-4 border-green-200 dark:border-green-900 border-t-green-600 rounded-full animate-spin" />
                  <Sparkles size={20} className="absolute inset-0 m-auto text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Gemini is analyzing...</h3>
                <p className="text-sm text-gray-500 text-center">
                  AI is identifying the material, recyclability, and disposal instructions
                </p>
                <div className="mt-4 flex gap-1">
                  {['Identifying...', 'Classifying...', 'Generating tips...'].map((step, i) => (
                    <span key={i} className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-2 py-1 rounded-full animate-pulse" style={{ animationDelay: `${i * 300}ms` }}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <ResultView result={scanResult} image={image} onReset={resetScan} />
          )}
        </div>
      )}
    </div>
  );
};

export default ScannerView;