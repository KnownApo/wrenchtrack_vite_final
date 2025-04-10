import React, { useState, useContext } from 'react';
import { JobLogContext } from '../context/JobLogContext';

export default function CustomersScreen() {
  const [input, setInput] = useState('');
  const { setCustomer, customer } = useContext(JobLogContext);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Select Customer</h2>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Enter customer name"
        className="border p-2 w-full rounded mb-4"
      />
      <button onClick={() => setCustomer(input)} className="bg-blue-500 text-white px-4 py-2 rounded">
        Save Customer
      </button>
      {customer && <p className="mt-4 text-green-600">Selected: {customer}</p>}
    </div>
  );
}
