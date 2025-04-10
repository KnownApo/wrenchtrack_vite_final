import React, { useState, useContext } from 'react';
import { JobLogContext } from '../context/JobLogContext';

export default function PartsScreen() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const { parts, setParts } = useContext(JobLogContext);

  const addPart = () => {
    if (name && price) {
      setParts([...parts, { name, price: parseFloat(price) }]);
      setName('');
      setPrice('');
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Parts</h2>
      <div className="flex gap-2 mb-4">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Part Name" className="border p-2 flex-1 rounded" />
        <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" type="number" className="border p-2 flex-1 rounded" />
        <button onClick={addPart} className="bg-blue-500 text-white px-4 py-2 rounded">Add</button>
      </div>
      <ul className="divide-y">
        {parts.map((p, i) => <li key={i} className="py-1">{p.name} - ${p.price.toFixed(2)}</li>)}
      </ul>
    </div>
  );
}
