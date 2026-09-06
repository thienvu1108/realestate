import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  getFirestore,
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
