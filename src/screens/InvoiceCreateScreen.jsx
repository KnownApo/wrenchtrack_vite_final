import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useInvoice } from '../context/InvoiceContext';
import { useCustomers } from '../context/CustomerContext';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import { 
  FaPlus, FaTrash, FaSave, FaArrowRight, FaArrowLeft, FaCheck, 
  FaUser, FaFileAlt, FaCalculator, FaEye
} from 'react-icons/fa';
import LoadingSpinner from '../components/LoadingSpinner';

export default function InvoiceCreateScreen() {
  const { user } = useAuth();
  const { addInvoice, updateInvoice } = useInvoice();
  const { customers } = useCustomers();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: invoiceId } = useParams();
  const isEditing = !!invoiceId;

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [parts, setParts] = useState([]);
  const [newPart, setNewPart] = useState({ name: '', cost: '', quantity: 1, description: '' });
  const [validationErrors, setValidationErrors] = useState({});
  
  const [invoiceData, setInvoiceData] = useState({
    title: 'Service Invoice',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    taxRate: 0.1,
    poNumber: '',
    invoiceNumber: `INV-${Date.now()}`,
    paymentTerms: 'Net 30',
    status: 'draft'
  });

  // Step configuration
  const steps = [
    { id: 1, title: 'Customer', icon: FaUser, description: 'Select customer' },
    { id: 2, title: 'Items', icon: FaFileAlt, description: 'Add parts & services' },
    { id: 3, title: 'Details', icon: FaCalculator, description: 'Invoice details' },
    { id: 4, title: 'Review', icon: FaEye, description: 'Review & save' }
  ];

  // Validation functions
  const validateStep = (step) => {
    const errors = {};
    
    switch (step) {
      case 1:
        if (!selectedCustomer) {
          errors.customer = 'Please select a customer';
        }
        break;
      case 2:
        if (parts.length === 0) {
          errors.parts = 'Please add at least one item';
        }
        break;
      case 3:
        if (!invoiceData.title.trim()) {
          errors.title = 'Invoice title is required';
        }
        if (!invoiceData.date) {
          errors.date = 'Invoice date is required';
        }
        if (!invoiceData.dueDate) {
          errors.dueDate = 'Due date is required';
        }
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Generate invoice number
  const generateInvoiceNumber = useCallback(() => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-${timestamp}-${randomSuffix}`;
  }, []);

  // Load existing invoice data for editing
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Handle pre-filled data from location state
        if (location.state?.invoiceData) {
          const prefilledData = location.state.invoiceData;
          
          if (prefilledData.customer) {
            setSelectedCustomer(prefilledData.customer);
            setInvoiceData(prev => ({
              ...prev,
              notes: prefilledData.notes || (prefilledData.vehicle ? 
                `Service for ${prefilledData.vehicle.year} ${prefilledData.vehicle.make} ${prefilledData.vehicle.model}` : 
                prev.notes
              )
            }));
          }
          
          if (prefilledData.parts && prefilledData.parts.length > 0) {
            setParts(prefilledData.parts);
          }
        }

        // If editing, load existing invoice
        if (isEditing && invoiceId) {
          const invoiceDoc = await getDoc(doc(db, 'users', user.uid, 'invoices', invoiceId));
          if (invoiceDoc.exists()) {
            const data = invoiceDoc.data();
            setInvoiceData({
              title: data.title || 'Service Invoice',
              date: data.date || new Date().toISOString().split('T')[0],
              dueDate: data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              notes: data.notes || '',
              taxRate: data.taxRate || 0.1,
              poNumber: data.poNumber || '',
              invoiceNumber: data.invoiceNumber || generateInvoiceNumber(),
              paymentTerms: data.paymentTerms || 'Net 30',
              status: data.status || 'draft'
            });
            
            setParts(data.parts || data.items || []);
            
            if (data.customer) {
              const customer = customers.find(c => c.id === data.customer.id) || data.customer;
              setSelectedCustomer(customer);
            }
          } else {
            toast.error('Invoice not found');
            navigate('/invoices');
          }
        } else {
          // New invoice
          setInvoiceData(prev => ({
            ...prev,
            invoiceNumber: generateInvoiceNumber()
          }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, isEditing, invoiceId, navigate, generateInvoiceNumber, location.state, customers]);

  // Part management
  const handleAddPart = () => {
    if (!newPart.name || !newPart.cost) {
      toast.error('Please provide both part name and cost');
      return;
    }
    
    const part = {
      ...newPart,
      cost: parseFloat(newPart.cost),
      total: parseFloat(newPart.cost) * newPart.quantity
    };
    
    setParts([...parts, part]);
    setNewPart({ name: '', cost: '', quantity: 1, description: '' });
  };

  const handleRemovePart = (index) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const handlePartChange = (index, field, value) => {
    const updatedParts = [...parts];
    updatedParts[index] = {
      ...updatedParts[index],
      [field]: value,
      total: field === 'cost' || field === 'quantity' ? 
        parseFloat(value || 0) * (field === 'cost' ? updatedParts[index].quantity : parseFloat(updatedParts[index].cost || 0)) :
        updatedParts[index].total
    };
    setParts(updatedParts);
  };

  // Calculations
  const calculateSubtotal = () => {
    return parts.reduce((sum, part) => 
      sum + (parseFloat(part.cost) || 0) * (parseFloat(part.quantity) || 1), 0
    );
  };

  const calculateTax = () => {
    return calculateSubtotal() * (parseFloat(invoiceData.taxRate) || 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  // Navigation
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Save invoice
  const handleSaveInvoice = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsLoading(true);
    try {
      const invoice = {
        ...invoiceData,
        customer: selectedCustomer,
        parts,
        totalAmount: calculateTotal(),
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        status: invoiceData.status || 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isEditing) {
        await updateInvoice(invoiceId, invoice);
        toast.success('Invoice updated successfully');
      } else {
        const newInvoiceId = await addInvoice(invoice);
        toast.success('Invoice created successfully');
        navigate(`/invoices/${newInvoiceId}`);
        return;
      }
      
      navigate('/invoices');
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <FaArrowLeft />
            Back to Invoices
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Invoice' : 'Create Invoice'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isEditing ? 'Update your invoice details' : 'Create a new invoice for your customer'}
          </p>
        </div>

        {/* Step Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.id ? (
                    <FaCheck size={16} />
                  ) : (
                    <step.icon size={16} />
                  )}
                </div>
                <div className="ml-3">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-400">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-full h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 mb-8">
          {/* Step 1: Customer Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Customer</h2>
              
              {validationErrors.customer && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <p className="text-red-600 dark:text-red-400 text-sm">{validationErrors.customer}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedCustomer?.id === customer.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{customer.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</p>
                        {customer.company && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{customer.company}</p>
                        )}
                      </div>
                      {selectedCustomer?.id === customer.id && (
                        <FaCheck className="text-blue-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {customers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No customers found.</p>
                  <button
                    onClick={() => navigate('/customers')}
                    className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Create a customer first
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Items */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Items</h2>
              
              {validationErrors.parts && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <p className="text-red-600 dark:text-red-400 text-sm">{validationErrors.parts}</p>
                </div>
              )}

              {/* Add New Part */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">Add New Item</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Item Name
                    </label>
                    <input
                      type="text"
                      value={newPart.name}
                      onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      placeholder="Enter item name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cost
                    </label>
                    <input
                      type="number"
                      value={newPart.cost}
                      onChange={(e) => setNewPart({...newPart, cost: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={newPart.quantity}
                      onChange={(e) => setNewPart({...newPart, quantity: parseInt(e.target.value) || 1})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      placeholder="1"
                      min="1"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddPart}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      <FaPlus className="inline mr-2" />
                      Add Item
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newPart.description}
                    onChange={(e) => setNewPart({...newPart, description: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    rows="2"
                    placeholder="Enter item description"
                  />
                </div>
              </div>

              {/* Parts List */}
              {parts.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Invoice Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200 dark:border-gray-700">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">
                            Item
                          </th>
                          <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">
                            Cost
                          </th>
                          <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">
                            Qty
                          </th>
                          <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">
                            Total
                          </th>
                          <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {parts.map((part, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">
                              <div>
                                <input
                                  type="text"
                                  value={part.name}
                                  onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                                  className="w-full border-0 bg-transparent focus:ring-0 text-gray-900 dark:text-white"
                                />
                                {part.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {part.description}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">
                              <input
                                type="number"
                                value={part.cost}
                                onChange={(e) => handlePartChange(index, 'cost', e.target.value)}
                                className="w-20 border-0 bg-transparent focus:ring-0 text-gray-900 dark:text-white"
                                step="0.01"
                              />
                            </td>
                            <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">
                              <input
                                type="number"
                                value={part.quantity}
                                onChange={(e) => handlePartChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-16 border-0 bg-transparent focus:ring-0 text-gray-900 dark:text-white"
                                min="1"
                              />
                            </td>
                            <td className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                              {formatCurrency(parseFloat(part.cost || 0) * parseInt(part.quantity || 1))}
                            </td>
                            <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">
                              <button
                                onClick={() => handleRemovePart(index)}
                                className="text-red-500 hover:text-red-700 transition-colors"
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
              )}
            </div>
          )}

          {/* Step 3: Invoice Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invoice Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invoice Title
                  </label>
                  <input
                    type="text"
                    value={invoiceData.title}
                    onChange={(e) => setInvoiceData({...invoiceData, title: e.target.value})}
                    className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                      validationErrors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {validationErrors.title && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{validationErrors.title}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={invoiceData.invoiceNumber}
                    onChange={(e) => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceData.date}
                    onChange={(e) => setInvoiceData({...invoiceData, date: e.target.value})}
                    className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                      validationErrors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {validationErrors.date && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{validationErrors.date}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={(e) => setInvoiceData({...invoiceData, dueDate: e.target.value})}
                    className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                      validationErrors.dueDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {validationErrors.dueDate && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{validationErrors.dueDate}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    PO Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={invoiceData.poNumber}
                    onChange={(e) => setInvoiceData({...invoiceData, poNumber: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Purchase Order Number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Terms
                  </label>
                  <select
                    value={invoiceData.paymentTerms}
                    onChange={(e) => setInvoiceData({...invoiceData, paymentTerms: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={invoiceData.taxRate * 100}
                  onChange={(e) => setInvoiceData({...invoiceData, taxRate: parseFloat(e.target.value) / 100 || 0})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder="10"
                  step="0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  rows="4"
                  placeholder="Additional notes or terms"
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Review Invoice</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Customer Information</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCustomer?.name}</p>
                    <p className="text-gray-600 dark:text-gray-400">{selectedCustomer?.email}</p>
                    {selectedCustomer?.phone && (
                      <p className="text-gray-600 dark:text-gray-400">{selectedCustomer.phone}</p>
                    )}
                    {selectedCustomer?.company && (
                      <p className="text-gray-600 dark:text-gray-400">{selectedCustomer.company}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Invoice Summary</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Tax ({(invoiceData.taxRate * 100).toFixed(1)}%):
                      </span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(calculateTax())}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-medium text-gray-900 dark:text-white">Total:</span>
                        <span className="text-lg font-medium text-gray-900 dark:text-white">
                          {formatCurrency(calculateTotal())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200 dark:border-gray-700">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">
                          Item
                        </th>
                        <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">
                          Cost
                        </th>
                        <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">
                          Qty
                        </th>
                        <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map((part, index) => (
                        <tr key={index}>
                          <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">
                            <div>
                              <p className="text-gray-900 dark:text-white">{part.name}</p>
                              {part.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {part.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                            {formatCurrency(part.cost)}
                          </td>
                          <td className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                            {part.quantity}
                          </td>
                          <td className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">
                            {formatCurrency(parseFloat(part.cost || 0) * parseInt(part.quantity || 1))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaArrowLeft />
            Previous
          </button>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/invoices')}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
              >
                Next
                <FaArrowRight />
              </button>
            ) : (
              <button
                onClick={handleSaveInvoice}
                disabled={isLoading}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave />
                    {isEditing ? 'Update Invoice' : 'Create Invoice'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
