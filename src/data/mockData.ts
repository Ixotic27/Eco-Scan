import EcoBag from '@/assets/rewards/SJ117845_grande.webp';
import RecycledNotebook from '@/assets/rewards/imprinted-recycled-earth-friendly-notebook-jotters-natural-chip-ej2-enhanced.webp';
import RecycledBottle from '@/assets/rewards/WBSGN_3Sprouts_Recycled_Water_Bottle_Green_1_fe8a085a-d96b-4dfc-870e-e67bf515f8ad.webp';
import EcoStickers from '@/assets/rewards/81X8-NSf-gL.jpg';

import { RecyclingCenter, RewardProduct, LeaderboardEntry, ScanResult } from '../types';

export const mockRecyclingCenters: RecyclingCenter[] = [
  {
    id: '1',
    name: 'Delhi Recycling Hub',
    address: 'Industrial Area, Phase 1, New Delhi',
    latitude: 28.6139,
    longitude: 77.2090,
    materials: [
      'Household Batteries',
      'Car Batteries',
      'Paper',
      'Cardboard',
      'Glass',
      'Aluminum Cans',
      'Steel Cans',
      'PET Bottles',
      'HDPE Containers'
    ],
    hours: 'Mon-Sat: 9AM-6PM',
    type: 'recycling',
    contact: '+91-11-2345-6789'
  },
  {
    id: '2',
    name: 'Mumbai Waste Management',
    address: 'Andheri East, Mumbai',
    latitude: 19.0760,
    longitude: 72.8777,
    materials: [
      'E-waste',
      'Computers',
      'Phones',
      'Appliances',
      'Copper Wire',
      'Circuit Boards',
      'Batteries',
      'Solar Panels',
      'Metal Scraps'
    ],
    hours: 'Mon-Fri: 8AM-5PM',
    type: 'recycling',
    contact: '+91-22-3456-7890'
  },
  {
    id: '3',
    name: 'Bangalore Green Solutions',
    address: 'Electronic City, Bangalore',
    latitude: 12.9716,
    longitude: 77.5946,
    materials: [
      'Newspapers',
      'Magazines',
      'Office Paper',
      'Glass Bottles',
      'Jars',
      'Food Waste',
      'Garden Waste',
      'Tetra Paks',
      'Metal Cans'
    ],
    hours: 'Mon-Sun: 10AM-7PM',
    type: 'recycling',
    contact: '+91-80-4567-8901'
  },
  {
    id: '4',
    name: 'Ghazipur Landfill',
    address: 'Ghazipur, Delhi',
    latitude: 28.6275,
    longitude: 77.3289,
    materials: [
      'General Waste',
      'Construction Debris',
      'Mixed Waste',
      'Non-recyclable Plastics'
    ],
    hours: '24/7',
    type: 'dumping'
  },
  {
    id: '5',
    name: 'Deonar Dumping Ground',
    address: 'Deonar, Mumbai',
    latitude: 19.0549,
    longitude: 72.9129,
    materials: [
      'Municipal Waste',
      'Industrial Waste',
      'Hazardous Materials',
      'Chemical Waste'
    ],
    hours: '24/7',
    type: 'dumping'
  },
  {
    id: '6',
    name: 'Chennai Recyclers',
    address: 'Ambattur Industrial Estate, Chennai',
    latitude: 13.0827,
    longitude: 80.2707,
    materials: [
      'Plastic Bottles',
      'Metal Items',
      'Electronics',
      'Batteries',
      'Appliances',
      'Computers',
      'Mobile Phones',
      'Cables',
      'Light Bulbs'
    ],
    hours: 'Mon-Sat: 9AM-5PM',
    type: 'recycling',
    contact: '+91-44-5678-9012'
  }
];

export const mockRewardProducts: RewardProduct[] = [
  {
    id: '1',
    name: 'Recycled Shopping Bag',
    description: 'Large recycled gift bag perfect for shopping and everyday use',
    pointsCost: 100,
    imageUrl: 'https://stephenjosephgifts.com/cdn/shop/products/LGB1132_1024x1024.jpg'
  },
  {
    id: '2',
    name: 'Eco-Friendly Notebook',
    description: 'Eco-friendly jotter made from 100% recycled materials',
    pointsCost: 150,
    imageUrl: 'https://www.customearthpromos.com/images/products/eco-friendly-jotters_1.jpg'
  },
  {
    id: '3',
    name: 'Recycled Water Bottle',
    description: 'Green recycled water bottle for sustainable hydration',
    pointsCost: 200,
    imageUrl: 'https://www.3sprouts.com/cdn/shop/products/3sprouts-water-bottle-green_1800x1800.jpg'
  },
  {
    id: '4',
    name: 'Environment Protection Stickers',
    description: 'Set of eco-themed stickers made from recycled materials',
    pointsCost: 50,
    imageUrl: 'https://m.media-amazon.com/images/I/81TxTGP5JVL._AC_SL1500_.jpg'
  }
];

