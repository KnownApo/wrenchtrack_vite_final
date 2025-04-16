import React, { useEffect, useState, useRef } from 'react';
import '../styles/modern.css';
import { collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { toast } from 'react-toastify';
import LaborGuideSearch from '../components/LaborGuideSearch';

export default function InvoiceBuilderScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pdfRef = useRef();

  const steps = [
    {
      title: 'Basic Info',
      icon: '📝'
    },
    {
      title: 'Customer',
      icon: '👥'
    },
    {
      title: 'Parts & Labor',
      icon: '🔧'
    },
    {
      title: 'Preview',
      icon: '📋'
    }
  ];

  const generateInvoiceNumber = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `INV-${randomNum}-${randomSuffix}`;
  };

  // Group all state initializations together at the top
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);  // Move this up
  const [error, setError] = useState(null);
  const [newPart, setNewPart] = useState({ name: '', price: '' });
  const [showLaborGuide, setShowLaborGuide] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [companySettings, setCompanySettings] = useState({});

  // Initialize with empty state first
  const [invoiceData, setInvoiceData] = useState({
    title: '',
    poNumber: '',
    customer: '',
    parts: [],
    taxRate: 0.1,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
    invoiceId: generateInvoiceNumber()
  });

  // Update loadInitialData
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First try to load settings
        const settingsSnap = await getDoc(doc(db, 'settings', user.uid));
        const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};
        setCompanySettings(settingsData);
        setLogoUrl(settingsData.avatarUrl);

        // Apply settings to invoice data
        setInvoiceData(prev => ({
          ...prev,
          title: settingsData?.preferences?.defaultInvoiceTitle || '',
          taxRate: settingsData?.preferences?.defaultTaxRate || 0.1
        }));

        // Load customers and invoices
        const [customersData, invoicesData] = await Promise.all([
          getDocs(collection(db, 'users', user.uid, 'customers')),
          getDocs(collection(db, 'users', user.uid, 'invoices'))
        ]);

        setCustomers(customersData.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setSavedInvoices(invoicesData.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (err) {
        console.error('Error in loadInitialData:', err);
        setError('Failed to load data. Please try refreshing the page.');
        toast.error('Error loading data');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [user]);

  // Handle form updates
  const updateInvoiceData = (field, value) => {
    setInvoiceData(prev => ({ ...prev, [field]: value }));
  };

  // Navigation between steps
  const nextStep = () => {
    if (validateCurrentStep()) {
      setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  // Validation
  const validateCurrentStep = () => {
    switch (activeStep) {
      case 0:
        if (!invoiceData.title) {
          toast.error('Please enter an invoice title');
          return false;
        }
        // Remove PO number validation since it's optional
        break;
      case 1:
        if (!invoiceData.customer) {
          toast.error('Please select a customer');
          return false;
        }
        break;
      case 2:
        if (!invoiceData.parts.length) {
          toast.error('Please add at least one part');
          return false;
        }
        break;
      default:
        return true;
    }
    return true;
  };

  // Add missing handlers
  const handleNavigateToSignature = () => {
    // Save current invoice state
    sessionStorage.setItem('draftInvoice', JSON.stringify(invoiceData));
    // Navigate to signature screen
    navigate('/signature');
  };

  const handleDownloadPdf = () => {
    if (!pdfRef.current) {
      toast.error('Preview not available');
      return;
    }

    // Create a fresh container for PDF generation with controlled styling
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
    
    // Get customer information
    const customer = customers.find(c => c.id === invoiceData.customer);
    
    // Dynamically adjust content based on the amount of parts
    const partCount = invoiceData.parts.length;
    
    // Adaptive sizing - more aggressive scaling for larger invoices
    const tableFontSize = partCount > 15 ? '8px' : partCount > 10 ? '9px' : partCount > 7 ? '10px' : '11px';
    const headerFontSize = partCount > 15 ? '16px' : partCount > 10 ? '18px' : '22px';
    const contentPadding = partCount > 15 ? '0.25in' : partCount > 10 ? '0.3in' : '0.4in';
    const cellPadding = partCount > 15 ? '3px' : partCount > 10 ? '4px' : '6px';
    
    // Skip notes completely if we have too many parts
    const includeNotes = partCount <= 12 && invoiceData.notes && invoiceData.notes.length > 0;
    
    // Create a clean HTML structure with precise pixel control
    container.innerHTML = `
      <div class="pdf-document" style="width: 8.27in; height: 11.69in; padding: ${contentPadding}; background: white; color: black; font-family: Arial, sans-serif; position: relative;">
        <!-- Header - Very compact when many items -->
        <div style="display: flex; justify-content: space-between; margin-bottom: ${partCount > 15 ? '5px' : '10px'};">
          <div style="width: 40%;">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height: ${partCount > 10 ? '40px' : '50px'}; max-width: 180px; margin-bottom: 3px;" />` : ''}
            <div style="font-size: 10px; line-height: 1.2;">
              <p style="font-weight: bold; margin-bottom: 1px;">${companySettings?.businessInfo?.name || ''}</p>
              <p style="margin-bottom: 1px;">${companySettings?.businessInfo?.address || ''}</p>
              <p style="margin-bottom: 1px;">${companySettings?.businessInfo?.phone || ''}</p>
              <p style="margin-bottom: 3px;">${companySettings?.businessInfo?.email || ''}</p>
            </div>
          </div>
          <div style="width: 40%; text-align: right;">
            <h1 style="font-size: ${headerFontSize}; font-weight: bold; margin-bottom: 3px;">${invoiceData.title}</h1>
            <div style="font-size: 10px; line-height: 1.2;">
              <p style="margin-bottom: 1px;"><span style="font-weight: bold;">Invoice #:</span> ${invoiceData.invoiceId}</p>
              <p style="margin-bottom: 1px;"><span style="font-weight: bold;">Date:</span> ${invoiceData.invoiceDate}</p>
              ${invoiceData.dueDate ? `<p style="margin-bottom: 1px;"><span style="font-weight: bold;">Due Date:</span> ${invoiceData.dueDate}</p>` : ''}
            </div>
          </div>
        </div>
        
        <!-- Thinner Divider -->
        <div style="border-top: 1px solid #ccc; margin: 5px 0;"></div>
        
        <!-- Bill To Section - Very Compact -->
        <div style="margin-bottom: ${partCount > 15 ? '5px' : '8px'};">
          <h3 style="font-size: 12px; font-weight: bold; margin-bottom: 2px;">Bill To</h3>
          ${customer ? `
            <div style="font-size: 10px; line-height: 1.2;">
              <p style="font-weight: bold; margin-bottom: 1px;">${customer.name || ''}</p>
              <p style="margin-bottom: 1px;">${customer.company || ''}</p>
              <p style="margin-bottom: 1px;">${customer.address || ''}</p>
              <p style="margin-bottom: 1px;">${customer.email || ''}</p>
            </div>
          ` : ''}
        </div>
        
        <!-- Parts Table - Maximally compact for many items -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: ${partCount > 15 ? '5px' : '10px'}; font-size: ${tableFontSize};">
          <thead>
            <tr style="background-color: #f3f3f3;">
              <th style="text-align: left; padding: ${cellPadding}; border: 1px solid #ddd;">Description</th>
              <th style="text-align: right; padding: ${cellPadding}; border: 1px solid #ddd; width: 80px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.parts.map((part, index) => `
              <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
                <td style="padding: ${cellPadding}; border: 1px solid #ddd; white-space: ${partCount > 15 ? 'nowrap' : 'normal'}; overflow: hidden; text-overflow: ellipsis; max-width: 0;">${part.name}</td>
                <td style="padding: ${cellPadding}; border: 1px solid #ddd; text-align: right;">$${parseFloat(part.price).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td style="padding: ${cellPadding}; border: 1px solid #ddd; font-weight: bold;">Subtotal</td>
              <td style="padding: ${cellPadding}; border: 1px solid #ddd; text-align: right;">$${calculateSubtotal().toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: ${cellPadding}; border: 1px solid #ddd; font-weight: bold;">Tax (${(invoiceData.taxRate * 100).toFixed(1)}%)</td>
              <td style="padding: ${cellPadding}; border: 1px solid #ddd; text-align: right;">$${calculateTax().toFixed(2)}</td>
            </tr>
            <tr style="background-color: #f3f3f3;">
              <td style="padding: ${cellPadding}; border: 1px solid #ddd; font-weight: bold; font-size: ${partCount > 15 ? '10px' : '12px'};">Total</td>
              <td style="padding: ${cellPadding}; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: ${partCount > 15 ? '10px' : '12px'};">$${calculateTotal().toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        
        <!-- Notes Section - Omitted when space is tight -->
        ${includeNotes ? `
          <div style="margin-bottom: 5px; max-height: ${partCount > 8 ? '50px' : '80px'}; overflow: hidden;">
            <h3 style="font-size: 12px; font-weight: bold; margin-bottom: 2px;">Notes</h3>
            <p style="font-size: 9px; line-height: 1.2;">${invoiceData.notes}</p>
          </div>
        ` : ''}
        
        <!-- Signature - Always included but compact -->
        <div style="margin-top: ${partCount > 15 ? '8px' : '12px'}; position: ${partCount > 20 ? 'absolute' : 'relative'}; bottom: ${partCount > 20 ? '0.25in' : 'auto'}; width: calc(100% - ${partCount > 20 ? '0.5in' : '0'});">
          <div style="border-top: 1px solid #000; width: 180px; margin-bottom: 3px;"></div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; line-height: 1.2;">
            <div>
              <p>Customer Signature</p>
              <p style="font-weight: bold; margin-top: 2px;">${customer ? customer.name : ''}</p>
            </div>
            <div style="text-align: right;">
              <p>Date</p>
              <p style="font-weight: bold; margin-top: 2px;">${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    toast.info('Generating PDF, please wait...');

    const element = container.querySelector('.pdf-document');
    
    // Configure PDF options for maximum single-page compatibility
    const opt = {
      margin: 0,
      filename: `invoice-${invoiceData.poNumber || 'draft'}-${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        windowWidth: 816,
        scrollY: -window.scrollY // Important to prevent page position issues
      },
      jsPDF: { 
        unit: 'in',
        format: 'letter',
        orientation: 'portrait',
        compress: true,
        hotfixes: ["px_scaling"]
      },
      pagebreak: { mode: 'avoid-all' } // Critical option to avoid page breaks
    };

    html2pdf().from(element).set(opt).save()
      .then(() => {
        document.body.removeChild(container);
        toast.success('PDF downloaded successfully');
      })
      .catch(err => {
        document.body.removeChild(container);
        console.error('PDF generation failed:', err);
        toast.error('Failed to generate PDF');
      });
  };

  // Add cleanup function
  useEffect(() => {
    return () => {
      // Cleanup on component unmount
      sessionStorage.removeItem('draftInvoice');
    };
  }, []);

  // Add autosave feature
  useEffect(() => {
    if (!isLoading && invoiceData.title) {
      sessionStorage.setItem('currentInvoice', JSON.stringify(invoiceData));
    }
  }, [invoiceData, isLoading]);

  // Load saved state on initial load
  useEffect(() => {
    const savedInvoice = sessionStorage.getItem('currentInvoice');
    if (savedInvoice && !isLoading) {
      try {
        const parsed = JSON.parse(savedInvoice);
        setInvoiceData(prev => ({ ...prev, ...parsed }));
      } catch (err) {
        console.error('Error loading saved invoice:', err);
      }
    }
  }, [isLoading]);

  // Update handleSaveInvoice
  const handleSaveInvoice = async () => {
    if (!validateCurrentStep()) return;

    setIsLoading(true);
    try {
      const customerData = customers.find(c => c.id === invoiceData.customer);
      const poNumber = invoiceData.poNumber || Math.floor(100000 + Math.random() * 900000).toString();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const finalId = `INV-${poNumber}-${randomSuffix}`;
      
      const invoiceToSave = {
        ...invoiceData,
        poNumber: finalId,
        invoiceId: finalId,
        customer: customerData,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending'
      };

      await addDoc(collection(db, 'users', user.uid, 'invoices'), invoiceToSave);
      toast.success('Invoice saved successfully');
      
      // Reset form using the same defaults
      setInvoiceData({
        title: '',
        poNumber: '',
        customer: '',
        parts: [],
        taxRate: 0.1,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        notes: '',
        invoiceId: generateInvoiceNumber()
      });
      setActiveStep(0);
      sessionStorage.removeItem('currentInvoice');
      sessionStorage.removeItem('draftInvoice');
    } catch (err) {
      console.error('Error saving invoice:', err);
      toast.error('Failed to save invoice');
    }
    setIsLoading(false);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the invoice? All data will be lost.')) {
      setInvoiceData({
        title: '',
        poNumber: '',
        customer: '',
        parts: [],
        taxRate: 0.1,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        notes: '',
        invoiceId: generateInvoiceNumber()
      });
      setActiveStep(0);
      sessionStorage.removeItem('currentInvoice');
      sessionStorage.removeItem('draftInvoice');
      toast.info('Invoice reset');
    }
  };

  // Add helper functions
  const calculateSubtotal = () => {
    return invoiceData.parts.reduce((sum, part) => sum + (parseFloat(part.price) || 0), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * invoiceData.taxRate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleAddLabor = (operation) => {
    if (!operation) return;
    
    const laborPart = {
      name: `Labor - ${operation.name}`,
      price: operation.standardHours * (companySettings.preferences?.laborRate || 100),
      type: 'labor',
      hours: operation.standardHours,
      description: operation.description
    };

    updateInvoiceData('parts', [...invoiceData.parts, laborPart]);
  };

  const handleAddPart = () => {
    if (newPart.name && newPart.price) {
      updateInvoiceData('parts', [...invoiceData.parts, { ...newPart, type: 'part' }]);
      setNewPart({ name: '', price: '' });
    } else {
      toast.error('Please enter both part name and price');
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Title *</label>
              <input
                type="text"
                value={invoiceData.title}
                onChange={(e) => updateInvoiceData('title', e.target.value)}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Enter invoice title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Number (Optional)
                  <span className="ml-1 text-xs text-gray-500">Leave empty for auto-generated</span>
                </label>
                <input
                  type="text"
                  value={invoiceData.poNumber}
                  onChange={(e) => updateInvoiceData('poNumber', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter PO or leave blank"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  value={invoiceData.taxRate * 100}
                  onChange={(e) => updateInvoiceData('taxRate', Math.max(0, Math.min(100, parseFloat(e.target.value))) / 100)}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                <input
                  type="date"
                  value={invoiceData.invoiceDate}
                  onChange={(e) => updateInvoiceData('invoiceDate', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => updateInvoiceData('dueDate', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  min={invoiceData.invoiceDate}
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer *</label>
              <select
                value={invoiceData.customer}
                onChange={(e) => updateInvoiceData('customer', e.target.value)}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {invoiceData.customer && (
              <div className="bg-gray-50 rounded-lg p-4">
                {(() => {
                  const customer = customers.find(c => c.id === invoiceData.customer);
                  return customer && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Customer Details</h3>
                      <p>{customer.address}</p>
                      <p>Email: {customer.email}</p>
                      <p>Phone: {customer.phone}</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Parts & Labor</h3>
                <div className="space-x-2">
                  <button
                    onClick={handleAddPart}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Add Part
                  </button>
                  <button
                    onClick={() => setShowLaborGuide(true)}
                    className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Add Labor
                  </button>
                </div>
              </div>
              {invoiceData.parts.length > 0 ? (
                <div className="space-y-2">
                  {invoiceData.parts.map((part, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span>{part.name}</span>
                      <div className="flex items-center gap-4">
                        <span>${parseFloat(part.price).toFixed(2)}</span>
                        <button
                          onClick={() => updateInvoiceData('parts', invoiceData.parts.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="text-right text-sm text-gray-600 mt-2">
                    Subtotal: ${calculateSubtotal().toFixed(2)}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center">No parts added yet</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Add New Part</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Part name"
                  value={newPart.name}
                  onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                  className="flex-1 border rounded-lg px-4 py-2"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={newPart.price}
                  onChange={(e) => setNewPart({ ...newPart, price: e.target.value })}
                  className="w-32 border rounded-lg px-4 py-2"
                  min="0"
                  step="0.01"
                />
                <button
                  onClick={() => {
                    if (newPart.name && newPart.price) {
                      updateInvoiceData('parts', [...invoiceData.parts, { ...newPart, type: 'part' }]);
                      setNewPart({ name: '', price: '' });
                    }
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div ref={pdfRef} className="bg-white mx-auto shadow-lg rounded-lg overflow-hidden" 
                 style={{ 
                   width: '8.5in', // Exact width for letter size
                   height: '11in', // Exact height for letter size
                   padding: '0.5in', // Consistent padding
                   boxSizing: 'border-box',
                   border: '1px solid #e5e7eb'
                 }}>
              {/* Header Section */}
              <div className="flex justify-between items-start mb-6">
                <div className="w-1/3">
                  {logoUrl && (
                    <div className="mb-4">
                      <img 
                        src={logoUrl}
                        alt="Company Logo"
                        className="h-auto w-auto object-contain"
                        style={{ maxHeight: '64px' }}
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="text-sm">
                    <p className="font-bold text-gray-800">{companySettings?.businessInfo?.name}</p>
                    <p>{companySettings?.businessInfo?.address}</p>
                    <p>{companySettings?.businessInfo?.phone}</p>
                    <p>{companySettings?.businessInfo?.email}</p>
                  </div>
                </div>
                <div className="w-2/3 text-right">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{invoiceData.title}</h1>
                  <div className="text-sm space-y-1">
                    <p><span className="font-semibold">Invoice #:</span> {invoiceData.invoiceId}</p>
                    <p><span className="font-semibold">Date:</span> {invoiceData.invoiceDate}</p>
                    {invoiceData.dueDate && <p><span className="font-semibold">Due Date:</span> {invoiceData.dueDate}</p>}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-300 my-4" />

              {/* Bill To Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Bill To</h3>
                {(() => {
                  const customer = customers.find(c => c.id === invoiceData.customer);
                  return customer && (
                    <div className="text-sm">
                      <p className="font-bold text-gray-800">{customer.name}</p>
                      <p>{customer.company}</p>
                      <p>{customer.address}</p>
                      <p>{customer.email}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Parts Table */}
              <table className="w-full text-sm border-collapse mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left py-2 px-4 border-b border-gray-300">Description</th>
                    <th className="text-right py-2 px-4 border-b border-gray-300">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.parts.map((part, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 px-4 border-b border-gray-200">{part.name}</td>
                      <td className="py-2 px-4 text-right border-b border-gray-200">${parseFloat(part.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="py-2 px-4 font-semibold">Subtotal</td>
                    <td className="py-2 px-4 text-right">${calculateSubtotal().toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-semibold">Tax ({(invoiceData.taxRate * 100).toFixed(1)}%)</td>
                    <td className="py-2 px-4 text-right">${calculateTax().toFixed(2)}</td>
                  </tr>
                  <tr className="bg-gray-100">
                    <td className="py-2 px-4 font-bold text-lg">Total</td>
                    <td className="py-2 px-4 text-right font-bold text-lg">${calculateTotal().toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Notes Section */}
              {invoiceData.notes && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{invoiceData.notes}</p>
                </div>
              )}

              {/* Signature Section */}
              <div className="mt-8">
                <div className="border-t border-gray-400 w-48 mb-2"></div>
                <div className="flex justify-between text-sm">
                  <div>
                    <p>Customer Signature</p>
                    <p className="font-bold mt-1">
                      {(() => {
                        const customer = customers.find(c => c.id === invoiceData.customer);
                        return customer ? customer.name : '';
                      })()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>Date</p>
                    <p className="font-bold mt-1">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Add this to the header section of your return statement
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  // Add error display in the UI
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-xl mb-4">⚠️ {error}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Add header with reset and download buttons */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            ← Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Reset
            </button>
            <button
              onClick={handleDownloadPdf}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* Steps Progress */}
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <button
              key={index}
              onClick={() => index < activeStep && setActiveStep(index)}
              className={`flex items-center gap-2 p-2 rounded-lg transition ${
                index === activeStep ? 'bg-blue-500 text-white' : 
                index < activeStep ? 'bg-green-100 text-green-700' : 'bg-gray-100'
              }`}
            >
              <span>{step.icon}</span>
              <span>{step.title}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={prevStep}
            className={`px-4 py-2 rounded-lg ${
              activeStep === 0 ? 'invisible' : 'bg-gray-500 text-white'
            }`}
          >
            Previous
          </button>
          <button
            onClick={activeStep === steps.length - 1 ? handleSaveInvoice : nextStep}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            {activeStep === steps.length - 1 ? 'Save Invoice' : 'Next'}
          </button>
        </div>
      </div>

      {/* Labor Guide Modal */}
      {showLaborGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Labor Guide</h2>
              <button
                onClick={() => setShowLaborGuide(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <LaborGuideSearch
              onSelectOperation={(op) => {
                handleAddLabor(op);
                setShowLaborGuide(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
