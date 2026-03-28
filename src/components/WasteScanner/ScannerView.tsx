import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Sparkles, AlertCircle, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { classifyWaste } from '../../lib/gemini';
import { ScannedItem, ScanResult } from '../../types';
import ResultView from './ResultView';

const ScannerView: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live camera state
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { addScannedItem } = useAppContext();

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      setShowCamera(true);
      // Need a small timeout to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 50);
    } catch (err) {
      setError('Could not access camera. Please check permissions or use Upload.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      if (!vw || !vh) return;

      // Downscale to 800px max to prevent massive base64 payloads
      // (Modern phones capture 4K video, which crashes Gemini/Vercel)
      const maxDim = 800;
      let w = vw, h = vh;
      if (w > maxDim || h > maxDim) {
         if (w > h) { h = Math.round(h * (maxDim / w)); w = maxDim; }
         else { w = Math.round(w * (maxDim / h)); h = maxDim; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality is enough for AI
        stopCamera();
        setImage(dataUrl);
        analyzeImage(dataUrl);
      }
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    setError(null);
    const img = new Image();
    img.onload = () => {
      const maxDim = 800;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * (maxDim / w)); w = maxDim; }
        else { w = Math.round(w * (maxDim / h)); h = maxDim; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        // Export as JPEG at 70% quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setImage(dataUrl);
        analyzeImage(dataUrl);
      }
    };
    // Load the image source from file
    const reader = new FileReader();
    reader.onloadend = () => {
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
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
      console.error('Scan error:', err);
      if (err instanceof Error && (err.message.includes('API_KEY') || err.message.includes('API key'))) {
        setError('Invalid Gemini API key. Please check your configuration.');
      } else if (err instanceof Error && err.message.includes('SAFETY')) {
        setError('Image was flagged by safety filters. Please try a different image.');
      } else {
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(`AI analysis failed: ${errMsg}`);
      }
      setImage(null);
    } finally {
      setIsScanning(false);
    }
  };

  const resetScan = () => {
    setImage(null);
    setScanResult(null);
    setError(null);
  };

  // 1. Result/Scanning View
  if (image) {
    return (
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        {isScanning ? (
          <div className="p-6">
            <img src={image} alt="Waste item" className="w-full h-60 object-contain rounded-xl bg-gray-50 dark:bg-gray-900 mb-6" />
            <div className="flex flex-col items-center py-4">
              <div className="relative mb-4">
                <div className="w-16 h-16 border-4 border-green-200 dark:border-green-900 border-t-green-600 rounded-full animate-spin" />
                <Sparkles size={20} className="absolute inset-0 m-auto text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Gemini AI is analyzing...</h3>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                Identifying material type, recyclability, CO₂ impact and disposal tips
              </p>
              <div className="mt-4 flex gap-1 flex-wrap justify-center">
                {['Identifying material...', 'Checking recyclability...', 'Generating tips...'].map((step, i) => (
                  <span key={i} className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-1 rounded-full animate-pulse" style={{ animationDelay: `${i * 400}ms` }}>
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
    );
  }

  // 2. Live Camera View
  if (showCamera) {
    return (
      <div className="max-w-lg mx-auto bg-black rounded-2xl shadow-xl overflow-hidden relative">
        <video 
          ref={videoRef} 
          playsInline 
          className="w-full h-96 object-cover"
        />
        <button 
          onClick={stopCamera}
          className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
        >
          <X size={20} />
        </button>
        <div className="absolute font-bold text-white/50 top-4 left-4 text-sm tracking-widest drop-shadow-md">
          ECOSCAN Live
        </div>
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center pb-8">
          <button
            onClick={capturePhoto}
            className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-xl"
          >
            <div className="w-12 h-12 bg-white rounded-full border border-gray-100"></div>
          </button>
        </div>
      </div>
    );
  }

  // 3. Initial View (Upload / Start Camera)
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} />
            <span className="text-sm font-medium opacity-90">Powered by Gemini 1.5 Flash</span>
          </div>
          <h2 className="text-2xl font-bold">Scan Waste Item</h2>
          <p className="opacity-80 text-sm mt-1">Upload or take a photo for instant AI classification</p>
        </div>

        <div className="p-6">
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => uploadInputRef.current?.click()}
            className="bg-gray-50 dark:bg-gray-900 rounded-xl p-10 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer group mb-4"
          >
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Camera size={28} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Drop image here or click to upload</p>
            <p className="text-gray-400 text-xs">Supports JPG, PNG, WEBP</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              id="camera-capture-btn"
              onClick={startCamera}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all hover:shadow-lg hover:shadow-green-500/25 hover:-translate-y-0.5"
            >
              <Camera size={18} />
              Take Photo
            </button>

            <button
              id="upload-file-btn"
              onClick={() => uploadInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
            >
              <Upload size={18} />
              Upload File
            </button>
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                <button onClick={() => setError(null)} className="text-xs text-red-500 underline mt-1">Dismiss</button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-1">
            <p className="text-center text-xs text-gray-400">
              💡 <strong>Tips for best results:</strong>
            </p>
            <ul className="text-xs text-gray-400 space-y-0.5 text-center">
              <li>• Place item on a plain background</li>
              <li>• Good lighting — avoid shadows</li>
              <li>• Fill the frame with the item</li>
            </ul>
          </div>
        </div>
      </div>

      {error && !showCamera && (
        <button
          onClick={resetScan}
          className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      )}
    </div>
  );
};

export default ScannerView;
