import React, { useState, useContext, useEffect } from 'react';
import { JobLogContext } from '../context/JobLogContext';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

export default function CustomersScreen() {
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredContact, setPreferredContact] = useState('email');
  const [customerHistory, setCustomerHistory] = useState([]);
  const { setCustomer, customer } = useContext(JobLogContext);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchCustomerHistory = async () => {
      const customersRef = collection(db, 'users', user.uid, 'customers');
      const snapshot = await getDocs(customersRef);
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomerHistory(history);
    };

    fetchCustomerHistory();
  }, [user]);

  const saveCustomer = async () => {
    if (!input.trim()) return;

    setCustomer(input);

    if (user) {
      const customersRef = collection(db, 'users', user.uid, 'customers');
      const newCustomer = {
        name: input,
        email,
        phone,
        address,
        company,
        notes,
        preferredContact,
        createdAt: new Date(),
      };
      await addDoc(customersRef, newCustomer);
      setCustomerHistory(prev => [...prev, newCustomer]);
    }

    setInput('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCompany('');
    setNotes('');
    setPreferredContact('email');
  };

  const editCustomer = async (id, updatedData) => {
    if (!user) return;

    const customerRef = doc(db, 'users', user.uid, 'customers', id);
    await updateDoc(customerRef, updatedData);

    setCustomerHistory(prev =>
      prev.map(cust => (cust.id === id ? { ...cust, ...updatedData } : cust))
    );
  };

  const deleteCustomer = async (id) => {
    if (!user) return;

    const customerRef = doc(db, 'users', user.uid, 'customers', id);
    await deleteDoc(customerRef);

    setCustomerHistory(prev => prev.filter(cust => cust.id !== id));
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Add Customer</h2>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Enter customer name"
        className="border p-2 w-full rounded mb-4"
      />
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter customer email"
        className="border p-2 w-full rounded mb-4"
      />
      <input
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="Enter customer phone"
        className="border p-2 w-full rounded mb-4"
      />
      <textarea
        value={address}
        onChange={e => setAddress(e.target.value)}
        placeholder="Enter customer address"
        className="border p-2 w-full rounded mb-4"
      />
      <input
        value={company}
        onChange={e => setCompany(e.target.value)}
        placeholder="Enter company name"
        className="border p-2 w-full rounded mb-4"
      />
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Enter additional notes"
        className="border p-2 w-full rounded mb-4"
      />
      <div className="mb-4">
        <label className="block font-medium mb-2">Preferred Contact Method</label>
        <select
          value={preferredContact}
          onChange={e => setPreferredContact(e.target.value)}
          className="border p-2 w-full rounded"
        >
          <option value="email">Email</option>
          <option value="phone">Phone</option>
        </select>
      </div>
      <button onClick={saveCustomer} className="bg-blue-500 text-white px-4 py-2 rounded">
        Save Customer
      </button>
      {customer && <p className="mt-4 text-green-600">Selected: {customer}</p>}

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Customer History</h3>
        {customerHistory.length === 0 ? (
          <p className="text-gray-500">No customer history available.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {customerHistory.map((cust, index) => (
              <li key={index} className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{cust.name}</div>
                    <div className="text-sm text-gray-500">Email: {cust.email || 'N/A'}</div>
                    <div className="text-sm text-gray-500">Phone: {cust.phone || 'N/A'}</div>
                    <div className="text-sm text-gray-500">Address: {cust.address || 'N/A'}</div>
                    <div className="text-sm text-gray-500">Company: {cust.company || 'N/A'}</div>
                    <div className="text-sm text-gray-500">Notes: {cust.notes || 'N/A'}</div>
                    <div className="text-sm text-gray-500">Preferred Contact: {cust.preferredContact || 'N/A'}</div>
                    <div className="text-sm text-gray-500">
                      Added on: {new Date(cust.createdAt?.seconds * 1000 || cust.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editCustomer(cust.id, { name: 'Updated Name' })} // Example edit
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCustomer(cust.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
