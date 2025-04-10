import React, { useState, useContext } from 'react';
import { JobLogContext } from '../context/JobLogContext';

export default function PaymentScreen() {
  const [method, setMethod] = useState('cash');
  const { setPaid } = useContext(JobLogContext);
  const [done, setDone] = useState(false);

  const handlePayment = () => {
    setPaid(true);
    setDone(true);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Payment Method</h2>
      <select className="border p-2 w-full rounded mb-4" value={method} onChange={e => setMethod(e.target.value)}>
        <option value="cash">Cash</option>
        <option value="card">Card</option>
        <option value="venmo">Venmo</option>
      </select>
      <button onClick={handlePayment} className="bg-blue-500 text-white px-4 py-2 w-full rounded">Mark as Paid</button>
      {done && <p className="mt-4 text-green-600">Payment recorded via {method}</p>}
    </div>
  );
}
