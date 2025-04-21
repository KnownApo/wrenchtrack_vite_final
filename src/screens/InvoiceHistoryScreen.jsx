import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useInvoices } from '../context/InvoiceContext';
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
  // Use the global invoice context
  const { invoices, loading: invoicesLoading, refreshInvoices } = useInvoices();
  
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
  const [editingPart, setEditingPart] = useState({ name: '', cost: '', quantity: 1 });
  
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
          paidAmount: paidAmount
        });
      });
      
      // Sort by date (most recent first)
      invoiceList.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      setInvoices(invoiceList);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
    
    // If the invoice has customer information, fetch payment history
    if (invoice?.customer?.email) {
      fetchCustomerPaymentHistory(invoice.customer.email);
    } else {
      // Reset payment history if no customer email
      setCustomerPaymentHistory([]);
      setPaymentMetrics({
        totalInvoices: 0,
        paidOnTime: 0,
        paidLate: 0,
        unpaid: 0,
        averageDaysToPayment: 0
      });
    }
  };
  
  // Function to fetch the customer's payment history
  const fetchCustomerPaymentHistory = async (customerEmail) => {
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
        
        // Skip the current invoice in the history if it's the selected one
        if (selectedInvoice && doc.id === selectedInvoice.id) return;
        
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
  };
  
  const handleDeleteInvoice = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'invoices', id));
        toast.success('Invoice deleted successfully');
      setInvoices(invoices.filter(invoice => invoice.id !== id));
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
      }
    }
  };

  // Add a new function to reload the invoice when needed
  const reloadInvoiceData = async (invoiceId) => {
    try {
      console.log('Reloading invoice data for:', invoiceId);
      const invoiceRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);
      
      if (invoiceDoc.exists()) {
        const data = invoiceDoc.data();
        console.log('Reloaded invoice data:', data);
        
        // Update the invoice in the list
        setInvoices(prevInvoices => 
          prevInvoices.map(inv => 
            inv.id === invoiceId ? { id: invoiceId, ...data } : inv
          )
        );
        
        // If this is the selected invoice in the modal, update it too
        if (selectedInvoice && selectedInvoice.id === invoiceId) {
          setSelectedInvoice({ id: invoiceId, ...data });
        }
        
        return { id: invoiceId, ...data };
      } else {
        console.warn('Invoice not found during reload:', invoiceId);
        return null;
      }
    } catch (error) {
      console.error('Error reloading invoice:', error);
      return null;
    }
  };

  // Enhanced update function to ensure updates propagate
  const handleUpdateStatus = async (invoice, newStatus) => {
    try {
      console.log('Updating invoice status:', invoice.id, 'from', invoice.status, 'to', newStatus);
      
      // Update in Firestore
      const invoiceRef = doc(db, 'users', user.uid, 'invoices', invoice.id);
      await updateDoc(invoiceRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Create updated invoice object
      const updatedInvoice = {
        ...invoice,
        status: newStatus,
        updatedAt: new Date()
      };
      
      // Show success message
      toast.success(`Invoice status updated to ${getStatusLabel(newStatus)}`);
      
      // Force refresh invoices using the context
      refreshInvoices();
      
      // If this is the currently selected invoice, update it too
      if (selectedInvoice && selectedInvoice.id === invoice.id) {
        setSelectedInvoice(updatedInvoice);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status: ' + error.message);
      return false;
    }
  };

  const openPaymentModal = (invoice) => {
    setPaymentInvoice(invoice);
    setPaymentAmount('');
    setMarkAsFinished(false); // Reset the checkbox state
    setShowPaymentModal(true);
  };

  const [markAsFinished, setMarkAsFinished] = useState(false);

const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentInvoice) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    try {
      const total = parseFloat(paymentInvoice.total) || 0;
      const currentPaid = parseFloat(paymentInvoice.paidAmount) || 0;
      const newPaidAmount = currentPaid + amount;
      
      // Use the invoice tracking hook to add a payment
      const updatedInvoice = await addPayment(paymentInvoice, amount);
      
      // If payment completed the invoice and user checked "Mark as Finished"
      if (updatedInvoice && updatedInvoice.status === 'paid' && markAsFinished) {
        // Mark invoice as finished
        const finishedInvoice = await finishInvoice(updatedInvoice);
        if (finishedInvoice) {
          // Use let instead of const for updatedInvoice to allow reassignment
          updatedInvoice = finishedInvoice;
        }
      }
      
      if (updatedInvoice) {
        // Update invoice in the UI
        setInvoices(invoices.map(inv => 
          inv.id === paymentInvoice.id ? updatedInvoice : inv
        ));
        
        // Display success message
        if (newPaidAmount >= total) {
          toast.success('Payment completed! Invoice marked as paid.');
        } else {
          toast.success(`Partial payment of $${amount.toFixed(2)} recorded. Remaining: $${(total - newPaidAmount).toFixed(2)}`);
        }
        
        // Close the modal
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const handlePaymentAmountChange = (e) => {
    setPaymentAmount(e.target.value);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'completed': return 'Completed';
      case 'paid': return 'Paid';
      case 'warranty': return 'Warranty';
      default: return status;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    // Handle different date formats
    let dateObj;
    if (date.toDate) {
      // Firestore timestamp
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      // JavaScript Date object
      dateObj = date;
    } else {
      // Try to parse string or number
      try {
        dateObj = new Date(date);
      } catch (e) {
        return 'Invalid date';
      }
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (invoice) => {
    // Simplify status display
    switch (invoice.status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Completed</span>;
      case 'paid':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Paid</span>;
      case 'warranty':
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">Warranty</span>;
      case 'finished':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Finished</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{invoice.status || 'Unknown'}</span>;
    }
  };

  const calculateInvoiceAmount = (invoice) => {
    // Check if total is already calculated
    if (invoice.total) {
      return parseFloat(invoice.total);
    }
    
    // Calculate from parts
    return invoice.parts?.reduce((sum, part) => {
        const cost = parseFloat(part.cost) || 0;
        const quantity = parseInt(part.quantity) || 1;
        return sum + (cost * quantity);
    }, 0) || 0;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'completed':
        return 'text-blue-600';
      case 'paid':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const generatePDF = (invoice) => {
    const invoiceElement = document.createElement('div');
    invoiceElement.className = 'invoice-container';
    invoiceElement.style.padding = '40px';
    invoiceElement.style.maxWidth = '800px';
    invoiceElement.style.margin = '0 auto';
    invoiceElement.style.fontFamily = 'Arial, sans-serif';
    invoiceElement.style.color = '#333';
    
    // Invoice header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '30px';
    
    const companyInfo = document.createElement('div');
    companyInfo.innerHTML = `
      <h2 style="color: #2563eb; margin-bottom: 10px; font-size: 24px;">WrenchTrack</h2>
      <p style="margin: 5px 0;">Professional Automotive Service</p>
      <p style="margin: 5px 0;">123 Service Ave, Repair City</p>
      <p style="margin: 5px 0;">Phone: (555) 123-4567</p>
    `;
    
    const invoiceInfo = document.createElement('div');
    invoiceInfo.style.textAlign = 'right';
    invoiceInfo.innerHTML = `
      <h1 style="color: #2563eb; font-size: 28px; margin-bottom: 10px;">INVOICE</h1>
      <p style="margin: 5px 0;"><strong>Invoice #:</strong> ${invoice.invoiceNumber || invoice.id.substring(0, 6)}</p>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${formatDate(invoice.createdAt)}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> ${getStatusLabel(invoice.status)}</p>
    `;
    
    header.appendChild(companyInfo);
    header.appendChild(invoiceInfo);
    invoiceElement.appendChild(header);
    
    // Customer info
    const customerInfo = document.createElement('div');
    customerInfo.style.marginBottom = '30px';
    customerInfo.style.padding = '15px';
    customerInfo.style.backgroundColor = '#f9fafb';
    customerInfo.style.borderRadius = '5px';
    
    customerInfo.innerHTML = `
      <h3 style="margin-bottom: 10px; color: #4b5563; font-size: 18px;">Customer Information</h3>
      <p style="margin: 5px 0;"><strong>Name:</strong> ${invoice.customer?.name || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Phone:</strong> ${invoice.customer?.phone || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${invoice.customer?.email || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Address:</strong> ${invoice.customer?.address || 'N/A'}</p>
    `;
    invoiceElement.appendChild(customerInfo);
    
    // Parts & Services
    const partsTable = document.createElement('div');
    partsTable.style.marginBottom = '30px';
    
    let partsHTML = `
      <h3 style="margin-bottom: 15px; color: #4b5563; font-size: 18px;">Parts & Services</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead style="background-color: #f9fafb;">
          <tr>
            <th style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e5e7eb;">Description</th>
            <th style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e5e7eb;">Quantity</th>
            <th style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e5e7eb;">Price</th>
            <th style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e5e7eb;">Total</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    if (invoice.parts && invoice.parts.length > 0) {
      invoice.parts.forEach(part => {
        const quantity = parseInt(part.quantity) || 1;
        const price = parseFloat(part.price) || 0;
        const total = (quantity * price).toFixed(2);
        
        partsHTML += `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 15px;">
              <div>${part.name}</div>
              ${part.description ? `<div style="color: #6b7280; font-size: 0.875rem;">${part.description}</div>` : ''}
            </td>
            <td style="padding: 12px 15px;">${quantity}</td>
            <td style="padding: 12px 15px;">$${price.toFixed(2)}</td>
            <td style="padding: 12px 15px;">$${total}</td>
          </tr>
        `;
      });
    } else {
      partsHTML += `
        <tr>
          <td colspan="4" style="padding: 12px 15px; text-align: center; color: #6b7280;">No parts or services listed</td>
        </tr>
      `;
    }
    
    const subtotal = calculateInvoiceAmount(invoice);
    const tax = parseFloat(invoice.tax) || 0;
    const total = parseFloat(invoice.total) || subtotal;
    const paid = parseFloat(invoice.paidAmount) || 0;
    const remaining = Math.max(0, total - paid);
    
    partsHTML += `
        </tbody>
        <tfoot style="background-color: #f9fafb; font-weight: 500;">
          <tr>
            <td colspan="3" style="padding: 12px 15px; text-align: right;">Subtotal</td>
            <td style="padding: 12px 15px;">$${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 12px 15px; text-align: right;">Tax</td>
            <td style="padding: 12px 15px;">$${tax.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 12px 15px; text-align: right; font-weight: bold;">Total</td>
            <td style="padding: 12px 15px; font-weight: bold;">$${total.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 12px 15px; text-align: right;">Paid</td>
            <td style="padding: 12px 15px; color: #059669;">$${paid.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 12px 15px; text-align: right;">Remaining</td>
            <td style="padding: 12px 15px; color: #dc2626;">$${remaining.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    `;
    
    partsTable.innerHTML = partsHTML;
    invoiceElement.appendChild(partsTable);
    
    // Note
    if (invoice.notes) {
      const notes = document.createElement('div');
      notes.style.marginBottom = '30px';
      notes.style.padding = '15px';
      notes.style.backgroundColor = '#f9fafb';
      notes.style.borderRadius = '5px';
      
      notes.innerHTML = `
        <h3 style="margin-bottom: 10px; color: #4b5563; font-size: 18px;">Notes</h3>
        <p style="margin: 0;">${invoice.notes}</p>
      `;
      invoiceElement.appendChild(notes);
    }
    
    // Footer
    const footer = document.createElement('div');
    footer.style.marginTop = '30px';
    footer.style.borderTop = '1px solid #e5e7eb';
    footer.style.paddingTop = '20px';
    footer.style.textAlign = 'center';
    footer.style.color = '#6b7280';
    footer.style.fontSize = '0.875rem';
    
    footer.innerHTML = `
      <p style="margin: 5px 0;">Thank you for your business!</p>
      <p style="margin: 5px 0;">WrenchTrack - Your Reliable Automotive Service Partner</p>
    `;
    invoiceElement.appendChild(footer);
    
    // Generate PDF
    const opt = {
      margin: 10,
      filename: `invoice-${invoice.invoiceNumber || invoice.id.substring(0, 6)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    try {
      // Add to DOM temporarily to generate PDF
      document.body.appendChild(invoiceElement);
      html2pdf().from(invoiceElement).set(opt).save();
      
      // Remove from DOM after PDF is generated
      setTimeout(() => {
        document.body.removeChild(invoiceElement);
      }, 100);
      
      toast.success('Invoice PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
      
      // Cleanup
      if (document.body.contains(invoiceElement)) {
        document.body.removeChild(invoiceElement);
      }
    }
  };
  
  // Calculate remaining amount to be paid
  const calculateRemainingAmount = (invoice) => {
    const total = parseFloat(invoice.total) || 0;
    const paidAmount = parseFloat(invoice.paidAmount) || 0;
    return Math.max(0, total - paidAmount).toFixed(2);
  };

  // Add missing calculateTotal function for the edit form
  const calculateTotal = (parts) => {
    const taxRate = 0.1; // Default 10% tax
    const subtotal = parts.reduce((sum, part) => {
      const cost = parseFloat(part.cost) || 0;
      const quantity = parseInt(part.quantity) || 1;
      return sum + (cost * quantity);
    }, 0);
    
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    };
  };

  // Filter invoices based on status and search term
  const filteredInvoices = invoices.filter(invoice => {
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    const matchesSearch = searchTerm === '' || 
      (invoice.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       invoice.id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });
  
  // Separate active and archived invoices (finished status)
  const activeInvoices = filteredInvoices.filter(invoice => invoice.status !== 'finished');
  const archivedInvoices = filteredInvoices.filter(invoice => invoice.status === 'finished');

  // Updated function to open edit modal instead of redirecting
  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setEditFormData({
      title: invoice.title || 'Service Invoice',
      notes: invoice.notes || '',
      parts: invoice.parts ? [...invoice.parts] : []
    });
    setShowEditModal(true);
  };

  // Function to add a part in the edit modal
  const handleAddPartInEdit = () => {
    if (!editingPart.name || !editingPart.cost) {
      toast.error('Please provide both part name and cost');
      return;
    }
    
    setEditFormData(prev => ({
      ...prev,
      parts: [...prev.parts, { ...editingPart, cost: parseFloat(editingPart.cost) }]
    }));
    
    setEditingPart({ name: '', cost: '', quantity: 1 });
  };
  
  // Function to remove a part in the edit modal
  const handleRemovePartInEdit = (index) => {
    setEditFormData(prev => ({
      ...prev,
      parts: prev.parts.filter((_, i) => i !== index)
    }));
  };
  
  // Function to calculate subtotal, tax, and total for the edited invoice
  const calculateEditedSubtotal = () => {
    return editFormData.parts.reduce((sum, part) => sum + (parseFloat(part.cost) * parseInt(part.quantity)), 0);
  };
  
  const calculateEditedTax = () => {
    const taxRate = editingInvoice?.taxRate || 0.1;
    return calculateEditedSubtotal() * taxRate;
  };
  
  const calculateEditedTotal = () => {
    return calculateEditedSubtotal() + calculateEditedTax();
  };
  
  // Handle saving edited invoice
  const handleSaveEditedInvoice = async () => {
    try {
      setIsLoading(true);
      
      // Calculate final values
      const calculatedTotal = calculateTotal(editFormData.parts);
      const finalInvoice = {
        ...editFormData,
        total: calculatedTotal.total,
        subtotal: calculatedTotal.subtotal,
        tax: calculatedTotal.tax,
        updatedAt: new Date()
      };
      
      // Update in Firestore
      const invoiceRef = doc(db, 'users', user.uid, 'invoices', editingInvoice.id);
      await updateDoc(invoiceRef, finalInvoice);
      
      // Update local state
      setInvoices(invoices.map(inv => 
        inv.id === editingInvoice.id ? { ...inv, ...finalInvoice } : inv
      ));
      
      // Show success message and close modal
      toast.success('Invoice updated successfully');
      setShowEditModal(false);
      setEditingInvoice(null);
      setEditFormData({});
      setEditingPart(null);
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // New function to refresh data
  const handleRefresh = () => {
    refreshInvoices();
    toast.info("Invoice data refreshed");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Invoice History</h1>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Refresh
          </button>
        </div>
        
        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md text-sm ${
                statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-md text-sm ${
                statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded-md text-sm ${
                statusFilter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1 rounded-md text-sm ${
                statusFilter === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setStatusFilter('warranty')}
              className={`px-3 py-1 rounded-md text-sm ${
                statusFilter === 'warranty' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Warranty
            </button>
            <button
              onClick={() => setStatusFilter('finished')}
              className={`px-3 py-1 rounded-md text-sm ${
                statusFilter === 'finished' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Finished
            </button>
          </div>
          
          <div className="w-full md:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoices..."
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No invoices found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Invoices Section */}
            {(statusFilter === 'all' || statusFilter !== 'finished') && activeInvoices.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-3 flex items-center">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-2">{activeInvoices.length}</span>
                  Active Invoices
                </h2>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remaining
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activeInvoices.map(invoice => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoiceNumber || `#${invoice.id.substring(0, 6)}`}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{invoice.customer?.name || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{formatDate(invoice.createdAt)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(invoice)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              ${calculateInvoiceAmount(invoice).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-600">
                              ${(parseFloat(invoice.paidAmount) || 0).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-red-600">
                              ${calculateRemainingAmount(invoice)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                            <div className="flex flex-wrap gap-1 justify-center">
                              <button 
                                onClick={() => handleViewInvoice(invoice)} 
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center text-xs"
                              >
                                <FaEye className="mr-1" />
                                View
                              </button>
                              <button 
                                onClick={() => openPaymentModal(invoice)}
                                className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center text-xs"
                              >
                                <FaMoneyBillWave className="mr-1" />
                                Pay
                              </button>
                              
                              {/* Status buttons - include warranty option */}
                              <div className="inline-flex flex-wrap">
                                <button 
                                  onClick={() => handleUpdateStatus(invoice, 'pending')}
                                  className={`px-2 py-1 ${invoice.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-yellow-100 text-yellow-700'} rounded-l hover:bg-yellow-200 text-xs border-r border-white`}
                                >
                                  Pending
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(invoice, 'completed')}
                                  className={`px-2 py-1 ${invoice.status === 'completed' ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700'} hover:bg-blue-200 text-xs border-r border-white`}
                                >
                                  Done
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(invoice, 'paid')}
                                  className={`px-2 py-1 ${invoice.status === 'paid' ? 'bg-green-200 text-green-800' : 'bg-green-100 text-green-700'} hover:bg-green-200 text-xs border-r border-white`}
                                >
                                  Paid
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(invoice, 'warranty')}
                                  className={`px-2 py-1 ${invoice.status === 'warranty' ? 'bg-purple-200 text-purple-800' : 'bg-purple-100 text-purple-700'} hover:bg-purple-200 text-xs border-r border-white rounded-r`}
                                >
                                  Warranty
                                </button>
                              </div>
                              
                              {/* Archive Button */}
                              {invoice.status === 'paid' && (
                                <button 
                                  onClick={() => handleUpdateStatus(invoice, 'finished')}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center text-xs"
                                >
                                  <FaArchive className="mr-1" />
                                  Archive
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteInvoice(invoice.id)}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center text-xs"
                              >
                                <FaTrash className="mr-1" />
                                Del
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Archived Invoices Section */}
            {(statusFilter === 'all' || statusFilter === 'finished') && archivedInvoices.length > 0 && (
              <div className="mt-8">
                <details className="mb-3">
                  <summary className="text-lg font-medium flex items-center cursor-pointer">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs mr-2">{archivedInvoices.length}</span>
                    Archived Invoices
                    <span className="text-xs text-gray-400 ml-2">(click to expand)</span>
                  </summary>
                  
                  <div className="bg-white rounded-lg shadow overflow-hidden mt-4 opacity-80">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Paid
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Archived Date
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {archivedInvoices.map(invoice => (
                          <tr key={invoice.id} className="opacity-70 bg-gray-50 hover:bg-gray-100">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-500">
                                {invoice.invoiceNumber || `#${invoice.id.substring(0, 6)}`}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{invoice.customer?.name || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{formatDate(invoice.createdAt)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(invoice)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-500">
                                ${calculateInvoiceAmount(invoice).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-500">
                                ${(parseFloat(invoice.paidAmount) || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {formatDate(invoice.finishedAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                              <div className="flex flex-wrap gap-1 justify-center">
                                <button 
                                  onClick={() => handleViewInvoice(invoice)} 
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center text-xs"
                                >
                                  <FaEye className="mr-1" />
                                  View
                                </button>
                                
                                {/* Unarchive Button */}
                                <button 
                                  onClick={() => handleUpdateStatus(invoice, 'paid')}
                                  className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center text-xs"
                                >
                                  <FaArchive className="mr-1" />
                                  Unarchive
                                </button>
                                
                                <button
                                  onClick={() => handleDeleteInvoice(invoice.id)}
                                  className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center text-xs"
                                >
                                  <FaTrash className="mr-1" />
                                  Del
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && paymentInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>
            <div className="mb-4">
              <p className="text-gray-700">Invoice: {paymentInvoice.invoiceNumber || `#${paymentInvoice.id.substring(0, 6)}`}</p>
              <p className="text-gray-700">Customer: {paymentInvoice.customer?.name || 'N/A'}</p>
              <p className="text-gray-700 mt-2">
                <span className="font-medium">Total Amount:</span> ${parseFloat(paymentInvoice.total).toFixed(2)}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Already Paid:</span> ${(parseFloat(paymentInvoice.paidAmount) || 0).toFixed(2)}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Remaining:</span> ${calculateRemainingAmount(paymentInvoice)}
              </p>
            </div>
            
            <form onSubmit={handlePaymentSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Payment Amount
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  max={calculateRemainingAmount(paymentInvoice)}
                  value={paymentAmount} 
                  onChange={handlePaymentAmountChange}
                  className="w-full px-3 py-2 border rounded-md" 
                  placeholder="Enter amount"
                  required
                />
              </div>
              
              {/* Option to mark as finished when payment is full */}
              {parseFloat(paymentAmount) >= parseFloat(calculateRemainingAmount(paymentInvoice)) && (
                <div className="mb-4 flex items-center">
                  <input 
                    type="checkbox" 
                    id="markAsFinished"
                    checked={markAsFinished}
                    onChange={(e) => setMarkAsFinished(e.target.checked)}
                    className="mr-2 h-5 w-5 text-green-600"
                  />
                  <label htmlFor="markAsFinished" className="text-gray-700">
                    Mark as finished and close out this invoice
                  </label>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center"
                >
                  {isUpdating ? (
                    <>
                      <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                      Processing...
                    </>
                  ) : (
                    'Record Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {isModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Invoice Details</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs for Invoice Details and Customer Payment History */}
            <div className="flex border-b mb-6">
              <button
                className="py-2 px-4 text-blue-600 border-b-2 border-blue-600 font-medium"
              >
                Invoice Details
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Invoice Information</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="mb-2">
                    <span className="font-medium">Invoice Number:</span> {selectedInvoice.invoiceNumber || `#${selectedInvoice.id.substring(0, 6)}`}
                  </p>
                  <p className="mb-2">
                    <span className="font-medium">Date:</span> {formatDate(selectedInvoice.createdAt)}
                  </p>
                  <p className="mb-2">
                    <span className="font-medium">Status:</span> {getStatusLabel(selectedInvoice.status)}
                  </p>
                  {selectedInvoice.tracking && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-1">Tracking Status</h4>
                      <InvoiceTrackingStatus invoice={selectedInvoice} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="mb-2">
                    <span className="font-medium">Name:</span> {selectedInvoice.customer?.name || 'N/A'}
                  </p>
                  <p className="mb-2">
                    <span className="font-medium">Phone:</span> {selectedInvoice.customer?.phone || 'N/A'}
                  </p>
                  <p className="mb-2">
                    <span className="font-medium">Email:</span> {selectedInvoice.customer?.email || 'N/A'}
                  </p>
                  <p className="mb-2">
                    <span className="font-medium">Address:</span> {selectedInvoice.customer?.address || 'N/A'}
                  </p>
                  
                  {/* Payment Reliability Summary */}
                  {selectedInvoice.customer?.email && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold mb-1 flex items-center">
                          <FaChartLine className="mr-1 text-blue-500" /> 
                          Payment Reliability
                        </h4>
                        {isLoadingHistory ? (
                          <span className="text-xs text-gray-500">Loading...</span>
                        ) : (
                          <div className="flex items-center">
                            <div className="w-20 h-1.5 rounded-full bg-gray-200 mr-2">
                              <div 
                                className="h-1.5 rounded-full bg-blue-500" 
                                style={{ 
                                  width: `${paymentMetrics.totalInvoices > 0 
                                    ? (paymentMetrics.paidOnTime / Math.max(1, paymentMetrics.totalInvoices)) * 100 
                                    : 0}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium">
                              {paymentMetrics.totalInvoices > 0 
                                ? Math.round((paymentMetrics.paidOnTime / Math.max(1, paymentMetrics.totalInvoices)) * 100)
                                : 0}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Payment History Section */}
            {selectedInvoice.customer?.email && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <FaHistory className="mr-2 text-blue-500" />
                  Customer Payment History
                </h3>
                
                {isLoadingHistory ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    {/* Payment Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {/* Average Days to Pay */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-blue-700">Avg. Days to Pay</p>
                          <FaRegClock className="h-4 w-4 text-blue-500" />
                        </div>
                        <p className="text-xl font-bold text-blue-700">
                          {paymentMetrics.averageDaysToPayment || 0}
                        </p>
                        <p className="text-xs text-blue-600/70 mt-1">
                          days on average
                        </p>
                      </div>
                      
                      {/* Paid On Time */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-green-700">Paid On Time</p>
                          <FaCheck className="h-4 w-4 text-green-500" />
                        </div>
                        <p className="text-xl font-bold text-green-700">
                          {paymentMetrics.paidOnTime || 0}
                        </p>
                        <p className="text-xs text-green-600/70 mt-1">
                          invoices paid on time
                        </p>
                      </div>
                      
                      {/* Paid Late */}
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-yellow-700">Paid Late</p>
                          <FaMoneyBillWave className="h-4 w-4 text-yellow-500" />
                        </div>
                        <p className="text-xl font-bold text-yellow-700">
                          {paymentMetrics.paidLate || 0}
                        </p>
                        <p className="text-xs text-yellow-600/70 mt-1">
                          invoices paid late
                        </p>
                      </div>
                      
                      {/* Unpaid/Overdue */}
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-red-700">Unpaid/Overdue</p>
                          <FaExclamationTriangle className="h-4 w-4 text-red-500" />
                        </div>
                        <p className="text-xl font-bold text-red-700">
                          {paymentMetrics.unpaid || 0}
                        </p>
                        <p className="text-xs text-red-600/70 mt-1">
                          overdue invoices
                        </p>
                      </div>
                    </div>
                    
                    {/* Previous Invoices Table */}
                    <div className="bg-white border rounded-md overflow-hidden mb-4">
                      <h4 className="text-sm font-medium p-4 border-b">Previous Invoices</h4>
                      
                      {customerPaymentHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {customerPaymentHistory.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {invoice.invoiceNumber || invoice.id.substring(0, 6)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(invoice.createdAt)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    ${parseFloat(invoice.total || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    {invoice.paidAt ? (
                                      <span className="text-gray-900">
                                        {formatDate(invoice.paidAt)} 
                                        {invoice.daysToPayment !== undefined && (
                                          <span className="text-xs text-gray-500 ml-1">
                                            ({invoice.daysToPayment} days)
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">Not paid</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    {invoice.paymentStatus === 'on-time' && (
                                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                        On time
                                      </span>
                                    )}
                                    {invoice.paymentStatus === 'late' && (
                                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                        Late
                                      </span>
                                    )}
                                    {invoice.paymentStatus === 'overdue' && (
                                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                        Overdue
                                      </span>
                                    )}
                                    {invoice.paymentStatus === 'pending' && (
                                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
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
                        <div className="text-center py-8 text-gray-500">
                          <p>No previous invoices found for this customer.</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Payment History for Current Invoice */}
                    {selectedInvoice.paymentHistory && selectedInvoice.paymentHistory.length > 0 && (
                      <div className="bg-white border rounded-md overflow-hidden mb-4">
                        <h4 className="text-sm font-medium p-4 border-b">Current Invoice Payment History</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {selectedInvoice.paymentHistory.map((payment, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {formatDate(payment.date?.toDate ? payment.date.toDate() : payment.date)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    ${parseFloat(payment.amount || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">
                                    {payment.method}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
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
                  </>
                )}
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Parts & Services</h3>
              <div className="bg-white border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedInvoice.parts && selectedInvoice.parts.map((part, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{part.name}</div>
                          {part.description && (
                            <div className="text-xs text-gray-500">{part.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{part.quantity || 1}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${parseFloat(part.price).toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${((parseFloat(part.price) || 0) * (parseInt(part.quantity) || 1)).toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!selectedInvoice.parts || selectedInvoice.parts.length === 0) && (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                          No parts or services listed
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="px-6 py-3 text-right font-medium">Subtotal</td>
                      <td className="px-6 py-3 text-sm">${calculateInvoiceAmount(selectedInvoice).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-6 py-3 text-right font-medium">Tax</td>
                      <td className="px-6 py-3 text-sm">${(parseFloat(selectedInvoice.tax) || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-6 py-3 text-right font-medium">Total</td>
                      <td className="px-6 py-3 font-bold">${parseFloat(selectedInvoice.total).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-6 py-3 text-right font-medium">Paid</td>
                      <td className="px-6 py-3 text-green-600 font-medium">${(parseFloat(selectedInvoice.paidAmount) || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-6 py-3 text-right font-medium">Remaining</td>
                      <td className="px-6 py-3 text-red-600 font-medium">${calculateRemainingAmount(selectedInvoice)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-end">
              <button 
                onClick={() => handleEditInvoice(selectedInvoice)} 
                className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center"
              >
                <FaBars className="mr-2" />
                Edit Invoice
              </button>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  openPaymentModal(selectedInvoice);
                }} 
                className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center"
              >
                <FaMoneyBillWave className="mr-2" />
                Record Payment
              </button>
              
              {/* Status buttons in detail view - include warranty */}
              <div className="inline-flex flex-wrap gap-1">
                <button 
                  onClick={() => handleUpdateStatus(selectedInvoice, 'pending')}
                  className={`px-4 py-2 ${selectedInvoice.status === 'pending' ? 'bg-yellow-600' : 'bg-yellow-500'} text-white rounded-l flex items-center hover:bg-yellow-600`}
                >
                  <FaClock className="mr-2" />
                  Pending
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedInvoice, 'completed')}
                  className={`px-4 py-2 ${selectedInvoice.status === 'completed' ? 'bg-blue-600' : 'bg-blue-500'} text-white flex items-center hover:bg-blue-600`}
                >
                  <FaCheckCircle className="mr-2" />
                  Complete
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedInvoice, 'paid')}
                  className={`px-4 py-2 ${selectedInvoice.status === 'paid' ? 'bg-green-600' : 'bg-green-500'} text-white flex items-center hover:bg-green-600`}
                >
                  <FaMoneyBillWave className="mr-2" />
                  Paid
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedInvoice, 'warranty')}
                  className={`px-4 py-2 ${selectedInvoice.status === 'warranty' ? 'bg-purple-600' : 'bg-purple-500'} text-white rounded-r flex items-center hover:bg-purple-600`}
                >
                  <FaTools className="mr-2" />
                  Warranty
                </button>
              </div>
              
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  generatePDF(selectedInvoice);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md flex items-center"
              >
                <FaFileDownload className="mr-2" />
                Download PDF
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this invoice?')) {
                    setIsModalOpen(false);
                    handleDeleteInvoice(selectedInvoice.id);
                  }
                }} 
                className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center"
              >
                <FaTrash className="mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal - Improved UI */}
      {showEditModal && editingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Edit Invoice</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Title</label>
              <input
                type="text"
                value={editFormData.title}
                onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Parts & Services</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Part/Service Name</label>
                  <input
                    type="text"
                    placeholder="Part/Service Name"
                    value={editingPart.name}
                    onChange={(e) => setEditingPart({...editingPart, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={editingPart.quantity}
                    onChange={(e) => setEditingPart({...editingPart, quantity: parseInt(e.target.value) || 1})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                  <input
                    type="number"
                    placeholder="Cost"
                    value={editingPart.cost}
                    onChange={(e) => setEditingPart({...editingPart, cost: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <button
                onClick={handleAddPartInEdit}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2 mb-4 transition-colors"
              >
                <FaPlus /> Add Part/Service
              </button>
              
              <div className="border border-gray-200 rounded-md overflow-hidden mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left py-2 px-4 text-gray-700">Description</th>
                      <th className="text-center py-2 px-4 text-gray-700">Quantity</th>
                      <th className="text-right py-2 px-4 text-gray-700">Unit Price</th>
                      <th className="text-right py-2 px-4 text-gray-700">Total</th>
                      <th className="text-center py-2 px-4 text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editFormData.parts.map((part, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-4">{part.name}</td>
                        <td className="text-center py-2 px-4">{part.quantity}</td>
                        <td className="text-right py-2 px-4">${parseFloat(part.cost).toFixed(2)}</td>
                        <td className="text-right py-2 px-4">${(parseFloat(part.cost) * parseInt(part.quantity)).toFixed(2)}</td>
                        <td className="text-center py-2 px-4">
                          <button
                            onClick={() => handleRemovePartInEdit(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {editFormData.parts.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-4 text-center text-gray-500">
                          No parts added yet. Add parts or services above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan="3" className="text-right py-2 px-4 font-semibold">Subtotal</td>
                      <td className="text-right py-2 px-4">${calculateEditedSubtotal().toFixed(2)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td colSpan="3" className="text-right py-2 px-4 font-semibold">
                        Tax ({((editingInvoice?.taxRate || 0.1) * 100).toFixed(1)}%)
                      </td>
                      <td className="text-right py-2 px-4">${calculateEditedTax().toFixed(2)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-gray-100">
                      <td colSpan="3" className="text-right py-2 px-4 font-bold">Total</td>
                      <td className="text-right py-2 px-4 font-bold">${calculateEditedTotal().toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={editFormData.notes}
                onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Add any notes or special instructions here"
              />
            </div>
            
            <div className="flex justify-end gap-3 border-t pt-4 mt-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedInvoice}
                className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}