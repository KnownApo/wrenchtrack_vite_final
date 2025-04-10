import React, { useEffect, useState, useContext } from 'react';
import { JobLogContext } from '../context/JobLogContext';

export default function JobTimerScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const { setJobDuration } = useContext(JobLogContext);

  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          setJobDuration(next);
          return next;
        });
      }, 1000);
    } else if (!isRunning && elapsed !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="text-center mt-10">
      <h2 className="text-2xl font-bold mb-6">Job Timer</h2>
      <div className="text-4xl font-mono mb-4">{Math.floor(elapsed / 60)}:{('0' + (elapsed % 60)).slice(-2)}</div>
      <div className="space-x-4">
        <button onClick={() => setIsRunning(!isRunning)} className="bg-green-500 text-white px-4 py-2 rounded">{isRunning ? 'Pause' : 'Start'}</button>
        <button onClick={() => { setElapsed(0); setIsRunning(false); setJobDuration(0); }} className="bg-red-500 text-white px-4 py-2 rounded">Reset</button>
      </div>
    </div>
  );
}
