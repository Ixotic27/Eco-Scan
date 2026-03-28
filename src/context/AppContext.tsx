import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  getOrCreateUser,
  updateUserInFirestore,
  getUserScans,
  saveScannedItem,
  markItemRecycled,
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
  markAsRecycled: (scanId: string) => Promise<void>;
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
        // Load user's scan history
        const scans = await getUserScans(fbUser.uid);
        setScannedItems(scans);
        // Seed Firestore data on first load
        await seedFirestoreIfEmpty();
      } else {
        setUser(null);
        setScannedItems([]);
      }
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Load rewards from Firestore
  useEffect(() => {
    if (!user) return;
    getRewardProducts().then(setRewardProducts);
  }, [user]);

  // Real-time leaderboard subscription
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToLeaderboard(setLeaderboard);
    return unsubscribe;
  }, [user]);

  // Apply theme
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
    const newPoints = user.points + item.result.points;
    setScannedItems(prev => [item, ...prev]);
    setUser(prev => prev ? { ...prev, scannedItems: newScannedCount, points: newPoints } : prev);
    // Save to Firestore and get the real ID back
    const firestoreId = await saveScannedItem(firebaseUser.uid, item);
    // Update the item's id to match Firestore doc id
    setScannedItems(prev => prev.map(s => s.id === item.id ? { ...s, id: firestoreId } : s));
    await updateUserInFirestore(firebaseUser.uid, { scannedItems: newScannedCount, points: newPoints });
  }, [user, firebaseUser]);

  const markAsRecycled = useCallback(async (scanId: string) => {
    if (!user || !firebaseUser) return;
    const bonusPoints = 5;
    const newRecycledCount = user.recycledItems + 1;
    const newPoints = user.points + bonusPoints;
    setScannedItems(prev => prev.map(item => item.id === scanId ? { ...item, recycled: true } : item));
    setUser(prev => prev ? { ...prev, recycledItems: newRecycledCount, points: newPoints } : prev);
    await markItemRecycled(firebaseUser.uid, scanId);
    await updateUserInFirestore(firebaseUser.uid, { recycledItems: newRecycledCount, points: newPoints });
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
      markAsRecycled,
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