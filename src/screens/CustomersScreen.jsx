import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../context/CustomerContext';
import { useInvoice } from '../context/InvoiceContext';
import { 
  User, Mail, Phone, DollarSign, FileText, Plus, Search, Download, 
  TrendingUp, Calendar, Clock, Eye, Edit2, Trash2, List, Grid3x3,
  Users, Building, Star, Activity, X
} from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="space-y-8">
        {/* Modern Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="card-glass relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10" />
          
          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    Customer Management
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Build and manage lasting customer relationships
                  </p>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
              >
                <Plus className="w-5 h-5" />
                Add Customer
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Analytics Cards */}
        {customerAnalytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {/* Total Customers Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card-glass group"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {customerAnalytics.activeCustomers} active
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {customerAnalytics.totalCustomers}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
                </div>
              </div>
            </motion.div>

            {/* Revenue Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card-glass group"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(customerAnalytics.totalRevenue)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Avg: {formatCurrency(customerAnalytics.avgRevenue)}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Top Customer Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card-glass group"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">👑</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {customerAnalytics.topCustomers[0]?.name || 'N/A'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Top Customer</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {customerAnalytics.topCustomers[0] ? formatCurrency(customerAnalytics.topCustomers[0].totalRevenue) : 'N/A'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Activity Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card-glass group"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {customerAnalytics.customerStats.filter(c => c.lastInvoice && 
                      new Date(c.lastInvoice) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Recent Activity</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Active this week
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modern Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card-glass"
        >
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search customers by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                />
              </div>
              
              {/* Filters */}
              <div className="flex items-center gap-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="name">Sort by Name</option>
                  <option value="revenue">Sort by Revenue</option>
                  <option value="invoices">Sort by Invoices</option>
                  <option value="lastInvoice">Sort by Last Invoice</option>
                </select>
                
                <button
                  onClick={exportCustomers}
                  className="flex items-center gap-2 px-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-200"
                >
                  <Download size={18} />
                  Export
                </button>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      viewMode === 'table' 
                        ? 'bg-blue-500 text-white shadow-lg' 
                        : 'bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-white/90 dark:hover:bg-gray-800/90'
                    }`}
                  >
                    <List size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      viewMode === 'grid' 
                        ? 'bg-blue-500 text-white shadow-lg' 
                        : 'bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-white/90 dark:hover:bg-gray-800/90'
                    }`}
                  >
                    <Grid3x3 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Modern Customer Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="card-glass w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                    </h3>
                    <button
                      onClick={resetForm}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <X size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Address
                      </label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                      >
                        {editingCustomer ? 'Update Customer' : 'Add Customer'}
                      </button>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modern Customer List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="card-glass"
        >
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200/50 dark:border-gray-700/50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Revenue
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Invoices
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Last Invoice
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          No customers found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Add your first customer to get started
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer, index) => (
                      <motion.tr
                        key={customer.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <button
                                onClick={() => navigate(`/customers/${customer.id}`)}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                              >
                                {customer.name}
                              </button>
                              {customer.company && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Building className="w-3 h-3" />
                                  {customer.company}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="truncate">{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(customer.totalRevenue)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Avg: {formatCurrency(customer.avgInvoiceValue)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {customer.invoiceCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {customer.lastInvoice ? format(customer.lastInvoice, 'MMM d, yyyy') : 'Never'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                            customer.status === 'active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              customer.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            {customer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => navigate(`/customers/${customer.id}`)}
                              className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                              title="View Profile"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(customer)}
                              className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                              title="Edit Customer"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => navigate('/invoices/create', { 
                                state: { selectedCustomer: customer } 
                              })}
                              className="p-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
                              title="Create Invoice"
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(customer.id)}
                              className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Delete Customer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No customers found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Add your first customer to get started
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCustomers.map((customer, index) => (
                    <motion.div
                      key={customer.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="card-glass group hover:shadow-xl transition-all duration-300"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <button
                                onClick={() => navigate(`/customers/${customer.id}`)}
                                className="text-lg font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                              >
                                {customer.name}
                              </button>
                              {customer.company && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Building className="w-3 h-3" />
                                  {customer.company}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                            customer.status === 'active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            <div className={`w-2 h-2 rounded-full mr-1 ${
                              customer.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            {customer.status}
                          </span>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center p-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                            <p className="text-lg font-bold text-green-700 dark:text-green-400">
                              {formatCurrency(customer.totalRevenue)}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-500">Total Revenue</p>
                          </div>
                          <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                              {customer.invoiceCount}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-500">Invoices</p>
                          </div>
                        </div>
                        
                        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                          <p className="text-sm font-medium text-purple-700 dark:text-purple-400">
                            {customer.lastInvoice ? format(customer.lastInvoice, 'MMM d, yyyy') : 'Never'}
                          </p>
                          <p className="text-xs text-purple-600 dark:text-purple-500">Last Invoice</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => navigate('/invoices/create', { 
                              state: { selectedCustomer: customer } 
                            })}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <FileText size={14} />
                            Invoice
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