export const mockLeaderboard: LeaderboardEntry[] = [
  { id: '1', name: 'Eco Explorer', points: 450, rank: 1 }
];

const recyclableMaterials = [
  // Plastics
  { name: 'PET Plastic (Type 1)', tips: 'Commonly used in beverage bottles. Remove caps and rinse before recycling.' },
  { name: 'HDPE Plastic (Type 2)', tips: 'Used in milk jugs and detergent bottles. Rinse thoroughly.' },
  { name: 'LDPE Plastic (Type 4)', tips: 'Found in squeezable bottles and shopping bags. Check local guidelines.' },
  { name: 'PP Plastic (Type 5)', tips: 'Used in food containers and bottle caps. Clean before recycling.' },
  
  // Paper Products
  { name: 'Newspaper', tips: 'Keep dry and bundle together. Remove plastic bags.' },
  { name: 'Cardboard', tips: 'Break down boxes and keep dry. Remove tape and staples.' },
  { name: 'Office Paper', tips: 'Remove plastic windows from envelopes. Keep paper clips separate.' },
  { name: 'Magazines', tips: 'Glossy paper is recyclable. Remove plastic wrapping.' },
  
  // Glass
  { name: 'Clear Glass', tips: 'Rinse and remove any non-glass parts like caps or corks.' },
  { name: 'Colored Glass', tips: 'Different colors can be recycled together unless specified otherwise.' },
  
  // Metals
  { name: 'Aluminum Cans', tips: 'Rinse and crush to save space. Labels can stay on.' },
  { name: 'Steel Cans', tips: 'Remove paper labels if possible. Rinse thoroughly.' },
  { name: 'Scrap Metal', tips: 'Separate different types of metals for better recycling.' },
  
  // Electronics
  { name: 'Batteries', tips: 'Different types need different recycling methods. Never put in regular trash.' },
  { name: 'Mobile Phones', tips: 'Remove SIM card and battery if possible. Clear personal data.' },
  { name: 'Computers', tips: 'Back up data and remove hard drives before recycling.' },
  
  // Others
  { name: 'Tetra Pak', tips: 'Rinse and flatten. Check if accepted in your area.' },
  { name: 'Light Bulbs', tips: 'LED and CFL bulbs need special recycling. Handle with care.' }
];

const nonRecyclableMaterials = [
  // Plastics
  { name: 'PVC Plastic (Type 3)', tips: 'Not recyclable in most programs. Consider alternatives.' },
  { name: 'Polystyrene (Type 6)', tips: 'Includes Styrofoam. Very difficult to recycle, avoid if possible.' },
  { name: 'Mixed Plastic (Type 7)', tips: 'Usually not recyclable. Look for recyclable alternatives.' },
  
  // Contaminated Items
  { name: 'Food-contaminated containers', tips: 'Food residue makes recycling impossible. Clean thoroughly or dispose.' },
  { name: 'Greasy pizza boxes', tips: 'The greasy part cannot be recycled. Cut off clean portions.' },
  { name: 'Used paper towels', tips: 'Contaminated with cleaning products or food waste.' },
  
  // Composite Materials
  { name: 'Chip bags', tips: 'Made of multiple materials fused together. Cannot be separated.' },
  { name: 'Bubble wrap', tips: 'Not recyclable in regular programs. Reuse when possible.' },
  { name: 'Laminated paper', tips: 'Paper-plastic combination cannot be separated.' },
  
  // Hazardous
  { name: 'Paint cans', tips: 'Contains hazardous materials. Requires special disposal.' },
  { name: 'Motor oil containers', tips: 'Contaminated with oil. Dispose at auto parts stores.' },
  { name: 'Chemical containers', tips: 'May contain harmful residues. Follow disposal guidelines.' }
];

const recyclingJokes = [
  "Why did the recycling bin feel confident? Because it was full of potential!",
  "What did the aluminum can say to the plastic bottle? 'You're soda pressing!'",
  "Why don't recycling bins tell jokes? They don't want to waste them!",
  "What's a recycler's favorite day? Second Monday!",
  "Why did the plastic bottle join the gym? To get shredded!"
];

export function mockClassifyWaste(imageUrl: string): Promise<ScanResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const isRecyclable = Math.random() < 0.7;
      const materials = isRecyclable ? recyclableMaterials : nonRecyclableMaterials;
      const material = materials[Math.floor(Math.random() * materials.length)];
      const joke = recyclingJokes[Math.floor(Math.random() * recyclingJokes.length)];
      
      resolve({
        isRecyclable,
        confidence: 0.7 + Math.random() * 0.25,
        material: material.name,
        tips: `${material.tips}\n\nHere's an eco-friendly joke: ${joke}`,
        points: isRecyclable ? 1 : 0
      });
    }, 1500);
  });
}