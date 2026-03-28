export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  points: number;
  scannedItems: number;
  recycledItems: number;
  co2Saved?: number; // Total kg of CO2 saved
  dailyVerifications?: number; // Count of today's verifications (max 5)
  lastVerificationDate?: string; // e.g. "2026-03-29" to track daily limit resets
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
  diyIdea?: string;
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
  recycled: boolean; // Legacy flag, kept for backward compatibility
  status?: 'pending' | 'verified_recycled' | 'verified_diy' | 'pending_community';
  quantity?: number;
  quantityUnit?: 'items' | 'kg' | 'lbs';
  co2Saved?: number; // Calculated CO2 saved in kg for this specific verification
}

export interface CommunityDIYPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  originalScanId: string;
  originalMaterial: string;
  diyImages: string[];
  materialsUsed: string;
  date: string;
  upvotes: number;
  votedUserIds: string[];
  status: 'pending_community' | 'approved';
}

export interface RecycleVerificationResult {
  valid: boolean;
  confidence: number;
  extractedTimestamp?: string;
  carbonSavedKg: number;
  reason: string;
}

export interface DIYVerificationResult {
  valid: boolean;
  confidence: number;
  isAIGenerated: boolean;
  reason: string;
}