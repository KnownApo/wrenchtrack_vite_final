import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

// This is a temporary component to debug settings loading issues
const SettingsDebugger = () => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const debugSettings = async () => {
      try {
        setLoading(true);
        
        if (!auth.currentUser) {
          setError("No user logged in");
          setLoading(false);
          return;
        }
        
        const userId = auth.currentUser.uid;
        const debugResults = {
          userId,
          locations: {}
        };
        
        // Check primary location
        try {
          const settingsRef = doc(db, 'users', userId, 'settings', 'userSettings');
          const settingsSnapshot = await getDoc(settingsRef);
          debugResults.locations.primary = {
            exists: settingsSnapshot.exists(),
            data: settingsSnapshot.exists() ? settingsSnapshot.data() : null
          };
        } catch (e) {
          debugResults.locations.primary = { error: e.message };
        }
        
        // Check user document
        try {
          const userRef = doc(db, 'users', userId);
          const userSnapshot = await getDoc(userRef);
          debugResults.locations.userDocument = {
            exists: userSnapshot.exists(),
            hasSettings: userSnapshot.exists() && !!userSnapshot.data().settings,
            data: userSnapshot.exists() ? (userSnapshot.data().settings || null) : null
          };
        } catch (e) {
          debugResults.locations.userDocument = { error: e.message };
        }
        
        // Check old location
        try {
          const oldSettingsRef = doc(db, 'settings', userId);
          const oldSettingsSnapshot = await getDoc(oldSettingsRef);
          debugResults.locations.oldLocation = {
            exists: oldSettingsSnapshot.exists(),
            data: oldSettingsSnapshot.exists() ? oldSettingsSnapshot.data() : null
          };
        } catch (e) {
          debugResults.locations.oldLocation = { error: e.message };
        }
        
        // Check localStorage backup
        try {
          const backupKey = `settings_backup_${userId}`;
          const backupStr = localStorage.getItem(backupKey);
          debugResults.locations.localStorage = {
            exists: !!backupStr,
            data: backupStr ? JSON.parse(backupStr) : null
          };
        } catch (e) {
          debugResults.locations.localStorage = { error: e.message };
        }
        
        setResults(debugResults);
        toast.success("Debug scan complete");
      } catch (error) {
        setError(error.message);
        toast.error("Error debugging settings");
      } finally {
        setLoading(false);
      }
    };
    
    debugSettings();
  }, []);
  
  if (loading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <div className="settings-debugger">
        <h1>Settings Debugger</h1>
        <div className="error-message">Error: {error}</div>
      </div>
    );
  }
  
  return (
    <div className="settings-debugger">
      <h1>Settings Debugger</h1>
      
      <div className="debug-info">
        <h2>User ID: {results.userId}</h2>
        
        <div className="location-results">
          <h3>Primary Location (users/{results.userId}/settings/userSettings)</h3>
          {results.locations.primary?.error ? (
            <p className="error">Error: {results.locations.primary.error}</p>
          ) : results.locations.primary?.exists ? (
            <div>
              <p className="success">✓ Settings found!</p>
              <pre>{JSON.stringify(results.locations.primary.data, null, 2)}</pre>
            </div>
          ) : (
            <p className="warning">No settings found in primary location</p>
          )}
          
          <h3>User Document (users/{results.userId})</h3>
          {results.locations.userDocument?.error ? (
            <p className="error">Error: {results.locations.userDocument.error}</p>
          ) : results.locations.userDocument?.hasSettings ? (
            <div>
              <p className="success">✓ Settings found in user document!</p>
              <pre>{JSON.stringify(results.locations.userDocument.data, null, 2)}</pre>
            </div>
          ) : (
            <p className="warning">No settings found in user document</p>
          )}
          
          <h3>Old Location (settings/{results.userId})</h3>
          {results.locations.oldLocation?.error ? (
            <p className="error">Error: {results.locations.oldLocation.error}</p>
          ) : results.locations.oldLocation?.exists ? (
            <div>
              <p className="success">✓ Settings found in old location!</p>
              <pre>{JSON.stringify(results.locations.oldLocation.data, null, 2)}</pre>
            </div>
          ) : (
            <p className="warning">No settings found in old location</p>
          )}
          
          <h3>LocalStorage Backup</h3>
          {results.locations.localStorage?.error ? (
            <p className="error">Error: {results.locations.localStorage.error}</p>
          ) : results.locations.localStorage?.exists ? (
            <div>
              <p className="success">✓ Settings found in localStorage!</p>
              <pre>{JSON.stringify(results.locations.localStorage.data, null, 2)}</pre>
            </div>
          ) : (
            <p className="warning">No settings found in localStorage</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsDebugger;
