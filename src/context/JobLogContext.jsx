import React, { createContext, useState, useEffect } from 'react';
import { auth } from '../firebase';

export const JobLogContext = createContext();

export const JobLogProvider = ({ children }) => {
  const [invoice, setInvoice] = useState(null);
  const [jobLog, setJobLog] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Load saved invoice from localStorage if available
  useEffect(() => {
    try {
      const savedInvoice = localStorage.getItem('currentInvoice');
      if (savedInvoice) {
        setInvoice(JSON.parse(savedInvoice));
      }
    } catch (error) {
      console.error('Error loading invoice from localStorage:', error);
    }
  }, []);

  // Save invoice to localStorage when it changes
  useEffect(() => {
    if (invoice) {
      try {
        localStorage.setItem('currentInvoice', JSON.stringify(invoice));
      } catch (error) {
        console.error('Error saving invoice to localStorage:', error);
      }
    }
  }, [invoice]);

  const clearInvoice = () => {
    setInvoice(null);
    localStorage.removeItem('currentInvoice');
  };

  // Job tracking methods
  const startJob = (job) => {
    setCurrentJob({
      ...job,
      startTime: new Date(),
      elapsed: 0,
    });
    setIsRunning(true);
  };

  const stopJob = () => {
    if (currentJob) {
      const endTime = new Date();
      const elapsed = Math.floor((endTime - new Date(currentJob.startTime)) / 1000);
      
      const completedJob = {
        ...currentJob,
        endTime,
        elapsed,
      };
      
      setJobLog([...jobLog, completedJob]);
      setCurrentJob(null);
      setIsRunning(false);
      
      return completedJob;
    }
  };

  const updateElapsed = () => {
    if (isRunning && currentJob) {
      const now = new Date();
      const elapsed = Math.floor((now - new Date(currentJob.startTime)) / 1000);
      setCurrentJob(prevJob => ({
        ...prevJob,
        elapsed,
      }));
    }
  };

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hrs > 0 ? hrs.toString().padStart(2, '0') : '00',
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  return (
    <JobLogContext.Provider value={{
      invoice,
      setInvoice,
      clearInvoice,
      jobLog,
      setJobLog,
      currentJob,
      isRunning,
      startJob,
      stopJob,
      updateElapsed,
      formatTime
    }}>
      {children}
    </JobLogContext.Provider>
  );
};
