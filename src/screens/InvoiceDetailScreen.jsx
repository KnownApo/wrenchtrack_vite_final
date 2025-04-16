import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';
import html2pdf from 'html2pdf.js';
import { FiArrowLeft, FiDownload, FiClock, FiFileText, FiDollarSign, FiUser, FiMail, FiMapPin, FiBriefcase, FiCalendar } from 'react-icons/fi';

export default function InvoiceDetailScreen() {
  const { invoiceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!user || !invoiceId) {
        navigate('/invoicehistory');
        return;
      }
      try {
        const docRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setInvoice({ 
            ...data,
            firestoreId: docSnap.id,
            createdAt: data.createdAt?.toDate()
          });
        } else {
          toast.error('Invoice not found');
          navigate('/invoicehistory');
        }
      } catch (err) {
        console.error('Error loading invoice:', err);
        toast.error('Failed to load invoice');
        navigate('/invoicehistory');
      }
      setIsLoading(false);
    };

    loadInvoice();
  }, [user, invoiceId, navigate]);

  const handleDownloadPdf = async () => {
    setIsPdfGenerating(true);
    const element = document.getElementById('invoice-detail');
    const opt = {
      margin: [0.5, 0.5],
      filename: `invoice-${invoice.poNumber || 'download'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false
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
      setIsPdfGenerating(false);
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
            onClick={() => navigate('/invoicehistory')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Back to Invoices</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isPdfGenerating}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiDownload className="w-5 h-5" />
            <span>{isPdfGenerating ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>
        </div>

        {/* Invoice Detail Card */}
        <div id="invoice-detail" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-8">
          {/* Invoice Header */}
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {invoice.title || 'Invoice'}
              </h1>
              <div className="space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <FiFileText className="w-4 h-4" />
                  <span>Invoice #: {invoice.poNumber || invoice.id || 'N/A'}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <FiClock className="w-4 h-4" />
                  <span>Created: {formatDate(invoice.createdAt)}</span>
                </p>
                {invoice.dueDate && (
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
                <span className="text-gray-900 dark:text-white">{invoice.customer?.name}</span>
              </div>
              {invoice.customer?.company && (
                <div className="flex items-center gap-2">
                  <FiBriefcase className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{invoice.customer.company}</span>
                </div>
              )}
              {invoice.customer?.address && (
                <div className="flex items-center gap-2">
                  <FiMapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{invoice.customer.address}</span>
                </div>
              )}
              {invoice.customer?.email && (
                <div className="flex items-center gap-2">
                  <FiMail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{invoice.customer.email}</span>
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
                {invoice.parts.map((part, index) => (
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
          </div>

          {/* Notes Section */}
          {invoice.notes && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Notes:</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Payment Terms or Additional Info */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Thank you for your business. Please process the payment within the due date.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
