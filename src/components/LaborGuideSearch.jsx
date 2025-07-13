import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as localLaborGuide from '../utils/laborGuideDebugger';

export default function LaborGuideSearch({ onSelectOperation }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [operations, setOperations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentOperations, setRecentOperations] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(''); // Add success message state
  const { user } = useAuth();

  console.log('LaborGuideSearch component initialized - Using local storage');

  // Load all operations on component mount
  useEffect(() => {
    const loadOperations = async () => {
      setIsLoading(true);
      try {
        // Get all operations from local storage
        const allOps = localLaborGuide.getAllOperations();
        console.log(`Loaded ${allOps.length} operations from local storage`);
        
        // Show recent operations (first 5)
        setRecentOperations(allOps.slice(0, 5));
      } catch (err) {
        console.error('Error loading operations:', err);
        setError('Failed to load labor guide operations');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOperations();
  }, []);  // Search operations
  const handleSearch = () => {
    if (!searchTerm || searchTerm.length < 3) return;
    
    setIsLoading(true);
    setError(null);
    setOperations([]); // Clear previous results before starting new search
    
    try {
      console.log(`Searching for: "${searchTerm}"`);
      
      // Always use the manual search to ensure results
      const allOps = localLaborGuide.getAllOperations();
      console.log(`Total operations available: ${allOps.length}`);
      
      if (!allOps || allOps.length === 0) {
        console.warn('No operations found in storage');
        setError('No operations available to search');
        setIsLoading(false);
        return;
      }
      
      // Clean search term and make case insensitive
      const searchTermLower = searchTerm.toLowerCase().trim();
      
      // More comprehensive search across all fields
      const manualSearchResults = allOps.filter(op => {
        if (!op) return false;
        
        const nameMatch = op.name && op.name.toLowerCase().includes(searchTermLower);
        const descMatch = op.description && op.description.toLowerCase().includes(searchTermLower);
        const idMatch = op.id && op.id.toString().includes(searchTermLower);
        
        return nameMatch || descMatch || idMatch;
      });
      
      console.log(`Found ${manualSearchResults.length} matching operations`);
      
      if (manualSearchResults.length === 0) {
        console.log('No matching operations found');
      } else {
        console.log('First match:', manualSearchResults[0]);
      }
      
      // Set the operations directly without setTimeout
      setOperations(manualSearchResults);
    } catch (err) {
      console.error('Error searching operations:', err);
      setError('Search failed: ' + (err.message || 'Unknown error'));
      setOperations([]);
    } finally {
      // Ensure loading is turned off regardless of success or error
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Reset to sample operations
  const handleReset = () => {
    setIsLoading(true);
    try {
      const operations = localLaborGuide.resetToSampleOperations();
      setRecentOperations(operations.slice(0, 5));
      setOperations([]);
      setSuccessMessage('Labor guide reset to sample operations'); // Show success message
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error resetting operations:', err);
      setError('Failed to reset operations');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search labor operations (min 3 characters)..."
          className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          disabled={searchTerm.length < 3 || isLoading}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {recentOperations.length > 0 ? 
            `${recentOperations.length} operations available` : 
            'No operations found'}
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Reset to Default
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <div className="mt-2">Loading...</div>
        </div>
      ) : (
        <div className="space-y-2">
          {operations.length > 0 ? (
            <div>
              <h3 className="font-semibold text-sm text-gray-500 mb-2">Search Results ({operations.length})</h3>
              <div className="space-y-2">
                {operations.map(op => (
                  <div 
                    key={op.id}
                    onClick={() => onSelectOperation(op)}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium">{op.name}</div>
                    <div className="text-sm text-gray-600">
                      Standard time: {op.standardHours} hours
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{op.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : searchTerm.length >= 3 ? (
            <div className="text-center py-4 text-gray-500">No matching operations found</div>
          ) : recentOperations.length > 0 ? (
            <div>
              <h3 className="font-semibold text-sm text-gray-500 mb-2">Recent Operations</h3>
              <div className="space-y-2">
                {recentOperations.map(op => (
                  <div 
                    key={op.id}
                    onClick={() => onSelectOperation(op)}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium">{op.name}</div>
                    <div className="text-sm text-gray-600">
                      Standard time: {op.standardHours} hours
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{op.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No labor guide operations found</p>
              <p className="mt-2 text-sm">Click "Reset to Default" to add sample operations</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
