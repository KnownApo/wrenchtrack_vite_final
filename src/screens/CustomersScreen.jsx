import React, { useState, useContext, useEffect } from 'react';
import { JobLogContext } from '../context/JobLogContext';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

export default function CustomersScreen() {
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredContact, setPreferredContact] = useState('email');
  const [searchQuery, setSearchQuery] = useState(''); // New state for search
  const [filteredCustomers, setFilteredCustomers] = useState([]); // New state for filtered customers
  const { setCustomer, customer } = useContext(JobLogContext);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchCustomers = async () => {
      const customersRef = collection(db, 'users', user.uid, 'customers');
      const snapshot = await getDocs(customersRef);
      const customers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFilteredCustomers(customers); // Initialize filtered customers
    };

    fetchCustomers();
  }, [user]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setFilteredCustomers((prev) =>
      prev.filter((customer) =>
        customer.name.toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  const saveCustomer = async () => {
    if (!input.trim()) {
      alert('Customer name is required.');
      return;
    }

    if (user) {
      try {
        console.log('Saving customer to Firestore...'); // Debugging log
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
        console.log('Customer saved successfully:', newCustomer); // Debugging log

        // Add the new customer to the filtered customers list
        setFilteredCustomers((prev) => [...prev, { id: newCustomer.id, ...newCustomer }]);

        // Reset the input fields
        setInput('');
        setEmail('');
        setPhone('');
        setAddress('');
        setCompany('');
        setNotes('');
        setPreferredContact('email');
        alert('✅ Customer saved successfully.');
      } catch (error) {
        console.error('Error saving customer:', error);
        alert('❌ Failed to save customer. Please try again later.');
      }
    } else {
      alert('❌ User is not authenticated.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-12">
          👥 Manage Customers
        </h1>

        {/* Search Bar */}
        <div className="bg-white shadow-lg rounded-3xl p-6 mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">🔍 Search Customers</h2>
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by customer name"
            className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
          />
        </div>

        {/* Add Customer Section */}
        <div className="bg-white shadow-lg rounded-3xl p-8 mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">➕ Add a New Customer</h2>
          <div className="space-y-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter customer name"
              className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter customer email"
              className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter customer phone"
              className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
            />
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter customer address"
              className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
            ></textarea>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Enter company name"
              className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter additional notes"
              className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
            ></textarea>
            <div>
              <label className="block font-medium mb-2">Preferred Contact Method</label>
              <select
                value={preferredContact}
                onChange={(e) => setPreferredContact(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
            </div>
          </div>
          <button
            onClick={saveCustomer}
            className="mt-6 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 transition"
          >
            Save Customer
          </button>
          {customer && <p className="mt-4 text-green-600">Selected: {customer}</p>}
        </div>

        {/* Quick Actions Section */}
        <div className="bg-white shadow-lg rounded-3xl p-8 mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">⚡ Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredCustomers.map((cust) => (
              <div key={cust.id} className="bg-gray-100 p-6 rounded-lg shadow hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-blue-700">{cust.name}</h3>
                <p className="text-sm text-gray-500">Email: {cust.email || 'N/A'}</p>
                <p className="text-sm text-gray-500">Phone: {cust.phone || 'N/A'}</p>
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => window.open(`mailto:${cust.email}`, '_blank')}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Email
                  </button>
                  <button
                    onClick={() => window.open(`tel:${cust.phone}`, '_blank')}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                  >
                    Call
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation to Customer History */}
        <div className="text-center">
          <button
            onClick={() => navigate('/customerhistory')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
          >
            View Customer History
          </button>
        </div>
      </div>
    </div>
  );
}
