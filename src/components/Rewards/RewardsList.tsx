import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Award, ShoppingBag } from 'lucide-react';

const RewardsList: React.FC = () => {
  const { rewardProducts, user, redeemProduct } = useAppContext();
  
  const handleRedeem = (productId: string) => {
    redeemProduct(productId);
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Rewards Marketplace</h2>
          <div className="bg-green-100 px-3 py-1 rounded-full flex items-center">
            <Award size={16} className="text-green-600 mr-1" />
            <span className="text-green-700 font-medium">{user.points} points</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewardProducts.map(product => {
            const canRedeem = user.points >= product.pointsCost;
            
            return (
              <div 
                key={product.id} 
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-48 overflow-hidden bg-gray-200">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-800">{product.name}</h3>
                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      {product.pointsCost} points
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                  
                  <button
                    onClick={() => handleRedeem(product.id)}
                    disabled={!canRedeem}
                    className={`mt-4 w-full py-2 px-4 rounded-lg flex items-center justify-center transition-colors ${
                      canRedeem
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag size={16} className="mr-2" />
                    {canRedeem ? 'Redeem Now' : 'Not Enough Points'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-800">How to Earn More Points</h3>
          <ul className="mt-2 text-sm text-blue-700 space-y-2">
            <li className="flex items-start">
              <span className="h-5 w-5 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 mr-2 flex-shrink-0">1</span>
              <span>Scan recyclable items (1 point each)</span>
            </li>
            <li className="flex items-start">
              <span className="h-5 w-5 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 mr-2 flex-shrink-0">2</span>
              <span>Recycle items at recycling centers (5 points each)</span>
            </li>
            <li className="flex items-start">
              <span className="h-5 w-5 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 mr-2 flex-shrink-0">3</span>
              <span>Invite friends to join EcoScan (10 points per referral)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RewardsList;