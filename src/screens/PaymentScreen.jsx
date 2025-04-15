import React, { useState, useContext, useEffect } from 'react';
import { JobLogContext } from '../context/JobLogContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

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

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user) return;
      try {
        const querySnapshot = await getDocs(collection(db, 'users', user.uid, 'invoices'));
        const invoiceList = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(invoice => !invoice.paid); // Only show unpaid invoices
        setInvoices(invoiceList);
      } catch (err) {
        setError('Failed to load invoices');
      }
    };
    fetchInvoices();
  }, [user]);

  const handleInvoiceSelect = (invoiceId) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoiceId);
      setAmount(invoice.total || '0');
    }
  };

  const handlePayment = async () => {
    if (!selectedInvoice || !amount) {
      setError('Please select an invoice and enter amount');
      return;
    }

    setProcessing(true);
    try {
      const invoice = invoices.find(inv => inv.id === selectedInvoice);
      const total = parseFloat(amount);
      
      const invoiceRef = doc(db, 'users', user.uid, 'invoices', selectedInvoice);
      await updateDoc(invoiceRef, {
        paid: true,
        paidAmount: total,
        paymentMethod: method,
        paidAt: new Date(),
        status: 'paid',
        completed: true,
        completedAt: new Date(),
        transaction: {
          amount: total,
          method: method,
          date: new Date(),
          status: 'completed'
        },
        total: total, // Ensure total is set
        balance: 0,
        updatedAt: new Date()
      });

      // Update invoice in state
      const updatedInvoices = invoices.map(inv => 
        inv.id === selectedInvoice 
          ? { ...inv, paid: true, status: 'paid', total: total }
          : inv
      );
      setInvoices(updatedInvoices);

      setPaid(true);
      setDone(true);
      setTimeout(() => {
        navigate('/invoicehistory');
      }, 2000);
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Process Payment</h2>
          
          {/* Invoice Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Invoice</label>
            <select
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              value={selectedInvoice}
              onChange={(e) => handleInvoiceSelect(e.target.value)}
            >
              <option value="">Choose an invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.poNumber} - ${invoice.total} ({invoice.customer?.name})
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <select 
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              value={method}
              onChange={e => setMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="card">Credit Card</option>
              <option value="venmo">Venmo</option>
              <option value="check">Check</option>
            </select>
          </div>

          {/* Card Payment Section - Coming Soon */}
          {method === 'card' && (
            <div className="mb-6">
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-center text-gray-500">
                  Credit card payments coming soon!
                </p>
                {/* STRIPE CARD ELEMENT COMING SOON: */}
                {/* <CardElement options={{style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                }}} /> */}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handlePayment}
            disabled={processing || !amount}
            className={`w-full py-3 rounded-lg text-white font-medium transition ${
              processing || !amount
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {processing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Processing...
              </span>
            ) : (
              `Pay $${amount || '0.00'}`
            )}
          </button>

          {/* Success Message */}
          {done && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-center">
                Payment of ${amount} recorded for invoice #{selectedInvoice} via {method}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
