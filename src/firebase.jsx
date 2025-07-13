import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, enableNetwork, disableNetwork, onSnapshotsInSync } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC1OvuWfeL1EQefe_O7jv7czOsCsTwYAgA",
  authDomain: "termsbuilder.firebaseapp.com",
  projectId: "termsbuilder",
  storageBucket: "termsbuilder.appspot.com",
  messagingSenderId: "1065252219949",
  appId: "1:1065252219949:web:59e43be88da0ba02d79ca4",
  measurementId: "G-CWWKBJZ3J2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

let networkEnabled = true;

// Enable offline persistence with retry mechanism
const initializeFirestore = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      await enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
          console.warn('The current browser does not support persistence.');
        }
      });
      
      // Set up sync listener
      onSnapshotsInSync(db, () => {
        console.log('Firestore sync complete');
      });
      
      return true;
    } catch (err) {
      retries--;
      console.warn(`Persistence initialization attempt failed (${retries} retries left):`, err);
      
      if (retries === 0) {
        console.error('Failed to enable persistence after all retries');
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
};

// Initialize Firestore
initializeFirestore().catch(console.error);

// Token refresh and error recovery mechanism
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      // Initial token refresh
      await user.getIdToken(true);
      
      // Set up token refresh interval (every 30 minutes)
      const tokenRefreshInterval = setInterval(async () => {
        try {
          if (!auth.currentUser) {
            clearInterval(tokenRefreshInterval);
            return;
          }
          await auth.currentUser.getIdToken(true);
        } catch (error) {
          console.error('Token refresh failed:', error);
          if (error.code === 'auth/network-request-failed') {
            // Handle offline case
            console.log('Network unavailable, will retry token refresh when online');
          }
        }
      }, 30 * 60 * 1000);
      
      // Set up network state handlers
      const handleConnectionError = async (error) => {
        if (error.code === 'permission-denied' && networkEnabled) {
          try {
            networkEnabled = false;
            await disableNetwork(db);
            // Force token refresh
            await user.getIdToken(true);
            await enableNetwork(db);
            networkEnabled = true;
          } catch (e) {
            console.error('Error recovering from permission denied:', e);
            networkEnabled = true; // Reset flag even on error
          }
        }
      };

      // Set up online/offline handlers
      window.addEventListener('online', async () => {
        if (!networkEnabled) {
          try {
            await enableNetwork(db);
            networkEnabled = true;
          } catch (e) {
            console.error('Error re-enabling network:', e);
          }
        }
      });

      window.addEventListener('offline', async () => {
        if (networkEnabled) {
          try {
            await disableNetwork(db);
            networkEnabled = false;
          } catch (e) {
            console.error('Error disabling network:', e);
          }
        }
      });

    } catch (error) {
      console.error('Error during auth initialization:', error);
    }
  }
});
