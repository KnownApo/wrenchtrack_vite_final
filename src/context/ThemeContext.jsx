import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Create the Theme context
const ThemeContext = createContext();

// Export a hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  // Load user's theme preference from localStorage or default to 'light'
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // First check localStorage
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme) {
          setTheme(savedTheme);
          document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        } else if (auth.currentUser) {
          // Try to get theme from user settings in Firestore
          const userSettingsRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'userSettings');
          const docSnap = await getDoc(userSettingsRef);
          
          if (docSnap.exists() && docSnap.data().theme) {
            const userTheme = docSnap.data().theme;
            setTheme(userTheme);
            document.documentElement.classList.toggle('dark', userTheme === 'dark');
            
            // Save to localStorage for future quick access
            localStorage.setItem('theme', userTheme);
          }
        }
      } catch (error) {
        console.error('Error fetching user theme:', error);
      }
    };
    
    loadTheme();
  }, []);
  
  // Toggle between light and dark themes
  const toggleTheme = (newTheme) => {
    // If no theme is provided, toggle between light and dark
    if (!newTheme) {
      newTheme = theme === 'light' ? 'dark' : 'light';
    }
    
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
    
    // If user is logged in, try to save to Firestore
    if (auth.currentUser) {
      const userSettingsRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'userSettings');
      
      // Use updateDoc to prevent overwriting other settings
      try {
        import('firebase/firestore').then(({ updateDoc, setDoc, serverTimestamp }) => {
          getDoc(userSettingsRef).then(docSnap => {
            if (docSnap.exists()) {
              updateDoc(userSettingsRef, { theme: newTheme, updatedAt: serverTimestamp() });
            } else {
              setDoc(userSettingsRef, { theme: newTheme, createdAt: serverTimestamp() });
            }
          });
        });
      } catch (error) {
        console.error('Error updating theme in Firestore:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
