import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Critical: Test connection on boot to diagnose network/config issues
export async function testConnection() {
  try {
    // Attempt to fetch a dummy document from the server to verify connectivity
    await getDocFromServer(doc(db, '_internal_', 'connection_test'));
    console.log("Firestore connection verified.");
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("Firestore Error: The client is offline. Check network/Firebase config.");
      } else {
        console.error("Firestore Connection Error:", error.message);
      }
    }
    return false;
  }
}
