export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  points: number;
  scannedItems: number;
  recycledItems: number;
}

export interface RecyclingCenter {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  materials: string[];
  hours: string;
  type: 'recycling' | 'dumping' | 'hazardous' | 'ewaste' | 'composting';
  contact?: string;
  distance?: number; // km, computed at runtime
}

export interface ScanResult {
  category: 'plastic' | 'paper' | 'glass' | 'metal' | 'organic' | 'electronic' | 'textile' | 'hazardous' | 'other';
  material: string;
  isRecyclable: boolean;
  confidence: number;
  tips: string;
  points: number;
  carbonFootprint: string;
  disposalMethod: string;
  geminiModel?: string;
}

export interface RewardProduct {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  imageUrl: string;
  category?: string;
  stock?: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  rank: number;
  avatar?: string;
}

export interface ScannedItem {
  id: string;
  imageUrl: string;
  result: ScanResult;
  date: string;
  recycled: boolean;
}