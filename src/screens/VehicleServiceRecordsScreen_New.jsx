import React, { useState, useMemo } from 'react';
import { useCustomers } from '../context/CustomerContext';
import { useVehicles } from '../context/VehicleContext';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiUser, FiTruck, FiDollarSign, FiClock, FiTool, FiFileText, FiDownload, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { formatCurrency } from '../utils/helpers/helpers';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function VehicleServiceRecordsScreen() {
  const { customers, loading: customersLoading, error: customersError } = useCustomers();
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
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  
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

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    return customers.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Only show customers who have vehicles
      const hasVehicles = getVehiclesByCustomer(customer.id).length > 0;
      
      return matchesSearch && hasVehicles;
    });
  }, [customers, searchTerm, getVehiclesByCustomer]);

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

  const toggleCustomerExpansion = (customerId) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedCustomers(newExpanded);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vehicle Service Records</h1>
          <p className="text-gray-600 dark:text-gray-400">Track vehicle maintenance and service history</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setVehicleFormData(prev => ({ ...prev, customerId: '' }));
              setShowVehicleForm(true);
            }}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FiPlus size={16} />
            Add Vehicle
          </button>
          {selectedVehicle && (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer/Vehicle Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customers & Vehicles</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <FiUser className="mx-auto mb-4 text-gray-400" size={48} />
                <p>No customers with vehicles found</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => {
                const customerVehicles = getVehiclesByCustomer(customer.id);
                const isExpanded = expandedCustomers.has(customer.id);
                
                return (
                  <div key={customer.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => toggleCustomerExpansion(customer.id)}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                          <FiUser className="text-blue-600 dark:text-blue-400" size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{customerVehicles.length} vehicles</p>
                        </div>
                      </div>
                      {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                    </div>
                    
                    {isExpanded && (
                      <div className="pl-8 pb-4">
                        {customerVehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors $"{
                              selectedVehicle?.id === vehicle.id
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => setSelectedVehicle(vehicle)}
                          >
                            <div className="flex items-center">
                              <FiTruck className="text-gray-400 mr-3" size={16} />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {vehicle.licensePlate || vehicle.vin}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditVehicle(vehicle);
                                }}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200"
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVehicle(vehicle.id);
                                }}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Service Records */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Service Records
              {selectedVehicle && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </span>
              )}
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!selectedVehicle ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <FiTruck className="mx-auto mb-4 text-gray-400" size={48} />
                <p>Select a vehicle to view service records</p>
              </div>
            ) : filteredServiceRecords.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <FiFileText className="mx-auto mb-4 text-gray-400" size={48} />
                <p>No service records found</p>
                <p className="text-sm">Add a service record to get started</p>
              </div>
            ) : (
              filteredServiceRecords.map((record) => (
                <div key={record.id} className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <FiTool className="text-green-600 dark:text-green-400" size={14} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{record.serviceType}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {format(new Date(record.serviceDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="ml-11 space-y-1">
                        {record.mileage && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Mileage:</span> {record.mileage.toLocaleString()} miles
                          </p>
                        )}
                        {record.technician && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Technician:</span> {record.technician}
                          </p>
                        )}
                        {record.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Description:</span> {record.description}
                          </p>
                        )}
                        {(record.cost || record.laborCost) && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Cost:</span> {formatCurrency((parseFloat(record.cost) || 0) + (parseFloat(record.laborCost) || 0))}
                          </p>
                        )}
                        {record.recommendations && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Recommendations:</span> {record.recommendations}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditService(record)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteService(record.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
