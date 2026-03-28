import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  getOrCreateUser,
  updateUserInFirestore,
  getUserScans,
  saveScannedItem,
  verifyRecycledItem,
  verifyDIYItem,
  subscribeToLeaderboard,
  getRewardProducts,
  redeemReward,
  seedFirestoreIfEmpty,
} from '../lib/db';
import { User, ScannedItem, RewardProduct, LeaderboardEntry } from '../types';

interface AppContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthLoading: boolean;
  scannedItems: ScannedItem[];
  rewardProducts: RewardProduct[];
  leaderboard: LeaderboardEntry[];
  theme: 'light' | 'dark';
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  addPoints: (points: number) => Promise<void>;
  addScannedItem: (item: ScannedItem) => Promise<void>;
  verifyRecycling: (scanId: string, quantity: number, quantityUnit: 'items' | 'kg' | 'lbs', co2Saved: number, pointsEarned: number) => Promise<void>;
  verifyDIY: (scanId: string) => Promise<void>;
  redeemProduct: (productId: string) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [rewardProducts, setRewardProducts] = useState<RewardProduct[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('ecoscan-theme') as 'light' | 'dark') || 'light';
  });

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const appUser = await getOrCreateUser(
          fbUser.uid,
          fbUser.displayName ?? 'Eco Explorer',
          fbUser.email ?? '',
          fbUser.photoURL ?? ''
        );
        setUser(appUser);
        const scans = await getUserScans(fbUser.uid);
        setScannedItems(scans);
        await seedFirestoreIfEmpty();
      } else {
        setUser(null);
        setScannedItems([]);
      }
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    getRewardProducts().then(setRewardProducts);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToLeaderboard(setLeaderboard);
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    localStorage.setItem('ecoscan-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const addPoints = useCallback(async (points: number) => {
    if (!user || !firebaseUser) return;
    const newPoints = user.points + points;
    setUser(prev => prev ? { ...prev, points: newPoints } : prev);
    await updateUserInFirestore(firebaseUser.uid, { points: newPoints });
  }, [user, firebaseUser]);

  const addScannedItem = useCallback(async (item: ScannedItem) => {
    if (!user || !firebaseUser) return;
    const newScannedCount = user.scannedItems + 1;
    
    // DELIBERATELY NOT ADDING POINTS ON SCAN (Proof-of-Work update)
    const assignedStatus = item.status || 'pending';
    
    setScannedItems(prev => [{...item, status: assignedStatus}, ...prev]);
    setUser(prev => prev ? { ...prev, scannedItems: newScannedCount } : prev);
    
    const firestoreId = await saveScannedItem(firebaseUser.uid, {...item, status: assignedStatus});
    setScannedItems(prev => prev.map(s => s.id === item.id ? { ...s, id: firestoreId } : s));
    await updateUserInFirestore(firebaseUser.uid, { scannedItems: newScannedCount });
  }, [user, firebaseUser]);

  const verifyRecycling = useCallback(async (scanId: string, quantity: number, quantityUnit: 'items' | 'kg' | 'lbs', co2Saved: number, pointsEarned: number) => {
    if (!user || !firebaseUser) return;
    
    // Check Daily Limit (Max 5 per day to prevent spam bots)
    const today = new Date().toISOString().split('T')[0];
    let newDailyCount = (user.dailyVerifications || 0) + 1;
    if (user.lastVerificationDate !== today) newDailyCount = 1;
    if (newDailyCount > 5) {
      throw new Error("Daily limit reached! You can only verify 5 items per day.");
    }

    const newRecycledCount = user.recycledItems + 1;
    const newPoints = user.points + pointsEarned;
    const newCo2 = (user.co2Saved || 0) + co2Saved;

    // Local State
    setScannedItems(prev => prev.map(item => item.id === scanId ? { 
      ...item, 
      status: 'verified_recycled', 
      recycled: true, 
      quantity, 
      quantityUnit, 
      co2Saved 
    } : item));
    
    setUser(prev => prev ? { 
      ...prev, 
      recycledItems: newRecycledCount, 
      points: newPoints, 
      co2Saved: newCo2,
      dailyVerifications: newDailyCount,
      lastVerificationDate: today
    } : prev);

    // Database
    await verifyRecycledItem(firebaseUser.uid, scanId, quantity, quantityUnit, co2Saved);
    await updateUserInFirestore(firebaseUser.uid, { 
      recycledItems: newRecycledCount, 
      points: newPoints,
      co2Saved: newCo2,
      dailyVerifications: newDailyCount,
      lastVerificationDate: today
    });
  }, [user, firebaseUser]);

  const verifyDIY = useCallback(async (scanId: string) => {
    if (!user || !firebaseUser) return;

    // Check Daily Limit
    const today = new Date().toISOString().split('T')[0];
    let newDailyCount = (user.dailyVerifications || 0) + 1;
    if (user.lastVerificationDate !== today) newDailyCount = 1;
    if (newDailyCount > 5) {
      throw new Error("Daily limit reached! You can only verify 5 items per day.");
    }

    // Move to pending community state. Points are awarded once it reaches 3 upvotes.
    setScannedItems(prev => prev.map(item => item.id === scanId ? { ...item, status: 'pending_community' } : item));
    
    setUser(prev => prev ? { 
      ...prev, 
      dailyVerifications: newDailyCount,
      lastVerificationDate: today
    } : prev);

    await verifyDIYItem(firebaseUser.uid, scanId); // Will update to state in DB
    await updateUserInFirestore(firebaseUser.uid, { 
      dailyVerifications: newDailyCount,
      lastVerificationDate: today
    });
  }, [user, firebaseUser]);

  const redeemProduct = useCallback(async (productId: string) => {
    if (!user || !firebaseUser) return;
    const product = rewardProducts.find(p => p.id === productId);
    if (!product || user.points < product.pointsCost) return;
    const newPoints = user.points - product.pointsCost;
    setUser(prev => prev ? { ...prev, points: newPoints } : prev);
    await redeemReward(firebaseUser.uid, productId, product.pointsCost);
  }, [user, firebaseUser, rewardProducts]);

  const updateUser = useCallback(async (data: Partial<User>) => {
    if (!user || !firebaseUser) return;
    setUser(prev => prev ? { ...prev, ...data } : prev);
    await updateUserInFirestore(firebaseUser.uid, data);
  }, [user, firebaseUser]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <AppContext.Provider value={{
      user,
      firebaseUser,
      isAuthLoading,
      scannedItems,
      rewardProducts,
      leaderboard,
      theme,
      signInWithGoogle,
      signOut,
      addPoints,
      addScannedItem,
      verifyRecycling,
      verifyDIY,
      redeemProduct,
      updateUser,
      toggleTheme,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}