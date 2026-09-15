import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  deleteDoc,
  serverTimestamp,
  getDocFromServer,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Ministry, Progress, UserRole, PdfDocument } from './types';

const MINISTRIES_COLLECTION = 'ministries';
const USERS_COLLECTION = 'users';

// The hardcoded system admin email
const SYSTEM_ADMIN_EMAIL = 'khuonnaret17@mekong.edu.kh';


enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  const errorString = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorString);
  throw new Error(errorString);
}

export const firestoreService = {
  // --- Documents ---
  async getDocuments(): Promise<PdfDocument[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'documents'));
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PdfDocument));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'documents');
      return [];
    }
  },

  async getDocumentsByMinistry(ministryId: string): Promise<PdfDocument[]> {
    try {
      const q = query(collection(db, 'documents'), where('ministryId', '==', ministryId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PdfDocument));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `documents for ministry ${ministryId}`);
      return [];
    }
  },

  // --- Ministries ---
  async getMinistries(): Promise<Ministry[]> {
    try {
      const querySnapshot = await getDocs(collection(db, MINISTRIES_COLLECTION));
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ministry))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, MINISTRIES_COLLECTION);
      return []; // unreachable but for type safety
    }
  },

  subscribeMinistries(callback: (ministries: Ministry[]) => void, onError?: (error: unknown) => void) {
    return onSnapshot(collection(db, MINISTRIES_COLLECTION), (snapshot) => {
      const ministries = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ministry))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      callback(ministries);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, MINISTRIES_COLLECTION);
      if (onError) onError(error);
    });
  },

  async saveMinistry(ministry: Ministry) {
    const docRef = doc(db, MINISTRIES_COLLECTION, ministry.id);
    try {
      await setDoc(docRef, {
        ...ministry,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${MINISTRIES_COLLECTION}/${ministry.id}`);
    }
  },

  async deleteMinistry(id: string) {
    try {
      await deleteDoc(doc(db, MINISTRIES_COLLECTION, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${MINISTRIES_COLLECTION}/${id}`);
    }
  },

  async updateMinistryOrders(updates: { id: string; order: number }[]) {
    try {
      const batch = writeBatch(db);
      updates.forEach(({ id, order }) => {
        const docRef = doc(db, MINISTRIES_COLLECTION, id);
        batch.set(docRef, { order, updatedAt: serverTimestamp() }, { merge: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, MINISTRIES_COLLECTION);
    }
  },

  // --- Users & Roles ---
  async syncUserSession(uid: string, email: string, requestedRole?: UserRole | null, adminAccess: boolean = false) {
    const userRef = doc(db, USERS_COLLECTION, uid);
    try {
      const userDoc = await getDoc(userRef);
      
      // Determine role based on email if it's the system admin OR if they have validated admin access
      const isSystemAdmin = email.toLowerCase() === SYSTEM_ADMIN_EMAIL.toLowerCase();
      const shouldBeAdmin = isSystemAdmin || adminAccess;
      
      let dbRole: UserRole = 'MEMBER';

      if (userDoc.exists()) {
        dbRole = userDoc.data()?.role as UserRole;
        
        if (shouldBeAdmin && dbRole !== 'ADMIN') {
          await setDoc(userRef, { role: 'ADMIN', updatedAt: serverTimestamp() }, { merge: true });
          dbRole = 'ADMIN';
        }
      } else {
        // NEW USER: Default to MEMBER unless should be admin
        dbRole = shouldBeAdmin ? 'ADMIN' : 'MEMBER';

        await setDoc(userRef, {
          uid,
          email,
          role: dbRole,
          progress: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // If user is an ADMIN in DB, they can preview as MEMBER if they requested it
      const finalRole = (dbRole === 'ADMIN') ? (requestedRole || 'ADMIN') : 'MEMBER';
      
      console.log(`[Role Sync] Email: ${email}, DB Role: ${dbRole}, Requested: ${requestedRole}, Final: ${finalRole}`);
      
      return finalRole;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${uid}`);
      return 'MEMBER';
    }
  },

  async getUserRole(uid: string): Promise<UserRole | null> {
    const userRef = doc(db, USERS_COLLECTION, uid);
    try {
      const userDoc = await getDoc(userRef);
      return userDoc.exists() ? (userDoc.data().role as UserRole) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${uid}`);
      return null;
    }
  },

  // --- User Progress ---
  async getProgress(userId: string): Promise<Progress> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    try {
      const userDoc = await getDoc(userRef);
      return userDoc.exists() ? (userDoc.data().progress as Progress) || {} : {};
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${userId}`);
      return {};
    }
  },

  async saveProgress(userId: string, progress: Progress) {
    const userRef = doc(db, USERS_COLLECTION, userId);
    try {
      await setDoc(userRef, { 
        progress,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${userId}`);
    }
  },

  async testConnection() {
    try {
      // Use a known path or a dummy one just to probe connection
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration or network.");
      }
    }
  }
};

// Removed synchronous testConnection() to avoid SSR gRPC issues
