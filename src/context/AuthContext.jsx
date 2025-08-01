import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase'; // Ensure this points to your Firebase configuration
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let tokenRefreshInterval;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('Auth state changed:', currentUser);
      if (currentUser) {
        try {
          // Force token refresh on sign-in
          await currentUser.getIdToken(true);
          
          // Set up periodic token refresh every 30 minutes
          tokenRefreshInterval = setInterval(async () => {
            try {
              await currentUser.getIdToken(true);
            } catch (error) {
              console.error('Token refresh failed:', error);
            }
          }, 30 * 60 * 1000); // 30 minutes
        } catch (error) {
          console.error('Initial token refresh failed:', error);
        }
      } else {
        // Clear token refresh interval when user signs out
        if (tokenRefreshInterval) {
          clearInterval(tokenRefreshInterval);
        }
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  const value = { 
    user, 
    loading,
    logout,
    isAuthenticated: !!user 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
