import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useInvoice } from '../context/InvoiceContext'; // Fixed to useInvoice
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaTrash, FaPrint, FaFileDownload, FaCheckCircle, FaMoneyBillWave, FaClock, FaHourglass, FaBars, FaPlus, FaSave, FaTimes, FaTools, FaHistory, FaChartLine, FaCheck, FaExclamationTriangle, FaRegClock, FaArchive } from 'react-icons/fa';
import html2pdf from 'html2pdf.js';
import InvoiceTrackingStatus from '../components/InvoiceTrackingStatus';
import { markInvoiceCompleted, initializeTracking, addMilestone, MILESTONE_TYPES, getTrackingSummary } from '../utils/invoiceTracking';
import useInvoiceTracking from '../hooks/useInvoiceTracking';

export default function InvoiceHistoryScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Use the global invoice context (fixed hook name)
  const { invoices, loading: invoicesLoading, refreshInvoices } = useInvoice(); // Fixed to useInvoice
  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { addPayment, completeInvoice, changeStatus, isUpdating, finishInvoice } = useInvoiceTracking(user?.uid);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [showDetailStatusDropdown, setShowDetailStatusDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState('bottom');
  // Batch operations state
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  // Customer Payment History states
  const [customerPaymentHistory, setCustomerPaymentHistory] = useState([]);
  const [paymentMetrics, setPaymentMetrics] = useState({
    totalInvoices: 0,
    paidOnTime: 0,
    paidLate: 0,
    unpaid: 0,
    averageDaysToPayment: 0
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  // New state for edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    notes: '',
    parts: []
  });
  const [editingPart, setEditingPart] = useState({
    name: '',
    cost: '',
    quantity: 1
  });
  const dropdownRef = useRef(null);
  const detailDropdownRef = useRef(null);

  useEffect(() => {
    // Set loading state based on the invoices context
    setIsLoading(invoicesLoading);
  }, [invoicesLoading]);

  useEffect(() => {
    function handleClickOutside(event) {
      // Close the detail status dropdown if clicked outside
      if (detailDropdownRef.current && !detailDropdownRef.current.contains(event.target)) {
        setShowDetailStatusDropdown(false);
      }
    }
    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);
    // Clean up the event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const invoicesRef = collection(db, 'users', user.uid, 'invoices');
      const invoiceSnapshot = await getDocs(invoicesRef);
      let invoiceList = [];
      invoiceSnapshot.forEach(doc => {
        const data = doc.data();
        // Initialize paidAmount if not present
        const paidAmount = typeof data.paidAmount !== 'undefined' ? parseFloat(data.paidAmount) : 0;
        invoiceList.push({
          id: doc.id,
          ...data,
          paidAmount,
          createdAt: data.createdAt?.toDate() || new Date(),
          dueDate: data.dueDate?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      // Sort by updatedAt descending
      invoiceList.sort((a, b) => b.updatedAt - a.updatedAt);
      // Update context if needed, but since context handles it, this is fallback
      if (invoiceList.length > 0) refreshInvoices(); // Assuming refreshInvoices updates the context
    } catch (err) {
      console.error('Error loading invoices:', err);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  // Call loadInvoices if context doesn't have data
  useEffect(() => {
    if (invoices.length === 0 && !invoicesLoading) {
      loadInvoices();
    }
  }, [invoices, invoicesLoading]);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesSearch = invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'invoices', invoiceId));
        toast.success('Invoice deleted successfully');
        refreshInvoices();
      } catch (err) {
        console.error('Error deleting invoice:', err);
        toast.error('Failed to delete invoice');
      }
    }
  };

  const handlePrintInvoice = (invoice) => {
    // Implement print logic using html2pdf or similar
    const element = document.createElement('div');
    element.innerHTML = `<h1>Invoice #${invoice.invoiceNumber}</h1><p>Customer: ${invoice.customerName}</p><p>Total: $${invoice.totalAmount}</p>`;
    html2pdf().from(element).save(`invoice_${invoice.id}.pdf`);
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || isNaN(paymentAmount) || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    try {
      await addPayment(paymentInvoice.id, parseFloat(paymentAmount));
      setShowPaymentModal(false);
      setPaymentAmount('');
      toast.success('Payment recorded successfully');
    } catch (err) {
      toast.error('Failed to record payment');
    }
  };

  const openPaymentModal = (invoice) => {
    setPaymentInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      await changeStatus(invoiceId, newStatus);
      toast.success('Status updated successfully');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Add more handlers as needed for batch, edit, etc.

  if (isLoading) return <div>Loading...</div>; // Use LoadingSpinner if available

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Invoice History</h1>
      
      {/* Search and Filter */}
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Search by customer or invoice number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-2 border rounded mr-2 dark:bg-gray-800 dark:text-white"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border rounded dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Invoice Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800">
          <thead>
            <tr>
              <th><input type="checkbox" checked={isAllSelected} onChange={() => setIsAllSelected(!isAllSelected)} /></th>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id}>
                <td><input type="checkbox" checked={selectedInvoices.includes(invoice.id)} onChange={() => {/* toggle selection */}} /></td>
                <td>{invoice.invoiceNumber || invoice.id}</td>
                <td>{invoice.customerName}</td>
                <td>${invoice.totalAmount?.toFixed(2)}</td>
                <td>{invoice.status}</td>
                <td>{new Date(invoice.dueDate).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleViewInvoice(invoice)}><FaEye /></button>
                  <button onClick={() => handleDeleteInvoice(invoice.id)}><FaTrash /></button>
                  <button onClick={() => handlePrintInvoice(invoice)}><FaPrint /></button>
                  <button onClick={() => openPaymentModal(invoice)}><FaMoneyBillWave /></button>
                  {/* Add more actions */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {isModalOpen && selectedInvoice && (
        <div className="modal">
          {/* Invoice details */}
          <button onClick={() => setIsModalOpen(false)}>Close</button>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal">
          <h2>Record Payment for Invoice #{paymentInvoice?.invoiceNumber}</h2>
          <input
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="Payment Amount"
          />
          <button onClick={handleRecordPayment}>Record</button>
          <button onClick={() => setShowPaymentModal(false)}>Cancel</button>
        </div>
      )}

      {/* Add edit modal, batch actions, etc. as needed */}
    </div>
  );
}