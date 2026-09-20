import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentSingleTabManager,
  persistentMultipleTabManager, 
  memoryLocalCache,
  getFirestore,
  setLogLevel,
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

// Silence Firestore internal diagnostic log warnings (including multi-tab lease clock skew warnings)
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Intercept benign Firestore multi-tab lease clock drift warning
if (typeof window !== 'undefined') {
  const origConsoleError = console.error;
  console.error = function (...args: any[]) {
    const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
    if (msg.includes('Detected an update time that is in the future')) {
      return;
    }
    origConsoleError.apply(console, args);
  };
}

const app = initializeApp(firebaseConfig);

// Detect iframe or iOS or Safari where persistentMultipleTabManager / Web Locks often conflict or deadlock
const isIframe = typeof window !== 'undefined' && window.self !== window.top;
const isIOSOrSafari = typeof navigator !== 'undefined' && (
  /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent || '')
);

let firestoreDb;
try {
  // Use persistentSingleTabManager in iframes or on iOS/Safari to completely eliminate lease conflicts and clock skew warnings
  const tabManager = (isIframe || isIOSOrSafari) ? persistentSingleTabManager({}) : persistentMultipleTabManager();
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({
      tabManager
    })
  }, firebaseConfig.firestoreDatabaseId);
} catch (e1) {
  console.warn("Falling back to single tab / memory cache for Firestore:", e1);
  try {
    firestoreDb = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: memoryLocalCache()
    }, firebaseConfig.firestoreDatabaseId);
  } catch (e2) {
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = firestoreDb;
export const auth = getAuth(app);

// Critical: Test connection on boot to diagnose network/config issues
export async function testConnection() {
  try {
    // Attempt to fetch a dummy document from the server to verify connectivity
    // If we get "Missing or insufficient permissions", it actually means we ARE connected
    // because the server responded with that error.
    await getDocFromServer(doc(db, '_internal_', 'connection_test'));
    console.log("Firestore connection verified.");
    return true;
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      // If we get "Missing or insufficient permissions", it confirms the server is reachable and active
      if ((error as any).code === 'permission-denied' || msg.includes('permission')) {
        console.log("Firestore connection verified (server reached).");
        return true;
      }

      const isQuotaOrOffline = (error as any).code === 'resource-exhausted' || 
                               (error as any).code === 'unavailable' ||
                               msg.includes('quota') || 
                               msg.includes('exhausted');
      
      if (isQuotaOrOffline && typeof window !== 'undefined') {
        console.warn("Firebase Connection Test indicated Limit or Connectivity issue. Switching to Local Database fallback.");
        (window as any).isFirestoreQuotaExceeded = true;
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
        return true;
      }

      if (error.message.includes('the client is offline')) {
        console.error("Firestore Error: The client is offline. Check network/Firebase config.");
      } else {
        console.error("Firestore Connection Error:", error.message);
      }
    }
    return false;
  }
}
