import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Question, Subject, Feedback, AppNotification, LoginRecord, PresenceRecord, PaidUser, BotCommandConfig } from '../types';
import { INITIAL_QUESTIONS, INITIAL_SUBJECTS, INITIAL_NOTIFICATIONS } from './initialData';
import { syncTelegramBotTemplates } from './telegram';

// Initialize Firebase App & Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'anonymous-client',
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Info: ', JSON.stringify(errInfo));
}

// Test initial connection per skill mandate
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client in offline/cache mode');
    }
  }
}
testConnection();

// Initial Local Storage Keys for fast, instantaneous offline loading & resilience
const STORAGE_KEYS = {
  QUESTIONS: 'mpq_cached_questions',
  SUBJECTS: 'mpq_cached_subjects',
  NOTIFICATIONS: 'mpq_cached_notifications',
  DISMISSED_NOTIFS: 'mpq_dismissed_notifs',
  FEEDBACKS: 'mpq_cached_feedbacks',
  LOGINS: 'mpq_cached_logins',
  PRESENCE: 'mpq_cached_presence',
  PAID_USERS: 'mpq_cached_paid_users',
  BOT_COMMANDS: 'mpq_cached_bot_commands',
};

function getLocal<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Real-time Questions Listener (Pure Firestore Sync)
 */
export function subscribeQuestions(callback: (questions: Question[]) => void) {
  const cached = getLocal<Question[]>(STORAGE_KEYS.QUESTIONS, []);
  callback(cached);

  const unsub = onSnapshot(
    collection(db, 'questions'),
    (snapshot) => {
      if (snapshot.empty) {
        setLocal(STORAGE_KEYS.QUESTIONS, []);
        callback([]);
      } else {
        const questions: Question[] = [];
        snapshot.forEach((d) => {
          questions.push({ id: d.id, ...(d.data() as Omit<Question, 'id'>) });
        });
        questions.sort((a, b) => (a.order || 0) - (b.order || 0));
        setLocal(STORAGE_KEYS.QUESTIONS, questions);
        callback(questions);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'questions');
      callback(cached);
    }
  );

  return unsub;
}

/**
 * Real-time Subjects Listener (Pure Firestore Sync)
 */
export function subscribeSubjects(callback: (subjects: Subject[]) => void) {
  const cached = getLocal<Subject[]>(STORAGE_KEYS.SUBJECTS, []);
  callback(cached);

  const unsub = onSnapshot(
    collection(db, 'subjects'),
    (snapshot) => {
      if (snapshot.empty) {
        setLocal(STORAGE_KEYS.SUBJECTS, []);
        callback([]);
      } else {
        const subs: Subject[] = [];
        snapshot.forEach((d) => {
          subs.push({ id: d.id, ...(d.data() as Omit<Subject, 'id'>) });
        });
        subs.sort((a, b) => (a.order || 0) - (b.order || 0));
        setLocal(STORAGE_KEYS.SUBJECTS, subs);
        callback(subs);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'subjects');
      callback(cached);
    }
  );

  return unsub;
}


/**
 * Real-time Notifications Listener
 */
