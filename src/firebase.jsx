import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC1OvuWfeL1EQefe_O7jv7czOsCsTwYAgA",
  authDomain: "termsbuilder.firebaseapp.com",
  projectId: "termsbuilder",
  storageBucket: "termsbuilder.firebasestorage.app",
  messagingSenderId: "1065252219949",
  appId: "1:1065252219949:web:59e43be88da0ba02d79ca4",
  measurementId: "G-CWWKBJZ3J2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
