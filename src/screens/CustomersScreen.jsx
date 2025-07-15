import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../context/CustomerContext';
import { useInvoice } from '../context/InvoiceContext';
import { FiUser, FiMail, FiPhone, FiDollarSign, FiFileText, FiPlus, FiSearch, FiDownload, FiTrendingUp, FiCalendar, FiClock, FiEye, FiEdit2, FiTrash2, FiList, FiGrid } from 'react-icons/fi';
import { formatCurrency } from '../utils/helpers/helpers';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function CustomersScreen() {
  const navigate = useNavigate();
  const { customers, loading: customersLoading, error: customersError, createCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { invoices, loading: invoicesLoading, error: invoicesError } = useInvoice();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    notes: '',
    status: 'active'
  });

  const loading = customersLoading || invoicesLoading;
  const error = customersError || invoicesError;

  // Calculate customer analytics
  const customerAnalytics = useMemo(() => {
    if (!customers || !invoices) return null;

    const customerStats = customers.map(customer => {
      const customerInvoices = invoices.filter(inv => inv.customer?.id === customer.id);
      const totalRevenue = customerInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const lastInvoice = customerInvoices.length > 0 ? 
        customerInvoices.reduce((latest, inv) => 
          new Date(inv.createdAt) > new Date(latest.createdAt) ? inv : latest
        ) : null;

      return {
        ...customer,
        totalRevenue,
        invoiceCount: customerInvoices.length,
        lastInvoice: lastInvoice ? new Date(lastInvoice.createdAt) : null,
        avgInvoiceValue: customerInvoices.length > 0 ? totalRevenue / customerInvoices.length : 0,
        status: customer.status || 'active'
      };
    });

    const totalCustomers = customers.length;
    const activeCustomers = customerStats.filter(c => c.status === 'active').length;
    const totalRevenue = customerStats.reduce((sum, c) => sum + c.totalRevenue, 0);
    const avgRevenue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    return {
      customerStats,
      totalCustomers,
      activeCustomers,
      totalRevenue,
      avgRevenue,
      topCustomers: customerStats.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5)
    };
  }, [customers, invoices]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    if (!customerAnalytics) return [];

    let filtered = customerAnalytics.customerStats;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(customer => customer.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'invoices':
          return b.invoiceCount - a.invoiceCount;
        case 'lastInvoice':
          if (!a.lastInvoice && !b.lastInvoice) return 0;
          if (!a.lastInvoice) return 1;
          if (!b.lastInvoice) return -1;
          return new Date(b.lastInvoice) - new Date(a.lastInvoice);
        default:
          return 0;
      }
    });

    return filtered;
  }, [customerAnalytics, searchTerm, filterStatus, sortBy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
        toast.success('Customer updated successfully!');
      } else {
        await createCustomer(formData);
        toast.success('Customer created successfully!');
      }
      resetForm();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      company: customer.company || '',
      notes: customer.notes || '',
      status: customer.status || 'active'
    });
    setShowForm(true);
  };

  const handleDelete = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer(customerId);
        toast.success('Customer deleted successfully!');
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error('Failed to delete customer');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: '',
      notes: '',
      status: 'active'
    });
    setEditingCustomer(null);
    setShowForm(false);
  };

  const exportCustomers = () => {
    if (!filteredCustomers.length) return;

    const csvData = filteredCustomers.map(customer => ({
      Name: customer.name,
      Email: customer.email || '',
      Phone: customer.phone || '',
      Company: customer.company || '',
      Address: customer.address || '',
      Status: customer.status,
      'Total Revenue': customer.totalRevenue,
      'Invoice Count': customer.invoiceCount,
      'Last Invoice': customer.lastInvoice ? format(customer.lastInvoice, 'yyyy-MM-dd') : 'Never',
      Notes: customer.notes || ''
    }));

    const csvContent = "data:text/csv;charset=utf-8," + 
      Object.keys(csvData[0]).join(",") + "\n" +
      csvData.map(row => Object.values(row).map(val => `"${val}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customers-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your customer relationships</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FiPlus size={16} />
          Add Customer
        </button>
      </div>

      {/* Analytics Cards */}
      {customerAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{customerAnalytics.totalCustomers}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{customerAnalytics.activeCustomers} active</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <FiUser className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatCurrency(customerAnalytics.totalRevenue)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg: {formatCurrency(customerAnalytics.avgRevenue)}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <FiDollarSign className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Top Customer</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {customerAnalytics.topCustomers[0]?.name || 'N/A'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {customerAnalytics.topCustomers[0] ? formatCurrency(customerAnalytics.topCustomers[0].totalRevenue) : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <FiTrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent Activity</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {customerAnalytics.customerStats.filter(c => c.lastInvoice && 
                    new Date(c.lastInvoice) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active this week</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                <FiClock className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="name">Sort by Name</option>
            <option value="revenue">Sort by Revenue</option>
            <option value="invoices">Sort by Invoices</option>
            <option value="lastInvoice">Sort by Last Invoice</option>
          </select>
          <button
            onClick={exportCustomers}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <FiDownload size={16} />
            Export
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'table' 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <FiList size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <FiGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Customer Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Invoices
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <FiUser className="mx-auto mb-4 text-gray-400" size={48} />
                      <p>No customers found</p>
                      <p className="text-sm">Add your first customer to get started</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <FiUser className="text-blue-600 dark:text-blue-400" size={16} />
                            </div>
                          </div>
                          <div className="ml-4">
                            <button
                              onClick={() => navigate(`/customers/${customer.id}`)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors text-left"
                            >
                              {customer.name}
                            </button>
                            {customer.company && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {customer.company}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {customer.email && (
                            <div className="flex items-center mb-1">
                              <FiMail className="mr-2 text-gray-400" size={14} />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center">
                              <FiPhone className="mr-2 text-gray-400" size={14} />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(customer.totalRevenue)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Avg: {formatCurrency(customer.avgInvoiceValue)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiFileText className="mr-2 text-gray-400" size={14} />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {customer.invoiceCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiCalendar className="mr-2 text-gray-400" size={14} />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {customer.lastInvoice ? format(customer.lastInvoice, 'MMM d, yyyy') : 'Never'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                            title="View Profile"
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            title="Edit Customer"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            onClick={() => navigate('/invoices/create', { 
                              state: { selectedCustomer: customer } 
                            })}
                            className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                            title="Create Invoice"
                          >
                            <FiFileText size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title="Delete Customer"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <FiUser className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-500 dark:text-gray-400">No customers found</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add your first customer to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <FiUser className="text-blue-600 dark:text-blue-400" size={20} />
                        </div>
                        <div className="ml-3">
                          <button
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            className="text-lg font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors text-left"
                          >
                            {customer.name}
                          </button>
                          {customer.company && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{customer.company}</p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        customer.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {customer.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {customer.email && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <FiMail className="mr-2 text-gray-400" size={14} />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <FiPhone className="mr-2 text-gray-400" size={14} />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(customer.totalRevenue)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {customer.invoiceCount}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Invoices</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {customer.lastInvoice ? format(customer.lastInvoice, 'MMM d, yyyy') : 'Never'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last Invoice</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(customer)}
                        className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => navigate('/invoices/create', { 
                          state: { selectedCustomer: customer } 
                        })}
                        className="flex-1 bg-green-100 hover:bg-green-200 text-green-600 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                      >
                        Invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