export function subscribeNotifications(callback: (notifications: AppNotification[]) => void) {
  const dismissedInitial = new Set<string>(getLocal<string[]>(STORAGE_KEYS.DISMISSED_NOTIFS, []));
  const hasStoredCache = (() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) !== null;
    } catch {
      return false;
    }
  })();
  const initialFallback = dismissedInitial.has('__ALL__')
    ? []
    : INITIAL_NOTIFICATIONS.filter((n) => !dismissedInitial.has(n.id));
  const cached = hasStoredCache
    ? getLocal<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, [])
    : initialFallback;
  callback(cached);

  const handleLocalChange = (e: Event) => {
    const customEvent = e as CustomEvent<AppNotification[]>;
    if (Array.isArray(customEvent.detail)) {
      callback(customEvent.detail);
    }
  };
  window.addEventListener('mpq-notifications-changed', handleLocalChange);

  let hasEverReceivedServerDocs = false;

  const unsub = onSnapshot(
    collection(db, 'notifications'),
    (snapshot) => {
      const dismissed = new Set<string>(getLocal<string[]>(STORAGE_KEYS.DISMISSED_NOTIFS, []));
      if (!snapshot.empty) {
        hasEverReceivedServerDocs = true;
        const notifs: AppNotification[] = [];
        snapshot.forEach((d) => {
          notifs.push({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) });
        });
        notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLocal(STORAGE_KEYS.NOTIFICATIONS, notifs);
        callback(notifs);
      } else {
        const storedNow = (() => {
          try {
            return localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) !== null;
          } catch {
            return false;
          }
        })();
        if (hasEverReceivedServerDocs || dismissed.has('__ALL__') || storedNow) {
          setLocal(STORAGE_KEYS.NOTIFICATIONS, []);
          callback([]);
        } else {
          const remainingDefaults = INITIAL_NOTIFICATIONS.filter((n) => !dismissed.has(n.id));
          setLocal(STORAGE_KEYS.NOTIFICATIONS, remainingDefaults);
          callback(remainingDefaults);
        }
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'notifications');
      callback(getLocal<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, initialFallback));
    }
  );

  return () => {
    window.removeEventListener('mpq-notifications-changed', handleLocalChange);
    unsub();
  };
}

/**
 * Real-time Feedback Listener
 */
export function subscribeFeedbacks(callback: (feedbacks: Feedback[]) => void) {
  const cached = getLocal<Feedback[]>(STORAGE_KEYS.FEEDBACKS, []);
  callback(cached);

  const unsub = onSnapshot(
    collection(db, 'feedbacks'),
    (snapshot) => {
      const items: Feedback[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<Feedback, 'id'>) });
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLocal(STORAGE_KEYS.FEEDBACKS, items);
      callback(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'feedbacks');
      callback(cached);
    }
  );

  return unsub;
}

/**
 * Real-time Logins Listener (for Admin view)
 */
export function subscribeLogins(callback: (logins: LoginRecord[]) => void) {
  const cached = getLocal<LoginRecord[]>(STORAGE_KEYS.LOGINS, []);
  callback(cached);

  const handleLocalChange = (e: Event) => {
    const customEvent = e as CustomEvent<LoginRecord[]>;
    if (Array.isArray(customEvent.detail)) {
      callback(customEvent.detail);
    }
  };
  window.addEventListener('mpq-logins-changed', handleLocalChange);

  const unsub = onSnapshot(
    collection(db, 'logins'),
    (snapshot) => {
      const items: LoginRecord[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<LoginRecord, 'id'>) });
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLocal(STORAGE_KEYS.LOGINS, items);
      callback(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'logins');
      callback(getLocal<LoginRecord[]>(STORAGE_KEYS.LOGINS, cached));
    }
  );

  return () => {
    window.removeEventListener('mpq-logins-changed', handleLocalChange);
    unsub();
  };
}

/**
 * Real-time Presence Listener (for Online active count)
 */
export function subscribePresence(callback: (presence: PresenceRecord[]) => void) {
  const cached = getLocal<PresenceRecord[]>(STORAGE_KEYS.PRESENCE, []);
  callback(cached);

  const unsub = onSnapshot(
    collection(db, 'presence'),
    (snapshot) => {
      const items: PresenceRecord[] = [];
      const now = Date.now();
      snapshot.forEach((d) => {
        const item = { id: d.id, ...(d.data() as Omit<PresenceRecord, 'id'>) };
        // Filter users active in last 5 minutes (300,000 ms)
        if (now - new Date(item.lastSeen).getTime() < 300000) {
          items.push(item);
        }
      });
      setLocal(STORAGE_KEYS.PRESENCE, items);
      callback(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'presence');
      callback(cached);
    }
  );

  return unsub;
}

// ---------------- Database Actions ----------------

