import React, { useState, useEffect } from 'react';
// Removed Firebase imports to use only local storage
import { useAuth } from '../context/AuthContext';

// Sample operations data for local use
const SAMPLE_OPERATIONS = [
  {
    id: "op1",
    name: "Oil Change",
    description: "Standard oil and filter change service",
    standardHours: 0.5,
    searchTerms: ["oil", "change", "filter", "lube"]
  },
  {
    id: "op2",
    name: "Brake Pad Replacement - Front",
    description: "Remove and replace front brake pads",
    standardHours: 1.0,
    searchTerms: ["brake", "pad", "front", "replace"]
  },
  {
    id: "op3",
    name: "Brake Pad Replacement - Rear",
    description: "Remove and replace rear brake pads",
    standardHours: 1.2,
    searchTerms: ["brake", "pad", "rear", "replace"]
  },
  {
    id: "op4",
    name: "Timing Belt Replacement",
    description: "Remove and replace timing belt and tensioner",
    standardHours: 3.5,
    searchTerms: ["timing", "belt", "replace"]
  },
  {
    id: "op5",
    name: "Alternator Replacement",
    description: "Remove and replace alternator",
    standardHours: 1.8,
    searchTerms: ["alternator", "replace", "electrical"]
  }
];

// Local storage key for labor guide operations
const LABOR_GUIDE_STORAGE_KEY = 'wrenchtrack_labor_guide';

// Export functions for use in other components
export function getAllOperations() {
  try {
    console.log('getAllOperations called from laborGuideDebugger');
    const storedOps = localStorage.getItem(LABOR_GUIDE_STORAGE_KEY);
    console.log('Retrieved from localStorage:', storedOps ? 'Data found' : 'No data found');
    
    if (storedOps) {
      const parsedOps = JSON.parse(storedOps);
      console.log(`Parsed ${parsedOps.length} operations from localStorage`);
      return parsedOps;
    } else {
      console.log('No operations in localStorage, returning empty array');
      // If nothing in storage, return sample operations instead of empty array
      return SAMPLE_OPERATIONS;
    }
  } catch (err) {
    console.error('Error getting operations from localStorage:', err);
    console.log('Returning sample operations due to error');
    // Return sample operations on error instead of empty array
    return SAMPLE_OPERATIONS;
  }
}

// Reset to sample operations and return them
export function resetToSampleOperations() {
  try {
    localStorage.setItem(LABOR_GUIDE_STORAGE_KEY, JSON.stringify(SAMPLE_OPERATIONS));
    return SAMPLE_OPERATIONS;
  } catch (err) {
    console.error('Error setting sample operations in localStorage:', err);
    return [];
  }
}

/**
 * This component is used for debugging labor guide data issues.
 * It provides tools to inspect, reset, and setup the labor guide.
 */
