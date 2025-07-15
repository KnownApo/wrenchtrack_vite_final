import React, { useState } from 'react';
import { 
  FiDollarSign, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiFileText,
  FiClock,
  FiAlertTriangle,
  FiTarget,
  FiDownload,
  FiRefreshCw
} from 'react-icons/fi';

const MOCK_ANALYTICS_DATA = {
  totalRevenue: 45650.00,
  revenueChange: 12.5,
  totalInvoices: 156,
  invoicesChange: 8.3,
  avgInvoiceValue: 292.63,
  avgValueChange: -2.1,
  paidInvoices: 134,
  pendingInvoices: 18,
  overdueInvoices: 4,
  collectionsRate: 95.2,
  revenueByMonth: [
    { month: 'Jan', revenue: 3800, invoices: 12 },
    { month: 'Feb', revenue: 4200, invoices: 15 },
    { month: 'Mar', revenue: 3900, invoices: 14 },
    { month: 'Apr', revenue: 4500, invoices: 16 },
    { month: 'May', revenue: 4800, invoices: 18 },
    { month: 'Jun', revenue: 5200, invoices: 19 },
    { month: 'Jul', revenue: 4900, invoices: 17 },
    { month: 'Aug', revenue: 5400, invoices: 20 },
    { month: 'Sep', revenue: 4700, invoices: 16 },
    { month: 'Oct', revenue: 5100, invoices: 18 },
    { month: 'Nov', revenue: 5300, invoices: 19 },
    { month: 'Dec', revenue: 5650, invoices: 21 }
  ],
  topCustomers: [
    { name: 'John Smith', revenue: 2850, invoices: 8 },
    { name: 'ABC Corp', revenue: 2400, invoices: 5 },
    { name: 'Mary Johnson', revenue: 1950, invoices: 7 },
    { name: 'Tech Solutions', revenue: 1800, invoices: 4 },
    { name: 'Green Industries', revenue: 1600, invoices: 6 }
  ],
  serviceAnalytics: [
    { service: 'Oil Change', revenue: 8500, count: 95 },
    { service: 'Brake Service', revenue: 12200, count: 48 },
    { service: 'Tire Rotation', revenue: 3800, count: 76 },
    { service: 'Engine Repair', revenue: 15600, count: 24 },
    { service: 'Transmission', revenue: 9800, count: 14 }
  ]
};

export default function InvoiceAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('12months');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  const data = MOCK_ANALYTICS_DATA;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const refreshData = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const exportData = () => {
    // Export functionality
    console.log('Exporting analytics data...');
  };

  const MetricCard = ({ title, value, change, icon: Icon, color = 'blue' }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900`}>
          <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
        <div className={`flex items-center gap-1 text-sm ${
          change > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {change > 0 ? <FiTrendingUp className="w-4 h-4" /> : <FiTrendingDown className="w-4 h-4" />}
          {formatPercent(change)}
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );

  const SimpleChart = ({ data }) => (
    <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-end justify-center gap-2">
      {data.slice(0, 8).map((item, index) => (
        <div key={index} className="flex flex-col items-center gap-2">
          <div
            className="bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600"
            style={{
              width: '24px',
              height: `${(item.revenue / Math.max(...data.map(d => d.revenue))) * 200}px`
            }}
          />
          <span className="text-xs text-gray-600 dark:text-gray-400 transform -rotate-45">
            {item.month}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoice Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive insights into your invoicing performance
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="3months">Last 3 months</option>
              <option value="6months">Last 6 months</option>
              <option value="12months">Last 12 months</option>
              <option value="custom">Custom range</option>
            </select>
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(data.totalRevenue)}
          change={data.revenueChange}
          icon={FiDollarSign}
          color="green"
        />
        <MetricCard
          title="Total Invoices"
          value={data.totalInvoices}
          change={data.invoicesChange}
          icon={FiFileText}
          color="blue"
        />
        <MetricCard
          title="Average Invoice Value"
          value={formatCurrency(data.avgInvoiceValue)}
          change={data.avgValueChange}
          icon={FiTarget}
          color="purple"
        />
        <MetricCard
          title="Collection Rate"
          value={`${data.collectionsRate}%`}
          change={2.3}
          icon={FiTrendingUp}
          color="indigo"
        />
      </div>

      {/* Invoice Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invoice Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Paid</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">{data.paidInvoices}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Pending</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">{data.pendingInvoices}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Overdue</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">{data.overdueInvoices}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Customers</h3>
          <div className="space-y-3">
            {data.topCustomers.slice(0, 5).map((customer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{customer.invoices} invoices</p>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(customer.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Analytics</h3>
          <div className="space-y-3">
            {data.serviceAnalytics.slice(0, 5).map((service, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{service.service}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{service.count} services</p>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(service.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Trend</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMetric('revenue')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedMetric === 'revenue'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setSelectedMetric('invoices')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedMetric === 'invoices'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Invoices
            </button>
          </div>
        </div>
        <SimpleChart data={data.revenueByMonth} type="bar" />
      </div>

      {/* Alerts & Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FiAlertTriangle className="w-5 h-5 text-yellow-500" />
          Alerts & Recommendations
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <FiClock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">4 Overdue Invoices</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Follow up with customers to collect {formatCurrency(8450)} in overdue payments
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <FiTrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Revenue Growth Opportunity</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your average invoice value decreased by 2.1%. Consider reviewing your pricing strategy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
