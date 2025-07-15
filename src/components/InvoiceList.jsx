import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../context/CustomerContext';
import { useInvoice } from '../context/InvoiceContext';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import { 
  FiEye, FiEdit2, FiFilter, FiSearch, FiMoreVertical, FiDollarSign, FiCalendar,
  FiClock, FiUser, FiTag, FiTrendingUp, FiArrowUp, FiArrowDown, FiCheck, FiX,
  FiTrash2, FiCheckSquare, FiSquare
} from 'react-icons/fi';

const getStatusColor = (status) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'overdue':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'draft':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'paid':
      return <FiDollarSign className="w-3 h-3" />;
    case 'pending':
      return <FiClock className="w-3 h-3" />;
    case 'overdue':
      return <FiCalendar className="w-3 h-3" />;
    case 'draft':
      return <FiTag className="w-3 h-3" />;
    default:
      return <FiTag className="w-3 h-3" />;
  }
};

export default function InvoiceList({ invoices, onView }) {
  const navigate = useNavigate();
  const { customers } = useCustomers();
  const { updateInvoice } = useInvoice();
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [filterStatus, setFilterStatus] = useState('all');
  const [showActions, setShowActions] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Bulk actions functions
  const handleBulkStatusUpdate = async (status) => {
    if (selectedInvoices.length === 0) return;
    
    try {
      setIsLoading(true);
      
      const updatePromises = selectedInvoices.map(async (invoiceId) => {
        const docRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
        return updateDoc(docRef, { 
          status,
          updatedAt: new Date(),
          ...(status === 'paid' && { paidAt: new Date() })
        });
      });
      
      await Promise.all(updatePromises);
      
      toast.success(`Updated ${selectedInvoices.length} invoices to ${status}`);
      setSelectedInvoices([]);
      setShowBulkActions(false);
      
      // Refresh the data
      window.location.reload();
    } catch (error) {
      console.error('Error updating invoices:', error);
      toast.error('Failed to update invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedInvoices.length} invoices? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const deletePromises = selectedInvoices.map(async (invoiceId) => {
        const docRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
        return deleteDoc(docRef);
      });
      
      await Promise.all(deletePromises);
      
      toast.success(`Deleted ${selectedInvoices.length} invoices`);
      setSelectedInvoices([]);
      setShowBulkActions(false);
      
      // Refresh the data
      window.location.reload();
    } catch (error) {
      console.error('Error deleting invoices:', error);
      toast.error('Failed to delete invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(invoice => invoice.id));
    }
  };

  const handleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  // Generate full invoice number with PO number
  const getFullInvoiceNumber = (invoice) => {
    const baseNumber = invoice.invoiceNumber || invoice.id;
    return invoice.poNumber ? `${baseNumber}-${invoice.poNumber}` : baseNumber;
  };

  const handleEdit = (invoiceId) => {
    navigate(`/invoices/${invoiceId}/edit`);
  };

  const handleCustomerClick = (invoice) => {
    const customerId = invoice.customer?.id || invoice.customerId;
    if (customerId) {
      // Find customer in context to ensure it exists
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        navigate(`/customers/${customerId}`);
      } else {
        toast.error('Customer not found');
      }
    } else {
      toast.error('Customer information not available');
    }
  };

  const handleQuickStatusChange = async (invoiceId, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'paid') {
        updates.paid = true;
        updates.paidAt = new Date().toISOString();
      } else {
        updates.paid = false;
        updates.paidAt = null;
      }
      await updateInvoice(invoiceId, updates);
      toast.success(`Invoice marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice status');
    }
  };

  const handleBulkAction = async (action) => {
    try {
      const promises = selectedInvoices.map(invoiceId => {
        switch (action) {
          case 'markPaid':
            return updateInvoice(invoiceId, { 
              status: 'paid', 
              paid: true, 
              paidAt: new Date().toISOString() 
            });
          case 'markPending':
            return updateInvoice(invoiceId, { 
              status: 'pending', 
              paid: false, 
              paidAt: null 
            });
          default:
            return Promise.resolve();
        }
      });
      
      await Promise.all(promises);
      toast.success(`${selectedInvoices.length} invoices updated`);
      setSelectedInvoices([]);
    } catch (error) {
      console.error('Error with bulk action:', error);
      toast.error('Failed to update invoices');
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedAndFilteredInvoices = useMemo(() => {
    let filtered = [...invoices];
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filterStatus);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle special cases
      if (sortBy === 'customerName') {
        aValue = a.customer?.name || a.customerName || '';
        bValue = b.customer?.name || b.customerName || '';
      } else if (sortBy === 'totalAmount') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (sortBy === 'createdAt' || sortBy === 'dueDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return filtered;
  }, [invoices, sortBy, sortOrder, filterStatus]);

  const toggleSelectAll = () => {
    if (selectedInvoices.length === sortedAndFilteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(sortedAndFilteredInvoices.map(inv => inv.id));
    }
  };

  const toggleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <FiArrowUp className="w-3 h-3" /> : <FiArrowDown className="w-3 h-3" />;
  };

  if (!invoices || invoices.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
        <FiSearch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No invoices found</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Bulk Actions Bar */}
      {selectedInvoices.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedInvoices.length} invoice{selectedInvoices.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedInvoices([])}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkStatusUpdate('draft')}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                <FiTag size={12} />
                Draft
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('pending')}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors disabled:opacity-50"
              >
                <FiClock size={12} />
                Pending
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('paid')}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors disabled:opacity-50"
              >
                <FiDollarSign size={12} />
                Paid
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors disabled:opacity-50"
              >
                <FiTrash2 size={12} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Header with Filters and Actions */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left side - Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FiFilter className="w-4 h-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">View:</span>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <FiTag className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <FiTrendingUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right side - Bulk Actions */}
          {selectedInvoices.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedInvoices.length} selected
              </span>
              <button
                onClick={() => handleBulkAction('markPaid')}
                className="px-3 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
              >
                Mark Paid
              </button>
              <button
                onClick={() => handleBulkAction('markPending')}
                className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
              >
                Mark Pending
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === sortedAndFilteredInvoices.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort('invoiceNumber')}
                >
                  <div className="flex items-center gap-1">
                    Invoice <SortIcon column="invoiceNumber" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort('customerName')}
                >
                  <div className="flex items-center gap-1">
                    Customer <SortIcon column="customerName" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort('totalAmount')}
                >
                  <div className="flex items-center gap-1">
                    Amount <SortIcon column="totalAmount" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status <SortIcon column="status" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort('dueDate')}
                >
                  <div className="flex items-center gap-1">
                    Due Date <SortIcon column="dueDate" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    Created <SortIcon column="createdAt" />
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedAndFilteredInvoices.map((invoice) => (
                <tr 
                  key={invoice.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedInvoices.includes(invoice.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice.id)}
                      onChange={() => toggleSelectInvoice(invoice.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {getFullInvoiceNumber(invoice)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FiUser className="w-4 h-4 text-gray-400" />
                      <button
                        onClick={() => handleCustomerClick(invoice)}
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors font-medium"
                      >
                        {invoice.customer?.name || invoice.customerName || 'Unknown Customer'}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(invoice.totalAmount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      {invoice.status || 'draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {invoice.createdAt ? format(invoice.createdAt, 'MMM d, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => onView(invoice.id)}
                        className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="View Invoice"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(invoice.id)}
                        className="p-1 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                        title="Edit Invoice"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowActions(prev => ({...prev, [invoice.id]: !prev[invoice.id]}))}
                          className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                          title="More Actions"
                        >
                          <FiMoreVertical className="w-4 h-4" />
                        </button>
                        {showActions[invoice.id] && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => handleQuickStatusChange(invoice.id, 'paid')}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <FiDollarSign className="w-4 h-4" />
                              Mark as Paid
                            </button>
                            <button
                              onClick={() => handleQuickStatusChange(invoice.id, 'pending')}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <FiClock className="w-4 h-4" />
                              Mark as Pending
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAndFilteredInvoices.map((invoice) => (
            <div 
              key={invoice.id}
              className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow ${
                selectedInvoices.includes(invoice.id) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.includes(invoice.id)}
                    onChange={() => toggleSelectInvoice(invoice.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {invoice.invoiceNumber || `#${invoice.id.slice(0, 8)}`}
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                  {getStatusIcon(invoice.status)}
                  {invoice.status || 'draft'}
                </span>
              </div>
              
              <div className="mb-3">
                <button
                  onClick={() => handleCustomerClick(invoice)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
                >
                  {invoice.customer?.name || invoice.customerName || 'Unknown Customer'}
                </button>
              </div>
              
              <div className="mb-3">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(invoice.totalAmount)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Due: {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : 'N/A'}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Created: {invoice.createdAt ? format(invoice.createdAt, 'MMM d') : 'N/A'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onView(invoice.id)}
                    className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    title="View Invoice"
                  >
                    <FiEye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(invoice.id)}
                    className="p-1 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                    title="Edit Invoice"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}