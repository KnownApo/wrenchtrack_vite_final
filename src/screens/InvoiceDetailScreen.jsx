import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import html2pdf from 'html2pdf.js';
import { FiArrowLeft, FiDownload, FiEdit, FiTrash2, FiMail, FiPhone, FiMapPin, FiPrinter, FiCheck, FiX, FiClock, FiDollarSign, FiFileText, FiCopy, FiShare2 } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { safeToDate, formatDate } from '../utils/dateUtils';
import { parseInvoiceNumber } from '../utils/invoiceUtils';

export default function InvoiceDetailScreen() {
  const { id: invoiceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef();
  
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [quickActionData, setQuickActionData] = useState({
    status: invoice?.status || 'draft',
    paymentTerms: invoice?.paymentTerms || 'Net 30',
    notes: invoice?.notes || ''
  });

  // Quick update functions
  const handleQuickStatusUpdate = async (newStatus) => {
    try {
      setIsLoading(true);
      
      const docRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
      await updateDoc(docRef, { 
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'paid' && { paidAt: new Date() })
      });
      
      setInvoice(prev => ({ 
        ...prev, 
        status: newStatus,
        ...(newStatus === 'paid' && { paidAt: new Date() })
      }));
      
      toast.success(`Invoice status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickNotesUpdate = async (newNotes) => {
    try {
      setIsLoading(true);
      
      const docRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
      await updateDoc(docRef, { 
        notes: newNotes,
        updatedAt: new Date()
      });
      
      setInvoice(prev => ({ ...prev, notes: newNotes }));
      setQuickActionData(prev => ({ ...prev, notes: newNotes }));
      
      toast.success('Notes updated successfully');
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
    } finally {
      setIsLoading(false);
    }
  };

  // Load business info for invoice header
  const loadBusinessInfo = useCallback(async () => {
    if (!user) return;
    
    try {
      const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'userSettings'));
      if (settingsDoc.exists()) {
        setBusinessInfo(settingsDoc.data());
      }
    } catch (error) {
      console.error('Error loading business info:', error);
    }
  }, [user]);

  // Load invoice data
  const loadInvoice = useCallback(async () => {
    if (!user || !invoiceId) {
      navigate('/invoices');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const docRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        const invoiceData = { 
          id: docSnap.id,
          ...data,
          createdAt: safeToDate(data.createdAt),
          dueDate: data.dueDate ? safeToDate(data.dueDate) : null,
          paidAt: data.paidAt ? safeToDate(data.paidAt) : null
        };
        setInvoice(invoiceData);
      } else {
        setError('Invoice not found');
      }
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError('Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  }, [user, invoiceId, navigate]);

  useEffect(() => {
    loadInvoice();
    loadBusinessInfo();
  }, [loadInvoice, loadBusinessInfo]);

  // Generate full invoice number display
  const getFullInvoiceNumber = () => {
    if (!invoice) return 'N/A';
    
    const parsed = parseInvoiceNumber(invoice.invoiceNumber);
    if (parsed) {
      return parsed.fullNumber;
    }
    
    // Fallback for old format
    const baseNumber = invoice.invoiceNumber || invoice.id;
    return invoice.poNumber ? `${baseNumber}-${invoice.poNumber}` : baseNumber;
  };

  // Copy invoice number to clipboard
  const handleCopyInvoiceNumber = async () => {
    try {
      await navigator.clipboard.writeText(getFullInvoiceNumber());
      toast.success('Invoice number copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy invoice number');
    }
  };

  // Share invoice (if Web Share API is available)
  const handleShareInvoice = async () => {
    const invoiceUrl = `${window.location.origin}/invoices/${invoice.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${getFullInvoiceNumber()}`,
          text: `Invoice for ${invoice.customer?.name || 'Customer'} - ${formatCurrency(calculateTotals().total)}`,
          url: invoiceUrl
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error('Failed to share invoice');
        }
      }
    } else {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(invoiceUrl);
        toast.success('Invoice URL copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy URL');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const calculateTotals = () => {
    if (!invoice) return { subtotal: 0, tax: 0, total: 0 };
    
    const subtotal = (invoice.parts || []).reduce((sum, part) => {
      return sum + (parseFloat(part.cost) || 0) * (parseInt(part.quantity) || 0);
    }, 0) + (parseFloat(invoice.laborCost) || 0);
    
    const tax = subtotal * (parseFloat(invoice.taxRate) || 0);
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    
    try {
      setIsPdfGenerating(true);
      
      const opt = {
        margin: [0.25, 0.25, 0.25, 0.25],
        filename: `invoice-${getFullInvoiceNumber().replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`,
        image: { 
          type: 'jpeg', 
          quality: 0.98 
        },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: printRef.current.offsetWidth,
          height: printRef.current.offsetHeight,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { 
          unit: 'in', 
          format: 'letter', 
          orientation: 'portrait',
          compress: true,
          putOnlyUsedFonts: true
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: '.page-break-avoid'
        }
      };
      
      await html2pdf().set(opt).from(printRef.current).save();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    navigate(`/invoices/${invoice.id}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
    
    try {
      setIsLoading(true);
      
      const docRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
      await deleteDoc(docRef);
      
      toast.success('Invoice deleted successfully');
      navigate('/invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!invoice) return <ErrorMessage message="Invoice not found" />;

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Actions - Only visible on screen */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <FiArrowLeft size={20} />
            Back to Invoices
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <FiCheck size={16} />
              Quick Actions
            </button>

            <button
              onClick={handleCopyInvoiceNumber}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Copy Invoice Number"
            >
              <FiCopy size={16} />
              Copy #
            </button>

            <button
              onClick={handleShareInvoice}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Share Invoice"
            >
              <FiShare2 size={16} />
              Share
            </button>
            
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FiPrinter size={16} />
              Print
            </button>
            
            <button
              onClick={handleDownloadPdf}
              disabled={isPdfGenerating}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <FiDownload size={16} />
              {isPdfGenerating ? 'Generating...' : 'Download PDF'}
            </button>
            
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <FiEdit size={16} />
              Edit
            </button>
            
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FiTrash2 size={16} />
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      {showQuickActions && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 print:hidden">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
              <button
                onClick={() => setShowQuickActions(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status Update */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Update Status</label>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleQuickStatusUpdate('draft')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      invoice.status === 'draft' 
                        ? 'bg-gray-100 text-gray-800 border-2 border-gray-300' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <FiFileText size={14} />
                    Draft
                  </button>
                  <button
                    onClick={() => handleQuickStatusUpdate('pending')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      invoice.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' 
                        : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200'
                    }`}
                  >
                    <FiClock size={14} />
                    Pending
                  </button>
                  <button
                    onClick={() => handleQuickStatusUpdate('paid')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      invoice.status === 'paid' 
                        ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                        : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                    }`}
                  >
                    <FiDollarSign size={14} />
                    Paid
                  </button>
                </div>
              </div>

              {/* Quick Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Notes</label>
                <textarea
                  value={quickActionData.notes}
                  onChange={(e) => setQuickActionData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Add quick notes..."
                />
                <button
                  onClick={() => handleQuickNotesUpdate(quickActionData.notes)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Updating...' : 'Update Notes'}
                </button>
              </div>

              {/* Invoice Summary */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Summary</label>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Status:</span>
                    <span className={`font-medium ${
                      invoice.status === 'paid' ? 'text-green-600' :
                      invoice.status === 'pending' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {(invoice.status || 'draft').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total:</span>
                    <span className="font-medium">{formatCurrency(calculateTotals().total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Due:</span>
                    <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Invoice #:</span>
                    <span className="font-medium text-xs">{getFullInvoiceNumber()}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Actions</label>
                <div className="space-y-2">
                  <button
                    onClick={handleCopyInvoiceNumber}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
                  >
                    <FiCopy size={14} />
                    Copy Invoice #
                  </button>
                  <button
                    onClick={handleShareInvoice}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                  >
                    <FiShare2 size={14} />
                    Share Invoice
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isPdfGenerating}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FiDownload size={14} />
                    {isPdfGenerating ? 'Generating...' : 'Download PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Content - Enhanced for Professional Printing */}
      <div className="max-w-4xl mx-auto p-6">
        <div ref={printRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg print:shadow-none print:rounded-none print:bg-white print:text-black">
          {/* Professional Invoice Header with Branding */}
          <div className="border-b-2 border-blue-600 p-8 print:border-black print-header">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-blue-600 dark:text-white print:text-black mb-2 print:mb-1 print:text-base">
                  {businessInfo?.businessName || 'Your Business Name'}
                </h1>
                <div className="text-sm text-gray-600 dark:text-gray-400 print:text-black space-y-1 print:text-xs">
                  {businessInfo?.businessAddress && <p className="font-medium">{businessInfo.businessAddress}</p>}
                  <div className="flex flex-wrap gap-4 mt-2 print:gap-2 print:mt-1">
                    {businessInfo?.businessPhone && (
                      <p className="flex items-center gap-1">
                        <FiPhone size={14} className="print:hidden" />
                        {businessInfo.businessPhone}
                      </p>
                    )}
                    {businessInfo?.businessEmail && (
                      <p className="flex items-center gap-1">
                        <FiMail size={14} className="print:hidden" />
                        {businessInfo.businessEmail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white print:text-black mb-4 print:mb-2 print:text-base">INVOICE</h2>
                <div className="bg-gray-50 dark:bg-gray-700 print:bg-gray-100 p-4 print:p-2 rounded-lg print:rounded-none">
                  <div className="text-sm text-gray-600 dark:text-gray-400 print:text-black space-y-2 print:space-y-1 print:text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium">Invoice #:</span>
                      <span className="font-bold">{getFullInvoiceNumber()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Date:</span>
                      <span>{formatDate(invoice.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Due Date:</span>
                      <span>{formatDate(invoice.dueDate)}</span>
                    </div>
                    {invoice.poNumber && (
                      <div className="flex justify-between">
                        <span className="font-medium">PO #:</span>
                        <span className="font-bold">{invoice.poNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Customer Information */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-700 print:border-black print-customer">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-4">
              <div>
                <h3 className="text-lg font-semibold text-blue-600 dark:text-white print:text-black mb-4 print:mb-2 border-b pb-2 print:pb-1 print:text-sm">Bill To:</h3>
                <div className="bg-gray-50 dark:bg-gray-700 print:bg-gray-100 p-4 print:p-2 rounded-lg print:rounded-none">
                  <div className="text-sm text-gray-600 dark:text-gray-400 print:text-black space-y-2 print:space-y-1 print:text-xs">
                    <p className="font-bold text-lg text-gray-900 dark:text-white print:text-black print:text-sm">
                      {invoice.customer?.name || invoice.customerName || 'N/A'}
                    </p>
                    {invoice.customer?.email && (
                      <p className="flex items-center gap-1">
                        <FiMail size={14} className="print:hidden" />
                        {invoice.customer.email}
                      </p>
                    )}
                    {invoice.customer?.phone && (
                      <p className="flex items-center gap-1">
                        <FiPhone size={14} className="print:hidden" />
                        {invoice.customer.phone}
                      </p>
                    )}
                    {invoice.customer?.address && (
                      <p className="flex items-start gap-1">
                        <FiMapPin size={14} className="mt-0.5 print:hidden" />
                        {invoice.customer.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-blue-600 dark:text-white print:text-black mb-4 print:mb-2 border-b pb-2 print:pb-1 print:text-sm">Service Details:</h3>
                <div className="bg-gray-50 dark:bg-gray-700 print:bg-gray-100 p-4 print:p-2 rounded-lg print:rounded-none">
                  <div className="text-sm text-gray-600 dark:text-gray-400 print:text-black space-y-2 print:space-y-1 print:text-xs">
                    {invoice.vehicleInfo && (
                      <p><strong>Vehicle:</strong> {invoice.vehicleInfo}</p>
                    )}
                    {invoice.description && (
                      <p><strong>Service:</strong> {invoice.description}</p>
                    )}
                    {invoice.notes && (
                      <p><strong>Notes:</strong> {invoice.notes}</p>
                    )}
                    <p><strong>Payment Terms:</strong> {invoice.paymentTerms || 'Net 30'}</p>
                    <p><strong>Status:</strong> 
                      <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold print:px-1 print:py-0 print:rounded-none ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 print:bg-green-200 print:text-green-800' :
                        invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 print:bg-yellow-200 print:text-yellow-800' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 print:bg-gray-200 print:text-gray-800'
                      }`}>
                        {(invoice.status || 'draft').toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Invoice Items Table */}
          <div className="p-8 print-table">
            <h3 className="text-lg font-semibold text-blue-600 dark:text-white print:text-black mb-6 print:mb-2 border-b pb-2 print:pb-1 print:text-sm">Items & Services</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 print:border-black">
                <thead>
                  <tr className="bg-blue-50 dark:bg-gray-700 print:bg-gray-200">
                    <th className="text-left py-4 px-4 print:py-1 print:px-2 font-bold text-gray-900 dark:text-white print:text-black border-b-2 border-gray-300 dark:border-gray-600 print:border-black">Description</th>
                    <th className="text-right py-4 px-4 print:py-1 print:px-2 font-bold text-gray-900 dark:text-white print:text-black border-b-2 border-gray-300 dark:border-gray-600 print:border-black">Qty</th>
                    <th className="text-right py-4 px-4 print:py-1 print:px-2 font-bold text-gray-900 dark:text-white print:text-black border-b-2 border-gray-300 dark:border-gray-600 print:border-black">Rate</th>
                    <th className="text-right py-4 px-4 print:py-1 print:px-2 font-bold text-gray-900 dark:text-white print:text-black border-b-2 border-gray-300 dark:border-gray-600 print:border-black">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Parts */}
                  {invoice.parts && invoice.parts.map((part, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700 print:border-black hover:bg-gray-50 dark:hover:bg-gray-800 print:hover:bg-transparent">
                      <td className="py-4 px-4 print:py-1 print:px-2 text-gray-900 dark:text-white print:text-black border-r border-gray-200 dark:border-gray-700 print:border-black">
                        <div>
                          <p className="font-semibold">{part.name}</p>
                          {part.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600 mt-1 print:text-xs print:mt-0">{part.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 print:py-1 print:px-2 text-right text-gray-900 dark:text-white print:text-black border-r border-gray-200 dark:border-gray-700 print:border-black">
                        {part.quantity || 1}
                      </td>
                      <td className="py-4 px-4 print:py-1 print:px-2 text-right text-gray-900 dark:text-white print:text-black border-r border-gray-200 dark:border-gray-700 print:border-black">
                        {formatCurrency(part.cost)}
                      </td>
                      <td className="py-4 px-4 print:py-1 print:px-2 text-right font-semibold text-gray-900 dark:text-white print:text-black">
                        {formatCurrency((parseFloat(part.cost) || 0) * (parseInt(part.quantity) || 1))}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Labor */}
                  {invoice.laborCost && parseFloat(invoice.laborCost) > 0 && (
                    <tr className="border-b border-gray-200 dark:border-gray-700 print:border-black hover:bg-gray-50 dark:hover:bg-gray-800 print:hover:bg-transparent">
                      <td className="py-4 px-4 print:py-1 print:px-2 text-gray-900 dark:text-white print:text-black border-r border-gray-200 dark:border-gray-700 print:border-black">
                        <div>
                          <p className="font-semibold">Labor</p>
                          {invoice.laborDescription && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600 mt-1 print:text-xs print:mt-0">{invoice.laborDescription}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 print:py-1 print:px-2 text-right text-gray-900 dark:text-white print:text-black border-r border-gray-200 dark:border-gray-700 print:border-black">
                        {invoice.laborHours || 1}
                      </td>
                      <td className="py-4 px-4 print:py-1 print:px-2 text-right text-gray-900 dark:text-white print:text-black border-r border-gray-200 dark:border-gray-700 print:border-black">
                        {formatCurrency(invoice.laborRate || invoice.laborCost)}
                      </td>
                      <td className="py-4 px-4 print:py-1 print:px-2 text-right font-semibold text-gray-900 dark:text-white print:text-black">
                        {formatCurrency(invoice.laborCost)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 print:border-black bg-gray-50 dark:bg-gray-700 print:bg-gray-100">
                    <td colSpan="3" className="py-4 px-4 print:py-1 print:px-2 text-right font-bold text-gray-900 dark:text-white print:text-black border-r border-gray-300 dark:border-gray-600 print:border-black">
                      Subtotal:
                    </td>
                    <td className="py-4 px-4 print:py-1 print:px-2 text-right font-bold text-gray-900 dark:text-white print:text-black">
                      {formatCurrency(subtotal)}
                    </td>
                  </tr>
                  {tax > 0 && (
                    <tr className="bg-gray-50 dark:bg-gray-700 print:bg-gray-100">
                      <td colSpan="3" className="py-4 px-4 print:py-1 print:px-2 text-right font-bold text-gray-900 dark:text-white print:text-black border-r border-gray-300 dark:border-gray-600 print:border-black">
                        Tax ({((parseFloat(invoice.taxRate) || 0) * 100).toFixed(1)}%):
                      </td>
                      <td className="py-4 px-4 print:py-1 print:px-2 text-right font-bold text-gray-900 dark:text-white print:text-black">
                        {formatCurrency(tax)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-blue-600 dark:border-blue-500 print:border-black bg-blue-50 dark:bg-blue-900 print:bg-blue-100">
                    <td colSpan="3" className="py-5 px-4 print:py-1 print:px-2 text-right text-xl font-bold text-blue-900 dark:text-white print:text-black border-r border-blue-300 dark:border-blue-600 print:border-black print:text-sm">
                      TOTAL:
                    </td>
                    <td className="py-5 px-4 print:py-1 print:px-2 text-right text-xl font-bold text-blue-900 dark:text-white print:text-black print:text-sm">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes Section */}
          {invoice.notes && (
            <div className="px-8 pb-8 print-notes">
              <h3 className="text-lg font-semibold text-blue-600 dark:text-white print:text-black mb-4 print:mb-2 border-b pb-2 print:pb-1 print:text-sm">Notes</h3>
              <div className="bg-gray-50 dark:bg-gray-700 print:bg-gray-100 rounded-lg print:rounded-none p-4 print:p-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black whitespace-pre-wrap print:text-xs">
                  {invoice.notes}
                </p>
              </div>
            </div>
          )}

          {/* Professional Footer */}
          <div className="border-t-2 border-blue-600 dark:border-blue-500 print:border-black p-8 print-footer bg-blue-50 dark:bg-gray-700 print:bg-gray-100">
            <div className="text-center space-y-4 print:space-y-2">
              <div className="mb-4 print:mb-2">
                <h3 className="text-lg font-bold text-blue-900 dark:text-white print:text-black mb-2 print:mb-1 print:text-sm">
                  Thank you for your business!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black print:text-xs">
                  {invoice.paymentTerms || 'Payment due within 30 days'}
                </p>
              </div>
              
              {businessInfo && (
                <div className="border-t pt-4 print:pt-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 print:text-gray-600 space-y-1 print:text-xs">
                    <p className="font-medium">{businessInfo.businessName}</p>
                    {businessInfo.businessAddress && <p>{businessInfo.businessAddress}</p>}
                    <div className="flex justify-center gap-4 print:gap-2 mt-2 print:mt-1">
                      {businessInfo.businessPhone && <p>Phone: {businessInfo.businessPhone}</p>}
                      {businessInfo.businessEmail && <p>Email: {businessInfo.businessEmail}</p>}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-400 dark:text-gray-500 print:text-gray-500 pt-2 print:pt-1">
                <p>Invoice generated on {formatDate(new Date())}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Print Styles - Optimized for Single Page */}
      <style>{`
        @media print {
          @page {
            margin: 0.4in;
            size: letter;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
            font-family: Arial, sans-serif;
            font-size: 11px !important;
            line-height: 1.2 !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          
          .print\\:bg-white {
            background: white !important;
          }
          
          .print\\:bg-gray-100 {
            background: #f8f9fa !important;
          }
          
          .print\\:bg-blue-100 {
            background: #e3f2fd !important;
          }
          
          .print\\:text-black {
            color: black !important;
          }
          
          .print\\:text-gray-600 {
            color: #4b5563 !important;
          }
          
          .print\\:text-gray-500 {
            color: #6b7280 !important;
          }
          
          .print\\:border-black {
            border-color: black !important;
          }
          
          /* Compact header section */
          .print-header {
            padding: 0.5rem !important;
            margin-bottom: 0.5rem !important;
          }
          
          .print-header h1 {
            font-size: 20px !important;
            margin: 0 0 0.25rem 0 !important;
          }
          
          .print-header h2 {
            font-size: 18px !important;
            margin: 0 0 0.5rem 0 !important;
          }
          
          .print-header .text-sm {
            font-size: 9px !important;
            line-height: 1.1 !important;
          }
          
          /* Compact customer info */
          .print-customer {
            padding: 0.5rem !important;
            margin-bottom: 0.5rem !important;
          }
          
          .print-customer h3 {
            font-size: 12px !important;
            margin: 0 0 0.25rem 0 !important;
          }
          
          .print-customer .text-sm {
            font-size: 9px !important;
          }
          
          /* Compact table */
          .print-table {
            padding: 0.5rem !important;
            margin-bottom: 0.5rem !important;
          }
          
          .print-table h3 {
            font-size: 12px !important;
            margin: 0 0 0.25rem 0 !important;
          }
          
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 9px !important;
          }
          
          th, td {
            border: 1px solid #000 !important;
            padding: 4px !important;
            text-align: left !important;
            vertical-align: top !important;
          }
          
          th {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
            font-size: 10px !important;
          }
          
          /* Compact footer */
          .print-footer {
            padding: 0.5rem !important;
            margin-top: 0.5rem !important;
          }
          
          .print-footer h3 {
            font-size: 12px !important;
            margin: 0 0 0.25rem 0 !important;
          }
          
          .print-footer .text-xs {
            font-size: 8px !important;
          }
          
          /* Compact notes */
          .print-notes {
            padding: 0.5rem !important;
            margin: 0.5rem 0 !important;
          }
          
          .print-notes h3 {
            font-size: 12px !important;
            margin: 0 0 0.25rem 0 !important;
          }
          
          .print-notes .text-sm {
            font-size: 9px !important;
          }
          
          /* Override dark mode styles */
          .dark\\:bg-gray-900,
          .dark\\:bg-gray-800,
          .dark\\:bg-gray-700 {
            background: white !important;
          }
          
          .dark\\:text-white,
          .dark\\:text-gray-300,
          .dark\\:text-gray-400 {
            color: black !important;
          }
          
          .dark\\:border-gray-700,
          .dark\\:border-gray-600 {
            border-color: #d1d5db !important;
          }
          
          /* Force proper spacing */
          .space-y-1 > * + * {
            margin-top: 0.1rem !important;
          }
          
          .space-y-2 > * + * {
            margin-top: 0.2rem !important;
          }
          
          .space-y-4 > * + * {
            margin-top: 0.3rem !important;
          }
          
          .space-y-6 > * + * {
            margin-top: 0.4rem !important;
          }
          
          /* Ensure single page fit */
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
          
          /* Reduce padding and margins for print */
          .print\\:p-2 {
            padding: 0.25rem !important;
          }
          
          .print\\:py-1 {
            padding-top: 0.1rem !important;
            padding-bottom: 0.1rem !important;
          }
          
          .print\\:px-2 {
            padding-left: 0.25rem !important;
            padding-right: 0.25rem !important;
          }
          
          .print\\:mb-1 {
            margin-bottom: 0.1rem !important;
          }
          
          .print\\:mb-2 {
            margin-bottom: 0.25rem !important;
          }
          
          .print\\:text-xs {
            font-size: 8px !important;
          }
          
          .print\\:text-sm {
            font-size: 9px !important;
          }
          
          .print\\:text-base {
            font-size: 11px !important;
          }
        }
      `}</style>
    </div>
  );
}
