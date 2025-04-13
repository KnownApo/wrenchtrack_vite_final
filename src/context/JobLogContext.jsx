import React, { createContext, useState, useContext } from 'react';

export const JobLogContext = createContext();

export function JobLogProvider({ children }) {
  const [parts, setParts] = useState([]); // Default to an empty array

  return (
    <JobLogContext.Provider value={{ parts, setParts }}>
      {children}
    </JobLogContext.Provider>
  );
}

export function useJobLog() {
  return useContext(JobLogContext);
}
