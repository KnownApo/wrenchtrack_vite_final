import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useInvoice } from '../context/InvoiceContext';
import { useCustomers } from '../context/CustomerContext';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiUsers, FiFileText, FiCalendar, FiDownload } from 'react-icons/fi';
import { format, subMonths, isWithinInterval } from 'date-fns';
import { formatCurrency } from '../utils/helpers/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

export default function AnalyticsScreen() {
  const navigate = useNavigate();
  const { invoices, loading: invoicesLoading, error: invoicesError } = useInvoice();
  const { customers, loading: customersLoading, error: customersError } = useCustomers();
  const [timeRange, setTimeRange] = useState('12months');

  const loading = invoicesLoading || customersLoading;
  const error = invoicesError || customersError;

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    if (!invoices || !customers) return null;

    const now = new Date();
    const getDateRange = () => {
      switch (timeRange) {
        case '3months':
          return { start: subMonths(now, 3), end: now };
        case '6months':
          return { start: subMonths(now, 6), end: now };
        case '12months':
          return { start: subMonths(now, 12), end: now };
        default:
          return { start: subMonths(now, 12), end: now };
      }
    };

    const { start, end } = getDateRange();
    const filteredInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.createdAt);
      return isWithinInterval(invDate, { start, end });
    });

    // Monthly revenue data
    const monthlyData = {};
    const months = [];
    for (let i = parseInt(timeRange.replace('months', '')); i >= 0; i--) {
      const month = subMonths(now, i);
      const monthKey = format(month, 'MMM yyyy');
      months.push(monthKey);
      monthlyData[monthKey] = {
        revenue: 0,
        invoices: 0,
        customers: new Set(),
        paid: 0,
        pending: 0,
        overdue: 0
      };
    }

    filteredInvoices.forEach(inv => {
      const monthKey = format(new Date(inv.createdAt), 'MMM yyyy');
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].revenue += inv.totalAmount || 0;
        monthlyData[monthKey].invoices++;
        if (inv.customer?.id) {
          monthlyData[monthKey].customers.add(inv.customer.id);
        }
        monthlyData[monthKey][inv.status] = (monthlyData[monthKey][inv.status] || 0) + 1;
      }
    });

    // Convert Set to count
    Object.keys(monthlyData).forEach(month => {
      monthlyData[month].customers = monthlyData[month].customers.size;
    });

    // Status distribution
    const statusCounts = {
      paid: filteredInvoices.filter(inv => inv.status === 'paid').length,
      pending: filteredInvoices.filter(inv => inv.status === 'pending').length,
      overdue: filteredInvoices.filter(inv => inv.status === 'overdue').length,
      draft: filteredInvoices.filter(inv => inv.status === 'draft').length,
    };

    // Top customers by revenue
    const customerRevenue = {};
    filteredInvoices.forEach(inv => {
      const customerId = inv.customer?.id;
      const customerName = inv.customer?.name || inv.customerName || 'Unknown';
      if (customerId) {
        if (!customerRevenue[customerId]) {
          customerRevenue[customerId] = { name: customerName, revenue: 0, invoices: 0 };
        }
        customerRevenue[customerId].revenue += inv.totalAmount || 0;
        customerRevenue[customerId].invoices++;
      }
    });

    const topCustomers = Object.values(customerRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Key metrics
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const avgInvoiceValue = filteredInvoices.length > 0 ? totalRevenue / filteredInvoices.length : 0;
    const totalInvoices = filteredInvoices.length;
    const uniqueCustomers = new Set(filteredInvoices.map(inv => inv.customer?.id).filter(Boolean)).size;

    // Growth calculations
    const halfwayPoint = Math.floor(filteredInvoices.length / 2);
    const firstHalf = filteredInvoices.slice(0, halfwayPoint);
    const secondHalf = filteredInvoices.slice(halfwayPoint);
    
    const firstHalfRevenue = firstHalf.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const secondHalfRevenue = secondHalf.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const revenueGrowth = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;

    return {
      monthlyData,
      months,
      statusCounts,
      topCustomers,
      totalRevenue,
      avgInvoiceValue,
      totalInvoices,
      uniqueCustomers,
      revenueGrowth,
      collectionRate: statusCounts.paid / (statusCounts.paid + statusCounts.pending + statusCounts.overdue) * 100 || 0,
      overdueRate: statusCounts.overdue / totalInvoices * 100 || 0,
    };
  }, [invoices, customers, timeRange]);

  // Chart data
  const chartData = useMemo(() => {
    if (!analyticsData) return null;

    const { monthlyData, months, statusCounts } = analyticsData;

    const revenueChartData = {
      labels: months,
      datasets: [{
        label: 'Monthly Revenue',
        data: months.map(month => monthlyData[month].revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      }]
    };

    const invoiceChartData = {
      labels: months,
      datasets: [{
        label: 'Monthly Invoices',
        data: months.map(month => monthlyData[month].invoices),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      }]
    };

    const customerChartData = {
      labels: months,
      datasets: [{
        label: 'Active Customers',
        data: months.map(month => monthlyData[month].customers),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        fill: true,
      }]
    };

    const statusChartData = {
      labels: ['Paid', 'Pending', 'Overdue', 'Draft'],
      datasets: [{
        data: [statusCounts.paid, statusCounts.pending, statusCounts.overdue, statusCounts.draft],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 2,
      }]
    };

    return {
      revenue: revenueChartData,
      invoices: invoiceChartData,
      customers: customerChartData,
      status: statusChartData,
    };
  }, [analyticsData]);

  const exportReport = () => {
    if (!analyticsData) return;

    const reportData = {
      timeRange,
      generatedAt: new Date().toISOString(),
      metrics: analyticsData,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <FiFileText className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No data available</h3>
        <p className="text-gray-600 dark:text-gray-400">Create some invoices to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Insights into your business performance</p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
          </select>
          <button
            onClick={exportReport}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FiDownload size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatCurrency(analyticsData.totalRevenue)}</p>
              <div className="flex items-center mt-1">
                {analyticsData.revenueGrowth > 0 ? (
                  <FiTrendingUp className="text-green-500 mr-1" size={14} />
                ) : (
                  <FiTrendingDown className="text-red-500 mr-1" size={14} />
                )}
                <span className={`text-sm ${analyticsData.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analyticsData.revenueGrowth.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <FiDollarSign className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Invoices</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{analyticsData.totalInvoices}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg: {formatCurrency(analyticsData.avgInvoiceValue)}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <FiFileText className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Customers</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{analyticsData.uniqueCustomers}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Collection: {analyticsData.collectionRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <FiUsers className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue Rate</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{analyticsData.overdueRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{analyticsData.statusCounts.overdue} overdue</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
              <FiCalendar className="text-red-600 dark:text-red-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
          <div className="h-64">
            <Line 
              data={chartData.revenue} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return '$' + value.toLocaleString();
                      }
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Invoice Status Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invoice Status</h3>
          <div className="h-64">
            <Doughnut 
              data={chartData.status} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Monthly Invoices Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Invoices</h3>
          <div className="h-64">
            <Bar 
              data={chartData.invoices} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Customer Activity Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Activity</h3>
          <div className="h-64">
            <Line 
              data={chartData.customers} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Customers</h3>
        <div className="space-y-3">
          {analyticsData.topCustomers.map((customer, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium mr-3">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <button
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors text-left"
                  >
                    {customer.name}
                  </button>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{customer.invoices} invoices</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(customer.revenue)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}