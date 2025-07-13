import React, { useContext, useState, useEffect } from 'react';
import { JobLogContext } from '../context/JobLogContext';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import html2pdf from 'html2pdf.js';
import { FaPlus, FaTrash, FaPrint, FaSave, FaArrowRight, FaArrowLeft, FaCheck, FaWrench, FaTimes } from 'react-icons/fa';
import firebaseService from '../services/firebaseService';
import { useNavigate, useParams } from 'react-router-dom';
import LaborGuideSearch from '../components/LaborGuideSearch';
import { setupLaborGuide } from '../utils/setupLaborGuide';

export default function InvoiceScreen({ isEditing }) {
  const { invoice, setInvoice, clearInvoice } = useContext(JobLogContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: invoiceId } = useParams(); // Get invoice ID from URL if editing
  const [currentStep, setCurrentStep] = useState(1);
  const [parts, setParts] = useState([]);
  const [newPart, setNewPart] = useState({ name: '', cost: '', quantity: 1 });
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLaborGuide, setShowLaborGuide] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    title: 'Service Invoice',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    taxRate: 0.1,
    poNumber: '',
    invoiceNumber: '',
  });
  const [isSetting, setIsSetting] = useState(false);
  const [existingInvoice, setExistingInvoice] = useState(null);
  
  // Generate a random alphanumeric string of specified length
  const generateRandomAlphanumeric = (length = 6) => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  // Generate invoice number based on PO number or random digits
  const generateInvoiceNumber = () => {
    // Use the PO number if provided, otherwise generate a random number
    const poBase = invoiceData.poNumber.trim() || Math.floor(100000 + Math.random() * 900000).toString();
    const randomSuffix = generateRandomAlphanumeric();
    return `INV-${poBase}-${randomSuffix}`;
  };
  
  // Add user settings state
  const [userSettings, setUserSettings] = useState({
    businessInfo: {
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      email: '',
      website: '',
      taxId: ''
    },
    preferences: {
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      defaultInvoiceTitle: 'Invoice',
      invoiceNotes: 'Thank you for your business!',
      invoiceTerms: 'Net 30',
      timezone: 'America/New_York'
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        // Generate initial invoice number
        const initialInvoiceNumber = generateInvoiceNumber();
        setInvoiceData(prev => ({
          ...prev, 
          invoiceNumber: initialInvoiceNumber
        }));
        
        // Fetch customers
        const customersRef = collection(db, 'users', user.uid, 'customers');
        const customersSnapshot = await getDocs(customersRef);
        const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomers(customersData);
        
        // Fetch settings using the firebaseService
        await firebaseService.initializeUserDocuments();
        const settings = await firebaseService.getSettingsDoc(true);
        
        if (settings) {
          console.log("Loaded settings for invoice:", settings);
          setUserSettings({
            businessInfo: settings.businessInfo || userSettings.businessInfo,
            preferences: settings.preferences || userSettings.preferences
          });
          
          // Apply settings to invoice data
          let updatedInvoiceData = { ...invoiceData };
          
          // Use the default invoice title from settings
          if (settings.preferences?.defaultInvoiceTitle) {
            updatedInvoiceData.title = settings.preferences.defaultInvoiceTitle;
          }
          
          // Use invoice notes from settings
          if (settings.preferences?.invoiceNotes) {
            updatedInvoiceData.notes = settings.preferences.invoiceNotes;
          }
          
          // Calculate due date based on invoice terms if available
          if (settings.preferences?.invoiceTerms) {
            const termMatch = settings.preferences.invoiceTerms.match(/Net\s+(\d+)/i);
            if (termMatch && termMatch[1]) {
              const days = parseInt(termMatch[1]);
              if (!isNaN(days)) {
                updatedInvoiceData.dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              }
            }
          }
          
          setInvoiceData(updatedInvoiceData);
        }

        // If editing an existing invoice, fetch its data
        if (isEditing && invoiceId) {
          const invoiceDocRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
          const invoiceDoc = await getDoc(invoiceDocRef);
          
          if (invoiceDoc.exists()) {
            const invoiceData = invoiceDoc.data();
            setExistingInvoice({ id: invoiceDoc.id, ...invoiceData });
            
            // Set invoice data from the document
            setInvoiceData({
              title: invoiceData.title || 'Service Invoice',
              date: invoiceData.date || new Date().toISOString().split('T')[0],
              dueDate: invoiceData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              notes: invoiceData.notes || '',
              taxRate: invoiceData.taxRate || 0.1,
              poNumber: invoiceData.poNumber || '',
              invoiceNumber: invoiceData.invoiceNumber || 'DRAFT',
            });
            
            // Set parts
            if (invoiceData.parts && Array.isArray(invoiceData.parts)) {
              setParts(invoiceData.parts);
            }
            
            // Set customer
            if (invoiceData.customer) {
              // Find the customer in our loaded customers
              const customer = customersData.find(c => c.id === invoiceData.customer.id);
              if (customer) {
                setSelectedCustomer(customer);
              } else {
                // If customer not found in our list, use the one from the invoice
                setSelectedCustomer(invoiceData.customer);
              }
            }
          } else {
            toast.error('Invoice not found');
            navigate('/invoicehistory');
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, isEditing, invoiceId, navigate]);
  
  // Update invoice number when PO number changes
  useEffect(() => {
    // Only regenerate if we're not already loading data (to avoid overriding during initial load)
    if (!isLoading) {
      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: generateInvoiceNumber()
      }));
    }
  }, [invoiceData.poNumber, isLoading]);

  const handleAddPart = () => {
    if (!newPart.name || !newPart.cost) {
      toast.error('Please provide both part name and cost');
      return;
    }
    setParts([...parts, { ...newPart, cost: parseFloat(newPart.cost) }]);
    setNewPart({ name: '', cost: '', quantity: 1 });
  };

  const handleRemovePart = (index) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return parts.reduce((sum, part) => sum + (part.cost * part.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * invoiceData.taxRate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleAddLabor = (operation) => {
    const laborRate = userSettings.preferences?.laborRate || 85; // Use settings or default to $85/hr
    const laborPart = {
      name: `Labor - ${operation.name}`,
      cost: operation.standardHours * laborRate,
      quantity: 1,
      type: 'labor',
      operation: operation
    };
    setParts([...parts, laborPart]);
    setShowLaborGuide(false);
    toast.success('Labor operation added to invoice');
  };

  const handleSetupLaborGuide = async () => {
    try {
      setIsSetting(true);
      const result = await setupLaborGuide();
      if (result) {
        toast.success('Labor guide setup complete! Sample operations added.');
      } else {
        toast.info('Labor guide data already exists.');
      }
      setShowLaborGuide(false);
      setTimeout(() => setShowLaborGuide(true), 500); // Reopen to refresh data
    } catch (error) {
      console.error('Error setting up labor guide:', error);
      toast.error('Error setting up labor guide. See console for details.');
    } finally {
      setIsSetting(false);
    }
  };

  // Updated saveInvoice function to handle both creating and updating
  const saveInvoice = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (parts.length === 0) {
      toast.error('Please add at least one part or service');
      return;
    }

    try {
      setIsLoading(true);
      const invoiceToSave = {
        ...invoiceData,
        invoiceNumber: invoiceData.invoiceNumber || generateInvoiceNumber(),
        customer: selectedCustomer,
        parts,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        total: calculateTotal(),
        updatedAt: new Date(),
        status: existingInvoice?.status || 'pending',
        userId: user.uid,
        businessInfo: userSettings.businessInfo,
        preferences: {
          currency: userSettings.preferences.currency,
          invoiceTerms: userSettings.preferences.invoiceTerms
        }
      };
      
      // Only set createdAt if this is a new invoice
      if (!isEditing) {
        invoiceToSave.createdAt = new Date();
      }
      
      // Track changes if this is a new invoice
      let invoiceWithTracking = invoiceToSave;
      
      if (!isEditing) {
        // Import tracking initialization for new invoices
        const { initializeTracking } = await import('../utils/invoiceTracking');
        // Initialize tracking for the new invoice
        invoiceWithTracking = initializeTracking(invoiceToSave);
      } else if (existingInvoice?.tracking) {
        // Keep existing tracking data
        invoiceWithTracking.tracking = existingInvoice.tracking;
      }

      let docRef;
      if (isEditing && invoiceId) {
        // Update the existing invoice
        const invoiceRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
        await updateDoc(invoiceRef, invoiceWithTracking);
        docRef = { id: invoiceId };
        console.log('Invoice updated with ID:', invoiceId);
        toast.success(`Invoice ${invoiceToSave.invoiceNumber} updated successfully`);
      } else {
        // Save as a new invoice
        docRef = await addDoc(collection(db, 'users', user.uid, 'invoices'), invoiceWithTracking);
        console.log('Invoice saved with ID:', docRef.id);
        toast.success(`Invoice ${invoiceToSave.invoiceNumber} saved successfully`);
      }
      
      // Add ID to the invoice object
      const invoiceWithId = {
        ...invoiceWithTracking,
        id: docRef.id
      };
      
      // Update context with saved invoice including ID
      setInvoice(invoiceWithId);
      
      // Navigate to invoice history
      navigate('/invoicehistory');
      
      // If not editing, reset form for a new invoice
      if (!isEditing) {
        resetInvoiceForm();
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to reset the form for a new invoice
  const resetInvoiceForm = () => {
    // Generate a new invoice number
    const newInvoiceNumber = generateInvoiceNumber();
    
    // Reset state while keeping user settings
    setCurrentStep(1);
    setParts([]);
    setSelectedCustomer(null);
    setNewPart({ name: '', cost: '', quantity: 1 });
    
    // Reset invoice data fields but keep the settings-derived values
    setInvoiceData({
      title: userSettings.preferences?.defaultInvoiceTitle || 'Service Invoice',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: userSettings.preferences?.invoiceNotes || '',
      taxRate: 0.1,
      poNumber: '',
      invoiceNumber: newInvoiceNumber,
    });
    
    toast.info('Form reset for new invoice');
  };

  const generatePDF = () => {
    const element = document.getElementById('invoice-preview');
    const opt = {
      margin: 0.5,
      filename: `invoice-${invoiceData.invoiceNumber || 'draft'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save()
      .then(() => toast.success('PDF generated successfully'))
      .catch(() => toast.error('Failed to generate PDF'));
  };

  const nextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 1 && !selectedCustomer) {
      toast.error('Please select a customer before proceeding');
      return;
    }
    
    if (currentStep === 2 && parts.length === 0) {
      toast.error('Please add at least one part or service');
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Define step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Step 1: Customer & Invoice Details</h3>
            
            {/* Customer Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Customer</label>
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value))}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                <option value="">Choose a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.company ? `(${customer.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invoice Title</label>
                <input
                  type="text"
                  value={invoiceData.title}
                  onChange={(e) => setInvoiceData({...invoiceData, title: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  PO Number <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={invoiceData.poNumber}
                  onChange={(e) => setInvoiceData({...invoiceData, poNumber: e.target.value})}
                  placeholder="Enter PO number if applicable"
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use an auto-generated number</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceData.invoiceNumber}
                  readOnly
                  className="w-full border rounded-lg px-4 py-2 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                  tabIndex="-1" // Removes from tab order
                  aria-readonly="true" // For screen readers
                />
                <p className="text-xs text-gray-500 mt-1">Auto-generated - cannot be modified</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  value={invoiceData.date}
                  onChange={(e) => setInvoiceData({...invoiceData, date: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
                <input
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => setInvoiceData({...invoiceData, dueDate: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  value={invoiceData.taxRate * 100}
                  onChange={(e) => setInvoiceData({...invoiceData, taxRate: parseFloat(e.target.value) / 100})}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  step="0.1"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Step 2: Add Parts & Services</h3>
            
            {/* Add Labor Guide Button */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setShowLaborGuide(true)}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FaWrench /> Add Labor from Guide
              </button>
            </div>
            
            {/* Parts Section */}
            <div className="mb-6">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Part/Service Name"
                  value={newPart.name}
                  onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                  className="col-span-2 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={newPart.quantity}
                  onChange={(e) => setNewPart({...newPart, quantity: parseInt(e.target.value) || 1})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
                <input
                  type="number"
                  placeholder="Cost"
                  value={newPart.cost}
                  onChange={(e) => setNewPart({...newPart, cost: e.target.value})}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <button
                onClick={handleAddPart}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                <FaPlus /> Add Part/Service
              </button>

              <div className="mt-4">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="text-left py-2 px-4 text-gray-800 dark:text-white">Description</th>
                      <th className="text-center py-2 px-4 text-gray-800 dark:text-white">Quantity</th>
                      <th className="text-right py-2 px-4 text-gray-800 dark:text-white">Unit Price</th>
                      <th className="text-right py-2 px-4 text-gray-800 dark:text-white">Total</th>
                      <th className="text-center py-2 px-4 text-gray-800 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((part, index) => (
                      <tr key={index} className="border-b dark:border-gray-700">
                        <td className="py-2 px-4 text-gray-800 dark:text-white">{part.name}</td>
                        <td className="text-center py-2 px-4 text-gray-800 dark:text-white">{part.quantity}</td>
                        <td className="text-right py-2 px-4 text-gray-800 dark:text-white">${part.cost.toFixed(2)}</td>
                        <td className="text-right py-2 px-4 text-gray-800 dark:text-white">${(part.cost * part.quantity).toFixed(2)}</td>
                        <td className="text-center py-2 px-4">
                          <button
                            onClick={() => handleRemovePart(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
              <textarea
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                rows="3"
              />
            </div>

            {/* Labor Guide Modal */}
            {showLaborGuide && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Labor Guide</h2>
                    <button
                      onClick={() => setShowLaborGuide(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <FaTimes size={20} />
                    </button>
                  </div>
                  <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    Search for labor operations to add to this invoice. Labor rate: ${userSettings.preferences?.laborRate || 85}/hr
                  </div>
                  <div className="mb-4">
                    <button 
                      onClick={handleSetupLaborGuide}
                      disabled={isSetting}
                      className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded transition-colors"
                    >
                      {isSetting ? 'Setting up...' : 'Setup Labor Guide Data'}
                    </button>
                    <span className="ml-2 text-xs text-gray-500">
                      Click to initialize sample labor operations
                    </span>
                  </div>
                  <LaborGuideSearch
                    onSelectOperation={handleAddLabor}
                  />
                </div>
              </div>
            )}
          </div>
        );
      
      case 3:
        return (
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Step 3: Review & Finalize</h3>
            
            {/* Invoice preview */}
            <div id="invoice-preview" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">{invoiceData.title}</h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Invoice #: {invoiceData.invoiceNumber}</p>
                  {invoiceData.poNumber && invoiceData.poNumber.trim() !== '' && (
                    <p className="text-gray-600 dark:text-gray-400">PO #: {invoiceData.poNumber}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-gray-600 dark:text-gray-400">Date: {new Date(invoiceData.date).toLocaleDateString()}</p>
                  <p className="text-gray-600 dark:text-gray-400">Due: {new Date(invoiceData.dueDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Bill To:</h3>
                  {selectedCustomer && (
                    <div className="text-gray-600 dark:text-gray-400">
                      <p className="font-medium">{selectedCustomer.name}</p>
                      <p>{selectedCustomer.company}</p>
                      <p>{selectedCustomer.address}</p>
                      <p>{selectedCustomer.email}</p>
                      <p>{selectedCustomer.phone}</p>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">From:</h3>
                  <div className="text-gray-600 dark:text-gray-400">
                    <p className="font-medium">{userSettings.businessInfo.name || 'Your Company Name'}</p>
                    <p className="font-medium">{[
                      userSettings.businessInfo.address,
                      userSettings.businessInfo.city,
                      userSettings.businessInfo.state,
                      userSettings.businessInfo.zip
                    ].filter(Boolean).join(', ') || 'Your Company Address'}</p>
                    <p>{userSettings.businessInfo.email || 'Your Email'}</p>
                    <p>{userSettings.businessInfo.phone || 'Your Phone'}</p>
                    {userSettings.businessInfo.website && <p>{userSettings.businessInfo.website}</p>}
                    {userSettings.businessInfo.taxId && <p>Tax ID: {userSettings.businessInfo.taxId}</p>}
                  </div>
                </div>
              </div>

              <table className="w-full mb-8">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="text-left py-3 px-4 text-gray-800 dark:text-white">Description</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-white">Quantity</th>
                    <th className="text-right py-3 px-4 text-gray-800 dark:text-white">Unit Price</th>
                    <th className="text-right py-3 px-4 text-gray-800 dark:text-white">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((part, index) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      <td className="py-3 px-4 text-gray-800 dark:text-white">{part.name}</td>
                      <td className="text-center py-3 px-4 text-gray-800 dark:text-white">{part.quantity}</td>
                      <td className="text-right py-3 px-4 text-gray-800 dark:text-white">
                        {userSettings.preferences.currency || '$'}{part.cost.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-800 dark:text-white">
                        {userSettings.preferences.currency || '$'}{(part.cost * part.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" className="text-right py-3 px-4 font-semibold text-gray-800 dark:text-white">Subtotal</td>
                    <td className="text-right py-3 px-4 text-gray-800 dark:text-white">
                      {userSettings.preferences.currency || '$'}{calculateSubtotal().toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="3" className="text-right py-3 px-4 font-semibold text-gray-800 dark:text-white">
                      Tax ({(invoiceData.taxRate * 100).toFixed(1)}%)
                    </td>
                    <td className="text-right py-3 px-4 text-gray-800 dark:text-white">
                      {userSettings.preferences.currency || '$'}{calculateTax().toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <td colSpan="3" className="text-right py-3 px-4 font-bold text-lg text-gray-800 dark:text-white">Total</td>
                    <td className="text-right py-3 px-4 font-bold text-lg text-gray-800 dark:text-white">
                      {userSettings.preferences.currency || '$'}{calculateTotal().toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {invoiceData.notes && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Notes</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{invoiceData.notes}</p>
                </div>
              )}

              <div className="border-t dark:border-gray-700 pt-8">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {userSettings.preferences.invoiceNotes || 'Thank you for your business!'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Please make checks payable to {userSettings.businessInfo.name || 'Your Company Name'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => navigate('/invoicehistory')}
                type="button"
                className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                View History
              </button>
              <button
                onClick={generatePDF}
                type="button"
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                disabled={isLoading}
              >
                <FaPrint /> Generate PDF
              </button>
              <button
                onClick={() => {
                  // Explicit function call with event prevented from bubbling
                  saveInvoice();
                }}
                type="button"
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                disabled={isLoading}
              >
                <FaSave /> {isLoading ? 'Saving...' : 'Save Invoice'}
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Create Invoice</h2>
          
          {/* Progress Steps */}
          <div className="relative mb-8">
            <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 z-0"></div>
            <div className="relative z-10 flex justify-between">
              <div className={`flex flex-col items-center ${currentStep >= 1 ? 'text-blue-500' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${currentStep >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>
                  {currentStep > 1 ? <FaCheck /> : 1}
                </div>
                <span className="text-sm mt-2">Customer</span>
              </div>
              <div className={`flex flex-col items-center ${currentStep >= 2 ? 'text-blue-500' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${currentStep >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>
                  {currentStep > 2 ? <FaCheck /> : 2}
                </div>
                <span className="text-sm mt-2">Items</span>
              </div>
              <div className={`flex flex-col items-center ${currentStep >= 3 ? 'text-blue-500' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${currentStep >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>
                  3
                </div>
                <span className="text-sm mt-2">Review</span>
              </div>
            </div>
          </div>

          {/* Dynamic Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={prevStep}
              className={`flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={currentStep === 1}
            >
              <FaArrowLeft /> Previous
            </button>
            
            {currentStep < 3 && (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Next <FaArrowRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
