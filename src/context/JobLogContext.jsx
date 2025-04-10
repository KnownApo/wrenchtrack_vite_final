import React, { createContext, useState } from 'react';

export const JobLogContext = createContext();

export const JobLogProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [jobDuration, setJobDuration] = useState(0);
  const [parts, setParts] = useState([]);
  const [signature, setSignature] = useState(null);
  const [paid, setPaid] = useState(false);

  return (
    <JobLogContext.Provider value={{
      customer,
      setCustomer,
      jobDuration,
      setJobDuration,
      parts,
      setParts,
      signature,
      setSignature,
      paid,
      setPaid
    }}>
      {children}
    </JobLogContext.Provider>
  );
};
