import { db, auth, storage } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';

class FirebaseService {
  constructor() {
    this.db = db;
    this.auth = auth;
    this.storage = storage;
  }

  async getUserDoc(path) {
    try {
      const userDoc = doc(this.db, 'users', this.auth.currentUser.uid, ...path.split('/'));
      const docSnap = await getDoc(userDoc);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('Failed to fetch data');
      throw error;
    }
  }

  async saveDocument(collection, data) {
    try {
      const userCollection = collection(this.db, 'users', this.auth.currentUser.uid, collection);
      const docRef = await addDoc(userCollection, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: this.auth.currentUser.uid
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save data');
      throw error;
    }
  }

  async uploadFile(file, path) {
    try {
      const storageRef = ref(this.storage, `users/${this.auth.currentUser.uid}/${path}`);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
      throw error;
    }
  }
}

export default new FirebaseService();
