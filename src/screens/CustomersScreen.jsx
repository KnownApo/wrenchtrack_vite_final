import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { CSVLink } from 'react-csv';
import { FiDownload, FiEdit2, FiTrash2, FiPlus, FiMail, FiPhone, FiUser, FiSearch, FiX, FiFilter, FiBriefcase, FiMapPin, FiClock, FiDollarSign, FiFileText } from 'react-icons/fi';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import debounce from 'lodash/debounce';
import { JobLogContext } from '../context/JobLogContext';

export default function CustomersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const { setCustomer } = useContext(JobLogContext);
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
    preferredContact: 'email',
    status: 'active'
  });
  const [errors, setErrors] = useState({});
  const customersPerPage = 8;
  const [customers, setCustomers] = useState([]);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    averageInvoiceValue: 0
  });
  const [customerInvoices, setCustomerInvoices] = useState({});

  // Add sorting function
  const sortCustomers = (customers) => {
    return [...customers].sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      return sortDirection === 'asc' ? 
        aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  };

  // Add delete customer function
  const handleDeleteCustomer = async (customerId) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'customers', customerId));
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      setFilteredCustomers(prev => prev.filter(c => c.id !== customerId));
      setShowDeleteModal(false);
      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  // Update the useEffect to set both customers and filteredCustomers
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch customers
        const customersRef = collection(db, 'users', user.uid, 'customers');
        const snapshot = await getDocs(customersRef);
        const fetchedCustomers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setCustomers(fetchedCustomers);
        setFilteredCustomers(fetchedCustomers);

        // Fetch invoices
        const invoicesRef = collection(db, 'users', user.uid, 'invoices');
        const invoicesSnapshot = await getDocs(query(invoicesRef, orderBy('createdAt', 'desc')));
        const invoicesData = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));

        // Group invoices by customer
        const invoicesByCustomer = {};
        invoicesData.forEach(invoice => {
          if (invoice.customer?.id) {
            if (!invoicesByCustomer[invoice.customer.id]) {
              invoicesByCustomer[invoice.customer.id] = [];
            }
            invoicesByCustomer[invoice.customer.id].push(invoice);
          }
        });

        setCustomerInvoices(invoicesByCustomer);
        
        // Update stats with invoice data
        const totalInvoiceValue = invoicesData.reduce((acc, invoice) => {
          const total = invoice.parts?.reduce((sum, part) => sum + (parseFloat(part.price) || 0), 0) || 0;
          return acc + total;
        }, 0);

        setStats({
          totalCustomers: fetchedCustomers.length,
          activeCustomers: fetchedCustomers.filter(c => c.status === 'active').length,
          averageInvoiceValue: totalInvoiceValue / invoicesData.length || 0
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
        setIsLoading(false);
      }
    };

    fetchData();
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

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditMode && selectedCustomer) {
        // Update existing customer
        const customerRef = doc(db, 'users', user.uid, 'customers', selectedCustomer.id);
        const updateData = {
          ...formData,
          updatedAt: new Date()
        };
        
        await updateDoc(customerRef, updateData);
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, ...updateData } : c));
        setFilteredCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, ...updateData } : c));
        toast.success('Customer updated successfully');
      } else {
        // Add new customer
        const customersRef = collection(db, 'users', user.uid, 'customers');
        const newCustomer = {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const docRef = await addDoc(customersRef, newCustomer);
        const customerWithId = { id: docRef.id, ...newCustomer };
        setCustomers(prev => [...prev, customerWithId]);
        setFilteredCustomers(prev => [...prev, customerWithId]);
        toast.success('Customer added successfully');
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    }
    setIsLoading(false);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      company: customer.company || '',
      notes: customer.notes || '',
      preferredContact: customer.preferredContact || 'email',
      status: customer.status || 'active'
    });
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditMode(false);
    setSelectedCustomer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: '',
      notes: '',
      preferredContact: 'email',
      status: 'active'
    });
    setErrors({});
  };

  const handleAddNewCustomer = () => {
    setIsEditMode(false);
    setSelectedCustomer(null);
    setShowModal(true);
  };

  // Add helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Add helper function to format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Add helper function to get customer invoice summary
  const getCustomerInvoiceSummary = (customerId) => {
    const invoices = customerInvoices[customerId] || [];
    const total = invoices.reduce((sum, invoice) => {
      return sum + (invoice.parts?.reduce((partSum, part) => partSum + (parseFloat(part.price) || 0), 0) || 0);
    }, 0);
    const lastService = invoices.length > 0 ? invoices[0].createdAt : null;
    const invoiceCount = invoices.length;
    
    return {
      total,
      lastService,
      invoiceCount
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your customer relationships</p>
          </div>
          <div className="flex gap-3">
            <CSVLink 
              data={customers} 
              filename="customers.csv" 
              className="btn btn-secondary flex items-center gap-2"
            >
              <FiDownload /> Export
            </CSVLink>
            <button 
              onClick={handleAddNewCustomer}
              className="btn btn-primary flex items-center gap-2"
            >
              <FiPlus /> Add Customer
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCustomers}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FiUser className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Customers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeCustomers}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FiUser className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Invoice Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${stats.averageInvoiceValue.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FiBriefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search customers..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                onChange={(e) => debouncedSearch(e.target.value)}
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
            <div className="relative">
              <select 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 appearance-none"
                onChange={(e) => setSortField(e.target.value)}
                value={sortField}
              >
                <option value="name">Sort by Name</option>
                <option value="company">Sort by Company</option>
                <option value="createdAt">Sort by Date Added</option>
              </select>
              <FiFilter className="absolute left-3 top-3 text-gray-400" />
            </div>
            <div className="relative">
              <select 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 appearance-none"
                onChange={(e) => setFilterStatus(e.target.value)}
                value={filterStatus}
              >
                <option value="all">All Customers</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <FiUser className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full">
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <FiUser className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No customers</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by adding a new customer
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleAddNewCustomer}
                    className="btn btn-primary inline-flex items-center gap-2"
                  >
                    <FiPlus /> Add Customer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const invoiceSummary = getCustomerInvoiceSummary(customer.id);
              
              return (
                <div 
                  key={customer.id} 
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <FiUser className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{customer.name}</h3>
                          {customer.company && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{customer.company}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <FiMail className="w-4 h-4" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <FiPhone className="w-4 h-4" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <FiMapPin className="w-4 h-4" />
                            <span>{customer.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCustomer(customer)}
                        className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        title="Edit Customer"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                        title="Delete Customer"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Add Invoice Summary Section */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <FiClock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Last Service</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {invoiceSummary.lastService ? formatDate(invoiceSummary.lastService) : 'No service yet'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FiFileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Total Invoices</p>
                          <p className="font-medium text-gray-900 dark:text-white">{invoiceSummary.invoiceCount}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <FiDollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Total Billed</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(invoiceSummary.total)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {customer.notes && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{customer.notes}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Customer Modal (Add/Edit) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isEditMode ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border ${
                        errors.name 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border ${
                        errors.email 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    />
                  </div>

                  <div className="col-span-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preferred Contact
                    </label>
                    <select
                      name="preferredContact"
                      value={formData.preferredContact}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="col-span-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : isEditMode ? 'Update Customer' : 'Add Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Delete Customer
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete {selectedCustomer.name}? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
