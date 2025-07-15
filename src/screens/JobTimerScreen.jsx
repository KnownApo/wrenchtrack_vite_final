import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { FiPlay, FiPause, FiSquare, FiPlus, FiTrash2, FiFileText } from 'react-icons/fi';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function JobTimerScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeJobs, setActiveJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newJobForm, setNewJobForm] = useState({
    customerName: '',
    vehicleInfo: '',
    description: '',
    estimatedHours: '',
    hourlyRate: 75
  });

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load jobs from Firestore
  const loadJobs = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const jobsRef = collection(db, 'users', user.uid, 'jobTimers');
      const q = query(jobsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const jobs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate(),
        pausedTime: doc.data().pausedTime?.toDate(),
      }));

      const active = jobs.filter(job => job.status === 'active' || job.status === 'paused');
      const completed = jobs.filter(job => job.status === 'completed');

      setActiveJobs(active);
      setCompletedJobs(completed);
    } catch (err) {
      console.error('Error loading jobs:', err);
      setError('Failed to load jobs');
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const startJob = async (jobData) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'users', user.uid, 'jobTimers'), {
        ...jobData,
        status: 'active',
        startTime: serverTimestamp(),
        totalTime: 0,
        createdAt: serverTimestamp(),
        userId: user.uid
      });

      toast.success('Job started successfully');
      setShowNewJobForm(false);
      setNewJobForm({
        customerName: '',
        vehicleInfo: '',
        description: '',
        estimatedHours: '',
        hourlyRate: 75
      });
      loadJobs();
    } catch (err) {
      console.error('Error starting job:', err);
      toast.error('Failed to start job');
    }
  };

  const pauseJob = async (jobId) => {
    if (!user) return;

    try {
      const jobRef = doc(db, 'users', user.uid, 'jobTimers', jobId);
      await updateDoc(jobRef, {
        status: 'paused',
        pausedTime: serverTimestamp()
      });

      toast.success('Job paused');
      loadJobs();
    } catch (err) {
      console.error('Error pausing job:', err);
      toast.error('Failed to pause job');
    }
  };

  const resumeJob = async (jobId) => {
    if (!user) return;

    try {
      const jobRef = doc(db, 'users', user.uid, 'jobTimers', jobId);
      await updateDoc(jobRef, {
        status: 'active',
        resumedTime: serverTimestamp()
      });

      toast.success('Job resumed');
      loadJobs();
    } catch (err) {
      console.error('Error resuming job:', err);
      toast.error('Failed to resume job');
    }
  };

  const stopJob = async (jobId) => {
    if (!user) return;

    try {
      const job = activeJobs.find(j => j.id === jobId);
      if (!job) return;

      const endTime = new Date();
      const totalTime = Math.floor((endTime - job.startTime) / 1000); // in seconds
      const totalCost = (totalTime / 3600) * job.hourlyRate; // cost based on hours

      const jobRef = doc(db, 'users', user.uid, 'jobTimers', jobId);
      await updateDoc(jobRef, {
        status: 'completed',
        endTime: serverTimestamp(),
        totalTime,
        totalCost: parseFloat(totalCost.toFixed(2))
      });

      toast.success('Job completed');
      loadJobs();
    } catch (err) {
      console.error('Error stopping job:', err);
      toast.error('Failed to stop job');
    }
  };

  const deleteJob = async (jobId) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const jobRef = doc(db, 'users', user.uid, 'jobTimers', jobId);
      await deleteDoc(jobRef);

      toast.success('Job deleted');
      loadJobs();
    } catch (err) {
      console.error('Error deleting job:', err);
      toast.error('Failed to delete job');
    }
  };

  const calculateElapsedTime = (job) => {
    if (!job.startTime) return 0;
    
    const start = job.startTime;
    const end = job.status === 'completed' ? job.endTime : currentTime;
    
    return Math.floor((end - start) / 1000); // in seconds
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNewJobSubmit = (e) => {
    e.preventDefault();
    if (!newJobForm.customerName || !newJobForm.description) {
      toast.error('Please fill in required fields');
      return;
    }
    startJob(newJobForm);
  };

  const createInvoiceFromJob = (job) => {
    const invoiceData = {
      customerName: job.customerName,
      vehicleInfo: job.vehicleInfo,
      description: job.description,
      laborHours: (job.totalTime / 3600).toFixed(2),
      laborRate: job.hourlyRate,
      totalAmount: job.totalCost
    };

    navigate('/invoices/create', { state: { prefilledData: invoiceData } });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Timer</h1>
          <p className="text-gray-600 dark:text-gray-300">Track time for jobs and projects</p>
        </div>
        <button
          onClick={() => setShowNewJobForm(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <FiPlus size={20} />
          Start New Job
        </button>
      </div>

      {/* Active Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {activeJobs.map(job => (
          <div key={job.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{job.customerName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{job.vehicleInfo}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${job.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{job.status}</span>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4">{job.description}</p>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <div className="text-2xl font-mono font-bold text-center text-gray-900 dark:text-white">
                {formatTime(calculateElapsedTime(job))}
              </div>
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Rate: ${job.hourlyRate}/hr
              </div>
            </div>

            <div className="flex gap-2">
              {job.status === 'active' ? (
                <button
                  onClick={() => pauseJob(job.id)}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <FiPause size={16} />
                  Pause
                </button>
              ) : (
                <button
                  onClick={() => resumeJob(job.id)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <FiPlay size={16} />
                  Resume
                </button>
              )}
              <button
                onClick={() => stopJob(job.id)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FiSquare size={16} />
                Stop
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Completed Jobs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Completed Jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {completedJobs.map(job => (
                <tr key={job.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{job.customerName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{job.vehicleInfo}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{job.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900 dark:text-white">{formatTime(job.totalTime)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">${job.totalCost?.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => createInvoiceFromJob(job)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Create Invoice"
                      >
                        <FiFileText size={16} />
                      </button>
                      <button
                        onClick={() => deleteJob(job.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Job"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Job Form Modal */}
      {showNewJobForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Start New Job</h3>
            <form onSubmit={handleNewJobSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={newJobForm.customerName}
                  onChange={(e) => setNewJobForm({ ...newJobForm, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vehicle Info
                </label>
                <input
                  type="text"
                  value={newJobForm.vehicleInfo}
                  onChange={(e) => setNewJobForm({ ...newJobForm, vehicleInfo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 2020 Honda Civic"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Job Description *
                </label>
                <textarea
                  value={newJobForm.description}
                  onChange={(e) => setNewJobForm({ ...newJobForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={newJobForm.estimatedHours}
                    onChange={(e) => setNewJobForm({ ...newJobForm, estimatedHours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newJobForm.hourlyRate}
                    onChange={(e) => setNewJobForm({ ...newJobForm, hourlyRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Start Job
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewJobForm(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}