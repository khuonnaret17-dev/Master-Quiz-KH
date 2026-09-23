'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot, setDoc, doc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { Ministry, UserRole, Progress, PdfDocument } from './types';
import { firestoreService } from './firestore-service';

export interface CustomUserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

interface FirebaseContextType {
  ministries: Ministry[];
  documents: PdfDocument[];
  loading: boolean;
  user: User | CustomUserSession | null;
  userRole: UserRole | null;
  userProgress: Progress;
  favorites: string[];
  isPremium: boolean;
  premiumUntil: string | null;
  linkedBank: { bankName: string; accountNumber: string; accountHolder: string; active?: boolean } | null;
  authLoading: boolean;
  isLoggingIn: boolean;
  error: string | null;
  login: (mode?: 'MEMBER' | 'ADMIN', adminCode?: string) => Promise<void>;
  loginCustomMember: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerCustomMember: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginCustomAdmin: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  saveProgress: (progress: Progress) => Promise<void>;
  toggleFavorite: (ministryId: string) => Promise<void>;
  linkBankAccount: (bankName: string, accountNumber: string, accountHolder: string, durationInMonths?: number) => Promise<void>;
  unlinkBankAccount: () => Promise<void>;
  upgradeToPremium: (durationInMonths?: number) => Promise<void>;
  refreshMinistries: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [ministries, setMinistries] = useState<Ministry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('vignasa_ministries_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [documents, setDocuments] = useState<PdfDocument[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('vignasa_documents_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        if (localStorage.getItem('vignasa_ministries_cache')) return false;
      } catch {}
    }
    return true;
  });
  const [user, setUser] = useState<User | CustomUserSession | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProgress, setUserProgress] = useState<Progress>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [linkedBank, setLinkedBank] = useState<{ bankName: string; accountNumber: string; accountHolder: string; active?: boolean } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize persistence
    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (err) {
        console.error("Persistence error:", err);
      }
    };
    initAuth();
  }, []);

  const refreshMinistries = async () => {
    // using onSnapshot for ministries instead of one time fetch
  };
  
  const refreshDocuments = async () => {
    // using onSnapshot for documents instead of one time fetch
  };

  useEffect(() => {
    // Set up real-time listener for ministries with sorting & caching
    const unsubscribeMinistries = onSnapshot(collection(db, 'ministries'), (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as Ministry))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      setMinistries(data);
      setLoading(false);
      setError(null);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('vignasa_ministries_cache', JSON.stringify(data));
        } catch {}
      }
    }, (error) => {
      console.error("Ministries real-time error:", error);
      setLoading(false);
    });

    // Set up real-time listener for documents with caching
    const unsubscribeDocuments = onSnapshot(collection(db, 'documents'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PdfDocument));
      setDocuments(data);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('vignasa_documents_cache', JSON.stringify(data));
        } catch {}
      }
    }, (error) => {
      console.error("Documents real-time error:", error);
    });

    return () => {
      unsubscribeMinistries();
      unsubscribeDocuments();
    };
  }, []);

  const checkCustomSession = () => {
    if (typeof window !== 'undefined') {
      const savedUserStr = localStorage.getItem('vignasa_custom_user');
      const savedRoleStr = localStorage.getItem('vignasa_custom_role');
      
      if (savedUserStr && savedRoleStr) {
        try {
          const parsedUser = JSON.parse(savedUserStr);
          const username = parsedUser.displayName;
          if (savedRoleStr === 'ADMIN') {
            setUser(parsedUser);
            setUserRole('ADMIN');
            setIsPremium(true);
            setAuthLoading(false);
            setLoading(false);
            return true;
          }

          setUser(parsedUser);
          setUserRole('MEMBER');
          
          const userRef = doc(db, 'custom_users', username.toLowerCase());
          onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserProgress(data.progress || {});
              
              const pUntil = data.premiumUntil || null;
              const rawIsPremium = data.isPremium || false;
              let activePremium = rawIsPremium;
              if (rawIsPremium && pUntil) {
                const hasExpired = new Date() > new Date(pUntil);
                if (hasExpired) {
                  activePremium = false;
                }
              }
              
              setIsPremium(activePremium);
              setPremiumUntil(pUntil);
              setLinkedBank(data.linkedBank || null);
            } else {
               logout();
            }
          });
          
          setAuthLoading(false);
          setLoading(false);
          return true;
        } catch (err) {
          console.error("Failed custom session parse", err);
        }
      }
    }
    return false;
  };

  useEffect(() => {
    if (checkCustomSession()) {
      return;
    }

    let unsubscribeData: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      let unsubscribeUserDoc: (() => void) | undefined;
      
      if (typeof window !== 'undefined' && localStorage.getItem('vignasa_custom_user')) {
        checkCustomSession();
        return;
      }

      setUser(authUser);
      if (authUser) {
        // Subscribe to user document for role, progress, premium, and linkedBank
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', authUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProgress(data.progress || {});
            
            const pUntil = data.premiumUntil || null;
            const rawIsPremium = data.isPremium || false;
            let activePremium = rawIsPremium;
            if (rawIsPremium && pUntil) {
              const hasExpired = new Date() > new Date(pUntil);
              if (hasExpired) {
                activePremium = false;
              }
            }
            
            setIsPremium(activePremium);
            setPremiumUntil(pUntil);
            setLinkedBank(data.linkedBank || null);
            // Don't overwrite role if it's currently requestedRole (handled by sync)
            if (!sessionStorage.getItem('vignasa_session_role')) {
              setUserRole(data.role || 'MEMBER');
            }
          }
        }, (err) => {
          console.error("User doc error:", err);
          if (err?.message?.includes('502')) {
            setError('បណ្ដាញភ្ជាប់មានបញ្ហា (Database Connection Error 502)');
          }
        });

        const unsubscribeFavorites = onSnapshot(collection(db, 'users', authUser.uid, 'favorites'), (snapshot) => {
            const favoritesList = snapshot.docs.map(doc => doc.id);
            setFavorites(favoritesList);
        });
        unsubscribeData = unsubscribeFavorites;

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
        setIsPremium(false);
        setPremiumUntil(null);
        setLinkedBank(null);
        if (unsubscribeUserDoc) unsubscribeUserDoc();
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeData) unsubscribeData();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic check for subscription expiration in real-time
  useEffect(() => {
    if (!premiumUntil || !isPremium) return;

    const interval = setInterval(() => {
      const hasExpired = new Date() > new Date(premiumUntil);
      if (hasExpired) {
        setIsPremium(false);
      }
    }, 5000); // Check every 5 seconds for real-time responsiveness

    return () => clearInterval(interval);
  }, [premiumUntil, isPremium]);

  const loginCustomMember = async (username: string, password: string) => {
    if (!username || !password) {
      return { success: false, error: 'សូមបំពេញឈ្មោះគណនី និងលេខសម្ងាត់!' };
    }

    const cleanUsername = username.trim();
    
    // Check if username is English only (letters, numbers, spaces)
    const englishRegex = /^[a-zA-Z0-9\s]+$/;
    if (!englishRegex.test(cleanUsername)) {
      return { success: false, error: 'ឈ្មោះគណនី (User Name) ត្រូវតែជាអក្សរអង់គ្លេស ឬលេខជាភាសាអង់គ្លេស!' };
    }

    const passwordRegex = /^\d{6}$/;
    if (!passwordRegex.test(password)) {
      return { success: false, error: 'លេខសម្ងាត់ត្រូវតែជាលេខ និងមាន ៦ខ្ទង់!' };
    }

    try {
      const userRef = doc(db, 'custom_users', cleanUsername.toLowerCase());
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const matchingUser = userDoc.data();
        if (matchingUser.password === password) {
          const userObj = {
            uid: `custom_${matchingUser.username}`,
            email: `${matchingUser.username}@master.quiz.kh.local`,
            displayName: matchingUser.username,
            photoURL: null
          };

          if (typeof window !== 'undefined') {
            localStorage.setItem('vignasa_custom_user', JSON.stringify(userObj));
            localStorage.setItem('vignasa_custom_role', 'MEMBER');
            localStorage.setItem('vignasa_custom_progress', JSON.stringify(matchingUser.progress || {}));
          }

          setUser(userObj);
          setUserRole('MEMBER');
          setUserProgress(matchingUser.progress || {});
          setIsPremium(matchingUser.isPremium || false);
          setPremiumUntil(matchingUser.premiumUntil || null);
          return { success: true };
        } else {
          return { success: false, error: 'ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវ!' };
        }
      } else {
        return { success: false, error: 'ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវ!' };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'មានបញ្ហាបច្គេសសក្នុងដំណើរការចូលគណនី';
      return { success: false, error: errMsg };
    }
  };

  const registerCustomMember = async (username: string, password: string) => {
    if (!username || !password) {
      return { success: false, error: 'សូមបំពេញឈ្មោះគណនី និងលេខសម្ងាត់!' };
    }
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      return { success: false, error: 'ឈ្មោះគណនីត្រូវមានយ៉ាងហោចណាស់ ៣ តួ!' };
    }

    // Check if username is English only (letters, numbers, spaces)
    const englishRegex = /^[a-zA-Z0-9\s]+$/;
    if (!englishRegex.test(cleanUsername)) {
      return { success: false, error: 'ឈ្មោះគណនី (User Name) ត្រូវតែជាអក្សរអង់គ្លេស ឬលេខជាភាសាអង់គ្លេស!' };
    }

    const passwordRegex = /^\d{6}$/;
    if (!passwordRegex.test(password)) {
      return { success: false, error: 'លេខសម្ងាត់ត្រូវតែជាលេខ និងមាន ៦ខ្ទង់!' };
    }

    try {
      if (typeof window !== 'undefined') {
        const userRef = doc(db, 'custom_users', cleanUsername.toLowerCase());
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          return { success: false, error: 'ឈ្មោះគណនីនេះត្រូវបានប្រើប្រាស់រួចហើយ!' };
        }

        const newUser = {
          username: cleanUsername,
          password: password,
          role: 'MEMBER' as UserRole,
          progress: {},
          isPremium: false,
          createdAt: new Date().toISOString()
        };

        await setDoc(userRef, newUser);

        const userObj = {
          uid: `custom_${cleanUsername.toLowerCase()}`,
          email: `${cleanUsername}@vignasa.local`,
          displayName: cleanUsername,
          photoURL: null
        };

        localStorage.setItem('vignasa_custom_user', JSON.stringify(userObj));
        localStorage.setItem('vignasa_custom_role', 'MEMBER');

        setUser(userObj);
        setUserRole('MEMBER');
        setUserProgress({});
        setIsPremium(false);
        setPremiumUntil(null);
        
        checkCustomSession();
        return { success: true };
      }
      return { success: false, error: 'បរិស្ថានរត់មិនគាំទ្រ' };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'មានបញ្ហាបច្ចេកទេសក្នុងដំណើរការចុះឈ្មោះ';
      return { success: false, error: errMsg };
    }
  };

  const loginCustomAdmin = async (password: string) => {
    if (!password) {
      return { success: false, error: 'សូមបញ្ចូលលេខសម្ងាត់សម្រាប់អ្នកគ្រប់គ្រង!' };
    }

    if (password !== '5251170074') {
      return { success: false, error: 'លេខសម្ងាត់អ្នកគ្រប់គ្រងមិនត្រឹមត្រូវ!' };
    }

    try {
      if (typeof window !== 'undefined') {
        const userObj = {
          uid: 'custom_admin',
          email: 'khuonnaret17@mekong.edu.kh',
          displayName: 'អ្នកគ្រប់គ្រង (Admin)',
          photoURL: null
        };

        localStorage.setItem('vignasa_custom_user', JSON.stringify(userObj));
        localStorage.setItem('vignasa_custom_role', 'ADMIN');
        localStorage.setItem('vignasa_custom_progress', JSON.stringify({}));

        setUser(userObj);
        setUserRole('ADMIN');
        setUserProgress({});
        setIsPremium(true);
        return { success: true };
      }
      return { success: false, error: 'បរិស្ថានរត់មិនគាំទ្រ' };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'មានបញ្ហាបច្ចេកទេសក្នុងដំណើរការចូលជា Admin';
      return { success: false, error: errMsg };
    }
  };

  const login = async (mode: 'MEMBER' | 'ADMIN' = 'MEMBER', adminCode?: string) => {
    if (isLoggingIn) return;
    
    if (mode === 'ADMIN' && adminCode !== '5251170074') {
      setError('លេខកូដមិនត្រឹមត្រូវ! (Invalid Admin Code)');
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
    } catch (error: unknown) {
      const errCode = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : '';
      if (errCode === 'auth/cancelled-popup-request') {
        console.log('Login cancelled by user');
      } else if (errCode === 'auth/popup-closed-by-user') {
        console.log('Popup closed by user');
      } else {
        console.error('Login error:', error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  async function logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vignasa_custom_user');
      localStorage.removeItem('vignasa_custom_role');
      localStorage.removeItem('vignasa_custom_progress');
    }
    setUser(null);
    setUserRole(null);
    setUserProgress({});
    setIsPremium(false);
    setPremiumUntil(null);
    setLinkedBank(null);
    await signOut(auth);
  }

  const saveProgress = async (progress: Progress) => {
    if (!user) return;
    setUserProgress(progress);
    
    if (user.uid && user.uid.startsWith('custom_')) {
      if (typeof window !== 'undefined') {
        const username = user.displayName;
        if (username && username !== 'អ្នកគ្រប់គ្រង (Admin)') {
          try {
            const userRef = doc(db, 'custom_users', username.toLowerCase());
            await setDoc(userRef, { progress }, { merge: true });
          } catch (e) {
            console.error('Failed to update custom member progress in DB', e);
          }
        }
      }
    } else {
      await firestoreService.saveProgress(user.uid, progress);
    }
  };

  const toggleFavorite = async (ministryId: string) => {
    if (!user) return;
    
    const isFavorite = favorites.includes(ministryId);
    const userId = user.uid;
    // For custom users, the doc ID for the user doc is username, not uid.
    // However, in line 391, the uid is `custom_${username}`.
    // The doc ref in line 313/372 uses username.toLowerCase().
    // I need to be careful with the path.
    // The current code uses user.displayName for username.
    
    const username = user.displayName;
    const isCustom = user.uid.startsWith('custom_');
    const userDocPath = isCustom ? doc(db, 'custom_users', username!.toLowerCase()) : doc(db, 'users', userId);
    const favRef = doc(userDocPath, 'favorites', ministryId);

    if (isFavorite) {
      await deleteDoc(favRef);
      setFavorites(prev => prev.filter(id => id !== ministryId));
    } else {
      await setDoc(favRef, { ministryId, createdAt: serverTimestamp() });
      setFavorites(prev => [...prev, ministryId]);
    }
  };

  const linkBankAccount = async (bankName: string, accountNumber: string, accountHolder: string, durationInMonths?: number) => {
    if (!user) return;
    
    const futureDate = new Date();
    if (durationInMonths) {
      futureDate.setMonth(futureDate.getMonth() + durationInMonths);
    } else {
      futureDate.setFullYear(futureDate.getFullYear() + 10); // 10 years subscription
    }
    const premiumUntil = futureDate.toISOString();

    if (user.uid && user.uid.startsWith('custom_')) {
      if (typeof window !== 'undefined') {
        const username = user.displayName || user.uid;
        const userRef = doc(db, 'custom_users', username.toLowerCase());
        const linkedBank = { bankName, accountNumber, accountHolder, active: true, linkedAt: new Date().toISOString() };
        await setDoc(userRef, { 
          isPremium: true, 
          premiumUntil: premiumUntil, 
          linkedBank
        }, { merge: true });
      }
    } else {
      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, {
          isPremium: true,
          premiumUntil: premiumUntil,
          linkedBank: {
            bankName,
            accountNumber,
            accountHolder,
            active: true,
            linkedAt: new Date().toISOString()
          },
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("Link bank error:", err);
      }
    }
  };

  const unlinkBankAccount = async () => {
    if (!user) return;
    
    if (user.uid && user.uid.startsWith('custom_')) {
      if (typeof window !== 'undefined') {
        const username = user.displayName || user.uid;
        const userRef = doc(db, 'custom_users', username.toLowerCase());
        await setDoc(userRef, { 
          isPremium: false, 
          premiumUntil: null, 
          linkedBank: null
        }, { merge: true });
      }
    } else {
      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, {
          isPremium: false,
          premiumUntil: null,
          linkedBank: null,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("Unlink bank error:", err);
      }
    }
  };

  const upgradeToPremium = async (durationInMonths?: number) => {
    if (!user) return;
    
    const futureDate = new Date();
    if (durationInMonths) {
      futureDate.setMonth(futureDate.getMonth() + durationInMonths);
    } else {
      futureDate.setFullYear(futureDate.getFullYear() + 10); // 10 years subscription
    }
    const premiumUntilTime = futureDate.toISOString();

    if (user.uid && user.uid.startsWith('custom_')) {
      if (typeof window !== 'undefined') {
        const username = user.displayName || user.uid;
        const userRef = doc(db, 'custom_users', username.toLowerCase());
        await setDoc(userRef, { 
          isPremium: true, 
          premiumUntil: premiumUntilTime
        }, { merge: true });
      }
    } else {
      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, {
          isPremium: true,
          premiumUntil: premiumUntilTime,
          updatedAt: serverTimestamp()
        }, { merge: true });
        setIsPremium(true);
        setPremiumUntil(premiumUntilTime);
      } catch (err) {
        console.error("Upgrade premium error:", err);
      }
    }
  };

  return (
    <FirebaseContext.Provider value={{ 
      ministries, 
      documents,
      loading, 
      user, 
      userRole, 
      userProgress,
      favorites,
      isPremium,
      premiumUntil,
      linkedBank,
      authLoading, 
      isLoggingIn,
      error,
      login, 
      loginCustomMember,
      registerCustomMember,
      loginCustomAdmin,
      logout,
      saveProgress,
      toggleFavorite,
      linkBankAccount,
      unlinkBankAccount,
      upgradeToPremium,
      refreshMinistries,
      refreshDocuments
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
