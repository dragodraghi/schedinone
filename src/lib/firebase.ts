import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

// Enable IndexedDB-backed offline persistence: game/match/leaderboard data
// loads instantly from cache on reopen and the app keeps working without a
// connection (writes are queued and flushed when the network returns).
// Falls back to the default in-memory cache where IndexedDB is unavailable
// (e.g. the test runner or private-mode browsers) so init never throws.
function createDb() {
  try {
    if (typeof indexedDB !== "undefined") {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    }
  } catch (err) {
    console.warn("[firebase] persistent cache unavailable, using default cache", err);
  }
  return getFirestore(app);
}

export const db = createDb();
export const auth = getAuth(app);
export const functions = getFunctions(app, "europe-west1");
