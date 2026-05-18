'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot, query, setDoc, doc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { ministries as initialMinistries } from './data';
import { Ministry, UserRole, Progress } from './types';
import { firestoreService } from './firestore-service';

interface FirebaseContextType {
  ministries: Ministry[];
  loading: boolean;
  user: User | null;
  userRole: UserRole | null;
  userProgress: Progress;
  authLoading: boolean;
  isLoggingIn: boolean;
  error: string | null;
  login: (mode?: 'MEMBER' | 'ADMIN', adminCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  saveProgress: (progress: Progress) => Promise<void>;
  refreshMinistries: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProgress, setUserProgress] = useState<Progress>({});
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize persistence
    const initAuth = async () => {
      try {
        const { browserLocalPersistence, setPersistence } = await import('firebase/auth');
        await setPersistence(auth, browserLocalPersistence);
      } catch (err) {
        console.error("Persistence error:", err);
      }
    };
    initAuth();
  }, []);

  const refreshMinistries = async () => {
    const data = await firestoreService.getMinistries();
    setMinistries(data);
  };

  useEffect(() => {
    let unsubscribeData: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      let unsubscribeUserDoc: (() => void) | undefined;
      
      setUser(authUser);
      if (authUser) {
        // Subscribe to user document for role and progress
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', authUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProgress(data.progress || {});
            // Don't overwrite role if it's currently requestedRole (handled by sync)
            if (!sessionStorage.getItem('vignasa_session_role')) {
              setUserRole(data.role || 'MEMBER');
            }
          }
        }, (err) => {
          console.error("User doc error:", err);
          if (err.message.includes('502')) {
            setError('បណ្ដាញភ្ជាប់មានបញ្ហា (Database Connection Error 502)');
          }
        });

        const requestedRole = typeof window !== 'undefined' ? sessionStorage.getItem('vignasa_session_role') as UserRole : null;
        const adminAccess = typeof window !== 'undefined' ? sessionStorage.getItem('vignasa_admin_access') === 'true' : false;
        
        try {
          const role = await firestoreService.syncUserSession(
            authUser.uid, 
            authUser.email!, 
            requestedRole,
            adminAccess
          );
          setUserRole(role);
          // Clear admin access flag after sync
          if (adminAccess) sessionStorage.removeItem('vignasa_admin_access');
        } catch (err) {
          console.error("Error syncing session:", err);
          setUserRole('MEMBER');
        }
      } else {
        setUserRole(null);
        setUserProgress({});
        if (unsubscribeUserDoc) unsubscribeUserDoc();
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeData) unsubscribeData();
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;

    let unsubscribeData: (() => void) | undefined;

    const initData = async () => {
      // 1. Handled Seeding (only if admin and empty)
      if (userRole === 'ADMIN' && ministries.length === 0) {
        try {
          const snapshot = await getDocs(collection(db, 'ministries'));
          if (snapshot.empty) {
            for (const m of initialMinistries) {
              await firestoreService.saveMinistry(m);
            }
          }
        } catch (error) {
          console.log('Seeding check skipped or unauthorized');
        }
      }

      // 2. Data Subscription
      unsubscribeData = firestoreService.subscribeMinistries((data) => {
        setMinistries(data);
        setLoading(false);
        setError(null);
      }, (err: any) => {
        console.error("Ministries subscription error:", err);
        if (err?.message?.includes('502')) {
          setError('បណ្ដាញភ្ជាប់មានបញ្ហា (Database Connection Error 502)');
        }
      });
    };

    initData();

    return () => {
      if (unsubscribeData) unsubscribeData();
    };
  }, [authLoading, userRole, ministries.length]);

  const login = async (mode: 'MEMBER' | 'ADMIN' = 'MEMBER', adminCode?: string) => {
    if (isLoggingIn) return;
    
    if (mode === 'ADMIN' && adminCode !== '5251170074') {
      alert('លេខកូដមិនត្រឹមត្រូវ! (Invalid Admin Code)');
      return;
    }

    setIsLoggingIn(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('vignasa_session_role', mode);
      if (mode === 'ADMIN') {
        sessionStorage.setItem('vignasa_admin_access', 'true');
      }
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.log('Login cancelled by user');
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.log('Popup closed by user');
      } else {
        console.error('Login error:', error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const saveProgress = async (progress: Progress) => {
    if (!user) return;
    await firestoreService.saveProgress(user.uid, progress);
  };

  return (
    <FirebaseContext.Provider value={{ 
      ministries, 
      loading, 
      user, 
      userRole, 
      userProgress,
      authLoading, 
      isLoggingIn,
      error,
      login, 
      logout,
      saveProgress,
      refreshMinistries
    }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
