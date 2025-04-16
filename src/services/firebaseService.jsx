import { auth, db } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection,
  query,
  getDocs,
  serverTimestamp,
  enableIndexedDbPersistence,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { toast } from 'react-toastify';

// Try to enable persistence for offline capabilities
try {
  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Persistence could not be enabled - multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Persistence not supported on this browser');
      }
    });
} catch (error) {
  console.warn('Error setting up persistence:', error);
}

class FirebaseService {
  constructor() {
    this.unsubscribers = [];
    this.isInitialized = false;
    this.cachedSettings = null;
    this.settingsLastFetched = 0;
  }
  
  // Initialize user documents - creates default documents if they don't exist
  async initializeUserDocuments() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user logged in when initializing documents');
        return null;
      }
      
      if (this.isInitialized) {
        console.log('User documents already initialized');
        return true;
      }
      
      console.log(`Initializing documents for user: ${user.uid}`);
      
      // Create settings document if it doesn't exist
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'userSettings');
      const settingsDoc = await getDoc(settingsRef);
      
      if (!settingsDoc.exists()) {
        console.log('Settings document does not exist, creating...');
        const defaultSettings = {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          theme: 'light',
          businessInfo: {
            name: '',
            email: user.email || '',
            phone: '',
            address: '',
            city: '',
            state: '',
            zip: '',
            website: '',
            taxId: ''
          },
          preferences: {
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            timezone: 'America/New_York',
            defaultInvoiceTitle: 'Invoice',
            invoiceTerms: 'Net 30',
            invoiceNotes: 'Thank you for your business!'
          },
          notifications: {
            emailNotifications: true,
            smsNotifications: false,
            invoiceReminders: true,
            marketingEmails: false
          },
          security: {
            twoFactorEnabled: false,
            passwordLastChanged: 'Never'
          },
          subscription: {
            plan: 'Free',
            billingCycle: 'Monthly',
            nextBillingDate: 'N/A',
            paymentMethod: 'None'
          }
        };
        
        await setDoc(settingsRef, defaultSettings);
        console.log('Settings document created successfully');
        
        // Cache the default settings
        this.cachedSettings = defaultSettings;
        this.settingsLastFetched = Date.now();
      } else {
        console.log('Settings document exists');
        // Cache the existing settings
        const data = settingsDoc.data();
        this.cachedSettings = data;
        this.settingsLastFetched = Date.now();
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Error initializing user documents:", error);
      return false;
    }
  }

  // Cleanup function to remove listeners and perform cleanup
  cleanup() {
    console.log('Cleaning up Firebase service');
    
    // Unsubscribe from any active listeners
    this.unsubscribers.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    
    this.unsubscribers = [];
    this.isInitialized = false;
    this.cachedSettings = null;
    this.settingsLastFetched = 0;
    
    return true;
  }

  // Get settings document from Firestore, with cache management
  async getSettingsDoc(useCache = true) {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user logged in when getting settings');
        return null;
      }
      
      // Return cached settings if available and useCache is true and cache is fresh (less than 5 minutes old)
      const cacheAge = Date.now() - this.settingsLastFetched;
      if (useCache && this.cachedSettings && cacheAge < 300000) { // 5 minutes
        console.log('Returning cached settings (age: ' + (cacheAge/1000).toFixed(1) + 's)');
        return this.cachedSettings;
      }
      
      console.log('Fetching fresh settings from Firestore');
      
      // Create path to user settings document
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'userSettings');
      
      // Get document from Firestore
      const docSnap = await getDoc(settingsRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Process timestamps if needed
        const processedData = this.processTimestamps(data);
        
        this.cachedSettings = processedData; // Update cache
        this.settingsLastFetched = Date.now();
        
        console.log('Settings loaded successfully from Firestore');
        return processedData;
      } else {
        console.log('No settings document exists, will initialize');
        
        // Initialize user documents which will create default settings
        await this.initializeUserDocuments();
        
        // Try to get the settings again
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
      console.error('Error fetching settings document:', error);
      
      // Handle permission errors differently
      if (error.code === 'permission-denied') {
        toast.error('Permission denied - please check your account permissions', {
          toastId: 'permission-denied'
        });
      }
      
      return this.cachedSettings || null; // Return cached settings as fallback
    }
  }

  // Process any Firestore timestamps in the document
  processTimestamps(data) {
    if (!data) return data;
    
    const processed = { ...data };
    
    // Convert any timestamp objects to ISO strings for easier handling
    Object.keys(processed).forEach(key => {
      if (processed[key] && typeof processed[key].toDate === 'function') {
        processed[key] = processed[key].toDate().toISOString();
      } else if (processed[key] && typeof processed[key] === 'object') {
        processed[key] = this.processTimestamps(processed[key]);
      }
    });
    
    return processed;
  }

  // Update settings document
  async updateSettingsDocument(data) {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user logged in when updating settings');
        return false;
      }
      
      // Reference to user settings doc
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'userSettings');
      
      // Add timestamp to updates
      const updatedData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      console.log('Updating settings document with:', updatedData);
      
      try {
        // Use merge: true to only update specified fields
        await setDoc(settingsRef, updatedData, { merge: true });
        console.log('Settings document updated successfully');
        
        // Update the cache with the new settings
        if (this.cachedSettings) {
          this.cachedSettings = {
            ...this.cachedSettings,
            ...data,
            updatedAt: new Date().toISOString() // Use ISO string as our cached timestamps are processed
          };
          this.settingsLastFetched = Date.now();
        }
        
        return true;
      } catch (error) {
        console.error('Error updating settings document:', error);
        this.handleFirestoreError(error);
        return false;
      }
    } catch (error) {
      console.error('General error in updateSettingsDocument:', error);
      this.handleFirestoreError(error);
      return false;
    }
  }

  // Specific error handler for Firestore errors
  handleFirestoreError(error) {
    switch (error.code) {
      case 'permission-denied':
        toast.error('Permission denied. Please check your account permissions.', {
          toastId: 'permission-denied-error'
        });
        break;
      case 'unavailable':
        toast.error('Service temporarily unavailable. Please try again later.', {
          toastId: 'service-unavailable'
        });
        break;
      case 'unauthenticated':
        toast.error('Authentication required. Please log in again.', {
          toastId: 'auth-required'
        });
        break;
      default:
        toast.error('An error occurred with the database. Please try again.', {
          toastId: 'generic-error'
        });
    }
  }
  
  // Get user avatar
  async getUserAvatar() {
    try {
      const settings = await this.getSettingsDoc(true);
      return settings?.avatar || '';
    } catch (error) {
      console.error('Error getting user avatar:', error);
      return '';
    }
  }
}

const firebaseService = new FirebaseService();
export default firebaseService;