function sanitizeData<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export async function addQuestion(q: Omit<Question, 'id'>) {
  const id = `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const cleanQ = sanitizeData(q);
  const newQuestion: Question = { ...cleanQ, id } as Question;

  // Immediately sync local cache
  const cached = getLocal<Question[]>(STORAGE_KEYS.QUESTIONS, []);
  setLocal(STORAGE_KEYS.QUESTIONS, [...cached, newQuestion]);

  try {
    await setDoc(doc(db, 'questions', id), newQuestion);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'questions');
  }
  return newQuestion;
}

export async function updateQuestion(id: string, updates: Partial<Question>) {
  const cleanUpdates = sanitizeData(updates);

  // Immediately sync local cache
  const cached = getLocal<Question[]>(STORAGE_KEYS.QUESTIONS, []);
  setLocal(
    STORAGE_KEYS.QUESTIONS,
    cached.map((q) => (q.id === id ? { ...q, ...cleanUpdates } : q))
  );

  try {
    await updateDoc(doc(db, 'questions', id), cleanUpdates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `questions/${id}`);
  }
}

export async function deleteQuestion(id: string) {
  // Immediately sync local cache
  const cached = getLocal<Question[]>(STORAGE_KEYS.QUESTIONS, []);
  setLocal(
    STORAGE_KEYS.QUESTIONS,
    cached.filter((q) => q.id !== id)
  );

  try {
    await deleteDoc(doc(db, 'questions', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `questions/${id}`);
  }
}

/**
 * Swap two questions positions (e.g. swap position of Q1 and Q8)
 */
export async function swapQuestions(q1: Question, q2: Question) {
  if (!q1.id || !q2.id) return;
  const tempOrder = q1.order ?? 0;
  const newOrder2 = q2.order ?? 0;

  await updateQuestion(q1.id, { order: newOrder2 });
  await updateQuestion(q2.id, { order: tempOrder });
}

export async function addSubject(sub: Omit<Subject, 'id'>) {
  const id = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const cleanSub = sanitizeData(sub);
  const newSub: Subject = { ...cleanSub, id } as Subject;

  // Immediately sync local cache
  const cached = getLocal<Subject[]>(STORAGE_KEYS.SUBJECTS, []);
  setLocal(STORAGE_KEYS.SUBJECTS, [...cached, newSub]);

  try {
    await setDoc(doc(db, 'subjects', id), newSub);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'subjects');
  }
  return newSub;
}

export async function updateSubject(id: string, updates: Partial<Subject>) {
  const cleanUpdates = sanitizeData(updates);

  // Immediately sync local cache
  const cached = getLocal<Subject[]>(STORAGE_KEYS.SUBJECTS, []);
  setLocal(
    STORAGE_KEYS.SUBJECTS,
    cached.map((s) => (s.id === id ? { ...s, ...cleanUpdates } : s))
  );

  try {
    await updateDoc(doc(db, 'subjects', id), cleanUpdates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `subjects/${id}`);
  }
}

export async function deleteSubject(id: string) {
  // Immediately sync local cache
  const cached = getLocal<Subject[]>(STORAGE_KEYS.SUBJECTS, []);
  setLocal(
    STORAGE_KEYS.SUBJECTS,
    cached.filter((s) => s.id !== id)
  );

  try {
    await deleteDoc(doc(db, 'subjects', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `subjects/${id}`);
  }
}

export async function recordLogin(username: string, passwordUsed: string, role: 'user' | 'admin') {
  const id = `login-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const record: LoginRecord = {
    id,
    username,
    passwordUsed,
    timestamp: new Date().toISOString(),
    role,
  };
  const cached = getLocal<LoginRecord[]>(STORAGE_KEYS.LOGINS, []);
  const next = [record, ...cached];
  setLocal(STORAGE_KEYS.LOGINS, next);
  window.dispatchEvent(new CustomEvent('mpq-logins-changed', { detail: next }));

  try {
    await setDoc(doc(db, 'logins', id), record);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'logins');
  }
}

