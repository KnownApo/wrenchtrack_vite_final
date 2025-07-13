import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, addDoc, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiClock, FiPlay, FiPause, FiCheck, FiSearch, FiArrowLeft, FiPlus, FiTrash2 } from 'react-icons/fi';

export default function JobTimerScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [laborGuide, setLaborGuide] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTimers, setActiveTimers] = useState({});
  const [timeEntries, setTimeEntries] = useState([]);
  const [laborRate, setLaborRate] = useState(85); // Default labor rate
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load existing time entries
  useEffect(() => {
    const loadTimeEntries = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'users', user.uid, 'timeEntries'), where('completed', '==', false));
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime?.toDate(),
          endTime: doc.data().endTime?.toDate()
        }));
        setTimeEntries(entries);

        // Restore active timers
        const activeTimersObj = {};
        entries.forEach(entry => {
          if (entry.isRunning) {
            activeTimersObj[entry.jobId] = {
              startTime: entry.startTime,
              entryId: entry.id
            };
          }
        });
        setActiveTimers(activeTimersObj);
      } catch (error) {
        console.error('Error loading time entries:', error);
        toast.error('Failed to load time entries');
      }
    };
    loadTimeEntries();
  }, [user]);

  // Add debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term) => {
      if (!term || term.length < 2) {
        setLaborGuide([]);
        return;
      }

      setLoading(true);
      try {
        const q = query(collection(db, 'laborGuide'));
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const formatDuration = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateElapsedTime = (startTime, endTime = new Date()) => {
    return endTime.getTime() - startTime.getTime();
  };

  const handleStartTimer = async (job) => {
    if (activeTimers[job.id]) {
      toast.error('Timer already running for this job');
      return;
    }

    try {
      const startTime = new Date();
      const timeEntry = {
        jobId: job.id,
        jobName: job.name,
        standardHours: job.standardHours,
        startTime,
        isRunning: true,
        completed: false,
        userId: user.uid,
        createdAt: startTime
      };

      const docRef = await addDoc(collection(db, 'users', user.uid, 'timeEntries'), timeEntry);
      setActiveTimers(prev => ({
        ...prev,
        [job.id]: { startTime, entryId: docRef.id }
      }));

      setTimeEntries(prev => [...prev, { ...timeEntry, id: docRef.id }]);
      toast.success('Timer started');
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error('Failed to start timer');
    }
  };

  const handleStopTimer = async (jobId) => {
    const timer = activeTimers[jobId];
    if (!timer) return;

    try {
      const endTime = new Date();
      const elapsedTime = calculateElapsedTime(timer.startTime, endTime);
      const actualHours = elapsedTime / (1000 * 60 * 60);
      
      const entryRef = doc(db, 'users', user.uid, 'timeEntries', timer.entryId);
      await updateDoc(entryRef, {
        endTime,
        isRunning: false,
        actualHours,
        laborCost: actualHours * laborRate
      });

      setActiveTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[jobId];
        return newTimers;
      });

      setTimeEntries(prev =>
        prev.map(entry =>
          entry.id === timer.entryId
            ? { ...entry, endTime, isRunning: false, actualHours, laborCost: actualHours * laborRate }
            : entry
        )
      );

      toast.success('Timer stopped');
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error('Failed to stop timer');
    }
  };

  const handleCompleteEntry = async (entryId) => {
    try {
      const entryRef = doc(db, 'users', user.uid, 'timeEntries', entryId);
      await updateDoc(entryRef, {
        completed: true,
        completedAt: new Date()
      });

      setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
      toast.success('Time entry completed');
    } catch (error) {
      console.error('Error completing entry:', error);
      toast.error('Failed to complete entry');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      const entryRef = doc(db, 'users', user.uid, 'timeEntries', entryId);
      await updateDoc(entryRef, {
        deleted: true,
        deletedAt: new Date()
      });

      setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
      toast.success('Time entry deleted');
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  // Update elapsed time display
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeEntries(prev => prev.map(entry => {
        if (!entry.isRunning) return entry;
        const elapsedTime = calculateElapsedTime(entry.startTime);
        return {
          ...entry,
          elapsedTime
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => navigate('/invoice')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
            >
              <FiArrowLeft className="w-5 h-5" />
              <span>Back to Invoice</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Timer</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track time spent on jobs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Labor Guide Search */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search labor guide (min. 2 characters)..."
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {laborGuide.map(job => (
                  <div
                    key={job.id}
                    className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{job.name}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{job.description}</p>
                        <div className="mt-2 text-blue-600 dark:text-blue-400 text-sm">
                          Standard Time: {job.standardHours} hours
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartTimer(job)}
                        disabled={!!activeTimers[job.id]}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                          activeTimers[job.id]
                            ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                        }`}
                      >
                        <FiPlay className="w-4 h-4" />
                        <span>Start</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Timers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FiClock className="w-5 h-5" />
              Active Time Entries
            </h2>

            <div className="space-y-4">
              {timeEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  No active time entries
                </div>
              ) : (
                timeEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="border dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{entry.jobName}</h3>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Started: {entry.startTime.toLocaleTimeString()}
                          </p>
                          <p className="text-lg font-mono text-blue-600 dark:text-blue-400">
                            {formatDuration(entry.elapsedTime || calculateElapsedTime(entry.startTime))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.isRunning ? (
                          <button
                            onClick={() => handleStopTimer(entry.jobId)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700"
                          >
                            <FiPause className="w-4 h-4" />
                            <span>Stop</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleCompleteEntry(entry.id)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                            >
                              <FiCheck className="w-4 h-4" />
                              <span>Complete</span>
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                            >
                              <FiTrash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
