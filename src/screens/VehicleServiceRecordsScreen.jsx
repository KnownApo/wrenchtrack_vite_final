import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../context/CustomerContext';
import { useVehicles } from '../context/VehicleContext';
import { useInvoice } from '../context/InvoiceContext';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiUser, FiTruck, FiDollarSign, FiClock, FiTool, FiFileText, FiDownload, FiPhone, FiMail, FiShoppingCart, FiAlertTriangle } from 'react-icons/fi';
import { formatCurrency } from '../utils/helpers/helpers';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import QuickServiceActions from '../components/QuickServiceActions';
import MaintenanceScheduler from '../components/MaintenanceScheduler';

export default function VehicleServiceRecordsScreen() {
  const navigate = useNavigate();
  const { customers, loading: customersLoading, error: customersError } = useCustomers();
  const { invoices } = useInvoice();
  const { 
    vehicles, 
    serviceRecords, 
    loading: vehiclesLoading, 
    error: vehiclesError,
    addVehicle, 
    updateVehicle, 
    deleteVehicle, 
    addServiceRecord, 
    updateServiceRecord, 
    deleteServiceRecord, 
    getVehiclesByCustomer, 
    getServiceRecordsByVehicle,
    getVehicleStats
  } = useVehicles();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  const [vehicleFormData, setVehicleFormData] = useState({
    year: '',
    make: '',
    model: '',
    vin: '',
    licensePlate: '',
    color: '',
    mileage: '',
    customerId: '',
    status: 'active'
  });

  const [serviceFormData, setServiceFormData] = useState({
    serviceDate: new Date().toISOString().split('T')[0],
    serviceType: '',
    mileage: '',
    description: '',
    technician: '',
    partsUsed: '',
    cost: '',
    laborCost: '',
    recommendations: '',
    nextServiceDate: '',
    nextServiceMileage: '',
    vehicleId: ''
  });

  const loading = customersLoading || vehiclesLoading;
  const error = customersError || vehiclesError;

  // Get customer-specific analytics (moved to useMemo above)
  const getCustomerAnalytics = (customerId) => {
    const customerVehicles = getVehiclesByCustomer(customerId);
    const customerServices = serviceRecords.filter(record => 
      customerVehicles.some(vehicle => vehicle.id === record.vehicleId)
    );
    const customerInvoices = invoices.filter(invoice => 
      invoice.customer?.id === customerId || invoice.customerId === customerId
    );
    
    const totalSpent = customerServices.reduce((sum, record) => 
      sum + (parseFloat(record.cost) || 0) + (parseFloat(record.laborCost) || 0), 0
    );
    
    const lastService = customerServices.sort((a, b) => 
      new Date(b.serviceDate) - new Date(a.serviceDate)
    )[0];
    
    return {
      totalVehicles: customerVehicles.length,
      totalServices: customerServices.length,
      totalSpent,
      lastService: lastService ? new Date(lastService.serviceDate) : null,
      averageServiceCost: customerServices.length > 0 ? totalSpent / customerServices.length : 0,
      totalInvoices: customerInvoices.length,
      unpaidInvoices: customerInvoices.filter(inv => !inv.paid).length
    };
  };

  // Get vehicle-specific analytics
  const getVehicleAnalytics = (vehicleId) => {
    const vehicleServices = getServiceRecordsByVehicle(vehicleId);
    const totalCost = vehicleServices.reduce((sum, record) => 
      sum + (parseFloat(record.cost) || 0) + (parseFloat(record.laborCost) || 0), 0
    );
    
    const lastService = vehicleServices[0];
    const nextService = lastService?.nextServiceDate ? new Date(lastService.nextServiceDate) : null;
    const isOverdue = nextService && nextService < new Date();
    
    return {
      totalServices: vehicleServices.length,
      totalCost,
      averageCost: vehicleServices.length > 0 ? totalCost / vehicleServices.length : 0,
      lastService: lastService ? new Date(lastService.serviceDate) : null,
      nextService,
      isOverdue,
      lastMileage: lastService?.mileage || 0
    };
  };

  // Quick invoice creation with pre-filled data
  const createQuickInvoice = (customer, vehicle = null) => {
    const vehicleServices = vehicle ? getServiceRecordsByVehicle(vehicle.id) : [];
    const lastService = vehicleServices.length > 0 ? vehicleServices[0] : null;
    
    const invoiceData = {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        company: customer.company
      },
      vehicle: vehicle ? {
        id: vehicle.id,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        vin: vehicle.vin,
        licensePlate: vehicle.licensePlate,
        mileage: vehicle.mileage
      } : null,
      parts: lastService ? [
        {
          name: lastService.serviceType || 'Previous Service',
          cost: parseFloat(lastService.cost) || 0,
          quantity: 1
        }
      ] : [],
      labor: lastService ? [
        {
          description: lastService.description || 'Service work',
          cost: parseFloat(lastService.laborCost) || 0,
          hours: 1
        }
      ] : [],
      notes: vehicle ? 
        `Service for ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.licensePlate ? ` (${vehicle.licensePlate})` : ''}${lastService ? `\n\nLast service: ${lastService.serviceType} on ${format(new Date(lastService.serviceDate), 'MMM d, yyyy')}` : ''}` : 
        `Service for ${customer.name}`
    };
    
    // Navigate to invoice creation with pre-filled data
    navigate('/invoices/create', { state: { invoiceData } });
  };

  // Filter customers with enhanced search
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    // Get customer-specific analytics
    const getCustomerAnalytics = (customerId) => {
      const customerVehicles = getVehiclesByCustomer(customerId);
      const customerServices = serviceRecords.filter(record => 
        customerVehicles.some(vehicle => vehicle.id === record.vehicleId)
      );
      const customerInvoices = invoices.filter(invoice => 
        invoice.customer?.id === customerId || invoice.customerId === customerId
      );
      
      const totalSpent = customerServices.reduce((sum, record) => 
        sum + (parseFloat(record.cost) || 0) + (parseFloat(record.laborCost) || 0), 0
      );
      
      const lastService = customerServices.sort((a, b) => 
        new Date(b.serviceDate) - new Date(a.serviceDate)
      )[0];
      
      return {
        totalVehicles: customerVehicles.length,
        totalServices: customerServices.length,
        totalSpent,
        lastService: lastService ? new Date(lastService.serviceDate) : null,
        averageServiceCost: customerServices.length > 0 ? totalSpent / customerServices.length : 0,
        totalInvoices: customerInvoices.length,
        unpaidInvoices: customerInvoices.filter(inv => !inv.paid).length
      };
    };
    
    const filtered = customers.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm);
      
      return matchesSearch;
    });
    
    // Sort by recent activity
    return filtered.sort((a, b) => {
      const aAnalytics = getCustomerAnalytics(a.id);
      const bAnalytics = getCustomerAnalytics(b.id);
      
      if (!aAnalytics.lastService && !bAnalytics.lastService) return 0;
      if (!aAnalytics.lastService) return 1;
      if (!bAnalytics.lastService) return -1;
      
      return bAnalytics.lastService - aAnalytics.lastService;
    });
  }, [customers, searchTerm, serviceRecords, invoices, getVehiclesByCustomer]);

  // Get analytics data
  const analyticsData = useMemo(() => {
    const stats = getVehicleStats();
    const recentServices = serviceRecords.filter(record => {
      const serviceDate = new Date(record.serviceDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return serviceDate >= weekAgo;
    });

    const overdueServices = vehicles.filter(vehicle => {
      const records = getServiceRecordsByVehicle(vehicle.id);
      if (records.length === 0) return true;
      
      const lastService = records[0];
      const lastServiceDate = new Date(lastService.serviceDate);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      return lastServiceDate < sixMonthsAgo;
    });

    return {
      ...stats,
      recentServices: recentServices.length,
      overdueServices: overdueServices.length,
      avgServiceCost: stats.totalServiceRecords > 0 ? stats.totalServiceCost / stats.totalServiceRecords : 0
    };
  }, [vehicles, serviceRecords, getVehicleStats, getServiceRecordsByVehicle]);

  // Filter service records for selected vehicle
  const filteredServiceRecords = useMemo(() => {
    if (!selectedVehicle) return [];
    
    let records = getServiceRecordsByVehicle(selectedVehicle.id);
    
    // Apply service type filter
    if (serviceTypeFilter !== 'all') {
      records = records.filter(record => 
        record.serviceType.toLowerCase().includes(serviceTypeFilter.toLowerCase())
      );
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      records = records.filter(record => 
        new Date(record.serviceDate) >= filterDate
      );
    }
    
    return records;
  }, [selectedVehicle, serviceTypeFilter, dateFilter, getServiceRecordsByVehicle]);

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, vehicleFormData);
      } else {
        await addVehicle(vehicleFormData);
      }
      resetVehicleForm();
    } catch (error) {
      console.error('Error saving vehicle:', error);
    }
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingService) {
        await updateServiceRecord(editingService.id, serviceFormData);
      } else {
        await addServiceRecord(serviceFormData);
      }
      resetServiceForm();
    } catch (error) {
      console.error('Error saving service record:', error);
    }
  };

  const handleEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleFormData({
      year: vehicle.year || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      vin: vehicle.vin || '',
      licensePlate: vehicle.licensePlate || '',
      color: vehicle.color || '',
      mileage: vehicle.mileage || '',
      customerId: vehicle.customerId || '',
      status: vehicle.status || 'active'
    });
    setShowVehicleForm(true);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceFormData({
      serviceDate: service.serviceDate ? format(new Date(service.serviceDate), 'yyyy-MM-dd') : '',
      serviceType: service.serviceType || '',
      mileage: service.mileage || '',
      description: service.description || '',
      technician: service.technician || '',
      partsUsed: service.partsUsed || '',
      cost: service.cost || '',
      laborCost: service.laborCost || '',
      recommendations: service.recommendations || '',
      nextServiceDate: service.nextServiceDate ? format(new Date(service.nextServiceDate), 'yyyy-MM-dd') : '',
      nextServiceMileage: service.nextServiceMileage || '',
      vehicleId: service.vehicleId || ''
    });
    setShowServiceForm(true);
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (window.confirm('Are you sure you want to delete this vehicle? This will also delete all associated service records.')) {
      try {
        await deleteVehicle(vehicleId);
        if (selectedVehicle?.id === vehicleId) {
          setSelectedVehicle(null);
        }
      } catch (error) {
        console.error('Error deleting vehicle:', error);
      }
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (window.confirm('Are you sure you want to delete this service record?')) {
      try {
        await deleteServiceRecord(serviceId);
      } catch (error) {
        console.error('Error deleting service record:', error);
      }
    }
  };

  const resetVehicleForm = () => {
    setVehicleFormData({
      year: '',
      make: '',
      model: '',
      vin: '',
      licensePlate: '',
      color: '',
      mileage: '',
      customerId: '',
      status: 'active'
    });
    setEditingVehicle(null);
    setShowVehicleForm(false);
  };

  const resetServiceForm = () => {
    setServiceFormData({
      serviceDate: new Date().toISOString().split('T')[0],
      serviceType: '',
      mileage: '',
      description: '',
      technician: '',
      partsUsed: '',
      cost: '',
      laborCost: '',
      recommendations: '',
      nextServiceDate: '',
      nextServiceMileage: '',
      vehicleId: selectedVehicle?.id || ''
    });
    setEditingService(null);
    setShowServiceForm(false);
  };

  const exportServiceRecords = () => {
    if (!selectedVehicle || filteredServiceRecords.length === 0) {
      toast.info('No service records to export');
      return;
    }

    const csvData = filteredServiceRecords.map(record => ({
      Date: format(new Date(record.serviceDate), 'yyyy-MM-dd'),
      'Service Type': record.serviceType,
      Mileage: record.mileage,
      Description: record.description,
      Technician: record.technician,
      'Parts Used': record.partsUsed,
      'Parts Cost': record.cost,
      'Labor Cost': record.laborCost,
      'Total Cost': (parseFloat(record.cost) || 0) + (parseFloat(record.laborCost) || 0),
      Recommendations: record.recommendations,
      'Next Service Date': record.nextServiceDate ? format(new Date(record.nextServiceDate), 'yyyy-MM-dd') : '',
      'Next Service Mileage': record.nextServiceMileage
    }));

    const csvContent = "data:text/csv;charset=utf-8," + 
      Object.keys(csvData[0]).join(",") + "\n" +
      csvData.map(row => Object.values(row).map(val => `"${val}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `service-records-${selectedVehicle.year}-${selectedVehicle.make}-${selectedVehicle.model}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vehicle Service Records</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage customer vehicles and service history</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {viewMode === 'grid' ? <FiFileText size={16} /> : <FiTruck size={16} />}
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </button>
          <button
            onClick={() => {
              setVehicleFormData(prev => ({ ...prev, customerId: selectedCustomer?.id || '' }));
              setShowVehicleForm(true);
            }}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FiPlus size={16} />
            Add Vehicle
          </button>
          {selectedVehicle && (
            <>
              <button
                onClick={() => {
                  setServiceFormData(prev => ({ ...prev, vehicleId: selectedVehicle.id }));
                  setShowServiceForm(true);
                }}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FiPlus size={16} />
                Add Service
              </button>
              <button
                onClick={() => {
                  const customer = customers.find(c => c.id === selectedVehicle.customerId);
                  if (customer) createQuickInvoice(customer, selectedVehicle);
                }}
                className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FiShoppingCart size={16} />
                Quick Invoice
              </button>
            </>
          )}
        </div>
      </div>

      {/* Analytics Cards */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Vehicles</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{analyticsData.totalVehicles}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{analyticsData.activeVehicles} active</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <FiTruck className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Services</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{analyticsData.totalServiceRecords}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{analyticsData.recentServices} this week</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <FiTool className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Service Costs</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatCurrency(analyticsData.totalServiceCost)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg: {formatCurrency(analyticsData.avgServiceCost)}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <FiDollarSign className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue Services</p>
                <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{analyticsData.overdueServices}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Needs attention</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                <FiClock className="text-red-600 dark:text-red-400" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          {selectedVehicle && (
            <>
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Service Types</option>
                <option value="maintenance">Maintenance</option>
                <option value="repair">Repair</option>
                <option value="inspection">Inspection</option>
                <option value="oil">Oil Change</option>
                <option value="tire">Tire Service</option>
                <option value="brake">Brake Service</option>
              </select>
              
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="quarter">Past Quarter</option>
                <option value="year">Past Year</option>
              </select>
              
              <button
                onClick={exportServiceRecords}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <FiDownload size={16} />
                Export
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customers</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select a customer to view their vehicles
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  <FiUser className="mx-auto mb-4 text-gray-400" size={48} />
                  <p>No customers found</p>
                </div>
              ) : (
                filteredCustomers.map((customer) => {
                  const analytics = getCustomerAnalytics(customer.id);
                  const isSelected = selectedCustomer?.id === customer.id;
                  
                  return (
                    <div
                      key={customer.id}
                      className={`p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                            <FiUser className="text-blue-600 dark:text-blue-400" size={16} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {analytics.totalVehicles} vehicles • {analytics.totalServices} services
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(analytics.totalSpent)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {analytics.lastService ? 
                              `Last: ${format(analytics.lastService, 'MMM d')}` : 
                              'No services'
                            }
                          </p>
                        </div>
                      </div>
                      
                      {/* Customer actions */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            createQuickInvoice(customer);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors text-sm"
                        >
                          <FiShoppingCart size={12} />
                          Invoice
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVehicleFormData(prev => ({ ...prev, customerId: customer.id }));
                            setShowVehicleForm(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm"
                        >
                          <FiPlus size={12} />
                          Vehicle
                        </button>
                        {analytics.unpaidInvoices > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md text-xs">
                            <FiAlertTriangle size={10} />
                            {analytics.unpaidInvoices} unpaid
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="lg:col-span-2">
          {!selectedCustomer ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <FiUser className="mx-auto mb-4 text-gray-400" size={64} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select a Customer
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choose a customer from the list to view their vehicles and service records
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Customer Header */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {selectedCustomer.email && (
                        <span className="flex items-center gap-1">
                          <FiMail size={14} />
                          {selectedCustomer.email}
                        </span>
                      )}
                      {selectedCustomer.phone && (
                        <span className="flex items-center gap-1">
                          <FiPhone size={14} />
                          {selectedCustomer.phone}
                        </span>
                      )}
                      {selectedCustomer.company && (
                        <span className="flex items-center gap-1">
                          <FiUser size={14} />
                          {selectedCustomer.company}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <button
                      onClick={() => createQuickInvoice(selectedCustomer)}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                    >
                      Create Invoice
                    </button>
                  </div>
                </div>
                
                {/* Customer Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {(() => {
                        const analytics = getCustomerAnalytics(selectedCustomer.id);
                        return analytics.totalVehicles;
                      })()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vehicles</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {(() => {
                        const analytics = getCustomerAnalytics(selectedCustomer.id);
                        return analytics.totalServices;
                      })()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Services</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {(() => {
                        const analytics = getCustomerAnalytics(selectedCustomer.id);
                        return formatCurrency(analytics.totalSpent);
                      })()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
                  </div>
                </div>
              </div>

              {/* Maintenance Scheduler */}
              <div className="mt-6">
                <MaintenanceScheduler customerId={selectedCustomer.id} />
              </div>

              {/* Customer Vehicles */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vehicles</h3>
                    <button
                      onClick={() => {
                        setVehicleFormData(prev => ({ ...prev, customerId: selectedCustomer.id }));
                        setShowVehicleForm(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <FiPlus size={14} />
                      Add Vehicle
                    </button>
                  </div>
                </div>
                
                {(() => {
                  const customerVehicles = getVehiclesByCustomer(selectedCustomer.id);
                  
                  if (customerVehicles.length === 0) {
                    return (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <FiTruck className="mx-auto mb-4 text-gray-400" size={48} />
                        <p>No vehicles found for this customer</p>
                        <button
                          onClick={() => {
                            setVehicleFormData(prev => ({ ...prev, customerId: selectedCustomer.id }));
                            setShowVehicleForm(true);
                          }}
                          className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                          Add First Vehicle
                        </button>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="p-6 space-y-4">
                      {customerVehicles.map((vehicle) => {
                        const analytics = getVehicleAnalytics(vehicle.id);
                        const isSelected = selectedVehicle?.id === vehicle.id;
                        
                        return (
                          <div
                            key={vehicle.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => setSelectedVehicle(vehicle)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mr-4">
                                  <FiTruck className="text-green-600 dark:text-green-400" size={20} />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white">
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                  </h4>
                                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                    {vehicle.licensePlate && (
                                      <span>License: {vehicle.licensePlate}</span>
                                    )}
                                    {vehicle.color && (
                                      <span>Color: {vehicle.color}</span>
                                    )}
                                    {vehicle.mileage && (
                                      <span>Mileage: {vehicle.mileage.toLocaleString()}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {analytics.totalServices} services
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatCurrency(analytics.totalCost)} total
                                </p>
                                {analytics.isOverdue && (
                                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <FiAlertTriangle size={10} />
                                    Service overdue
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Vehicle Actions */}
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  createQuickInvoice(selectedCustomer, vehicle);
                                }}
                                className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors text-sm"
                              >
                                <FiShoppingCart size={12} />
                                Invoice
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setServiceFormData(prev => ({ ...prev, vehicleId: vehicle.id }));
                                  setShowServiceForm(true);
                                }}
                                className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-md hover:bg-green-200 dark:hover:bg-green-800 transition-colors text-sm"
                              >
                                <FiPlus size={12} />
                                Service
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditVehicle(vehicle);
                                }}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm"
                              >
                                <FiEdit2 size={12} />
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVehicle(vehicle.id);
                                }}
                                className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors text-sm"
                              >
                                <FiTrash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Service Records Panel */}
      {selectedVehicle && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Service Records - {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Complete maintenance and repair history
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setServiceFormData(prev => ({ ...prev, vehicleId: selectedVehicle.id }));
                    setShowServiceForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  <FiPlus size={16} />
                  Add Service
                </button>
                <button
                  onClick={exportServiceRecords}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <FiDownload size={16} />
                  Export
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {/* Quick Service Actions */}
            <div className="mb-6">
              <QuickServiceActions 
                vehicle={selectedVehicle}
                onServiceSelect={(serviceData) => {
                  setServiceFormData(serviceData);
                  setShowServiceForm(true);
                }}
              />
            </div>
            
            {filteredServiceRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FiTool className="mx-auto mb-4 text-gray-400" size={48} />
                <p>No service records found</p>
                <button
                  onClick={() => {
                    setServiceFormData(prev => ({ ...prev, vehicleId: selectedVehicle.id }));
                    setShowServiceForm(true);
                  }}
                  className="mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  Add First Service Record
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredServiceRecords.map((record) => (
                  <div key={record.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <FiTool className="text-green-600 dark:text-green-400" size={16} />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {record.serviceType}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {format(new Date(record.serviceDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {record.mileage && (
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Mileage:</span>
                              <p className="text-gray-600 dark:text-gray-400">{record.mileage.toLocaleString()}</p>
                            </div>
                          )}
                          {record.technician && (
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Technician:</span>
                              <p className="text-gray-600 dark:text-gray-400">{record.technician}</p>
                            </div>
                          )}
                          {(record.cost || record.laborCost) && (
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Cost:</span>
                              <p className="text-gray-600 dark:text-gray-400">
                                {formatCurrency((parseFloat(record.cost) || 0) + (parseFloat(record.laborCost) || 0))}
                              </p>
                            </div>
                          )}
                          {record.nextServiceDate && (
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Next Service:</span>
                              <p className="text-gray-600 dark:text-gray-400">
                                {format(new Date(record.nextServiceDate), 'MMM d, yyyy')}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {record.description && (
                          <div className="mt-3">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{record.description}</p>
                          </div>
                        )}
                        
                        {record.partsUsed && (
                          <div className="mt-3">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Parts Used:</span>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{record.partsUsed}</p>
                          </div>
                        )}
                        
                        {record.recommendations && (
                          <div className="mt-3">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Recommendations:</span>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{record.recommendations}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditService(record)}
                          className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteService(record.id)}
                          className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vehicle Form Modal */}
      {showVehicleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h3>
              <button
                onClick={resetVehicleForm}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleVehicleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer *
                </label>
                <select
                  required
                  value={vehicleFormData.customerId}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, customerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    required
                    min="1900"
                    max="2030"
                    value={vehicleFormData.year}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Make *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleFormData.make}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, make: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  required
                  value={vehicleFormData.model}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  VIN
                </label>
                <input
                  type="text"
                  value={vehicleFormData.vin}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, vin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    License Plate
                  </label>
                  <input
                    type="text"
                    value={vehicleFormData.licensePlate}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, licensePlate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    value={vehicleFormData.color}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Mileage
                </label>
                <input
                  type="number"
                  value={vehicleFormData.mileage}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, mileage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={vehicleFormData.status}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
                <button
                  type="button"
                  onClick={resetVehicleForm}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Form Modal */}
      {showServiceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingService ? 'Edit Service Record' : 'Add New Service Record'}
              </h3>
              <button
                onClick={resetServiceForm}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={serviceFormData.serviceDate}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, serviceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service Type *
                  </label>
                  <select
                    required
                    value={serviceFormData.serviceType}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, serviceType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select service type</option>
                    <option value="Oil Change">Oil Change</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Repair">Repair</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Tire Service">Tire Service</option>
                    <option value="Brake Service">Brake Service</option>
                    <option value="Engine Service">Engine Service</option>
                    <option value="Transmission Service">Transmission Service</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mileage
                  </label>
                  <input
                    type="number"
                    value={serviceFormData.mileage}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, mileage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Technician
                  </label>
                  <input
                    type="text"
                    value={serviceFormData.technician}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, technician: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={serviceFormData.description}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parts Used
                </label>
                <textarea
                  value={serviceFormData.partsUsed}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, partsUsed: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Parts Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceFormData.cost}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Labor Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceFormData.laborCost}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, laborCost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recommendations
                </label>
                <textarea
                  value={serviceFormData.recommendations}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, recommendations: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Next Service Date
                  </label>
                  <input
                    type="date"
                    value={serviceFormData.nextServiceDate}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, nextServiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Next Service Mileage
                  </label>
                  <input
                    type="number"
                    value={serviceFormData.nextServiceMileage}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, nextServiceMileage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {editingService ? 'Update Service Record' : 'Add Service Record'}
                </button>
                <button
                  type="button"
                  onClick={resetServiceForm}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
