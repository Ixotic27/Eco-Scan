import React, { useState } from 'react';
import { Gift, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Rewards: React.FC = () => {
  const { rewardProducts, user, redeemProduct } = useAppContext();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const handleRedeem = async (productId: string, cost: number) => {
    if (!user || user.points < cost) {
      setRedeemError('Not enough points!');
      setTimeout(() => setRedeemError(null), 3000);
      return;
    }
    setRedeeming(productId);
    setRedeemError(null);
    try {
      await redeemProduct(productId);
      setRedeemed(productId);
      setTimeout(() => setRedeemed(null), 3000);
    } catch {
      setRedeemError('Redemption failed. Please try again.');
      setTimeout(() => setRedeemError(null), 3000);
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift size={22} className="text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Rewards</h1>
        </div>
        <div className="bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full">
          <span className="text-green-700 dark:text-green-400 font-bold">{user?.points ?? 0} pts</span>
        </div>
      </div>

      {redeemError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle size={16} className="text-red-500" />
          <p className="text-red-700 dark:text-red-400 text-sm">{redeemError}</p>
        </div>
      )}

      {rewardProducts.length === 0 ? (
        <div className="text-center py-16">
          <Gift size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Rewards loading from Firestore...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rewardProducts.map(product => {
            const canAfford = (user?.points ?? 0) >= product.pointsCost;
            const isRedeeming = redeeming === product.id;
            const justRedeemed = redeemed === product.id;

            return (
              <div
                key={product.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all ${
                  canAfford ? 'border-gray-100 dark:border-gray-700' : 'border-gray-100 dark:border-gray-700 opacity-80'
                }`}
              >
                <div className="relative h-44 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&q=80'; }}
                  />
                  <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {product.pointsCost} pts
                  </div>
                  {product.category && (
                    <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full capitalize">
                      {product.category}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-800 dark:text-white mb-1">{product.name}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-3 leading-relaxed">{product.description}</p>

                  <button
                    id={`redeem-${product.id}`}
                    onClick={() => handleRedeem(product.id, product.pointsCost)}
                    disabled={!canAfford || isRedeeming || justRedeemed}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      justRedeemed
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : canAfford
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg hover:-translate-y-0.5'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isRedeeming ? (
                      <><Loader2 size={15} className="animate-spin" /> Redeeming...</>
                    ) : justRedeemed ? (
                      <><CheckCircle size={15} /> Redeemed!</>
                    ) : canAfford ? (
                      <><Gift size={15} /> Redeem for {product.pointsCost} pts</>
                    ) : (
                      `Need ${product.pointsCost - (user?.points ?? 0)} more pts`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Rewards;