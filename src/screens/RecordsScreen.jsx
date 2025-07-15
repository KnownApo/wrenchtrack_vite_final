import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../context/CustomerContext';
import { useVehicles } from '../context/VehicleContext';
import { useInvoice } from '../context/InvoiceContext';
import { format } from 'date-fns';
import { 
  FiFileText, FiTruck, FiUser, FiDollarSign, FiSearch,
  FiDownload, FiEye, FiTool, FiAlertTriangle,
  FiArrowUpRight, FiArrowDownRight
} from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function RecordsScreen() {
  const navigate = useNavigate();
  const { customers, loading: customersLoading, error: customersError } = useCustomers();
  const { vehicles, serviceRecords, loading: vehiclesLoading, error: vehiclesError } = useVehicles();
  const { invoices, loading: invoicesLoading, error: invoicesError } = useInvoice();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const loading = customersLoading || vehiclesLoading || invoicesLoading;
  const error = customersError || vehiclesError || invoicesError;

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Service records analytics
    const totalServices = serviceRecords.length;
    const thisMonthServices = serviceRecords.filter(record => 
      new Date(record.serviceDate) >= thisMonth
    ).length;
    const lastMonthServices = serviceRecords.filter(record => 
      new Date(record.serviceDate) >= lastMonth && new Date(record.serviceDate) < thisMonth
    ).length;
    
    const serviceRevenue = serviceRecords.reduce((sum, record) => 
      sum + (parseFloat(record.cost) || 0) + (parseFloat(record.laborCost) || 0), 0
    );
    
    // Invoice analytics
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.paid).length;
    const overdueInvoices = invoices.filter(inv => 
      !inv.paid && inv.dueDate && new Date(inv.dueDate) < now
    ).length;
    
    const invoiceRevenue = invoices.reduce((sum, inv) => 
      sum + (inv.totalAmount || 0), 0
    );
    
    const thisMonthRevenue = invoices.filter(inv => 
      new Date(inv.createdAt) >= thisMonth
    ).reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    const lastMonthRevenue = invoices.filter(inv => 
      new Date(inv.createdAt) >= lastMonth && new Date(inv.createdAt) < thisMonth
    ).reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    // Customer analytics
    const activeCustomers = customers.filter(c => c.status === 'active' || !c.status).length;
    const customersWithRecentActivity = customers.filter(customer => {
      const customerInvoices = invoices.filter(inv => 
        inv.customer?.id === customer.id || inv.customerId === customer.id
      );
      return customerInvoices.some(inv => 
        new Date(inv.createdAt) >= new Date(now - 30 * 24 * 60 * 60 * 1000)
      );
    }).length;
    
    // Vehicle analytics
    const totalVehicles = vehicles.length;
    const vehiclesNeedingService = vehicles.filter(vehicle => {
      const vehicleServices = serviceRecords.filter(record => record.vehicleId === vehicle.id);
      if (vehicleServices.length === 0) return true;
      
      const lastService = vehicleServices.sort((a, b) => 
        new Date(b.serviceDate) - new Date(a.serviceDate)
      )[0];
      
      const daysSinceService = (now - new Date(lastService.serviceDate)) / (1000 * 60 * 60 * 24);
      return daysSinceService > 90; // 3 months
    }).length;
    
    return {
      totalServices,
      thisMonthServices,
      lastMonthServices,
      serviceRevenue,
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      invoiceRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      activeCustomers,
      customersWithRecentActivity,
      totalVehicles,
      vehiclesNeedingService,
      serviceGrowth: lastMonthServices > 0 ? ((thisMonthServices - lastMonthServices) / lastMonthServices) * 100 : 0,
      revenueGrowth: lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0
    };
  }, [customers, vehicles, serviceRecords, invoices]);

  // Filter and sort records based on active tab
  const filteredRecords = useMemo(() => {
    let records = [];
    
    switch (activeTab) {
      case 'services':
        records = serviceRecords.map(record => ({
          ...record,
          type: 'service',
          date: new Date(record.serviceDate),
          amount: (parseFloat(record.cost) || 0) + (parseFloat(record.laborCost) || 0),
          title: record.serviceType,
          customer: customers.find(c => {
            const vehicle = vehicles.find(v => v.id === record.vehicleId);
            return vehicle && c.id === vehicle.customerId;
          }),
          vehicle: vehicles.find(v => v.id === record.vehicleId)
        }));
        break;
      case 'invoices':
        records = invoices.map(invoice => ({
          ...invoice,
          type: 'invoice',
          date: new Date(invoice.createdAt),
          amount: invoice.totalAmount || 0,
          title: `Invoice #${invoice.invoiceNumber || invoice.id.slice(0, 8)}`,
          customer: customers.find(c => c.id === invoice.customer?.id || c.id === invoice.customerId)
        }));
        break;
      case 'customers':
        records = customers.map(customer => {
          const customerInvoices = invoices.filter(inv => 
            inv.customer?.id === customer.id || inv.customerId === customer.id
          );
          const lastInvoice = customerInvoices.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          )[0];
          
          return {
            ...customer,
            type: 'customer',
            date: lastInvoice ? new Date(lastInvoice.createdAt) : new Date(customer.createdAt || 0),
            amount: customerInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
            title: customer.name,
            invoiceCount: customerInvoices.length
          };
        });
        break;
      case 'vehicles':
        records = vehicles.map(vehicle => {
          const vehicleServices = serviceRecords.filter(record => record.vehicleId === vehicle.id);
          const lastService = vehicleServices.sort((a, b) => 
            new Date(b.serviceDate) - new Date(a.serviceDate)
          )[0];
          
          return {
            ...vehicle,
            type: 'vehicle',
            date: lastService ? new Date(lastService.serviceDate) : new Date(vehicle.createdAt || 0),
            amount: vehicleServices.reduce((sum, record) => 
              sum + (parseFloat(record.cost) || 0) + (parseFloat(record.laborCost) || 0), 0
            ),
            title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            customer: customers.find(c => c.id === vehicle.customerId),
            serviceCount: vehicleServices.length
          };
        });
        break;
      default: {
        // Overview - combine all records
        const allRecords = [
          ...serviceRecords.map(record => ({
            ...record,
            type: 'service',
            date: new Date(record.serviceDate),
            amount: (parseFloat(record.cost) || 0) + (parseFloat(record.laborCost) || 0),
            title: record.serviceType
          })),
          ...invoices.map(invoice => ({
            ...invoice,
            type: 'invoice',
            date: new Date(invoice.createdAt),
            amount: invoice.totalAmount || 0,
            title: `Invoice #${invoice.invoiceNumber || invoice.id.slice(0, 8)}`
          }))
        ];
        records = allRecords;
        break;
      }
    }
    
    // Apply filters
    if (searchTerm) {
      records = records.filter(record => 
        record.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (dateFilter !== 'all') {
      const now = new Date();
      let filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
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
      
      records = records.filter(record => record.date >= filterDate);
    }
    
    if (statusFilter !== 'all') {
      records = records.filter(record => {
        switch (statusFilter) {
          case 'paid':
            return record.paid === true;
          case 'unpaid':
            return record.paid === false;
          case 'overdue':
            return record.paid === false && record.dueDate && new Date(record.dueDate) < new Date();
          default:
            return true;
        }
      });
    }
    
    // Sort records
    records.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = a.date;
          bValue = b.date;
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'customer':
          aValue = a.customer?.name || '';
          bValue = b.customer?.name || '';
          break;
        default:
          aValue = a.title;
          bValue = b.title;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return records;
  }, [activeTab, searchTerm, dateFilter, statusFilter, sortBy, sortOrder, customers, vehicles, serviceRecords, invoices]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getRecordIcon = (type) => {
    switch (type) {
      case 'service':
        return <FiTool className="text-blue-500" size={16} />;
      case 'invoice':
        return <FiFileText className="text-green-500" size={16} />;
      case 'customer':
        return <FiUser className="text-purple-500" size={16} />;
      case 'vehicle':
        return <FiTruck className="text-orange-500" size={16} />;
      default:
        return <FiFileText className="text-gray-500" size={16} />;
    }
  };

  const exportRecords = () => {
    const csvData = filteredRecords.map(record => ({
      Type: record.type,
      Title: record.title,
      Customer: record.customer?.name || 'N/A',
      Date: format(record.date, 'yyyy-MM-dd'),
      Amount: record.amount,
      Status: record.paid ? 'Paid' : 'Unpaid'
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const csvContent = csvData.map(row => 
      Object.values(row).map(value => `"${value}"`).join(',')
    ).join('\n');

    const fullCsv = `${headers}\n${csvContent}`;
    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `records_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Records</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Comprehensive view of all business records and analytics
            </p>
          </div>
          <button
            onClick={exportRecords}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <FiDownload size={16} />
            Export Records
          </button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(analytics.invoiceRevenue)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {analytics.revenueGrowth >= 0 ? (
                    <FiArrowUpRight className="text-green-500" size={16} />
                  ) : (
                    <FiArrowDownRight className="text-red-500" size={16} />
                  )}
                  <span className={`text-sm ${analytics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(analytics.revenueGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <FiDollarSign className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Services</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {analytics.totalServices}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {analytics.serviceGrowth >= 0 ? (
                    <FiArrowUpRight className="text-green-500" size={16} />
                  ) : (
                    <FiArrowDownRight className="text-red-500" size={16} />
                  )}
                  <span className={`text-sm ${analytics.serviceGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(analytics.serviceGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FiTool className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Customers</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {analytics.activeCustomers}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {analytics.customersWithRecentActivity} recent activity
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <FiUser className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vehicles</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {analytics.totalVehicles}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {analytics.vehiclesNeedingService > 0 && (
                    <>
                      <FiAlertTriangle className="text-yellow-500" size={16} />
                      <span className="text-sm text-yellow-600">
                        {analytics.vehiclesNeedingService} need service
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <FiTruck className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="customer">Customer</option>
                <option value="title">Title</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'services', label: 'Services' },
              { id: 'invoices', label: 'Invoices' },
              { id: 'customers', label: 'Customers' },
              { id: 'vehicles', label: 'Vehicles' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Records Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Type
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Title
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Customer
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
                {filteredRecords.map((record, index) => (
                  <tr key={`${record.type}-${record.id}-${index}`} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        {getRecordIcon(record.type)}
                        <span className="capitalize text-sm text-gray-600 dark:text-gray-400">
                          {record.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {record.title}
                      </div>
                      {record.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {record.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-6">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {record.customer ? (
                          <button
                            onClick={() => navigate(`/customers/${record.customer.id}`)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            {record.customer.name}
                          </button>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-900 dark:text-white">
                      {format(record.date, 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-900 dark:text-white">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="py-3 px-6">
                      {record.type === 'invoice' && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          record.paid
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : record.dueDate && new Date(record.dueDate) < new Date()
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {record.paid ? 'Paid' : record.dueDate && new Date(record.dueDate) < new Date() ? 'Overdue' : 'Pending'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6">
                      <button
                        onClick={() => {
                          switch (record.type) {
                            case 'invoice':
                              navigate(`/invoices/${record.id}`);
                              break;
                            case 'customer':
                              navigate(`/customers/${record.id}`);
                              break;
                            case 'vehicle':
                              navigate('/vehicle-service-records', { 
                                state: { selectedVehicle: record } 
                              });
                              break;
                            default:
                              break;
                          }
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <FiEye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <FiFileText className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No records found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
