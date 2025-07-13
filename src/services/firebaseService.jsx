import { auth, db } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection,
  query,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { toast } from 'react-toastify';

class FirebaseService {
  constructor() {
    this.unsubscribers = [];
    this.isInitialized = false;
    this.cachedSettings = null;
    this.settingsLastFetched = 0;
    this.initializationPromise = null;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.hadPermissionIssue = false;
  }

  async ensureInitialized() {
    if (this.isInitialized) return true;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.initializeWithRetry();
    const result = await this.initializationPromise;
    this.initializationPromise = null;
    return result;
  }

  async initializeWithRetry() {
    let retries = this.maxRetries;
    while (retries > 0) {
      try {
        await this.waitForAuth();
        const result = await this.initializeUserDocuments();
        this.isInitialized = result;
        return result;
      } catch (error) {
        retries--;
        console.warn(`Initialization attempt failed (${retries} retries left):`, error);
        if (retries === 0) {
          this.isInitialized = false;
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        this.retryDelay *= 2; // Exponential backoff
      }
    }
    return false;
  }

  async waitForAuth() {
    if (!auth.currentUser) {
      return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            unsubscribe();
            resolve(true);
          }
        });
        // Add timeout to prevent hanging
        setTimeout(() => {
          unsubscribe();
          resolve(false);
        }, 10000); // 10 second timeout
      });
    }
    return true;
  }

  async initializeUserDocuments() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user logged in when initializing documents');
        return false;
      }

      // Create base user document if it doesn't exist
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          email: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Create or get settings document
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'userSettings');
      const settingsDoc = await getDoc(settingsRef);

      if (!settingsDoc.exists()) {
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
        this.cachedSettings = defaultSettings;
        this.settingsLastFetched = Date.now();
      } else {
        this.cachedSettings = settingsDoc.data();
        this.settingsLastFetched = Date.now();
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Error initializing user documents:", error);
      this.isInitialized = false;
      
      if (error.code === 'permission-denied') {
        await this.handlePermissionError(error, 'initialization');
      } else {
        toast.error('Failed to initialize user data. Please try logging out and back in.');
      }
      
      throw error;
    }
  }

  // Get settings document from Firestore, with cache management and error handling
  async getSettingsDoc(useCache = true) {
    try {
      await this.ensureInitialized();
      
      const user = auth.currentUser;
      if (!user) {
        console.log('No user logged in when getting settings');
        return null;
      }
      
      // Return cached settings if available and valid
      const cacheAge = Date.now() - this.settingsLastFetched;
      if (useCache && this.cachedSettings && cacheAge < 300000) { // 5 minutes
        return this.cachedSettings;
      }

      const settingsRef = doc(db, 'users', user.uid, 'settings', 'userSettings');
      const docSnap = await getDoc(settingsRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const processedData = this.processTimestamps(data);
        this.cachedSettings = processedData;
        this.settingsLastFetched = Date.now();
        return processedData;
      }
      
      // If no settings exist, try to initialize
      await this.initializeUserDocuments();
      return this.cachedSettings;
    } catch (error) {
      console.error('Error fetching settings document:', error);
      if (error.code === 'permission-denied') {
        await this.handlePermissionError(error, 'fetching settings');
      }
      return this.cachedSettings || null;
    }
  }

  processTimestamps(data) {
    if (!data) return data;
    
    const processed = { ...data };
    Object.keys(processed).forEach((key) => {
      if (processed[key] && typeof processed[key].toDate === 'function') {
        processed[key] = processed[key].toDate().toISOString();
      } else if (processed[key] && typeof processed[key] === 'object') {
        processed[key] = this.processTimestamps(processed[key]);
      }
    });
    
    return processed;
  }
  async handlePermissionError(error, operation) {
    console.warn(`Permission denied during ${operation}:`, error);
    this.hadPermissionIssue = true;
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      
      // Force token refresh
      await user.getIdToken(true);
      
      // Verify the token was refreshed
      const newToken = await user.getIdToken();
      if (!newToken) {
        throw new Error('Failed to obtain new token');
      }
      
      this.hadPermissionIssue = false;
      toast.success('Permissions refreshed successfully');
      return true;
    } catch (refreshError) {
      console.error('Failed to refresh token:', refreshError);
      toast.error('Permission error. Please try logging out and back in.', {
        toastId: 'permission-error',
        autoClose: 5000
      });
      return false;
    }
  }

  cleanup() {
    this.unsubscribers.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    
    this.unsubscribers = [];
    this.isInitialized = false;
    this.cachedSettings = null;
    this.settingsLastFetched = 0;
    this.initializationPromise = null;
    
    return true;
  }
}

const firebaseService = new FirebaseService();
export default firebaseService;
