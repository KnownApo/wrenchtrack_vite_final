import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoice } from '../context/InvoiceContext';
import InvoiceList from '../components/InvoiceList';
import InvoiceAnalytics from '../components/InvoiceAnalytics';
import InvoiceStatusChart from '../components/InvoiceStatusChart';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { debounce } from 'lodash';

export default function InvoiceScreen() {
  const { invoices, loading, error, setError } = useInvoice();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Clear error when component mounts
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [error, setError]);

  // Memoized filtered invoices based on search term
  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return invoices;
    
    const term = searchTerm.toLowerCase();
    return invoices.filter(inv =>
      inv.customerName?.toLowerCase().includes(term) ||
      inv.invoiceNumber?.toLowerCase().includes(term) ||
      inv.id?.toLowerCase().includes(term)
    );
  }, [invoices, searchTerm]);

  // Memoized analytics data
  const analyticsData = useMemo(() => {
    const totalInv = filteredInvoices.length;
    const totalRev = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const pendingAmt = filteredInvoices
      .filter(inv => inv.status === 'pending')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const overdue = filteredInvoices.filter(inv => inv.status === 'overdue').length;

    return {
      totalInvoices: totalInv,
      totalRevenue: totalRev,
      pendingAmount: pendingAmt,
      overdueInvoices: overdue,
    };
  }, [filteredInvoices]);

  // Memoized chart data
  const chartData = useMemo(() => {
    const statusCounts = filteredInvoices.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
  }, [filteredInvoices]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((term) => {
      setSearchTerm(term);
    }, 300),
    []
  );

  // Cleanup debounced function
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleView = useCallback((id) => {
    navigate(`/invoices/${id}`);
  }, [navigate]);

  const handleCreateInvoice = useCallback(() => {
    navigate('/invoices/create');
  }, [navigate]);

  const handleSearchChange = useCallback((e) => {
    debouncedSearch(e.target.value);
  }, [debouncedSearch]);

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoices</h1>
        <button
          onClick={handleCreateInvoice}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Invoice
        </button>
      </div>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Search invoices by customer name, invoice number, or ID..."
          onChange={handleSearchChange}
          className="w-full max-w-md p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:focus:ring-blue-400"
        />
      </div>

      <div className="space-y-6">
        <InvoiceAnalytics data={analyticsData} />
        
        {chartData.length > 0 && (
          <InvoiceStatusChart data={chartData} />
        )}
        
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No invoices found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first invoice'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreateInvoice}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
              >
                Create Your First Invoice
              </button>
            )}
          </div>
        ) : (
          <InvoiceList invoices={filteredInvoices} onView={handleView} />
        )}
      </div>
    </div>
  );
}