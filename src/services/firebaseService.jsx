import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from 'react-toastify';

class FirebaseService {
  constructor() {
    this.cachedSettings = null;
    this.settingsLastFetched = 0;
  }

  async getSettingsDoc(forceRefresh = false) {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user logged in when fetching settings');
        return null;
      }

      const settingsRef = doc(db, 'users', user.uid, 'settings', 'userSettings');
      
      if (!forceRefresh && this.cachedSettings && (Date.now() - this.settingsLastFetched) < 300000) {
        console.log('Returning cached settings');
        return this.cachedSettings;
      }

      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        const processedData = this.processTimestamps(data);
        this.cachedSettings = processedData;
        this.settingsLastFetched = Date.now();
        console.log('Settings loaded from Firestore');
        return processedData;
      } else {
        console.log('Initializing new settings');
        await this.initializeUserDocuments();
        const newSettingsSnap = await getDoc(settingsRef);
        if (newSettingsSnap.exists()) {
          const data = newSettingsSnap.data();
          this.cachedSettings = data;
          this.settingsLastFetched = Date.now();
          return data;
        }
        return null;
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      if (error.code === 'permission-denied') {
        toast.error('Permission denied - check account permissions');
      }
      return this.cachedSettings || null;
    }
  }

  processTimestamps(data) {
    if (!data) return data;
    const processed = { ...data };
    Object.keys(processed).forEach(key => {
      if (processed[key] && typeof processed[key].toDate === 'function') {
        processed[key] = processed[key].toDate().toISOString();
      } else if (processed[key] && typeof processed[key] === 'object') {
        processed[key] = this.processTimestamps(processed[key]);
      }
    });
    return processed;
  }

  async updateSettingsDocument(data) {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user logged in for update');
        return false;
      }
      
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'userSettings');
      const updatedData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      console.log('Updating settings with:', updatedData);
      await setDoc(settingsRef, updatedData, { merge: true });
      console.log('Settings updated successfully');
      
      this.cachedSettings = {
        ...this.cachedSettings,
        ...data,
        updatedAt: new Date().toISOString()
      };
      this.settingsLastFetched = Date.now();
      
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      this.handleFirestoreError(error);
      return false;
    }
  }

  handleFirestoreError(error) {
    toast.error(`Firestore error: ${error.message || 'Unknown'}`);
  }

  async initializeUserDocuments() {
    const user = auth.currentUser;
    if (!user) return;
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'userSettings');
    await setDoc(settingsRef, { createdAt: serverTimestamp() }, { merge: true });
  }
}

export default new FirebaseService();