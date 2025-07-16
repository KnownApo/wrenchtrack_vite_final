import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useInvoice } from '../context/InvoiceContext';
import { useCustomers } from '../context/CustomerContext';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { TrendingUp, TrendingDown, DollarSign, Users, FileText, Calendar, Download, BarChart3, PieChart, Activity } from 'lucide-react';
import { format, subMonths, isWithinInterval } from 'date-fns';
import { formatCurrency } from '../utils/helpers/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { motion } from 'framer-motion';

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <ErrorMessage 
            message={error} 
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200/50 dark:border-gray-700/50">
            <FileText className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No data available</h3>
            <p className="text-gray-600 dark:text-gray-400">Create some invoices to see analytics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Deep insights into your business performance
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="12months">Last 12 Months</option>
              </select>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={exportReport}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Download size={18} />
                Export Report
              </motion.button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {formatCurrency(analyticsData.totalRevenue)}
                  </p>
                  <div className="flex items-center mt-1">
                    {analyticsData.revenueGrowth > 0 ? (
                      <TrendingUp className="text-green-500 mr-1" size={16} />
                    ) : (
                      <TrendingDown className="text-red-500 mr-1" size={16} />
                    )}
                    <span className={`text-sm font-medium ${analyticsData.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {analyticsData.revenueGrowth.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                  <DollarSign className="text-white" size={28} />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {analyticsData.totalInvoices}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Avg: {formatCurrency(analyticsData.avgInvoiceValue)}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
                  <FileText className="text-white" size={28} />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Customers</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {analyticsData.uniqueCustomers}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Collection: {analyticsData.collectionRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                  <Users className="text-white" size={28} />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {analyticsData.overdueRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {analyticsData.statusCounts.overdue} overdue
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg">
                  <Calendar className="text-white" size={28} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <BarChart3 className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Revenue Trend</h3>
              </div>
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
            </motion.div>

            {/* Invoice Status Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                  <PieChart className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Invoice Status</h3>
              </div>
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
            </motion.div>

            {/* Monthly Invoices Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                  <FileText className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Invoices</h3>
              </div>
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
            </motion.div>

            {/* Customer Activity Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                  <Activity className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Customer Activity</h3>
              </div>
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
            </motion.div>
          </div>

          {/* Top Customers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg">
                <Users className="text-white" size={20} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Top Customers</h3>
            </div>
            <div className="space-y-4">
              {analyticsData.topCustomers.map((customer, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg mr-4">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className="font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors text-left"
                      >
                        {customer.name}
                      </motion.button>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {customer.invoices} invoices
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white text-lg">
                      {formatCurrency(customer.revenue)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}