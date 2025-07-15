import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../context/CustomerContext';
import { useInvoice } from '../context/InvoiceContext';
import { FiUser, FiMail, FiPhone, FiMapPin, FiEdit2, FiTrash2, FiSearch, FiClock, FiDollarSign, FiFileText, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import debounce from 'lodash/debounce';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function CustomerHistoryScreen() {
  const navigate = useNavigate();
  const { customers, loading: customersLoading, error: customersError, updateCustomer, deleteCustomer } = useCustomers();
  const { invoices, loading: invoicesLoading, error: invoicesError } = useInvoice();
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    notes: '',
    preferredContact: 'email',
    status: 'active'
  });

  const loading = customersLoading || invoicesLoading;
  const error = customersError || invoicesError;

  // Initialize filtered customers when customers data changes
  React.useEffect(() => {
    if (customers) {
      setFilteredCustomers(customers);
    }
  }, [customers]);

  // Customer analytics data
  const { customerInvoices, stats } = useMemo(() => {
    if (!customers || !invoices) return { customerInvoices: {}, stats: { totalCustomers: 0, totalInvoices: 0, totalRevenue: 0 } };

    // Group invoices by customer
    const invoicesByCustomer = {};
    let totalRevenue = 0;
    
    invoices.forEach(invoice => {
      if (invoice.customer?.id) {
        if (!invoicesByCustomer[invoice.customer.id]) {
          invoicesByCustomer[invoice.customer.id] = [];
        }
        invoicesByCustomer[invoice.customer.id].push(invoice);
        totalRevenue += invoice.totalAmount || 0;
      }
    });

    return {
      customerInvoices: invoicesByCustomer,
      stats: {
        totalCustomers: customers.length,
        totalInvoices: invoices.length,
        totalRevenue: totalRevenue
      }
    };
  }, [customers, invoices]);

  const handleSearch = debounce((query) => {
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
  }, 300);
  const startEditing = (customer) => {
    setEditingCustomer(customer.id);
    setEditData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      company: customer.company || '',
      notes: customer.notes || '',
      preferredContact: customer.preferredContact || 'email',
      status: customer.status || 'active'
    });
  };

  const saveEdit = async () => {
    if (!editingCustomer) return;

    try {
      await updateCustomer(editingCustomer, editData);
      setEditingCustomer(null);
      setEditData({
        name: '',
        email: '',
        phone: '',
        address: '',
        company: '',
        notes: '',
        preferredContact: 'email',
        status: 'active'
      });
      toast.success('Customer updated successfully');
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer');
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await deleteCustomer(id);
      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCustomerSummary = (customerId) => {
    const invoices = customerInvoices[customerId] || [];
    const total = invoices.reduce((sum, invoice) => {
      return sum + (invoice.parts?.reduce((partSum, part) => 
        partSum + (parseFloat(part.price) || 0) * (parseFloat(part.quantity) || 1), 0) || 0);
    }, 0);
    const lastService = invoices.length > 0 ? invoices[0].createdAt : null;
    
    return {
      total,
      lastService,
      invoiceCount: invoices.length,
      recentInvoices: invoices.slice(0, 3)
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer History</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">View detailed customer history and interactions</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalInvoices}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FiFileText className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FiDollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="relative">
            <input
              type="text"
              placeholder="Search customers..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              onChange={(e) => handleSearch(e.target.value)}
            />
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
        </div>

        {/* Customer List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <FiUser className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No customers found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search terms
              </p>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const summary = getCustomerSummary(customer.id);
              
              return (
                <div
                  key={customer.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  {editingCustomer === customer.id ? (
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Customer</h3>
                        <button
                          onClick={() => setEditingCustomer(null)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <FiX className="w-5 h-5" />
                        </button>
                      </div>
                      <input
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        placeholder="Customer Name"
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        placeholder="Email"
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        placeholder="Phone"
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        value={editData.company}
                        onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                        placeholder="Company"
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <textarea
                        value={editData.address}
                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                        placeholder="Address"
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        rows="2"
                      ></textarea>
                      <textarea
                        value={editData.notes}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        placeholder="Notes"
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        rows="2"
                      ></textarea>
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCustomer(null)}
                          className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <FiUser className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <button
                              onClick={() => navigate(`/customers/${customer.id}`)}
                              className="font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                              {customer.name}
                            </button>
                            {customer.company && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{customer.company}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditing(customer)}
                            className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
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

                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <FiClock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Last Service</p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {summary.lastService ? formatDate(summary.lastService) : 'No service yet'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <FiFileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Total Invoices</p>
                              <p className="font-medium text-gray-900 dark:text-white">{summary.invoiceCount}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <FiDollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Total Revenue</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(summary.total)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Recent Invoices */}
                      {summary.recentInvoices.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Recent Invoices</h4>
                          <div className="space-y-2">
                            {summary.recentInvoices.map(invoice => (
                              <div key={invoice.id} className="flex justify-between items-center text-sm">
                                <div className="text-gray-600 dark:text-gray-400">
                                  {formatDate(invoice.createdAt)}
                                </div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(invoice.parts?.reduce((sum, part) => 
                                    sum + (parseFloat(part.price) || 0) * (parseFloat(part.quantity) || 1), 0) || 0
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {customer.notes && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{customer.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}