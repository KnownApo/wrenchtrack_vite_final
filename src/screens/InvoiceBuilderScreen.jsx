import React, { useEffect, useState, useRef } from 'react';
import '../styles/modern.css';
import { collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { toast } from 'react-toastify';

export default function InvoiceBuilderScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const pdfRef = useRef();
  const [newPart, setNewPart] = useState({ name: '', price: '' }); // Add this line

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
    signatureURL: ''
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

  // Load signature from storage
  useEffect(() => {
    const savedSignature = sessionStorage.getItem('signatureURL');
    if (savedSignature) {
      updateInvoiceData('signatureURL', savedSignature);
    }
  }, []);

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

  // Update handleSaveInvoice
  const handleSaveInvoice = async () => {
    if (!validateCurrentStep()) return;
    if (!invoiceData.signatureURL) {
      toast.error('Please add a signature before saving');
      return;
    }

    setIsLoading(true);
    try {
      const customerData = customers.find(c => c.id === invoiceData.customer);
      const invoiceToSave = {
        ...invoiceData,
        customer: customerData,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed',
        id: `INV-${invoiceData.poNumber}-${Date.now()}`
      };

      await addDoc(collection(db, 'users', user.uid, 'invoices'), invoiceToSave);
      toast.success('Invoice saved successfully');
      
      // Clear storage
      sessionStorage.removeItem('signatureURL');
      sessionStorage.removeItem('draftInvoice');
      
      navigate('/invoicehistory');
    } catch (err) {
      console.error('Error saving invoice:', err);
      toast.error('Failed to save invoice');
    }
    setIsLoading(false);
  };

  // Add reset function
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
        signatureURL: ''
      });
      setActiveStep(0);
      sessionStorage.removeItem('signatureURL');
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
              <h3 className="font-medium mb-2">Added Parts</h3>
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
            <div ref={pdfRef} className="border rounded-lg p-6 space-y-6">
              <div className="flex justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{invoiceData.title}</h2>
                  <p className="text-gray-600">PO: {invoiceData.poNumber}</p>
                  <p className="text-gray-600">Date: {invoiceData.invoiceDate}</p>
                  {invoiceData.dueDate && (
                    <p className="text-gray-600">Due: {invoiceData.dueDate}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold">{companySettings?.businessInfo?.name}</p>
                  <p>{companySettings?.businessInfo?.address}</p>
                  <p>{companySettings?.businessInfo?.phone}</p>
                  <p>{companySettings?.businessInfo?.email}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.parts.map((part, index) => (
                      <tr key={index}>
                        <td className="py-2">{part.name}</td>
                        <td className="py-2 text-right">${parseFloat(part.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t">
                    <tr>
                      <td className="py-2">Subtotal</td>
                      <td className="py-2 text-right">${calculateSubtotal().toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2">Tax ({(invoiceData.taxRate * 100).toFixed(1)}%)</td>
                      <td className="py-2 text-right">${calculateTax().toFixed(2)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right">${calculateTotal().toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {invoiceData.signatureURL ? (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Signature</h3>
                  <img
                    src={invoiceData.signatureURL}
                    alt="Signature"
                    className="max-h-32 mx-auto"
                  />
                </div>
              ) : (
                <div className="text-center py-4">
                  <button
                    onClick={handleNavigateToSignature}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    Add Signature
                  </button>
                </div>
              )}

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={invoiceData.notes}
                  onChange={(e) => updateInvoiceData('notes', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2"
                  rows={3}
                  placeholder="Enter any additional notes..."
                />
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
    </div>
  );
}
