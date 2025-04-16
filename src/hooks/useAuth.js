```javascript
// If you have a useAuth hook, add this to ensure the settings are properly loaded with auth state changes

// ...existing code...

// Load user settings when auth state changes
useEffect(() => {
  const loadUserSettings = async () => {
    if (currentUser) {
      try {
        const settings = await firebaseService.getSettingsDoc();
        
        if (settings) {
          // Update theme if available
          if (settings.theme) {
            localStorage.setItem('theme', settings.theme);
            // If you have a toggle theme function
            if (typeof toggleTheme === 'function') {
              toggleTheme(settings.theme);
            }
          }
          
          // Save avatar in localStorage for quick access
          if (settings.avatar) {
            localStorage.setItem(`user_avatar_${currentUser.uid}`, settings.avatar);
          }
        }
      } catch (error) {
        console.error("Error loading user settings:", error);
      }
    }
  };
  
  loadUserSettings();
}, [currentUser]);

// ...existing code...
```