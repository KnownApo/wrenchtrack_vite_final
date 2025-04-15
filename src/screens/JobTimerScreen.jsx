import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';

export default function JobTimerScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [laborGuide, setLaborGuide] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Add debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term) => {
      if (!term || term.length < 2) {
        setLaborGuide([]);
        return;
      }

      setLoading(true);
      try {
        // Simplified query without array-contains
        const q = query(collection(db, 'laborGuide'));
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side filtering
        const searchTerms = term.toLowerCase().split(' ').filter(t => t.length > 0);
        const filteredResults = results.filter(job => {
          const jobText = `${job.name} ${job.description}`.toLowerCase();
          return searchTerms.every(term => jobText.includes(term));
        });

        if (filteredResults.length === 0) {
          toast.info('No matching jobs found');
        }
        
        setLaborGuide(filteredResults);
      } catch (error) {
        console.error('Error searching labor guide:', error);
        toast.error('Search failed. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  // Update search handler
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    // You could add this to your invoice or job context
    toast.success(`Added ${job.name} - ${job.standardHours} hours`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/invoice')}
          className="mb-6 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
        >
          ← Back to Invoice
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Labor Guide</h1>

          <div className="space-y-6">
            <div className="flex gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search operations (minimum 2 characters)..."
                className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="grid gap-4">
                {laborGuide.map(job => (
                  <div
                    key={job.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleJobSelect(job)}
                  >
                    <h3 className="font-bold">{job.name}</h3>
                    <p className="text-gray-600">{job.description}</p>
                    <div className="mt-2 text-blue-600">
                      Standard Time: {job.standardHours} hours
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
