import React, { createContext, useState, useContext, useCallback } from 'react';
import { toast } from 'react-toastify';

export const JobLogContext = createContext();

export function JobLogProvider({ children }) {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = useCallback((error) => {
    console.error('JobLog Error:', error);
    setError(error.message);
    toast.error(error.message);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <JobLogContext.Provider 
      value={{ 
        parts, 
        setParts, 
        loading, 
        setLoading,
        error,
        handleError,
        clearError
      }}
    >
      {children}
    </JobLogContext.Provider>
  );
}

export function useJobLog() {
  const context = useContext(JobLogContext);
  if (!context) {
    throw new Error('useJobLog must be used within a JobLogProvider');
  }
  return context;
}
