import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebase'; // Ensure this points to your Firebase configuration
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser); // Log the user object
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  const value = { user };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
