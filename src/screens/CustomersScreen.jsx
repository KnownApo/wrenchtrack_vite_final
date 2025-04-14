import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import debounce from 'lodash/debounce';
import { JobLogContext } from '../context/JobLogContext';

export default function CustomersScreen() {
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // New state for search
  const [filteredCustomers, setFilteredCustomers] = useState([]); // New state for filtered customers
  const { setCustomer, customer } = useContext(JobLogContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    notes: '',
    preferredContact: 'email'
  });
  const [errors, setErrors] = useState({});
  const customersPerPage = 8;
  const [customers, setCustomers] = useState([]);  // Add this line

  // Update the useEffect to set both customers and filteredCustomers
  useEffect(() => {
    if (!user) return;

    const fetchCustomers = async () => {
      try {
        const customersRef = collection(db, 'users', user.uid, 'customers');
        const snapshot = await getDocs(customersRef);
        const fetchedCustomers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setCustomers(fetchedCustomers);
        setFilteredCustomers(fetchedCustomers);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error('Failed to load customers');
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [user]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setFilteredCustomers(customers);
        return;
      }
      const filtered = customers.filter(customer =>
        Object.values(customer).some(value =>
          String(value).toLowerCase().includes(query.toLowerCase())
        )
      );
      setFilteredCustomers(filtered);
    }, 300),
    [customers]
  );

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const saveCustomer = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsLoading(true);
    try {
      const customersRef = collection(db, 'users', user.uid, 'customers');
      const newCustomer = {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(customersRef, newCustomer);
      setFilteredCustomers(prev => [...prev, { id: docRef.id, ...newCustomer }]);
      setFormData({
        name: '', email: '', phone: '', address: '', company: '', 
        notes: '', preferredContact: 'email'
      });
      toast.success('Customer added successfully');
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    }
    setIsLoading(false);
  };

  // Pagination
  const paginatedCustomers = useMemo(() => {
    const startIndex = (page - 1) * customersPerPage;
    return filteredCustomers.slice(startIndex, startIndex + customersPerPage);
  }, [filteredCustomers, page]);

  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
            Manage Customers
          </h1>
          <button
            onClick={() => navigate('/customerhistory')}
            className="bubble-button"
          >
            View History
          </button>
        </div>

        {/* Search and Add Customer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Panel */}
          <div className="lg:col-span-2">
            <div className="bubble-card p-6">
              <div className="relative">
                <input
                  type="text"
                  onChange={(e) => debouncedSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="bubble-input w-full pl-10"
                />
                <span className="absolute left-3 top-3 text-gray-400">🔍</span>
              </div>
              
              {/* Customer Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {paginatedCustomers.map((customer) => (
                  <div key={customer.id} className="bubble-card p-4 hover:scale-102 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{customer.name}</h3>
                        <p className="text-sm text-gray-600">{customer.company}</p>
                      </div>
                      <div className="flex gap-2">
                        {customer.email && (
                          <button
                            onClick={() => window.open(`mailto:${customer.email}`)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"
                            title="Send email"
                          >
                            ✉️
                          </button>
                        )}
                        {customer.phone && (
                          <button
                            onClick={() => window.open(`tel:${customer.phone}`)}
                            className="p-2 text-green-500 hover:bg-green-50 rounded-full"
                            title="Call"
                          >
                            📞
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>{customer.address}</p>
                      <p className="mt-1">Preferred: {customer.preferredContact}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`px-3 py-1 rounded ${
                        page === i + 1
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add Customer Form */}
          <div className="bubble-card p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Customer</h2>
            <form onSubmit={(e) => { e.preventDefault(); saveCustomer(); }} className="space-y-4">
              {/* Form inputs with validation */}
              {Object.entries(formData).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </label>
                  {key === 'notes' ? (
                    <textarea
                      name={key}
                      value={value}
                      onChange={handleInputChange}
                      className={`bubble-input w-full ${errors[key] ? 'border-red-500' : ''}`}
                      rows="3"
                    />
                  ) : key === 'preferredContact' ? (
                    <select
                      name={key}
                      value={value}
                      onChange={handleInputChange}
                      className="bubble-input w-full"
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                    </select>
                  ) : (
                    <input
                      type={key === 'email' ? 'email' : 'text'}
                      name={key}
                      value={value}
                      onChange={handleInputChange}
                      className={`bubble-input w-full ${errors[key] ? 'border-red-500' : ''}`}
                    />
                  )}
                  {errors[key] && (
                    <p className="text-red-500 text-sm mt-1">{errors[key]}</p>
                  )}
                </div>
              ))}
              
              <button
                type="submit"
                disabled={isLoading}
                className="bubble-button w-full"
              >
                {isLoading ? 'Saving...' : 'Save Customer'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
