import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomers } from '../context/CustomerContext';
import { useVehicles } from '../context/VehicleContext';
import { useInvoice } from '../context/InvoiceContext';
import { format } from 'date-fns';
import { 
  FiArrowLeft, FiUser, FiMail, FiPhone, FiBriefcase, FiMapPin, 
  FiTruck, FiFileText, FiDollarSign, FiClock, FiAlertTriangle,
  FiEdit2, FiTrash2, FiPlus, FiEye
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import ErrorMessage from '../components/ErrorMessage';

export default function CustomerProfileScreen() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { customers, loading: customersLoading, error: customersError, updateCustomer, deleteCustomer } = useCustomers();
  const { getVehiclesByCustomer, getServiceRecordsByVehicle } = useVehicles();
  const { invoices } = useInvoice();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    notes: '',
    status: 'active'
  });

  const customer = customers.find(c => c.id === customerId);
  const customerVehicles = getVehiclesByCustomer(customerId);
  const customerInvoices = invoices.filter(inv => 
    inv.customer?.id === customerId || inv.customerId === customerId
  );

  // Customer analytics
  const customerAnalytics = useMemo(() => {
    const allServiceRecords = customerVehicles.flatMap(vehicle => 
      getServiceRecordsByVehicle(vehicle.id)
    );
    
    const totalSpent = allServiceRecords.reduce((sum, record) => 
      sum + (parseFloat(record.cost) || 0) + (parseFloat(record.laborCost) || 0), 0
    );
    
    const totalInvoiceAmount = customerInvoices.reduce((sum, invoice) => 
      sum + (invoice.totalAmount || 0), 0
    );
    
    const unpaidInvoices = customerInvoices.filter(inv => !inv.paid);
    const overdueInvoices = customerInvoices.filter(inv => 
      !inv.paid && inv.dueDate && new Date(inv.dueDate) < new Date()
    );
    
    const lastService = allServiceRecords.sort((a, b) => 
      new Date(b.serviceDate) - new Date(a.serviceDate)
    )[0];
    
    return {
      totalVehicles: customerVehicles.length,
      totalServices: allServiceRecords.length,
      totalSpent,
      totalInvoices: customerInvoices.length,
      totalInvoiceAmount,
      unpaidInvoices: unpaidInvoices.length,
      overdueInvoices: overdueInvoices.length,
      lastService: lastService ? new Date(lastService.serviceDate) : null,
      averageServiceCost: allServiceRecords.length > 0 ? totalSpent / allServiceRecords.length : 0
    };
  }, [customerVehicles, customerInvoices, getServiceRecordsByVehicle]);

  useEffect(() => {
    if (customer) {
      setEditFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        company: customer.company || '',
        notes: customer.notes || '',
        status: customer.status || 'active'
      });
    }
  }, [customer]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateCustomer(customerId, editFormData);
      setShowEditModal(false);
      toast.success('Customer updated successfully');
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCustomer(customerId);
      setShowDeleteModal(false);
      toast.success('Customer deleted successfully');
      navigate('/customers');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (customersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading customer...</p>
        </div>
      </div>
    );
  }

  if (customersError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <ErrorMessage message={customersError} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Customer Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The customer you&apos;re looking for doesn&apos;t exist or may have been deleted.
          </p>
          <button
            onClick={() => navigate('/customers')}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <FiArrowLeft size={16} />
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/customers')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <FiArrowLeft size={20} />
              Back to Customers
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {customer.name}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <FiEdit2 size={16} />
              Edit
            </button>
            <button
              onClick={() => navigate('/invoices/create', { 
                state: { 
                  invoiceData: { 
                    customer: {
                      id: customer.id,
                      name: customer.name,
                      email: customer.email,
                      phone: customer.phone,
                      address: customer.address,
                      company: customer.company
                    }
                  }
                }
              })}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <FiPlus size={16} />
              New Invoice
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <FiTrash2 size={16} />
              Delete
            </button>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <FiUser className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {customer.name}
                </h2>
                <div className="flex items-center gap-6 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <FiMail size={14} />
                      {customer.email}
                    </span>
                  )}
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <FiPhone size={14} />
                      {customer.phone}
                    </span>
                  )}
                  {customer.company && (
                    <span className="flex items-center gap-1">
                      <FiBriefcase size={14} />
                      {customer.company}
                    </span>
                  )}
                  {customer.address && (
                    <span className="flex items-center gap-1">
                      <FiMapPin size={14} />
                      {customer.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(customerAnalytics.totalSpent)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Total Spent
                </div>
              </div>
              {customerAnalytics.overdueInvoices > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full">
                  <FiAlertTriangle size={14} />
                  {customerAnalytics.overdueInvoices} overdue
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vehicles</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {customerAnalytics.totalVehicles}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FiTruck className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Invoices</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {customerAnalytics.totalInvoices}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <FiFileText className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Services</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {customerAnalytics.totalServices}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <FiClock className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(customerAnalytics.totalInvoiceAmount)}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <FiDollarSign className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {['overview', 'vehicles', 'invoices', 'services'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {customerInvoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Invoice #{invoice.invoiceNumber || invoice.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(invoice.totalAmount || 0)}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          invoice.paid
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {invoice.paid ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Notes
                </h3>
                {customer.notes ? (
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {customer.notes}
                  </p>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    No notes available
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Vehicles ({customerVehicles.length})
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {customerVehicles.map((vehicle) => {
                    const serviceRecords = getServiceRecordsByVehicle(vehicle.id);
                    const lastService = serviceRecords.length > 0 ? serviceRecords[0] : null;
                    
                    return (
                      <div key={vehicle.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </h4>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {serviceRecords.length} services
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                          <p><strong>VIN:</strong> {vehicle.vin}</p>
                          <p><strong>License:</strong> {vehicle.licensePlate}</p>
                          <p><strong>Mileage:</strong> {vehicle.mileage?.toLocaleString() || 'N/A'}</p>
                          {lastService && (
                            <p><strong>Last Service:</strong> {format(new Date(lastService.serviceDate), 'MMM d, yyyy')}</p>
                          )}
                        </div>
                        
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => navigate('/vehicle-service-records', { 
                              state: { selectedCustomer: customer, selectedVehicle: vehicle } 
                            })}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm"
                          >
                            <FiEye size={12} />
                            View Records
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Invoices ({customerInvoices.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Invoice #
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Date
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Amount
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Status
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-3 px-6 text-sm text-gray-900 dark:text-white">
                          #{invoice.invoiceNumber || invoice.id.slice(0, 8)}
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-900 dark:text-white">
                          {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-900 dark:text-white">
                          {formatCurrency(invoice.totalAmount || 0)}
                        </td>
                        <td className="py-3 px-6">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            invoice.paid
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {invoice.paid ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-6">
                          <button
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Service History ({customerAnalytics.totalServices})
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {customerVehicles.map((vehicle) => {
                    const serviceRecords = getServiceRecordsByVehicle(vehicle.id);
                    if (serviceRecords.length === 0) return null;
                    
                    return (
                      <div key={vehicle.id} className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h4>
                        <div className="space-y-2">
                          {serviceRecords.slice(0, 3).map((record) => (
                            <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {record.serviceType}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {format(new Date(record.serviceDate), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {formatCurrency((parseFloat(record.cost) || 0) + (parseFloat(record.laborCost) || 0))}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {record.mileage?.toLocaleString() || 'N/A'} miles
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Edit Customer
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={editFormData.company}
                  onChange={(e) => setEditFormData({...editFormData, company: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <textarea
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows="3"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Customer
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this customer? This action cannot be undone and will also delete all associated vehicles and service records.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
