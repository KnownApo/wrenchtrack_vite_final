import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaTrash, FaPrint, FaFileDownload, FaCheckCircle, FaMoneyBillWave } from 'react-icons/fa';
import html2pdf from 'html2pdf.js';

export default function InvoiceHistoryScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Load invoices on component mount
  useEffect(() => {
    loadInvoices();
  }, [user, statusFilter]);

  // Function to load invoices that can be called after updates
  const loadInvoices = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching invoices for user:', user.uid);
      const invoicesRef = collection(db, 'users', user.uid, 'invoices');
      const snapshot = await getDocs(invoicesRef);
      
      if (snapshot.empty) {
        console.log('No invoices found');
        setInvoices([]);
        return;
      }
      
      // Map the documents to array and add document ID
      let loadedInvoices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamp to JS Date if needed
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt) || new Date()
      }));
      
      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        loadedInvoices = loadedInvoices.filter(invoice => 
          invoice.status?.toLowerCase() === statusFilter.toLowerCase()
        );
      }
      
      console.log(`Loaded ${loadedInvoices.length} invoices`);
      
      // Sort by created date (newest first)
      loadedInvoices.sort((a, b) => {
        // Use timestamp if available, or fall back to createdAt
        const timeA = a.timestamp || a.createdAt.getTime();
        const timeB = b.timestamp || b.createdAt.getTime();
        return timeB - timeA;
      });

      setInvoices(loadedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle viewing an invoice
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };
  
  // Handle deleting an invoice
  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'invoices', id));
      setInvoices(invoices.filter(invoice => invoice.id !== id));
      toast.success('Invoice deleted successfully');
      if (isModalOpen) {
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  // Handle updating invoice status
  const handleUpdateStatus = async (invoice, newStatus) => {
    try {
      // Don't set global loading state - it causes the UI to rerender and crash
      const localLoading = true;
      
      const invoiceRef = doc(db, 'users', user.uid, 'invoices', invoice.id);
      await updateDoc(invoiceRef, { 
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      const updatedInvoices = invoices.map(inv => 
        inv.id === invoice.id ? { ...inv, status: newStatus, updatedAt: new Date() } : inv
      );
      setInvoices(updatedInvoices);
      
      // Update selected invoice if in modal
      if (selectedInvoice && selectedInvoice.id === invoice.id) {
        setSelectedInvoice({...selectedInvoice, status: newStatus, updatedAt: new Date()});
      }
      
      toast.success(`Invoice marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  // Get user-friendly status label
  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'Paid';
      case 'overdue': return 'Overdue';
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      case 'canceled': return 'Canceled';
      default: return 'Pending';
    }
  };

  // Format date for display with better error handling
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString();
      }
      if (date instanceof Date) {
        return date.toLocaleDateString();
      }
      // Handle Firebase timestamp
      if (date.toDate) {
        return date.toDate().toLocaleDateString();
      }
      return 'N/A';
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'N/A';
    }
  };

  // Get status badge with improved colors and accessibility
  const getStatusBadge = (status) => {
    let bgColor, textColor, icon;
    
    switch (status?.toLowerCase()) {
      case 'paid':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        icon = <FaMoneyBillWave className="mr-1" size={12} />;
        break;
      case 'overdue':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        icon = <span className="mr-1">⚠️</span>;
        break;
      case 'completed':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        icon = <FaCheckCircle className="mr-1" size={12} />;
        break;
      case 'pending':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        icon = <span className="mr-1">⏱️</span>;
        break;
      case 'canceled':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        icon = <span className="mr-1">❌</span>;
        break;
      default:
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        icon = <span className="mr-1">⏱️</span>;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {icon}
        {getStatusLabel(status)}
      </span>
    );
  };

  // Calculate invoice amount correctly
  const calculateInvoiceAmount = (invoice) => {
    if (invoice.total) {
      return Number(invoice.total);
    } else if (invoice.parts && Array.isArray(invoice.parts)) {
      return invoice.parts.reduce((sum, part) => {
        const cost = parseFloat(part.cost) || 0;
        const quantity = parseInt(part.quantity) || 1;
        return sum + (cost * quantity);
      }, 0);
    }
    return 0;
  };

  // Add missing getStatusColor function
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Fix the generatePDF function that's missing
  const generatePDF = (invoice) => {
    try {
      // Create a container for the invoice
      const container = document.createElement('div');
      container.className = 'invoice-pdf-container';
      container.style.padding = '20px';
      container.style.fontFamily = 'Arial, sans-serif';
      
      // Add invoice content
      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
          <div>
            <h1 style="font-size:24px; margin-bottom:5px;">${invoice.title || 'Invoice'}</h1>
            <p style="margin:3px 0;">Invoice #: ${invoice.invoiceNumber}</p>
            ${invoice.poNumber ? `<p style="margin:3px 0;">PO #: ${invoice.poNumber}</p>` : ''}
          </div>
          <div style="text-align:right;">
            <p style="margin:3px 0;">Date: ${new Date(invoice.date).toLocaleDateString()}</p>
            <p style="margin:3px 0;">Due: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
          <div>
            <h3 style="margin-bottom:5px;">Bill To:</h3>
            <p style="margin:3px 0; font-weight:bold;">${invoice.customer?.name || ''}</p>
            <p style="margin:3px 0;">${invoice.customer?.company || ''}</p>
            <p style="margin:3px 0;">${invoice.customer?.address || ''}</p>
            <p style="margin:3px 0;">${invoice.customer?.email || ''}</p>
            <p style="margin:3px 0;">${invoice.customer?.phone || ''}</p>
          </div>
          <div style="text-align:right;">
            <h3 style="margin-bottom:5px;">From:</h3>
            <p style="margin:3px 0; font-weight:bold;">${invoice.businessInfo?.name || 'Your Company Name'}</p>
            <p style="margin:3px 0;">${[
              invoice.businessInfo?.address,
              invoice.businessInfo?.city,
              invoice.businessInfo?.state,
              invoice.businessInfo?.zip
            ].filter(Boolean).join(', ') || 'Your Company Address'}</p>
            <p style="margin:3px 0;">${invoice.businessInfo?.email || 'Your Email'}</p>
            <p style="margin:3px 0;">${invoice.businessInfo?.phone || 'Your Phone'}</p>
          </div>
        </div>
        
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
          <thead>
            <tr style="background-color:#f3f4f6;">
              <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Description</th>
              <th style="text-align:center; padding:8px; border-bottom:1px solid #ddd;">Quantity</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid #ddd;">Unit Price</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.parts?.map(part => `
              <tr>
                <td style="padding:8px; border-bottom:1px solid #ddd;">${part.name}</td>
                <td style="text-align:center; padding:8px; border-bottom:1px solid #ddd;">${part.quantity}</td>
                <td style="text-align:right; padding:8px; border-bottom:1px solid #ddd;">
                  ${invoice.preferences?.currency || '$'}${Number(part.cost).toFixed(2)}
                </td>
                <td style="text-align:right; padding:8px; border-bottom:1px solid #ddd;">
                  ${invoice.preferences?.currency || '$'}${(Number(part.cost) * Number(part.quantity)).toFixed(2)}
                </td>
              </tr>
            `).join('') || ''}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right; padding:8px; font-weight:bold;">Subtotal</td>
              <td style="text-align:right; padding:8px;">
                ${invoice.preferences?.currency || '$'}${Number(invoice.subtotal).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td colspan="3" style="text-align:right; padding:8px; font-weight:bold;">
                Tax (${(Number(invoice.taxRate) * 100).toFixed(1)}%)
              </td>
              <td style="text-align:right; padding:8px;">
                ${invoice.preferences?.currency || '$'}${Number(invoice.tax).toFixed(2)}
              </td>
            </tr>
            <tr style="background-color:#f3f4f6;">
              <td colspan="3" style="text-align:right; padding:8px; font-weight:bold; font-size:16px;">Total</td>
              <td style="text-align:right; padding:8px; font-weight:bold; font-size:16px;">
                ${invoice.preferences?.currency || '$'}${Number(invoice.total).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
        
        ${invoice.notes ? `
          <div style="margin-bottom:20px;">
            <h3 style="margin-bottom:5px;">Notes:</h3>
            <p style="margin:0;">${invoice.notes}</p>
          </div>
        ` : ''}
        
        <div style="border-top:1px solid #ddd; padding-top:20px;">
          <p style="margin:3px 0;">${invoice.preferences?.invoiceNotes || 'Thank you for your business!'}</p>
          <p style="margin:3px 0;">Please make checks payable to ${invoice.businessInfo?.name || 'Your Company Name'}</p>
        </div>
      `;
      
      // Temporarily append to document
      document.body.appendChild(container);
      
      // Generate PDF
      html2pdf().from(container).set({
        margin: 0.5,
        filename: `invoice-${invoice.invoiceNumber || 'download'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      }).save().then(() => {
        // Remove the temporary container
        document.body.removeChild(container);
        toast.success('PDF generated successfully');
      }).catch(err => {
        console.error('Error generating PDF:', err);
        document.body.removeChild(container);
        toast.error('Failed to generate PDF');
      });
    } catch (error) {
      console.error('Error in generatePDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page header with better spacing and card design */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Invoice History</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track all your invoices in one place
          </p>
        </header>
        
        {/* Filter and actions bar */}
        <div className="bg-white shadow-sm rounded-lg mb-6 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                Filter by:
              </label>
              <select 
                id="status-filter"
                className="form-select px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Invoices</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
            
            <button
              onClick={() => navigate('/invoice')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Invoice
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {/* Empty state */}
          {!isLoading && invoices.length === 0 && (
            <div className="py-12 px-4 sm:px-6 lg:px-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No invoices found</h3>
              <p className="mt-1 text-gray-500">
                {statusFilter !== 'all' 
                  ? `No invoices with '${getStatusLabel(statusFilter)}' status found.` 
                  : "You haven't created any invoices yet."}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/invoice')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Your First Invoice
                </button>
              </div>
            </div>
          )}
          
          {/* Invoices table with improved layout */}
          {!isLoading && invoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => {
                    const amount = calculateInvoiceAmount(invoice);
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        {/* Invoice details column */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber || `Draft #${invoice.id.substring(0, 6)}`}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <span className="mr-2">Created: {formatDate(invoice.date)}</span>
                            <span>Due: {formatDate(invoice.dueDate)}</span>
                          </div>
                        </td>
                        
                        {/* Customer column */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{invoice.customer?.name || 'N/A'}</div>
                          {invoice.customer?.company && (
                            <div className="text-xs text-gray-500">{invoice.customer.company}</div>
                          )}
                        </td>
                        
                        {/* Amount column */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.preferences?.currency || '$'}{amount.toFixed(2)}
                          </div>
                        </td>
                        
                        {/* Status column */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {getStatusBadge(invoice.status)}
                        </td>
                        
                        {/* Actions column */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center space-x-2">
                            <button 
                              onClick={() => handleViewInvoice(invoice)} 
                              className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded"
                              title="View Details"
                              aria-label="View invoice details"
                            >
                              <FaEye size={14} />
                            </button>
                            <button 
                              onClick={() => generatePDF(invoice)} 
                              className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded"
                              title="Download PDF"
                              aria-label="Download invoice as PDF"
                            >
                              <FaFileDownload size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteInvoice(invoice.id)} 
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded"
                              title="Delete Invoice"
                              aria-label="Delete invoice"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                          
                          {/* Quick status update */}
                          <div className="mt-2 flex justify-center space-x-1">
                            <button
                              onClick={() => handleUpdateStatus(invoice, 'completed')}
                              className={`p-1 text-xs rounded ${invoice.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 hover:bg-blue-50'}`}
                              title="Mark as Completed"
                              aria-label="Mark invoice as completed"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(invoice, 'paid')}
                              className={`p-1 text-xs rounded ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 hover:bg-green-50'}`}
                              title="Mark as Paid"
                              aria-label="Mark invoice as paid"
                            >
                              Paid
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Invoice Modal with improved UX */}
      {isModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Invoice Details
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({selectedInvoice.invoiceNumber || 'Draft'})
                </span>
              </h2>
              <button
                onClick={(e) => { 
                  e.stopPropagation();
                  setIsModalOpen(false);
                }}
                className="rounded-full p-1 hover:bg-gray-100 focus:outline-none"
                aria-label="Close"
              >
                <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Status change bar */}
            <div className="bg-gray-50 px-6 py-2 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">Status:</span> 
                {getStatusBadge(selectedInvoice.status)}
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateStatus(selectedInvoice, 'pending');
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    selectedInvoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-white border hover:bg-yellow-50'
                  }`}
                >
                  Pending
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateStatus(selectedInvoice, 'completed');
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    selectedInvoice.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-white border hover:bg-blue-50'
                  }`}
                >
                  Completed
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateStatus(selectedInvoice, 'paid');
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-white border hover:bg-green-50'
                  }`}
                >
                  Paid
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Invoice Header */}
              <div className="flex flex-wrap md:flex-nowrap justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {selectedInvoice.title || 'Invoice'}
                  </h3>
                  <p className="text-gray-600">
                    Invoice #: {selectedInvoice.invoiceNumber}
                  </p>
                  {selectedInvoice.poNumber && (
                    <p className="text-gray-600">
                      PO #: {selectedInvoice.poNumber}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-gray-600">
                    Date: {formatDate(selectedInvoice.date)}
                  </p>
                  <p className="text-gray-600">
                    Due: {formatDate(selectedInvoice.dueDate)}
                  </p>
                  <span className={`mt-2 inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                    {selectedInvoice.status || 'pending'}
                  </span>
                </div>
              </div>
              
              {/* Customer and Business Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Bill To:</h4>
                  <p className="text-gray-600 font-medium">
                    {selectedInvoice.customer?.name || 'N/A'}
                  </p>
                  {selectedInvoice.customer?.company && (
                    <p className="text-gray-600">
                      {selectedInvoice.customer.company}
                    </p>
                  )}
                  {selectedInvoice.customer?.address && (
                    <p className="text-gray-600">
                      {selectedInvoice.customer.address}
                    </p>
                  )}
                  {selectedInvoice.customer?.email && (
                    <p className="text-gray-600">
                      {selectedInvoice.customer.email}
                    </p>
                  )}
                  {selectedInvoice.customer?.phone && (
                    <p className="text-gray-600">
                      {selectedInvoice.customer.phone}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">From:</h4>
                  <p className="text-gray-600 font-medium">
                    {selectedInvoice.businessInfo?.name || 'Your Company Name'}
                  </p>
                  <p className="text-gray-600">
                    {[
                      selectedInvoice.businessInfo?.address,
                      selectedInvoice.businessInfo?.city,
                      selectedInvoice.businessInfo?.state,
                      selectedInvoice.businessInfo?.zip,
                    ].filter(Boolean).join(', ') || 'Your Company Address'}
                  </p>
                  {selectedInvoice.businessInfo?.email && (
                    <p className="text-gray-600">
                      {selectedInvoice.businessInfo.email}
                    </p>
                  )}
                  {selectedInvoice.businessInfo?.phone && (
                    <p className="text-gray-600">
                      {selectedInvoice.businessInfo.phone}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Items Table */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full">
                  <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Item</th>
                      <th className="px-4 py-2 text-center">Qty</th>
                      <th className="px-4 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInvoice.parts?.map((part, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-gray-800">{part.name}</td>
                        <td className="px-4 py-2 text-center text-gray-800">{part.quantity}</td>
                        <td className="px-4 py-2 text-right text-gray-800">
                          {selectedInvoice.preferences?.currency || '$'}{Number(part.cost).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-800">
                          {selectedInvoice.preferences?.currency || '$'}{(Number(part.cost) * Number(part.quantity)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-right font-medium text-gray-700">Subtotal</td>
                      <td className="px-4 py-2 text-right text-gray-800">
                        {selectedInvoice.preferences?.currency || '$'}{Number(selectedInvoice.subtotal).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-right font-medium text-gray-700">
                        Tax ({(Number(selectedInvoice.taxRate) * 100).toFixed(1)}%)
                      </td>
                      <td className="px-4 py-2 text-right text-gray-800">
                        {selectedInvoice.preferences?.currency || '$'}{Number(selectedInvoice.tax).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td colSpan="3" className="px-4 py-2 text-right font-bold text-gray-700">Total</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-800">
                        {selectedInvoice.preferences?.currency || '$'}{Number(selectedInvoice.total).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Notes:</h4>
                  <p className="text-gray-600 whitespace-pre-line">
                    {selectedInvoice.notes}
                  </p>
                </div>
              )}
              
              {/* Footer with action buttons */}
              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    generatePDF(selectedInvoice);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <FaFileDownload className="mr-2" />
                  Download PDF
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(false);
                    handleDeleteInvoice(selectedInvoice.id);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  <FaTrash className="mr-2" />
                  Delete Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}