export async function deleteLoginRecord(id: string) {
  const cached = getLocal<LoginRecord[]>(STORAGE_KEYS.LOGINS, []);
  const next = cached.filter((l) => l.id !== id);
  setLocal(STORAGE_KEYS.LOGINS, next);
  window.dispatchEvent(new CustomEvent('mpq-logins-changed', { detail: next }));

  try {
    await deleteDoc(doc(db, 'logins', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `logins/${id}`);
  }
}

export async function deleteLoginsByIds(ids: string[]) {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const cached = getLocal<LoginRecord[]>(STORAGE_KEYS.LOGINS, []);
  const next = cached.filter((l) => !idSet.has(l.id));
  setLocal(STORAGE_KEYS.LOGINS, next);
  window.dispatchEvent(new CustomEvent('mpq-logins-changed', { detail: next }));

  try {
    await Promise.all(ids.map((id) => deleteDoc(doc(db, 'logins', id))));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'logins');
  }
}

export async function updatePresenceHeartbeat(username: string, role: 'user' | 'admin') {
  const safeId = `user-${encodeURIComponent(username).replace(/%/g, '_')}`;
  const record: PresenceRecord = {
    id: safeId,
    username,
    role,
    lastSeen: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'presence', safeId), record, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'presence');
  }
}

