import React, { useEffect, useState, useContext } from 'react';
import { JobLogContext } from '../context/JobLogContext';

export default function JobTimerScreen() {
  const [isRunning, setIsRunning] = useState(() => JSON.parse(localStorage.getItem('isRunning')) || false);
  const [elapsed, setElapsed] = useState(() => parseInt(localStorage.getItem('elapsed'), 10) || 0);
  const { currentInvoiceId } = useContext(JobLogContext); // Access JobLogContext

  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else if (!isRunning && elapsed !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Persist elapsed time to localStorage
  useEffect(() => {
    localStorage.setItem('elapsed', elapsed);
  }, [elapsed]);

  // Persist running state to localStorage
  useEffect(() => {
    localStorage.setItem('isRunning', JSON.stringify(isRunning));
  }, [isRunning]);

  const resetTimer = () => {
    setElapsed(0);
    setIsRunning(false);
    localStorage.removeItem('elapsed');
    localStorage.removeItem('isRunning');
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      <div className="bg-white shadow-lg rounded-3xl p-8 max-w-md w-full">
        <h2 className="text-3xl font-extrabold text-center text-blue-600 mb-6">⏱️ Job Timer</h2>
        <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 text-white text-5xl font-mono font-bold rounded-2xl p-6 text-center shadow-inner mb-6">
          {formatTime(elapsed)}
          <div className="absolute inset-0 bg-black bg-opacity-10 rounded-2xl pointer-events-none"></div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{ width: `${(elapsed % 60) * 1.67}%` }} // Example progress bar logic
          ></div>
        </div>
        <div className="flex justify-center gap-4">
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
        {currentInvoiceId && (
          <p className="text-sm text-gray-500 text-center mt-4">
            Tracking time for Invoice ID: <span className="font-medium text-gray-700">{currentInvoiceId}</span>
          </p>
        )}
      </div>
    </div>
  );
}
