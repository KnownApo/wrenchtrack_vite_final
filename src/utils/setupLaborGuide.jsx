// Removed Firebase imports to use only local storage
// import { collection, query, getDocs, addDoc } from 'firebase/firestore';
// import { db } from '../firebase';

// Local storage key for labor guide operations
const LABOR_GUIDE_STORAGE_KEY = 'wrenchtrack_labor_guide';

const sampleOperations = [
  {
    id: "op1",
    name: 'Oil Change - Standard',
    description: 'Standard oil change service with filter replacement',
    standardHours: 0.5,
    searchTerms: ['oil', 'change', 'filter', 'standard', 'oil change', 'maintenance']
  },
  {
    name: 'Brake Pad Replacement - Front',
    description: 'Replace front brake pads and inspect rotors',
    standardHours: 1.5,
    searchTerms: ['brake', 'pad', 'front', 'brakes', 'replacement', 'brake pad']
  },
  {
    name: 'Brake Pad Replacement - Rear',
    description: 'Replace rear brake pads and inspect rotors',
    standardHours: 1.5,
    searchTerms: ['brake', 'pad', 'rear', 'brakes', 'replacement', 'brake pad']
  },
  {
    name: 'Timing Belt Replacement',
    description: 'Replace timing belt, water pump, and tensioners',
    standardHours: 4.5,
    searchTerms: ['timing', 'belt', 'water pump', 'tensioner', 'replacement']
  },
  {
    name: 'A/C Recharge',
    description: 'Evacuate system and recharge with refrigerant',
    standardHours: 1.0,
    searchTerms: ['ac', 'air', 'conditioning', 'recharge', 'refrigerant', 'a/c']
  },
  {
    name: 'Alternator Replacement',
    description: 'Remove and replace alternator',
    standardHours: 2.0,
    searchTerms: ['alternator', 'electrical', 'charging', 'battery', 'replacement']
  },
  {
    name: 'Spark Plug Replacement',
    description: 'Remove and replace spark plugs, check ignition wires',
    standardHours: 1.2,
    searchTerms: ['spark', 'plug', 'ignition', 'tune', 'up', 'replacement']
  },
  {
    name: 'Starter Motor Replacement',
    description: 'Remove and replace starter motor',
    standardHours: 1.8,
    searchTerms: ['starter', 'motor', 'electrical', 'start', 'replacement']
  },
  {
    name: 'Wheel Alignment',
    description: 'Four wheel alignment with toe, camber, and caster adjustment',
    standardHours: 1.2,
    searchTerms: ['wheel', 'alignment', 'toe', 'camber', 'caster', 'adjustment']
  },
  {
    name: 'Tire Rotation and Balance',
    description: 'Rotate and balance all four tires',
    standardHours: 0.8,
    searchTerms: ['tire', 'rotation', 'balance', 'wheel', 'maintenance']
  }
];

export const setupLaborGuide = async () => {
  try {
    // Check if labor guide collection exists and has entries
    const q = query(collection(db, 'laborGuide'));
    const querySnapshot = await getDocs(q);
    
    // If collection is empty, add sample operations
    if (querySnapshot.empty) {
      console.log('Setting up labor guide with sample operations...');
      
      for (const operation of sampleOperations) {
        await addDoc(collection(db, 'laborGuide'), operation);
      }
      
      console.log('Labor guide setup complete!');
      return true;
    } else {
      console.log('Labor guide collection already exists with data.');
      return false;
    }
  } catch (error) {
    console.error('Error setting up labor guide:', error);
    return false;
  }
};

export default setupLaborGuide; 