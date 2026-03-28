import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { ScannedItem, RecyclingCenter, RewardProduct, LeaderboardEntry, User } from '../types';

// ─── User ────────────────────────────────────────────────────────────────────

export async function getOrCreateUser(uid: string, displayName: string, email: string, photoURL: string): Promise<User> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const newUser: User = {
      id: uid,
      name: displayName || 'Eco Explorer',
      email: email || '',
      avatar: photoURL || '',
      points: 0,
      scannedItems: 0,
      recycledItems: 0,
    };
    await setDoc(ref, { ...newUser, createdAt: serverTimestamp() });
    return newUser;
  }
  return snap.data() as User;
}

export async function updateUserInFirestore(uid: string, data: Partial<User>): Promise<void> {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

// ─── Scan History ─────────────────────────────────────────────────────────────

export async function saveScannedItem(userId: string, item: ScannedItem): Promise<string> {
  const ref = collection(db, 'users', userId, 'scans');
  const docRef = await addDoc(ref, {
    ...item,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getUserScans(userId: string): Promise<ScannedItem[]> {
  const ref = collection(db, 'users', userId, 'scans');
  const q = query(ref, orderBy('createdAt', 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      date: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.date,
    } as ScannedItem;
  });
}

export async function markItemRecycled(userId: string, scanId: string): Promise<void> {
  const ref = doc(db, 'users', userId, 'scans', scanId);
  await updateDoc(ref, { recycled: true, recycledAt: serverTimestamp() });
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export function subscribeToLeaderboard(callback: (entries: LeaderboardEntry[]) => void) {
  const ref = collection(db, 'users');
  const q = query(ref, orderBy('points', 'desc'), limit(20));
  return onSnapshot(q, snap => {
    const entries: LeaderboardEntry[] = snap.docs.map((d, i) => ({
      id: d.id,
      name: d.data().name || 'Anonymous',
      points: d.data().points || 0,
      rank: i + 1,
      avatar: d.data().avatar || '',
    }));
    callback(entries);
  });
}

// ─── Recycling Centers ────────────────────────────────────────────────────────

export async function getRecyclingCenters(): Promise<RecyclingCenter[]> {
  const ref = collection(db, 'recyclingCenters');
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as RecyclingCenter));
}

// ─── Rewards ──────────────────────────────────────────────────────────────────

export async function getRewardProducts(): Promise<RewardProduct[]> {
  const ref = collection(db, 'rewards');
  const q = query(ref, orderBy('pointsCost', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as RewardProduct));
}

export async function redeemReward(userId: string, productId: string, pointsCost: number): Promise<void> {
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User not found');
  const currentPoints: number = snap.data().points ?? 0;
  if (currentPoints < pointsCost) throw new Error('Insufficient points');
  batch.update(userRef, { points: currentPoints - pointsCost, updatedAt: serverTimestamp() });
  const redemptionRef = doc(collection(db, 'users', userId, 'redemptions'));
  batch.set(redemptionRef, { productId, pointsCost, redeemedAt: serverTimestamp() });
  await batch.commit();
}

// ─── Seed Data (run once to populate Firestore) ───────────────────────────────

export async function seedFirestoreIfEmpty(): Promise<void> {
  // Seed recycling centers
  const centersRef = collection(db, 'recyclingCenters');
  const centersSnap = await getDocs(centersRef);
  if (centersSnap.empty) {
    const centers = [
      {
        name: 'Delhi Recycling Hub',
        address: 'Industrial Area, Phase 1, New Delhi',
        latitude: 28.6139,
        longitude: 77.2090,
        materials: ['Batteries', 'Paper', 'Cardboard', 'Glass', 'Aluminum Cans', 'Steel Cans', 'PET Bottles', 'HDPE Containers'],
        hours: 'Mon-Sat: 9AM-6PM',
        type: 'recycling',
        contact: '+91-11-2345-6789',
      },
      {
        name: 'Mumbai Waste Management',
        address: 'Andheri East, Mumbai',
        latitude: 19.0760,
        longitude: 72.8777,
        materials: ['E-waste', 'Computers', 'Phones', 'Appliances', 'Batteries', 'Metal Scraps'],
        hours: 'Mon-Fri: 8AM-5PM',
        type: 'recycling',
        contact: '+91-22-3456-7890',
      },
      {
        name: 'Bangalore Green Solutions',
        address: 'Electronic City, Bangalore',
        latitude: 12.9716,
        longitude: 77.5946,
        materials: ['Newspapers', 'Magazines', 'Office Paper', 'Glass Bottles', 'Food Waste', 'Metal Cans'],
        hours: 'Mon-Sun: 10AM-7PM',
        type: 'recycling',
        contact: '+91-80-4567-8901',
      },
      {
        name: 'Ghazipur Landfill',
        address: 'Ghazipur, Delhi',
        latitude: 28.6275,
        longitude: 77.3289,
        materials: ['General Waste', 'Construction Debris', 'Non-recyclable Plastics'],
        hours: '24/7',
        type: 'dumping',
      },
      {
        name: 'Deonar Dumping Ground',
        address: 'Deonar, Mumbai',
        latitude: 19.0549,
        longitude: 72.9129,
        materials: ['Municipal Waste', 'Industrial Waste', 'Hazardous Materials'],
        hours: '24/7',
        type: 'dumping',
      },
      {
        name: 'Chennai Recyclers',
        address: 'Ambattur Industrial Estate, Chennai',
        latitude: 13.0827,
        longitude: 80.2707,
        materials: ['Plastic Bottles', 'Metal Items', 'Electronics', 'Batteries', 'Appliances'],
        hours: 'Mon-Sat: 9AM-5PM',
        type: 'recycling',
        contact: '+91-44-5678-9012',
      },
      {
        name: 'Hyderabad e-Waste Hub',
        address: 'HITEC City, Hyderabad',
        latitude: 17.4399,
        longitude: 78.3489,
        materials: ['Laptops', 'Monitors', 'Mobile Phones', 'Chargers', 'Circuit Boards'],
        hours: 'Mon-Sat: 10AM-6PM',
        type: 'recycling',
        contact: '+91-40-2345-6789',
      },
      {
        name: 'Pune Paper Recyclers',
        address: 'Bhosari MIDC, Pune',
        latitude: 18.6298,
        longitude: 73.8477,
        materials: ['Newspapers', 'Books', 'Cardboard', 'Office Paper', 'Magazines'],
        hours: 'Mon-Fri: 9AM-5PM',
        type: 'recycling',
        contact: '+91-20-3456-7890',
      },
    ];
    const batch = writeBatch(db);
    centers.forEach(c => {
      const ref = doc(collection(db, 'recyclingCenters'));
      batch.set(ref, c);
    });
    await batch.commit();
    console.log('✅ Recycling centers seeded to Firestore');
  }

  // Seed reward products
  const rewardsRef = collection(db, 'rewards');
  const rewardsSnap = await getDocs(rewardsRef);
  if (rewardsSnap.empty) {
    const rewards = [
      {
        name: 'Recycled Shopping Bag',
        description: 'Large eco-friendly bag made from 100% recycled materials. Reduce single-use plastic!',
        pointsCost: 100,
        imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',
        category: 'lifestyle',
        stock: 50,
      },
      {
        name: 'Eco-Friendly Notebook',
        description: 'Jotter made from 100% recycled paper. Perfect for eco-conscious note-taking.',
        pointsCost: 150,
        imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&q=80',
        category: 'stationery',
        stock: 30,
      },
      {
        name: 'Stainless Steel Water Bottle',
        description: 'Reusable insulated bottle. Eliminate 156 plastic bottles per year!',
        pointsCost: 200,
        imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80',
        category: 'lifestyle',
        stock: 25,
      },
      {
        name: 'Eco Sticker Pack',
        description: 'Set of 12 environment-themed stickers printed on recycled paper.',
        pointsCost: 50,
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
        category: 'collectible',
        stock: 100,
      },
      {
        name: 'Bamboo Cutlery Set',
        description: 'Fork, knife, spoon and straw made from sustainable bamboo. Carry anywhere!',
        pointsCost: 175,
        imageUrl: 'https://images.unsplash.com/photo-1584833898866-72d7e5da0c93?w=400&q=80',
        category: 'lifestyle',
        stock: 40,
      },
      {
        name: 'Seed Bomb Kit',
        description: 'Plant wildflowers anywhere! 10 seed bombs with native plant mix.',
        pointsCost: 80,
        imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80',
        category: 'garden',
        stock: 60,
      },
    ];
    const batch = writeBatch(db);
    rewards.forEach(r => {
      const ref = doc(collection(db, 'rewards'));
      batch.set(ref, r);
    });
    await batch.commit();
    console.log('✅ Reward products seeded to Firestore');
  }
}
