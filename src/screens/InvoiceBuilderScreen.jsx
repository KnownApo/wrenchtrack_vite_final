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
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const pdfRef = useRef();
  const [newPart, setNewPart] = useState({ name: '', price: '' }); // Add this line
  const [showLaborGuide, setShowLaborGuide] = useState(false);

  // Combined state for invoice data
  const [invoiceData, setInvoiceData] = useState({
    title: '',
    poNumber: '',
    customer: '',
    parts: [],
    taxRate: 0.1,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
    invoiceId: `INV-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`
  });

  // Cache state
  const [customers, setCustomers] = useState([]);
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [companySettings, setCompanySettings] = useState({});

  // Steps configuration
  const steps = [
    { title: 'Basic Info', icon: '📝' },
    { title: 'Customer', icon: '👤' },
    { title: 'Parts', icon: '🔧' },
    { title: 'Review & Sign', icon: '✍️' }
  ];

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        // Load settings
        const settingsSnap = await getDoc(doc(db, 'settings', user.uid));
        if (settingsSnap.exists()) {
          const settings = settingsSnap.data();
          setCompanySettings(settings);
          setInvoiceData(prev => ({
            ...prev,
            title: settings.preferences?.defaultInvoiceTitle || '',
            taxRate: settings.taxRate || 0.1
          }));
        }

        // Load customers
        const customersSnap = await getDocs(collection(db, 'users', user.uid, 'customers'));
        setCustomers(customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Load saved invoices
        const invoicesSnap = await getDocs(collection(db, 'users', user.uid, 'invoices'));
        setSavedInvoices(invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (err) {
        setError('Failed to load initial data');
        toast.error('Failed to load data');
      }
      setIsLoading(false);
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
        if (!invoiceData.title || !invoiceData.poNumber) {
          toast.error('Please fill in all required fields');
          return false;
        }
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

    const element = pdfRef.current;
    const opt = {
      margin: 1,
      filename: `invoice-${invoiceData.poNumber}-${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save()
      .then(() => toast.success('PDF downloaded successfully'))
      .catch(err => {
        console.error('PDF generation failed:', err);
        toast.error('Failed to generate PDF');
      });
  };

  // Load draft invoice if exists
  useEffect(() => {
    const draftInvoice = sessionStorage.getItem('draftInvoice');
    if (draftInvoice) {
      try {
        const parsed = JSON.parse(draftInvoice);
        setInvoiceData(prev => ({ ...prev, ...parsed }));
        sessionStorage.removeItem('draftInvoice'); // Clear after loading
      } catch (err) {
        console.error('Error loading draft invoice:', err);
      }
    }
  }, []);

  // Add cleanup function
  useEffect(() => {
    return () => {
      // Cleanup on component unmount
      sessionStorage.removeItem('draftInvoice');
    };
  }, []);

  // Add autosave feature
  useEffect(() => {
    // Don't save if it's the initial load
    if (!isLoading && invoiceData) {
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
      const randomDigits = Math.floor(100 + Math.random() * 900);
      const invoiceToSave = {
        ...invoiceData,
        customer: customerData,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed',
        id: `INV-${invoiceData.poNumber}-${randomDigits}`
      };

      await addDoc(collection(db, 'users', user.uid, 'invoices'), invoiceToSave);
      toast.success('Invoice saved successfully');
      
      sessionStorage.removeItem('currentInvoice');
      sessionStorage.removeItem('draftInvoice');
      
      navigate('/invoicehistory');
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
        notes: ''
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
      price: operation.standardHours * (companySettings.preferences?.laborRate || 100), // Default to $100/hr if no rate set
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
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Number *</label>
                <input
                  type="text"
                  value={invoiceData.poNumber}
                  onChange={(e) => updateInvoiceData('poNumber', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter PO number"
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
                      updateInvoiceData('parts', [...invoiceData.parts, { ...newPart }]);
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
          <div className="space-y-6">
            <div ref={pdfRef} className="border rounded-lg p-8 space-y-6 bg-white shadow-sm">
              {/* Professional Header */}
              <div className="border-b pb-6">
                <div className="grid grid-cols-2 gap-8">
                  {/* Company Info - Left */}
                  <div className="space-y-2">
                    <div className="h-16 w-32 bg-gray-100 rounded flex items-center justify-center mb-4">
                      {companySettings?.businessInfo?.logo || 'LOGO'}
                    </div>
                    <h3 className="font-bold text-gray-800">{companySettings?.businessInfo?.name}</h3>
                    <p className="text-sm text-gray-600">{companySettings?.businessInfo?.address}</p>
                    <p className="text-sm text-gray-600">{companySettings?.businessInfo?.phone}</p>
                    <p className="text-sm text-gray-600">{companySettings?.businessInfo?.email}</p>
                  </div>
                  
                  {/* Invoice Details - Right */}
                  <div className="text-right space-y-2">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">{invoiceData.title}</h1>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-600">PO:</span> <span className="font-semibold">{invoiceData.poNumber}</span></p>
                      <p><span className="text-gray-600">Invoice ID:</span> <span className="font-semibold">{invoiceData.invoiceId}</span></p>
                      <p><span className="text-gray-600">Date:</span> <span className="font-semibold">{invoiceData.invoiceDate}</span></p>
                      {invoiceData.dueDate && (
                        <p><span className="text-gray-600">Due Date:</span> <span className="font-semibold text-blue-600">{invoiceData.dueDate}</span></p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To Section */}
              <div className="border-b pb-6">
                <h3 className="text-gray-600 text-sm mb-2">BILL TO</h3>
                {(() => {
                  const customer = customers.find(c => c.id === invoiceData.customer);
                  return customer && (
                    <div className="space-y-1">
                      <p className="font-bold text-gray-800">{customer.name}</p>
                      <p className="text-gray-600">{customer.company}</p>
                      <p className="text-gray-600">{customer.address}</p>
                      <p className="text-gray-600">{customer.email}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Parts Table */}
              <div className="py-6">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Description</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoiceData.parts.map((part, index) => (
                      <tr key={index} className="text-gray-800">
                        <td className="px-4 py-4">{part.name}</td>
                        <td className="px-4 py-4 text-right">${parseFloat(part.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2">
                    <tr className="text-gray-600">
                      <td className="px-4 py-3">Subtotal</td>
                      <td className="px-4 py-3 text-right">${calculateSubtotal().toFixed(2)}</td>
                    </tr>
                    <tr className="text-gray-600">
                      <td className="px-4 py-3">Tax ({(invoiceData.taxRate * 100).toFixed(1)}%)</td>
                      <td className="px-4 py-3 text-right">${calculateTax().toFixed(2)}</td>
                    </tr>
                    <tr className="font-bold text-lg">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">${calculateTotal().toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes Section */}
              {invoiceData.notes && (
                <div className="border-t pt-6">
                  <h3 className="text-gray-600 text-sm mb-2">NOTES</h3>
                  <p className="text-gray-800 whitespace-pre-line">{invoiceData.notes}</p>
                </div>
              )}

              {/* Signature Section */}
              <div className="border-t pt-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="border-b border-black mt-8 mb-2"></div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p>Customer Signature</p>
                        <p className="font-semibold mt-2">
                          {(() => {
                            const customer = customers.find(c => c.id === invoiceData.customer);
                            return customer ? customer.name : '';
                          })()}
                        </p>
                      </div>
                      <div>
                        <p>Date</p>
                        <p className="font-semibold mt-2">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block border-2 border-blue-600 rounded-lg px-6 py-3">
                      <span className="block text-blue-600 font-bold">Total Amount Due</span>
                      <span className="text-2xl font-bold">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t pt-6 mt-8">
                <p className="text-center text-sm text-gray-500">
                  Thank you for your business! Please contact us for any questions regarding this invoice.
                </p>
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