export default function LaborGuideDebugger() {
  const { user } = useAuth();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState('');
  const [error, setError] = useState(null);
  const [dbStatus, setDbStatus] = useState({
    connected: false,
    message: 'Checking database connection...'
  });

  // Check Firestore connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setDbStatus({
          connected: false,
          message: 'Checking Firestore connection...'
        });

        console.log("Checking Firestore connection:");
        console.log("Current user:", user ? `ID: ${user.uid}` : 'Not logged in');
        console.log("Firestore instance:", db);

        if (!user) {
          setDbStatus({
            connected: false,
            message: 'Not logged in. Please log in to access the database.'
          });
          return;
        }

        // Try to access a test document to verify permissions
        try {
          // First, try to check if the collection exists
          console.log("Attempting to access laborGuide collection...");
          const testQuery = query(collection(db, 'laborGuide'));
          const testSnapshot = await getDocs(testQuery);
          
          setDbStatus({
            connected: true,
            message: `Connected to Firestore. User: ${user.email}. Found ${testSnapshot.size} operations.`
          });
        } catch (err) {
          console.error("Error accessing collection:", err);
          
          if (err.code === 'permission-denied') {
            setDbStatus({
              connected: false,
              message: `Permission denied: You don't have access to the laborGuide collection. Error: ${err.message}`
            });
          } else {
            setDbStatus({
              connected: false,
              message: `Error connecting to Firestore: ${err.code} - ${err.message}`
            });
          }
        }
      } catch (err) {
        console.error("General error checking connection:", err);
        setDbStatus({
          connected: false,
          message: `Error: ${err.message}`
        });
      }
    };

    checkConnection();
  }, [user]);

  // Load labor guide data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Loading labor guide data...");
      if (!user) {
        throw new Error("Not logged in");
      }

      console.log(`Using Firestore instance:`, db);
      console.log(`Using user ID:`, user.uid);
      
      const q = query(collection(db, 'laborGuide'));
      console.log("Executing query...");
      
      const snapshot = await getDocs(q);
      console.log(`Query complete. Got ${snapshot.size} documents`);
      
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOperations(results);
      console.log(`Loaded ${results.length} labor guide operations`);
    } catch (err) {
      console.error('Error loading labor guide data:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      
      // More detailed error message based on error code
      if (err.code === 'permission-denied') {
        setError(`Permission denied: You don't have access to the laborGuide collection. Error: ${err.message}`);
      } else {
        setError(`${err.code || 'Error'}: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Setup the labor guide with sample data
  const handleSetup = async () => {
    setLoading(true);
    setSetupStatus('Setting up labor guide...');
    setError(null);
    try {
      console.log("Setting up labor guide...");
      if (!user) {
        throw new Error("Not logged in");
      }
      
      // Create the collection if it doesn't exist
      console.log("Creating sample operations directly...");
      
      // Add a single test operation first to see if we have permission
      try {
        const testOperation = {
          name: 'Test Operation',
          description: 'This is a test operation added for debugging',
          standardHours: 1.0,
          searchTerms: ['test', 'debug', 'operation']
        };
        
        console.log("Adding test operation...");
        const docRef = await addDoc(collection(db, 'laborGuide'), testOperation);
        console.log("Test operation added with ID:", docRef.id);
        
        // If we succeeded, try the full setup
        console.log("Running full setup...");
        const result = await setupLaborGuide();
        if (result) {
          setSetupStatus('Setup complete! Sample operations added.');
        } else {
          setSetupStatus('Labor guide already has data.');
        }
      } catch (err) {
        console.error("Error during direct operation:", err);
        throw err;
      }
      
      await loadData(); // Reload the data
    } catch (err) {
      console.error('Error setting up labor guide:', err);
      if (err.code === 'permission-denied') {
        setError(`Permission denied: You don't have write access to the laborGuide collection. Error: ${err.message}`);
      } else {
        setError(`${err.code || 'Error'}: ${err.message}`);
      }
      setSetupStatus('Setup failed.');
    } finally {
      setLoading(false);
    }
  };

  // Clear all labor guide data
  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to delete all labor guide data? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log("Clearing all labor guide data...");
      const q = query(collection(db, 'laborGuide'));
      const snapshot = await getDocs(q);
      
      console.log(`Found ${snapshot.size} documents to delete`);
      
      // Delete each document
      let deletedCount = 0;
      for (const docSnapshot of snapshot.docs) {
        try {
          console.log(`Deleting document ${docSnapshot.id}...`);
          await deleteDoc(doc(db, 'laborGuide', docSnapshot.id));
          deletedCount++;
        } catch (err) {
          console.error(`Error deleting document ${docSnapshot.id}:`, err);
          throw err;
        }
      }
      
      console.log(`Deleted ${deletedCount} documents`);
      setOperations([]);
      setSetupStatus(`All labor guide data cleared (${deletedCount} operations).`);
    } catch (err) {
      console.error('Error clearing labor guide data:', err);
      if (err.code === 'permission-denied') {
        setError(`Permission denied: You don't have delete access to the laborGuide collection. Error: ${err.message}`);
      } else {
        setError(`${err.code || 'Error'}: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Add a single test operation
  const handleAddTestOperation = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Adding test operation...");
      const testOperation = {
        name: 'Test Operation',
        description: 'This is a test operation added for debugging',
        standardHours: 1.0,
        searchTerms: ['test', 'debug', 'operation']
      };
      
      console.log("Operation data:", testOperation);
      const docRef = await addDoc(collection(db, 'laborGuide'), testOperation);
      console.log("Operation added with ID:", docRef.id);
      
      setSetupStatus('Test operation added.');
      await loadData(); // Reload the data
    } catch (err) {
      console.error('Error adding test operation:', err);
      if (err.code === 'permission-denied') {
        setError(`Permission denied: You don't have write access to the laborGuide collection. Error: ${err.message}`);
      } else {
        setError(`${err.code || 'Error'}: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load data on first render
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Labor Guide Debugger</h2>
      
      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded">
        <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Database Status</h3>
        <p className={`text-sm ${dbStatus.connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {dbStatus.message}
        </p>
        
        <div className="mt-4">
          <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Debug Info</h3>
          <p className="text-sm">User: {user ? `${user.email} (${user.uid})` : 'Not logged in'}</p>
          <p className="text-sm">Operations found: <strong>{operations.length}</strong></p>
        </div>
        
        {setupStatus && <p className="text-sm mt-2 text-green-600 dark:text-green-400">{setupStatus}</p>}
        {error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
            <h4 className="font-medium">Error:</h4>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        <button 
          onClick={loadData} 
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Data'}
        </button>
        
        <button 
          onClick={handleSetup} 
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Working...' : 'Setup Labor Guide'}
        </button>
        
        <button 
          onClick={handleAddTestOperation} 
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Test Operation'}
        </button>
        
        <button 
          onClick={handleClear} 
          disabled={loading}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? 'Clearing...' : 'Clear All Data'}
        </button>
      </div>
      
      <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Terms</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
            {operations.length > 0 ? (
              operations.map(op => (
                <tr key={op.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{op.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{op.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{op.standardHours}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {op.searchTerms && op.searchTerms.join(', ')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {loading ? 'Loading...' : 'No labor guide operations found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 