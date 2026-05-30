'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot, query, setDoc, doc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { ministries as initialMinistries } from './data';
import { Ministry, UserRole, Progress, PdfDocument } from './types';
import { firestoreService } from './firestore-service';

interface FirebaseContextType {
  ministries: Ministry[];
  documents: PdfDocument[];
  loading: boolean;
  user: any;
  userRole: UserRole | null;
  userProgress: Progress;
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
  linkBankAccount: (bankName: string, accountNumber: string, accountHolder: string, durationInMonths?: number) => Promise<void>;
  unlinkBankAccount: () => Promise<void>;
  upgradeToPremium: (durationInMonths?: number) => Promise<void>;
  refreshMinistries: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProgress, setUserProgress] = useState<Progress>({});
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
  
  const refreshDocuments = async () => {
    const data = await firestoreService.getDocuments();
    setDocuments(data);
  };

  useEffect(() => {
    const checkCustomSession = () => {
      if (typeof window !== 'undefined') {
        const savedUserStr = localStorage.getItem('vignasa_custom_user');
        const savedRoleStr = localStorage.getItem('vignasa_custom_role');
        
        if (savedUserStr && savedRoleStr) {
          try {
            const parsedUser = JSON.parse(savedUserStr);
            const username = parsedUser.displayName;
            const usersStr = localStorage.getItem('vignasa_custom_users') || '[]';
            const users = JSON.parse(usersStr);
            const idx = users.findIndex((u: any) => u.username?.toLowerCase() === username?.toLowerCase());
            
            setUser(parsedUser);
            setUserRole(savedRoleStr as UserRole);
            
            if (idx !== -1) {
              const matchedUser = users[idx];
              setUserProgress(matchedUser.progress || {});
              const pUntil = matchedUser.premiumUntil || null;
              let activePremium = matchedUser.isPremium || false;
              if (activePremium && pUntil) {
                 const hasExpired = new Date() > new Date(pUntil);
                 if (hasExpired) activePremium = false;
              }
              setIsPremium(activePremium);
              setPremiumUntil(pUntil);
              setLinkedBank(matchedUser.linkedBank || null);
            } else {
              // Fallback for Admin or unknown
              if (savedRoleStr === 'ADMIN') {
                setIsPremium(true);
              } else {
                setIsPremium(false);
              }
              setUserProgress({});
              setPremiumUntil(null);
              setLinkedBank(null);
            }
            
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

  useEffect(() => {
    if (authLoading) return;

    let unsubscribeData: (() => void) | undefined;
    let unsubscribeDocs: (() => void) | undefined;

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
      
      // 3. Documents Subscription
      unsubscribeDocs = onSnapshot(collection(db, 'documents'), (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PdfDocument));
        setDocuments(docs);
      });
    };

    initData();

    return () => {
      if (unsubscribeData) unsubscribeData();
      if (unsubscribeDocs) unsubscribeDocs();
    };
  }, [authLoading, userRole, ministries.length]);

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
      if (typeof window !== 'undefined') {
        const usersStr = localStorage.getItem('vignasa_custom_users') || '[]';
        const users = JSON.parse(usersStr);

        let matchingUser = users.find((u: any) => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.password === password);
        
        if (matchingUser) {
          const userObj = {
            uid: `custom_${matchingUser.username}`,
            email: `${matchingUser.username}@vignasa.local`,
            displayName: matchingUser.username,
            photoURL: null
          };

          localStorage.setItem('vignasa_custom_user', JSON.stringify(userObj));
          localStorage.setItem('vignasa_custom_role', 'MEMBER');
          localStorage.setItem('vignasa_custom_progress', JSON.stringify(matchingUser.progress || {}));

          setUser(userObj);
          setUserRole('MEMBER');
          setUserProgress(matchingUser.progress || {});
          setIsPremium(matchingUser.isPremium || false);
          setPremiumUntil(matchingUser.premiumUntil || null);
          return { success: true };
        } else {
          return { success: false, error: 'ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវ!' };
        }
      }
      return { success: false, error: 'បរិស្ថានរត់មិនគាំទ្រ' };
    } catch (err: any) {
      return { success: false, error: err.message || 'មានបញ្ហាបច្គេសសក្នុងដំណើរការចូលគណនី' };
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
        const usersStr = localStorage.getItem('vignasa_custom_users') || '[]';
        const users = JSON.parse(usersStr);

        const exists = users.some((u: any) => u.username.toLowerCase() === cleanUsername.toLowerCase());
        if (exists) {
          return { success: false, error: 'ឈ្មោះគណនីនេះត្រូវបានប្រើប្រាស់រួចហើយ!' };
        }

        const newUser = {
          username: cleanUsername,
          password: password,
          role: 'MEMBER' as UserRole,
          progress: {},
          isPremium: false
        };

        users.push(newUser);
        localStorage.setItem('vignasa_custom_users', JSON.stringify(users));

        const userObj = {
          uid: `custom_${cleanUsername}`,
          email: `${cleanUsername}@vignasa.local`,
          displayName: cleanUsername,
          photoURL: null
        };

        localStorage.setItem('vignasa_custom_user', JSON.stringify(userObj));
        localStorage.setItem('vignasa_custom_role', 'MEMBER');
        localStorage.setItem('vignasa_custom_progress', JSON.stringify({}));

        setUser(userObj);
        setUserRole('MEMBER');
        setUserProgress({});
        setIsPremium(false);
        setPremiumUntil(null);
        return { success: true };
      }
      return { success: false, error: 'បរិស្ថានរត់មិនគាំទ្រ' };
    } catch (err: any) {
      return { success: false, error: err.message || 'មានបញ្ហាបច្ចេកទេសក្នុងដំណើរការចុះឈ្មោះ' };
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
    } catch (err: any) {
      return { success: false, error: err.message || 'មានបញ្ហាបច្ចេកទេសក្នុងដំណើរការចូលជា Admin' };
    }
  };

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
  };

  const saveProgress = async (progress: Progress) => {
    if (!user) return;
    setUserProgress(progress);
    
    if (user.uid && user.uid.startsWith('custom_')) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('vignasa_custom_progress', JSON.stringify(progress));
        const username = user.displayName;
        if (username && username !== 'អ្នកគ្រប់គ្រង (Admin)') {
          try {
            const usersStr = localStorage.getItem('vignasa_custom_users') || '[]';
            const users = JSON.parse(usersStr);
            const idx = users.findIndex((u: any) => u.username.toLowerCase() === username.toLowerCase());
            if (idx !== -1) {
              users[idx].progress = progress;
              localStorage.setItem('vignasa_custom_users', JSON.stringify(users));
            }
          } catch (e) {
            console.error('Failed to update custom member progress in array', e);
          }
        }
      }
    } else {
      await firestoreService.saveProgress(user.uid, progress);
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
        const usersStr = localStorage.getItem('vignasa_custom_users') || '[]';
        const users = JSON.parse(usersStr);
        const username = user.displayName;
        const idx = users.findIndex((u: any) => u.username.toLowerCase() === username.toLowerCase());
        if (idx !== -1) {
          users[idx].isPremium = true;
          users[idx].premiumUntil = premiumUntil;
          users[idx].linkedBank = { bankName, accountNumber, accountHolder, active: true, linkedAt: new Date().toISOString() };
          localStorage.setItem('vignasa_custom_users', JSON.stringify(users));
          setIsPremium(true);
          setPremiumUntil(premiumUntil);
          setLinkedBank(users[idx].linkedBank);
        }
      }
    } else {
      const userRef = doc(db, 'users', user.uid);
      try {
        const { serverTimestamp } = await import('firebase/firestore');
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
        const usersStr = localStorage.getItem('vignasa_custom_users') || '[]';
        const users = JSON.parse(usersStr);
        const username = user.displayName;
        const idx = users.findIndex((u: any) => u.username.toLowerCase() === username.toLowerCase());
        if (idx !== -1) {
          users[idx].isPremium = false;
          users[idx].premiumUntil = null;
          users[idx].linkedBank = null;
          localStorage.setItem('vignasa_custom_users', JSON.stringify(users));
          setIsPremium(false);
          setPremiumUntil(null);
          setLinkedBank(null);
        }
      }
    } else {
      const userRef = doc(db, 'users', user.uid);
      try {
        const { serverTimestamp } = await import('firebase/firestore');
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
        const usersStr = localStorage.getItem('vignasa_custom_users') || '[]';
        const users = JSON.parse(usersStr);
        const username = user.displayName;
        const idx = users.findIndex((u: any) => u.username.toLowerCase() === username.toLowerCase());
        if (idx !== -1) {
          users[idx].isPremium = true;
          users[idx].premiumUntil = premiumUntilTime;
          localStorage.setItem('vignasa_custom_users', JSON.stringify(users));
          setIsPremium(true);
          setPremiumUntil(premiumUntilTime);
        }
      }
    } else {
      const userRef = doc(db, 'users', user.uid);
      try {
        const { serverTimestamp } = await import('firebase/firestore');
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
