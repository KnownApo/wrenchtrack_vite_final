import { collection, getDocs, addDoc, query } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Sets up the labor guide with sample data if it doesn't already exist
 * @param {string} userId - Optional user ID to scope the operations
 * @returns {Promise<boolean>} - Promise resolving to true if setup was performed, false if data already existed
 */
export const setupLaborGuide = async (userId) => {
  try {
    console.log("Running setupLaborGuide...");
    
    // Define sample operations
    const sampleOperations = [
      {
        name: "Oil Change",
        description: "Standard oil and filter change service",
        standardHours: 0.5,
        searchTerms: ["oil", "change", "filter", "lube"]
      },
      {
        name: "Brake Pad Replacement - Front",
        description: "Remove and replace front brake pads",
        standardHours: 1.0,
        searchTerms: ["brake", "pad", "front", "replace"]
      },
      {
        name: "Brake Pad Replacement - Rear",
        description: "Remove and replace rear brake pads",
        standardHours: 1.2,
        searchTerms: ["brake", "pad", "rear", "replace"]
      },
      {
        name: "Timing Belt Replacement",
        description: "Remove and replace timing belt and tensioner",
        standardHours: 3.5,
        searchTerms: ["timing", "belt", "replace"]
      },
      {
        name: "Alternator Replacement",
        description: "Remove and replace alternator",
        standardHours: 1.8,
        searchTerms: ["alternator", "replace", "electrical"]
      },
      {
        name: "Spark Plug Replacement",
        description: "Remove and replace spark plugs",
        standardHours: 0.8,
        searchTerms: ["spark", "plug", "tune", "ignition"]
      },
      {
        name: "Water Pump Replacement",
        description: "Remove and replace water pump",
        standardHours: 2.5,
        searchTerms: ["water", "pump", "cooling", "replace"]
      }
    ];
    
    // First check if there's any data already
    const q = query(collection(db, 'laborGuide'));
    const snapshot = await getDocs(q);
    
    // If we already have data, don't add more
    if (!snapshot.empty) {
      console.log(`Labor guide already has ${snapshot.size} operations`);
      return false;
    }
    
    console.log("No existing labor guide data found, adding sample operations");
    
    // Add sample operations
    for (const operation of sampleOperations) {
      await addDoc(collection(db, 'laborGuide'), operation);
    }
    
    console.log(`Added ${sampleOperations.length} sample operations to labor guide`);
    
    // Also store in local storage for offline access
    const LABOR_GUIDE_STORAGE_KEY = 'wrenchtrack_labor_guide';
    localStorage.setItem(LABOR_GUIDE_STORAGE_KEY, JSON.stringify(sampleOperations));
    
    return true;
  } catch (error) {
    console.error("Error in setupLaborGuide:", error);
    throw error;
  }
};

// Export as default as well, for compatibility with default imports
export default setupLaborGuide;