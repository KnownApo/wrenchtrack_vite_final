import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const SAMPLE_OPERATIONS = [
  // ... (keep as fallback)
];

export default function LaborGuideSearch({ onSelectOperation }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [operations, setOperations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    loadOperations();
  }, []);

  const loadOperations = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'laborGuide'));
      const snapshot = await getDocs(q);
      const ops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOperations(ops.length > 0 ? ops : SAMPLE_OPERATIONS);
    } catch (err) {
      setError('Failed to load from Firebase, using samples');
      setOperations(SAMPLE_OPERATIONS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.length < 3) return;
    setIsLoading(true);
    try {
      // Firebase search (basic, consider Cloud Search for advanced)
      const q = query(collection(db, 'laborGuide'));
      const snapshot = await getDocs(q);
      const allOps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = allOps.filter(op => 
        op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setOperations(filtered);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addOperation = async (newOp) => {
    try {
      await addDoc(collection(db, 'laborGuide'), newOp);
      loadOperations();
    } catch (err) {
      setError('Failed to add operation');
    }
  };

  // ... (rest of the component, add form for new operations if needed)

  return (
    <div>
      <h2>Labor Guide Search</h2>
      <input
        type="text"
        placeholder="Search operations..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      <button onClick={handleSearch} disabled={isLoading || searchTerm.length < 3}>
        Search
      </button>
      {isLoading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {operations.map(op => (
          <li key={op.id}>
            <strong>{op.name}</strong>: {op.description}
            <button onClick={() => onSelectOperation && onSelectOperation(op)}>
              Select
            </button>
          </li>
        ))}
      </ul>
      {/* Example add operation form (optional) */}
      {/* <button onClick={() => addOperation({ name: 'New Op', description: 'Desc' })}>Add Sample Operation</button> */}
    </div>
  );
}