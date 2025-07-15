import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import html2pdf from 'html2pdf.js';
import { FiArrowLeft, FiDownload, FiClock, FiFileText, FiUser, FiMail, FiMapPin, FiBriefcase, FiCalendar, FiActivity, FiCheck, FiCreditCard, FiAlertTriangle, FiChevronsUp } from 'react-icons/fi';

export default function InvoiceDetailScreen() {
  const { invoiceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [customerPaymentHistory, setCustomerPaymentHistory] = useState([]);
  const [paymentMetrics, setPaymentMetrics] = useState({
    totalInvoices: 0,
    paidOnTime: 0,
    paidLate: 0,
    unpaid: 0,
    averageDaysToPayment: 0
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Function to fetch the customer's payment history
  const fetchCustomerPaymentHistory = useCallback(async (customerEmail) => {
    if (!customerEmail || !user) {
      setIsLoadingHistory(false);
      return;
    }
    
    try {
      setIsLoadingHistory(true);
      
      // Query invoices that belong to this customer
      const invoicesRef = collection(db, 'users', user.uid, 'invoices');
      const customerQuery = query(invoicesRef, where("customer.email", "==", customerEmail));
      const querySnapshot = await getDocs(customerQuery);
      
      // Process the customer's invoices
      const invoices = [];
      let totalDaysToPayment = 0;
      let paidInvoicesCount = 0;
      let paidOnTimeCount = 0;
      let paidLateCount = 0;
      let unpaidCount = 0;
      
      querySnapshot.forEach(doc => {
        const invoiceData = doc.data();
        
        // Skip the current invoice in the history
        if (doc.id === invoiceId) return;
        
        const invoice = {
          id: doc.id,
          ...invoiceData,
          createdAt: invoiceData.createdAt?.toDate?.() || new Date(invoiceData.createdAt),
          paidAt: invoiceData.paidAt?.toDate?.() || (invoiceData.paidAt ? new Date(invoiceData.paidAt) : null),
          dueDate: invoiceData.dueDate?.toDate?.() || (invoiceData.dueDate ? new Date(invoiceData.dueDate) : null)
        };
        
        // Calculate days to payment if applicable
        if (invoice.createdAt && invoice.paidAt) {
          const daysToPayment = Math.floor((invoice.paidAt - invoice.createdAt) / (1000 * 60 * 60 * 24));
          invoice.daysToPayment = daysToPayment;
          totalDaysToPayment += daysToPayment;
          paidInvoicesCount++;
          
          // Determine if paid on time or late
          if (invoice.dueDate && invoice.paidAt > invoice.dueDate) {
            paidLateCount++;
            invoice.paymentStatus = 'late';
          } else {
            paidOnTimeCount++;
            invoice.paymentStatus = 'on-time';
          }
        } else if (invoice.dueDate && new Date() > invoice.dueDate) {
          unpaidCount++;
          invoice.paymentStatus = 'overdue';
        } else {
          invoice.paymentStatus = 'pending';
        }
        
        invoices.push(invoice);
      });
      
      // Calculate metrics
      const metrics = {
        totalInvoices: invoices.length,
        paidOnTime: paidOnTimeCount,
        paidLate: paidLateCount,
        unpaid: unpaidCount,
        averageDaysToPayment: paidInvoicesCount > 0 ? Math.round(totalDaysToPayment / paidInvoicesCount) : 0
      };
      
      // Sort invoices by date (newest first)
      invoices.sort((a, b) => b.createdAt - a.createdAt);
      
      setCustomerPaymentHistory(invoices);
      setPaymentMetrics(metrics);
    } catch (error) {
      console.error('Error fetching customer payment history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user, invoiceId]);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!user || !invoiceId) {
        navigate('/invoices');
        return;
      }
      try {
        const docRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const invoiceData = { 
            ...data,
            firestoreId: docSnap.id,
            createdAt: data.createdAt?.toDate()
          };
          setInvoice(invoiceData);
          
          // If we have customer info, fetch their payment history
          if (invoiceData.customer && invoiceData.customer.email) {
            fetchCustomerPaymentHistory(invoiceData.customer.email);
          } else {
            setIsLoadingHistory(false);
          }
        } else {
          toast.error('Invoice not found');
          navigate('/invoices');
        }
      } catch (err) {
        console.error('Error loading invoice:', err);
        toast.error('Failed to load invoice');
        navigate('/invoices');
      }
      setIsLoading(false);
    };

    loadInvoice();
  }, [user, invoiceId, navigate, fetchCustomerPaymentHistory]);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    
    setIsPdfGenerating(true);
    const element = document.getElementById('invoice-detail');
    
    // Hide action buttons during PDF generation
    const actionButtons = element.querySelectorAll('.pdf-hide');
    actionButtons.forEach(btn => btn.style.display = 'none');
    
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `Invoice-${invoice.invoiceNumber || invoice.id?.slice(0, 8) || 'download'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: 'in', 
        format: 'letter', 
        orientation: 'portrait'
      }
    };

    try {
      await html2pdf().set(opt).from(element).save();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      // Show action buttons again
      actionButtons.forEach(btn => btn.style.display = '');
      setIsPdfGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const invoiceElement = document.getElementById('invoice-detail');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber || invoice.id?.slice(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .invoice-header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            .invoice-table { width: 100%; border-collapse: collapse; }
            .invoice-table th, .invoice-table td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            .invoice-table th { background-color: #f5f5f5; }
            .total-section { margin-top: 20px; text-align: right; }
            .pdf-hide { display: none !important; }
          </style>
        </head>
        <body>
          ${invoiceElement.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
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
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateSubtotal = () => {
    return invoice.parts.reduce((sum, part) => 
      sum + (parseFloat(part.price) || 0) * (parseFloat(part.quantity) || 1), 0
    );
  };

  const calculateTax = (subtotal) => {
    return subtotal * (invoice.taxRate || 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!invoice) return null;

  const subtotal = calculateSubtotal();
  const tax = calculateTax(subtotal);
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Back to Invoices</span>
          </button>
          
          <div className="flex items-center gap-3 pdf-hide">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <FiFileText className="w-5 h-5" />
              Print
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isPdfGenerating}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiDownload className="w-5 h-5" />
              <span>{isPdfGenerating ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
            <button
              onClick={() => navigate(`/invoices/${invoiceId}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <FiFileText className="w-5 h-5" />
              Edit Invoice
            </button>
          </div>
        </div>

        {/* Invoice Detail Card */}
        <div id="invoice-detail" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-8">
          {/* Invoice Header */}
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                { invoice.title || 'Invoice'}
              </h1>
              <div className="space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <FiFileText className="w-4 h-4" />
                  <span>Invoice #: { invoice.poNumber || invoice.id || 'N/A'}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <FiClock className="w-4 h-4" />
                  <span>Created: {formatDate(invoice.createdAt)}</span>
                </p>
                { invoice.dueDate && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    <span>Due Date: {formatDate(invoice.dueDate)}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Company Logo/Info Placeholder */}
            <div className="text-right space-y-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Company</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">123 Business Street</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">City, State 12345</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">contact@company.com</p>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Bill To:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FiUser className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white">{ invoice.customer?.name}</span>
              </div>
              { invoice.customer?.company && (
                <div className="flex items-center gap-2">
                  <FiBriefcase className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{ invoice.customer.company}</span>
                </div>
              )}
              { invoice.customer?.address && (
                <div className="flex items-center gap-2">
                  <FiMapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{ invoice.customer.address}</span>
                </div>
              )}
              { invoice.customer?.email && (
                <div className="flex items-center gap-2">
                  <FiMail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{ invoice.customer.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Items */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 text-sm font-medium text-gray-900 dark:text-white">Description</th>
                  <th className="text-right py-3 text-sm font-medium text-gray-900 dark:text-white">Quantity</th>
                  <th className="text-right py-3 text-sm font-medium text-gray-900 dark:text-white">Price</th>
                  <th className="text-right py-3 text-sm font-medium text-gray-900 dark:text-white">Amount</th>
                </tr>
              </thead>
              <tbody>
                { invoice.parts.map((part, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-3 text-sm text-gray-900 dark:text-white">{part.name}</td>
                    <td className="py-3 text-sm text-right text-gray-900 dark:text-white">
                      {part.quantity || 1}
                    </td>
                    <td className="py-3 text-sm text-right text-gray-900 dark:text-white">
                      {formatCurrency(parseFloat(part.price) || 0)}
                    </td>
                    <td className="py-3 text-sm text-right text-gray-900 dark:text-white">
                      {formatCurrency((parseFloat(part.price) || 0) * (parseFloat(part.quantity) || 1))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" className="py-3 text-sm text-right font-medium text-gray-900 dark:text-white">Subtotal:</td>
                  <td className="py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(subtotal)}
                  </td>
                </tr>
                <tr>
                  <td colSpan="3" className="py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                    Tax ({(invoice.taxRate || 0) * 100}%):
                  </td>
                  <td className="py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(tax)}
                  </td>
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td colSpan="3" className="py-3 text-right font-bold text-gray-900 dark:text-white">Total:</td>
                  <td className="py-3 text-right font-bold text-gray-900 dark:text-white">
                    {formatCurrency(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>          {/* Notes Section */}
          { invoice.notes && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Notes:</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{ invoice.notes}</p>
            </div>
          )}

          {/* Payment Terms or Additional Info */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Thank you for your business. Please process the payment within the due date.
            </p>
          </div>
        </div>

        {/* Customer Payment History Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <FiActivity className="mr-2" />
              Customer Payment History
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Payment history and reliability metrics for { invoice.customer?.name}
            </p>
          </div>

          {/* Payment Reliability Metrics */}
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Payment Reliability</h3>
            
            {isLoadingHistory ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {/* Average Days to Payment */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-blue-700 dark:text-blue-300">Avg. Days to Pay</p>
                      <FiClock className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                      {paymentMetrics.averageDaysToPayment}
                    </p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                      days on average
                    </p>
                  </div>
                  
                  {/* Paid On Time */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-green-700 dark:text-green-300">Paid On Time</p>
                      <FiCheck className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                      {paymentMetrics.paidOnTime}
                    </p>
                    <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                      invoices paid on time
                    </p>
                  </div>
                  
                  {/* Paid Late */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">Paid Late</p>
                      <FiCreditCard className="h-4 w-4 text-yellow-500" />
                    </div>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mt-1">
                      {paymentMetrics.paidLate}
                    </p>
                    <p className="text-xs text-yellow-600/70 dark:text-yellow-400/70 mt-1">
                      invoices paid late
                    </p>
                  </div>
                  
                  {/* Unpaid/Overdue */}
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-red-700 dark:text-red-300">Unpaid/Overdue</p>
                      <FiAlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
                      {paymentMetrics.unpaid}
                    </p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                      overdue invoices
                    </p>
                  </div>
                </div>
                
                {/* Reliability Score */}
                {paymentMetrics.totalInvoices > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Payment Reliability Score</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {Math.round((paymentMetrics.paidOnTime / Math.max(1, paymentMetrics.totalInvoices)) * 100)}%
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(paymentMetrics.paidOnTime / Math.max(1, paymentMetrics.totalInvoices)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Invoice Payment History */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Previous Invoices</h3>
            
            {isLoadingHistory ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : customerPaymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice #</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {customerPaymentHistory.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          { invoice.poNumber || invoice.id.substring(0, 6)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatCurrency(invoice.total || 0)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm">
                          { invoice.paidAt ? (
                            <span className="text-gray-900 dark:text-white">
                              {formatDate(invoice.paidAt)} 
                              { invoice.daysToPayment !== undefined && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                  ({ invoice.daysToPayment} days)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Not paid</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm">
                          { invoice.paymentStatus === 'on-time' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              On time
                            </span>
                          )}
                          { invoice.paymentStatus === 'late' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              Late
                            </span>
                          )}
                          { invoice.paymentStatus === 'overdue' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              Overdue
                            </span>
                          )}
                          { invoice.paymentStatus === 'pending' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <p>No previous invoices found for this customer.</p>
              </div>
            )}
          </div>
          
          {/* This Invoice's Payment History */}
          { invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center mb-3">
                <FiChevronsUp className="mr-1" /> 
                <span>Current Invoice Payment History</span>
              </h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    { invoice.paymentHistory.map((payment, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDate(payment.date?.toDate ? payment.date.toDate() : payment.date)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatCurrency(payment.amount || 0)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {payment.method}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            {payment.status || 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