export async function submitFeedback(username: string, text: string) {
  const id = `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const item: Feedback = {
    id,
    username,
    text,
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'feedbacks', id), item);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'feedbacks');
  }
  return item;
}

export async function broadcastNotification(message: string, type: 'info' | 'success' | 'warning' = 'info') {
  const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const item: AppNotification = {
    id,
    message,
    timestamp: new Date().toISOString(),
    type,
  };

  const cached = getLocal<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  const next = [item, ...cached.filter((n) => n.id !== id)];
  setLocal(STORAGE_KEYS.NOTIFICATIONS, next);
  window.dispatchEvent(new CustomEvent('mpq-notifications-changed', { detail: next }));

  try {
    await setDoc(doc(db, 'notifications', id), item);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'notifications');
  }
  return item;
}

export async function deleteNotification(id: string) {
  const dismissed = getLocal<string[]>(STORAGE_KEYS.DISMISSED_NOTIFS, []);
  if (!dismissed.includes(id)) {
    setLocal(STORAGE_KEYS.DISMISSED_NOTIFS, [...dismissed, id]);
  }

  const cached = getLocal<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  const next = cached.filter((n) => n.id !== id);
  setLocal(STORAGE_KEYS.NOTIFICATIONS, next);
  window.dispatchEvent(new CustomEvent('mpq-notifications-changed', { detail: next }));

  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
  }
}

export async function deleteAllNotifications(ids: string[]) {
  const dismissed = new Set<string>(getLocal<string[]>(STORAGE_KEYS.DISMISSED_NOTIFS, []));
  dismissed.add('__ALL__');
  ids.forEach((id) => dismissed.add(id));
  setLocal(STORAGE_KEYS.DISMISSED_NOTIFS, Array.from(dismissed));

  setLocal(STORAGE_KEYS.NOTIFICATIONS, []);
  window.dispatchEvent(new CustomEvent('mpq-notifications-changed', { detail: [] }));

  try {
    await Promise.all(ids.map((id) => deleteDoc(doc(db, 'notifications', id))));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'notifications');
  }
}

/**
 * Real-time Paid Users Listener (Track accounts granted lifetime permanent access)
 */
export function subscribePaidUsers(callback: (users: PaidUser[]) => void) {
  const cached = getLocal<PaidUser[]>(STORAGE_KEYS.PAID_USERS, []);
  callback(cached);

  const unsub = onSnapshot(
    collection(db, 'paid_users'),
    (snapshot) => {
      const users: PaidUser[] = [];
      snapshot.forEach((d) => {
        users.push({ id: d.id, ...(d.data() as Omit<PaidUser, 'id'>) });
      });
      users.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
      setLocal(STORAGE_KEYS.PAID_USERS, users);
      callback(users);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'paid_users');
      callback(cached);
    }
  );

  return unsub;
}

/**
 * Check if a username has paid and holds permanent active access
 */
export async function checkIsUserPaid(rawUsername: string): Promise<PaidUser | null> {
  const norm = rawUsername.trim().toLowerCase();
  if (!norm) return null;

  // Check local cache first for instantaneous offline response
  const cached = getLocal<PaidUser[]>(STORAGE_KEYS.PAID_USERS, []);
  const localMatch = cached.find(
    (u) => u.username.trim().toLowerCase() === norm && u.status === 'active' && u.permanentAccess
  );
  if (localMatch) return localMatch;

  try {
    const snap = await getDocFromServer(doc(db, 'paid_users', `user-${encodeURIComponent(norm)}`));
    if (snap.exists()) {
      const data = snap.data() as PaidUser;
      if (data.status === 'active' && data.permanentAccess) {
        return { ...data, id: snap.id };
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `paid_users/user-${norm}`);
  }

  return null;
}

/**
 * Register a user as having paid via the KHQR system and grant permanent access
 */
export async function registerPaidUser(params: {
  username: string;
  phoneNumber?: string;
  transactionRef?: string;
  note?: string;
  method?: string;
}): Promise<PaidUser> {
  const norm = params.username.trim().toLowerCase();
  const id = `user-${encodeURIComponent(norm)}`;
  const now = new Date().toISOString();

  const record: PaidUser = {
    id,
    username: params.username.trim(),
    phoneNumber: params.phoneNumber?.trim() || '',
    amount: 10,
    currency: 'USD',
    paidAt: now,
    status: 'active',
    permanentAccess: true,
    transactionRef: params.transactionRef?.trim() || `KHQR-${Date.now().toString(36).toUpperCase()}`,
    method: params.method || 'KHQR_BAKONG_ABA',
    note: params.note || 'បង់ប្រាក់ជោគជ័យតាម KHQR ($10.00) ទទួលបានសិទ្ធិប្រើប្រាស់ពេញមួយជីវិត',
  };

  // Update local cache immediately
  const cached = getLocal<PaidUser[]>(STORAGE_KEYS.PAID_USERS, []);
  const existingIdx = cached.findIndex((u) => u.id === id);
  if (existingIdx >= 0) {
    cached[existingIdx] = record;
  } else {
    cached.unshift(record);
  }
  setLocal(STORAGE_KEYS.PAID_USERS, cached);

  // Sync to Firestore
  try {
    await setDoc(doc(db, 'paid_users', id), sanitizeData(record), { merge: true });
    // Also broadcast an in-app alert to welcome the member
    await broadcastNotification(
      `🎉 សូមស្វាគមន៍សមាជិក VIP ថ្មី «${record.username}» បានបង់ប្រាក់ $10 ជោគជ័យ និងទទួលបានសិទ្ធិចូលប្រើប្រាស់ពេញមួយជីវិត!`,
      'success'
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'paid_users');
  }

  return record;
}

/**
 * Admin action: Manually grant lifetime permanent access to an account
 */
export async function grantManualPermanentAccess(username: string, note?: string): Promise<PaidUser> {
  return registerPaidUser({
    username,
    method: 'ADMIN_MANUAL',
    note: note || 'អ្នកគ្រប់គ្រង (Admin) បានផ្តល់សិទ្ធិប្រើប្រាស់ពេញមួយជីវិតដោយផ្ទាល់',
    transactionRef: `MANUAL-${Date.now().toString(36).toUpperCase()}`,
  });
}

/**
 * Update paid user status (e.g. revoke or reactivate)
 */
export async function updatePaidUserStatus(id: string, status: 'active' | 'pending' | 'revoked', permanentAccess: boolean) {
  const cached = getLocal<PaidUser[]>(STORAGE_KEYS.PAID_USERS, []);
  setLocal(
    STORAGE_KEYS.PAID_USERS,
    cached.map((u) => (u.id === id ? { ...u, status, permanentAccess } : u))
  );

  try {
    await updateDoc(doc(db, 'paid_users', id), { status, permanentAccess });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `paid_users/${id}`);
  }
}

/**
 * Delete a paid user record
 */
export async function deletePaidUser(id: string) {
  const cached = getLocal<PaidUser[]>(STORAGE_KEYS.PAID_USERS, []);
  setLocal(
    STORAGE_KEYS.PAID_USERS,
    cached.filter((u) => u.id !== id)
  );

  try {
    await deleteDoc(doc(db, 'paid_users', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `paid_users/${id}`);
  }
}

function getBotCommandDocId(command: string): string {
  return command.replace(/^\//, '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Real-time Command Bot Content Listener
 */
export function subscribeBotCommands(
  callback: (commands: Record<string, BotCommandConfig>) => void
) {
  const cached = getLocal<Record<string, BotCommandConfig>>(STORAGE_KEYS.BOT_COMMANDS, {});
  callback(cached);

  const handleLocalChange = (e: Event) => {
    const customEvent = e as CustomEvent<Record<string, BotCommandConfig>>;
    if (customEvent.detail && typeof customEvent.detail === 'object') {
      callback(customEvent.detail);
    }
  };
  window.addEventListener('mpq-bot-commands-changed', handleLocalChange);

  const unsub = onSnapshot(
    collection(db, 'bot_commands'),
    (snapshot) => {
      const map: Record<string, BotCommandConfig> = {};
      snapshot.forEach((d) => {
        const data = d.data() as BotCommandConfig;
        if (data?.command) {
          map[data.command] = data;
        }
      });
      setLocal(STORAGE_KEYS.BOT_COMMANDS, map);
      callback(map);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'bot_commands');
      callback(getLocal<Record<string, BotCommandConfig>>(STORAGE_KEYS.BOT_COMMANDS, cached));
    }
  );

  return () => {
    window.removeEventListener('mpq-bot-commands-changed', handleLocalChange);
    unsub();
  };
}

export async function saveBotCommandConfig(config: BotCommandConfig) {
  const docId = getBotCommandDocId(config.command);
  const payload = sanitizeData({
    command: config.command.trim().slice(0, 32),
    titleKh: (config.titleKh || '').trim().slice(0, 120),
    descriptionKh: config.descriptionKh.trim().slice(0, 200),
    title: config.title.trim().slice(0, 250),
    body: config.body.slice(0, 4000),
    imageUrl: config.imageUrl ? config.imageUrl.trim().slice(0, 500) : undefined,
    imageAlt: config.imageAlt ? config.imageAlt.trim().slice(0, 200) : undefined,
    actions: (config.actions || [])
      .slice(0, 10)
      .filter((a) => a.label.trim() && a.value.trim())
      .map((a) => ({
        label: a.label.trim().slice(0, 120),
        type: a.type,
        value: a.value.trim().slice(0, 400),
      })),
    updatedAt: new Date().toISOString(),
  }) as BotCommandConfig;

  const cached = getLocal<Record<string, BotCommandConfig>>(STORAGE_KEYS.BOT_COMMANDS, {});
  const next = { ...cached, [payload.command]: payload };
  setLocal(STORAGE_KEYS.BOT_COMMANDS, next);
  window.dispatchEvent(new CustomEvent('mpq-bot-commands-changed', { detail: next }));

  try {
    await setDoc(doc(db, 'bot_commands', docId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `bot_commands/${docId}`);
    throw err;
  }

  await syncTelegramBotTemplates(next);
  return payload;
}

export async function resetBotCommandConfig(command: string) {
  const docId = getBotCommandDocId(command);
  const cached = getLocal<Record<string, BotCommandConfig>>(STORAGE_KEYS.BOT_COMMANDS, {});
  const next = { ...cached };
  delete next[command];
  setLocal(STORAGE_KEYS.BOT_COMMANDS, next);
  window.dispatchEvent(new CustomEvent('mpq-bot-commands-changed', { detail: next }));

  try {
    await deleteDoc(doc(db, 'bot_commands', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `bot_commands/${docId}`);
  }

  await syncTelegramBotTemplates(next);
}

export async function resetAllBotCommands(commands: string[]) {
  setLocal(STORAGE_KEYS.BOT_COMMANDS, {});
  window.dispatchEvent(new CustomEvent('mpq-bot-commands-changed', { detail: {} }));

  try {
    await Promise.all(
      commands.map((cmd) => deleteDoc(doc(db, 'bot_commands', getBotCommandDocId(cmd))))
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'bot_commands');
  }

  await syncTelegramBotTemplates({});
}
