import React, { useEffect, useState, useContext } from 'react';
import { JobLogContext } from '../context/JobLogContext';

export default function JobTimerScreen() {
  const [isRunning, setIsRunning] = useState(() => JSON.parse(localStorage.getItem('isRunning')) || false);
  const [elapsed, setElapsed] = useState(() => parseInt(localStorage.getItem('elapsed'), 10) || 0);
  const { setJobDuration, currentInvoiceId } = useContext(JobLogContext); // Access JobLogContext

  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          return next;
        });
      }, 1000);
    } else if (!isRunning && elapsed !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Update JobLogContext only when elapsed changes
  useEffect(() => {
    setJobDuration(elapsed);
    localStorage.setItem('elapsed', elapsed); // Persist elapsed time
  }, [elapsed, setJobDuration]);

  useEffect(() => {
    localStorage.setItem('isRunning', JSON.stringify(isRunning)); // Persist running state
  }, [isRunning]);

  const resetTimer = () => {
    setElapsed(0);
    setIsRunning(false);
    setJobDuration(0);
    localStorage.removeItem('elapsed');
    localStorage.removeItem('isRunning');
  };

  return (
    <div className="text-center mt-10">
      <h2 className="text-2xl font-bold mb-6">Job Timer</h2>
      <div className="text-4xl font-mono mb-4">{Math.floor(elapsed / 60)}:{('0' + (elapsed % 60)).slice(-2)}</div>
      <div className="space-x-4">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`px-6 py-3 rounded-lg text-white font-semibold transition ${
            isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={resetTimer}
          className="px-6 py-3 rounded-lg bg-gray-500 hover:bg-gray-600 text-white font-semibold transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
