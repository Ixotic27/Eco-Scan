import React, { useState, useRef } from 'react';
import { X, UploadCloud, Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ScannedItem } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { verifyRecyclingImage, verifyDIYProject } from '../../lib/gemini';
import { isImageHashDuplicate, recordVerifiedImageHash } from '../../lib/db';

interface Props {
  item: ScannedItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const VerificationModal: React.FC<Props> = ({ item, onClose, onSuccess }) => {
  const { verifyRecycling, verifyDIY } = useAppContext();
  
  const [mode, setMode] = useState<'select' | 'recycle' | 'diy'>('select');
  const [images, setImages] = useState<string[]>([]);
  
  // Recycle Stats
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityUnit, setQuantityUnit] = useState<'items'|'kg'|'lbs'>('items');
  
  // DIY Stats
  const [diyMaterials, setDiyMaterials] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hash function for duplicate checking (Basic SHA-256 via Web Crypto API)
  const hashImage = async (base64: string) => {
    const msgUint8 = new TextEncoder().encode(base64.slice(0, 1000)); // hash first 1000 chars for speed
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      if (mode === 'recycle' && images.length >= 1) {
         setError("You only need 1 image for Recycling verification. (Make sure it has a GPS watermark!)");
         return;
      }
      
      newImages.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setImages(prev => [...prev, ev.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleVerifyRecycle = async () => {
    if (images.length === 0) return setError("Please upload an image with a GPS timestamp watermark.");
    setLoading(true);
    setError(null);
    try {
      // 1. Check for Duplicate Image
      const hash = await hashImage(images[0]);
      const isDup = await isImageHashDuplicate(hash);
      if (isDup) throw new Error("Duplicate image detected. This image has already been verified recently.");

      // 2. Gemini Verification 
      const result = await verifyRecyclingImage(images[0], item.result.material, quantity, quantityUnit);
      if (!result.valid) {
        throw new Error(`Verification Failed: ${result.reason}`);
      }

      // 3. Optional: Deduplicate extracted timestamp if one was found
      // (Skipping strict timestamp duplication block for this prototype, but we could add it here.)

      // 4. Record Hash & Commit
      await recordVerifiedImageHash(hash, 'current_user'); // passing dummy user id string for hash owner
      await verifyRecycling(item.id, quantity, quantityUnit, Math.max(result.carbonSavedKg, 0), item.result.points);
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to verify image.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDIY = async () => {
    if (images.length < 2) return setError("Please upload at least 2 images from different angles.");
    if (!diyMaterials) return setError("Please describe the materials you used.");
    
    setLoading(true);
    setError(null);
    try {
      const result = await verifyDIYProject(images, item.result.material, diyMaterials);
      
      if (result.isAIGenerated) {
        throw new Error(`Action Blocked: AI Generation Detected. ${result.reason}`);
      }
      if (!result.valid) {
        throw new Error(`Verification Failed: ${result.reason}`);
      }

      await verifyDIY(item.id);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to verify DIY project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Verify to Earn Points</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {mode === 'select' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">How did you process this {item.result.material}?</p>
              
              <button onClick={() => setMode('recycle')} className="w-full relative overflow-hidden group p-4 border-2 border-green-200 dark:border-green-800 rounded-xl hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 text-left transition-all">
                <h4 className="font-bold text-green-800 dark:text-green-300">♻️ Dropped in Recycling Bin</h4>
                <p className="text-xs text-green-700/80 dark:text-green-500 mt-1">Requires an image containing a GPS/Timestamp watermark from a mapping camera app.</p>
              </button>

              <button onClick={() => setMode('diy')} className="w-full relative overflow-hidden group p-4 border-2 border-amber-200 dark:border-amber-800 rounded-xl hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-left transition-all">
                <h4 className="font-bold text-amber-800 dark:text-amber-300">🛠️ Upcycled / DIY Project</h4>
                <p className="text-xs text-amber-700/80 dark:text-amber-500 mt-1">Requires multiple photos. Project will be posted to the Community Feed for 3 upvotes.</p>
              </button>
            </div>
          )}

          {(mode === 'recycle' || mode === 'diy') && (
             <div className="space-y-4">
               {error && (
                 <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex gap-2 items-start border border-red-200">
                   <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                   <p>{error}</p>
                 </div>
               )}

               {mode === 'recycle' && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Quantity Discarded</label>
                      <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Unit</label>
                      <select value={quantityUnit} onChange={e => setQuantityUnit(e.target.value as any)} className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="items">Items</option>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="lbs">Pounds (lbs)</option>
                      </select>
                    </div>
                  </div>
               )}

               {mode === 'diy' && (
                 <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">What other materials did you use?</label>
                    <textarea 
                      placeholder="e.g. Hot glue, paint, cardboard..." 
                      value={diyMaterials} 
                      onChange={e => setDiyMaterials(e.target.value)} 
                      className="w-full mt-1 p-2 h-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" 
                    />
                 </div>
               )}

               <div>
                 <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                   {mode === 'recycle' ? "Upload GPS Watermarked Photo (1 required)" : "Upload Photos (Min. 2 angles required)"}
                 </label>
                 
                 <div className="mt-2 grid grid-cols-3 gap-2">
                   {images.map((img, i) => (
                     <div key={i} className="aspect-square relative rounded-lg overflow-hidden border border-gray-200">
                       <img src={img} alt="upload preview" className="w-full h-full object-cover" />
                       <button onClick={() => setImages(prev => prev.filter((_, idx)=>idx!==i))} className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white hover:bg-black/80"><X size={12}/></button>
                     </div>
                   ))}
                   {(mode === 'diy' || images.length === 0) && (
                     <button onClick={() => fileInputRef.current?.click()} className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                       <Camera size={20} />
                       <span className="text-[10px] font-medium">Add Photo</span>
                     </button>
                   )}
                 </div>
                 <input type="file" accept="image/*" multiple={mode === 'diy'} ref={fileInputRef} onChange={handleFileChange} className="hidden" />
               </div>

               <div className="pt-4 flex gap-3">
                 <button disabled={loading} onClick={() => { setMode('select'); setImages([]); setError(null); }} className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Back</button>
                 <button disabled={loading} onClick={mode === 'recycle' ? handleVerifyRecycle : handleVerifyDIY} className="flex-1 flex justify-center items-center gap-2 font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all shadow-md px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                   {loading ? <><Loader2 size={18} className="animate-spin" /> Verifying AI...</> : <><CheckCircle size={18} /> Submit for Verification</>}
                 </button>
               </div>
             </div>
          )}
        </div>

      </div>
    </div>
  );
};
