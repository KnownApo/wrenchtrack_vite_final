import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

export default function LaborGuideSearch({ onSelectOperation }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [operations, setOperations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const searchOperations = async (term) => {
    if (!term) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'laborGuide'),
        where('searchTerms', 'array-contains', term.toLowerCase())
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOperations(results);
    } catch (err) {
      console.error('Error searching labor guide:', err);
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search labor operations..."
          className="flex-1 border rounded-lg px-4 py-2"
        />
        <button
          onClick={() => searchOperations(searchTerm)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Search
        </button>
      </div>

      {isLoading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <div className="space-y-2">
          {operations.map(op => (
            <div 
              key={op.id}
              onClick={() => onSelectOperation(op)}
              className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <div className="font-medium">{op.name}</div>
              <div className="text-sm text-gray-600">
                Standard time: {op.standardHours} hours
              </div>
              <div className="text-sm text-gray-500">{op.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
