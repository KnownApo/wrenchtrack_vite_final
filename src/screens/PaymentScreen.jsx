import React, { useState, useContext, useEffect } from 'react';
import { JobLogContext } from '../context/JobLogContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiDollarSign, FiCreditCard, FiCheckCircle, FiAlertCircle, FiClock, FiUser, FiFileText, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';

// STRIPE INTEGRATION COMING SOON:
// import { loadStripe } from '@stripe/stripe-js';
// import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// const stripePromise = loadStripe('your-publishable-key'); // Coming soon
// const PaymentForm = ({ amount, onSuccess }) => {
//   const stripe = useStripe();
//   const elements = useElements();
//   // Stripe payment processing coming soon
// };

export default function PaymentScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState('cash');
  const { setPaid } = useContext(JobLogContext);
  const [done, setDone] = useState(false);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [remainingBalance, setRemainingBalance] = useState(0);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user) return;
      try {
        const querySnapshot = await getDocs(collection(db, 'users', user.uid, 'invoices'));
        const invoiceList = querySnapshot.docs
          .map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            balance: doc.data().total - (doc.data().paidAmount || 0)
          }))
          .filter(invoice => !invoice.paid && invoice.balance > 0);
        setInvoices(invoiceList);
      } catch (err) {
        toast.error('Failed to load invoices');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoices();
  }, [user]);

  const handleInvoiceSelect = (invoiceId) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoiceId);
      setAmount(invoice.balance.toString());
      setRemainingBalance(invoice.balance);
      setError(null);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const validatePayment = (paymentAmount, invoice) => {
    const payment = parseFloat(paymentAmount);
    if (isNaN(payment) || payment <= 0) {
      throw new Error('Please enter a valid payment amount');
    }
    if (payment > invoice.balance) {
      throw new Error(`Payment amount cannot exceed the remaining balance of ${formatCurrency(invoice.balance)}`);
    }
    return payment;
  };

  const handlePayment = async () => {
    if (!selectedInvoice || !amount) {
      setError('Please select an invoice and enter amount');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const invoice = invoices.find(inv => inv.id === selectedInvoice);
      const payment = validatePayment(amount, invoice);
      
      const newPaidAmount = (invoice.paidAmount || 0) + payment;
      const newBalance = invoice.total - newPaidAmount;
      const isFullyPaid = newBalance <= 0;

      const invoiceRef = doc(db, 'users', user.uid, 'invoices', selectedInvoice);
      await updateDoc(invoiceRef, {
        paid: isFullyPaid,
        paidAmount: newPaidAmount,
        balance: newBalance,
        paymentHistory: [
          ...(invoice.paymentHistory || []),
          {
            amount: payment,
            method: method,
            date: new Date(),
            status: 'completed'
          }
        ],
        lastPayment: {
          amount: payment,
          method: method,
          date: new Date()
        },
        status: isFullyPaid ? 'paid' : 'partial',
        updatedAt: new Date()
      });

      // Update invoice in state
      const updatedInvoices = invoices.filter(inv => 
        inv.id !== selectedInvoice || (inv.id === selectedInvoice && !isFullyPaid)
      ).map(inv => 
        inv.id === selectedInvoice 
          ? { ...inv, balance: newBalance, paidAmount: newPaidAmount }
          : inv
      );
      setInvoices(updatedInvoices);

      setPaid(isFullyPaid);
      setDone(true);
      toast.success(`Payment of ${formatCurrency(payment)} processed successfully`);
      
      setTimeout(() => {
        navigate('/invoicehistory');
      }, 2000);
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to process payment. Please try again.');
      toast.error(err.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const selectedInvoiceData = selectedInvoice ? invoices.find(inv => inv.id === selectedInvoice) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => navigate('/invoicehistory')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
            >
              <FiArrowLeft className="w-5 h-5" />
              <span>Back to Invoices</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Process Payment</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Record payment for outstanding invoices</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Payment Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
              {/* Invoice Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Select Invoice
                </label>
                <select
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  value={selectedInvoice}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                >
                  <option value="">Choose an invoice</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.poNumber || invoice.id} - Balance: {formatCurrency(invoice.balance)} ({invoice.customer?.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Payment Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiDollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setAmount(value);
                      if (selectedInvoiceData && parseFloat(value) > selectedInvoiceData.balance) {
                        setError(`Payment amount cannot exceed the remaining balance of ${formatCurrency(selectedInvoiceData.balance)}`);
                      } else {
                        setError(null);
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="0.00"
                    step="0.01"
                    max={selectedInvoiceData?.balance}
                  />
                </div>
                {selectedInvoiceData && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Remaining balance: {formatCurrency(selectedInvoiceData.balance)}
                  </p>
                )}
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { id: 'cash', label: 'Cash', icon: FiDollarSign },
                    { id: 'card', label: 'Credit Card', icon: FiCreditCard },
                    { id: 'venmo', label: 'Venmo', icon: FiDollarSign },
                    { id: 'check', label: 'Check', icon: FiCheckCircle },
                  ].map((payMethod) => (
                    <button
                      key={payMethod.id}
                      type="button"
                      onClick={() => setMethod(payMethod.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border ${
                        method === payMethod.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500'
                      }`}
                    >
                      <payMethod.icon className="w-6 h-6 mb-2" />
                      <span className="text-sm">{payMethod.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Payment Coming Soon Notice */}
              {method === 'card' && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <FiClock className="w-5 h-5" />
                    <p>Credit card payments coming soon!</p>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                    <FiAlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handlePayment}
                disabled={processing || !amount || !selectedInvoice || error}
                className={`w-full py-3 rounded-lg text-white font-medium transition flex items-center justify-center gap-2 ${
                  processing || !amount || !selectedInvoice || error
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                }`}
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FiDollarSign className="w-5 h-5" />
                    <span>Pay {formatCurrency(amount || 0)}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Invoice Details Sidebar */}
          <div className="lg:col-span-1">
            {selectedInvoiceData ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Invoice Details</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <FiFileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Invoice Number</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedInvoiceData.poNumber || selectedInvoiceData.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FiUser className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedInvoiceData.customer?.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FiClock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Created Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(selectedInvoiceData.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FiDollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(selectedInvoiceData.total || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FiDollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Amount Paid</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(selectedInvoiceData.paidAmount || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FiDollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Remaining Balance</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(selectedInvoiceData.balance || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="text-center text-gray-600 dark:text-gray-400">
                  <FiFileText className="w-8 h-8 mx-auto mb-3" />
                  <p>Select an invoice to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Success Message */}
        {done && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Payment Successful
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Payment of {formatCurrency(amount)} has been recorded for invoice #{selectedInvoice} via {method}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Redirecting to invoice history...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
