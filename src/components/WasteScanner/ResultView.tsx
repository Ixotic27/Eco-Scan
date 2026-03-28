import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, XCircle, RefreshCw, MapPin, Leaf, Zap, Trash2, Recycle, Lightbulb, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScanResult } from '../../types';

interface ResultViewProps {
  result: ScanResult | null;
  image: string;
  onReset: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  plastic:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  paper:      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  glass:      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  metal:      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  organic:    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  electronic: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  textile:    'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  hazardous:  'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  other:      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const ResultView: React.FC<ResultViewProps> = ({ result, image, onReset }) => {
  const [ytVideoId, setYtVideoId] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to fetch a top YouTube video for the DIY idea if the user has youtube API enabled
    if (result && result.diyIdea) {
      const fetchYT = async () => {
        try {
          const query = encodeURIComponent(`DIY upcycle repurpose ${result.material}`);
          const key = import.meta.env.VITE_GEMINI_API_KEY;
          const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${query}&type=video&key=${key}`);
          if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
              setYtVideoId(data.items[0].id.videoId);
            }
          }
        } catch (e) {
          console.error("YT fetch failed, falling back to link", e);
        }
      };
      fetchYT();
    }
  }, [result]);

  if (!result) return null;

  const isRecyclable = result.isRecyclable;
  const confidencePercent = Math.round(result.confidence * 100);
  const categoryColor = CATEGORY_COLORS[result.category] || CATEGORY_COLORS.other;

  return (
    <div className="p-6 space-y-4">
      {/* Image */}
      <div className="relative">
        <img
          src={image}
          alt="Scanned waste item"
          className="w-full h-56 object-contain rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700"
        />
        {/* Gemini badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-full">
          <Zap size={11} className="text-yellow-400" />
          <span>Gemini AI</span>
        </div>
      </div>

      {/* Result Banner */}
      <div className={`rounded-xl p-4 ${isRecyclable ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
        <div className="flex items-start gap-3">
          {isRecyclable
            ? <CheckCircle size={24} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            : <XCircle size={24} className="text-red-600 dark:text-red-400 flex-shrink-0" />
          }
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${isRecyclable ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
              {isRecyclable ? '✅ Recyclable!' : '❌ Not Recyclable'}
            </h3>
            <p className={`text-sm mt-0.5 ${isRecyclable ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {result.material}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 mb-1">Confidence</p>
          <p className="text-lg font-bold text-gray-800 dark:text-white">{confidencePercent}%</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center border border-green-100 dark:border-green-800">
          <p className="text-xs text-gray-500 mb-1">Points</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-400">+{result.points}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-800">
          <p className="text-xs text-gray-500 mb-1">CO₂ Impact</p>
          <p className="text-sm font-bold text-blue-700 dark:text-blue-400 leading-tight">{result.carbonFootprint}</p>
        </div>
      </div>

      {/* Category & Disposal */}
      <div className="flex gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${categoryColor}`}>
          <Leaf size={11} />
          {result.category.charAt(0).toUpperCase() + result.category.slice(1)}
        </span>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {isRecyclable ? <Recycle size={11} /> : <Trash2 size={11} />}
          {result.disposalMethod}
        </span>
      </div>

      {/* AI Tips */}
      {result.tips && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1 text-sm">💡 AI Disposal Tips</h4>
          <p className="text-blue-700 dark:text-blue-400 text-sm leading-relaxed">{result.tips}</p>
        </div>
      )}

      {/* DIY / Upcycling Idea */}
      {result.diyIdea && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 overflow-hidden">
          <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2 text-sm flex items-center gap-1.5">
            <Lightbulb size={16} />
            Creative Upcycling Idea
          </h4>
          <p className="text-amber-700 dark:text-amber-400 text-sm leading-relaxed mb-4">{result.diyIdea}</p>
          
          {ytVideoId ? (
            <div className="w-full rounded-xl overflow-hidden shadow-inner bg-black aspect-video relative">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${ytVideoId}`}
                title="DIY Tutorial"
                className="absolute inset-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <a 
              href={`https://www.youtube.com/results?search_query=DIY+upcycle+repurpose+${encodeURIComponent(result.material)}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff0000]/10 text-[#ff0000] dark:text-[#ff4d4d] font-semibold text-xs rounded-xl hover:bg-[#ff0000]/20 transition-colors w-full justify-center"
            >
              <Youtube size={16} /> Watch Tutorials on YouTube
            </a>
          )}
        </div>
      )}

      {/* CTA */}
      {isRecyclable && (
        <Link
          to="/map"
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all hover:shadow-lg hover:shadow-green-500/20"
        >
          <MapPin size={18} />
          Find Recycling Centers Nearby
          <ArrowRight size={18} />
        </Link>
      )}

      {/* Reset */}
      <button
        onClick={onReset}
        className="w-full border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
      >
        <RefreshCw size={16} />
        Scan Another Item
      </button>
    </div>
  );
};

export default ResultView;