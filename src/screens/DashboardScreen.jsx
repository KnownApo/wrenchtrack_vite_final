import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useInvoices } from '../context/InvoiceContext';
import { Link } from 'react-router-dom';
import { format, subDays, isWithinInterval, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { BsArrowUpRight, BsArrowDownRight, BsClock, BsCheckCircle } from 'react-icons/bs';
import { FaCheckCircle, FaMoneyBillWave, FaHourglass, FaSync } from 'react-icons/fa';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { getTrackingSummary } from '../utils/invoiceTracking';
import InvoiceTrackingAnalytics from '../components/InvoiceTrackingAnalytics';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardScreen() {
  const { user } = useAuth();
  const { invoices, loading: invoicesLoading, refreshInvoices } = useInvoices();
  const [loading, setLoading] = useState(true);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [monthlyData, setMonthlyData] = useState({ labels: [], datasets: [] });
  const [statusChartData, setStatusChartData] = useState({ labels: [], datasets: [] });
  const [timeFilter, setTimeFilter] = useState('all');
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalBilled: 0,
    averageInvoice: 0,
    highestInvoice: 0,
    lowestInvoice: 0,
    unpaidAmount: 0,
    paidAmount: 0,
    unpaidCount: 0,
    paidCount: 0,
    completedCount: 0,
    pendingCount: 0,
    completedAmount: 0,
    pendingAmount: 0,
    // New tracking stats
    completedUnpaidCount: 0,
    completedPaidCount: 0,
    completedUnpaidAmount: 0,
    completedPaidAmount: 0,
    avgTimeToComplete: 0,
    avgTimeToPay: 0,
    // Add warranty counts
    warrantyCount: 0,
    warrantyAmount: 0
  });
  const [showTrackingAnalytics, setShowTrackingAnalytics] = useState(false);

  // Process dashboard data whenever invoices change
  useEffect(() => {
    if (invoicesLoading) {
      setLoading(true);
      return;
    }
    
    processDashboardData(invoices);
  }, [invoices, invoicesLoading, timeFilter]);

  // Process the invoice data for the dashboard
  const processDashboardData = (invoiceData) => {
    try {
      console.log('Processing dashboard data with', invoiceData.length, 'invoices');
      setLoading(true);
      
      let statsData = {
        totalInvoices: 0,
        totalBilled: 0,
        unpaidAmount: 0,
        paidAmount: 0,
        unpaidCount: 0,
        paidCount: 0,
        completedCount: 0,
        pendingCount: 0,
        completedAmount: 0,
        pendingAmount: 0,
        invoiceTotals: [],
        // New tracking stats
        completedUnpaidCount: 0,
        completedPaidCount: 0,
        completedUnpaidAmount: 0,
        completedPaidAmount: 0,
        timeToCompleteValues: [],
        timeToPayValues: [],
        // Add warranty counts
        warrantyCount: 0,
        warrantyAmount: 0
      };

      const monthlyTotals = {};
      const statusData = {
        pending: 0,
        completed_unpaid: 0,
        completed_paid: 0,
        paid: 0,
        warranty: 0,
        total: 0
      };

      // Process each invoice
      invoiceData.forEach(data => {
        // Calculate total from parts
        const invoiceTotal = data.parts?.reduce((sum, part) => sum + (parseFloat(part.price) || 0), 0) || 
                            parseFloat(data.total) || 0;
        
        // Get actual amount paid (if partial payment exists)
        const paidAmount = typeof data.paidAmount !== 'undefined' ? parseFloat(data.paidAmount) : 0;
        const remainingAmount = Math.max(0, invoiceTotal - paidAmount);

        // Add to running totals
        statsData.totalInvoices++;
        statsData.totalBilled += invoiceTotal;
        statsData.invoiceTotals.push(invoiceTotal);
        
        // Handle status - now including warranty
        if (data.status === 'warranty') {
          // Warranty invoice
          statsData.warrantyCount++;
          statsData.warrantyAmount += invoiceTotal;
          statusData.warranty++;
        }
        else if (data.status === 'completed') {
          // Completed invoice
          statsData.completedCount++;
          statsData.completedAmount += invoiceTotal;
          
          if (paidAmount > 0) {
            // Has some payment
            if (paidAmount >= invoiceTotal) {
              // Fully paid
              statsData.completedPaidCount++;
              statsData.completedPaidAmount += invoiceTotal;
              statsData.paidAmount += paidAmount;
              statusData.completed_paid++;
            } else {
              // Partially paid
              statsData.completedUnpaidCount++;
              statsData.completedUnpaidAmount += remainingAmount;
              statsData.paidAmount += paidAmount;
              statsData.unpaidAmount += remainingAmount;
              statusData.completed_unpaid++;
            }
          } else {
            // No payment
            statsData.completedUnpaidCount++;
            statsData.completedUnpaidAmount += invoiceTotal;
            statsData.unpaidAmount += invoiceTotal;
            statusData.completed_unpaid++;
          }
        } else if (data.status === 'paid') {
          // Paid invoice
          statsData.paidCount++;
          statsData.paidAmount += paidAmount;
          statusData.paid++;
        } else {
          // Default to pending for anything else
          statsData.pendingCount++;
          statsData.pendingAmount += invoiceTotal;
          statsData.unpaidAmount += invoiceTotal;
          statusData.pending++;
        }
        
        statusData.total++;

        // Update monthly totals
        const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
        const monthKey = format(date, 'MM/yyyy');
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + invoiceTotal;
      });

      // Calculate derived stats
      const averageInvoice = statsData.totalInvoices > 0 ? 
        statsData.totalBilled / statsData.totalInvoices : 0;
      
      const highestInvoice = Math.max(...statsData.invoiceTotals, 0);
      const lowestInvoice = statsData.invoiceTotals.length > 0 ? 
        Math.min(...statsData.invoiceTotals) : 0;
        
      // Calculate average time metrics if available
      const avgTimeToComplete = statsData.timeToCompleteValues.length > 0 ?
        statsData.timeToCompleteValues.reduce((sum, time) => sum + time, 0) / statsData.timeToCompleteValues.length :
        0;
        
      const avgTimeToPay = statsData.timeToPayValues.length > 0 ?
        statsData.timeToPayValues.reduce((sum, time) => sum + time, 0) / statsData.timeToPayValues.length :
        0;

      // Set final stats
      setStats({
        ...statsData,
        averageInvoice,
        highestInvoice,
        lowestInvoice,
        avgTimeToComplete,
        avgTimeToPay
      });

      // Set monthly data for chart
      const sortedMonths = Object.keys(monthlyTotals).sort();
      setMonthlyData({
        labels: sortedMonths,
        datasets: [{
          label: 'Monthly Revenue',
          data: sortedMonths.map(month => monthlyTotals[month]),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
          fill: true
        }]
      });
      
      // Create status chart data with warranty
      setStatusChartData({
        labels: ['Pending', 'Completed (Unpaid)', 'Completed (Paid)', 'Paid', 'Warranty'],
        datasets: [
          {
            label: 'Invoice Status',
            data: [
              statusData.pending,
              statusData.completed_unpaid,
              statusData.completed_paid,
              statusData.paid,
              statusData.warranty
            ],
            backgroundColor: [
              'rgba(255, 206, 86, 0.7)',   // yellow for pending
              'rgba(54, 162, 235, 0.7)',   // blue for completed (unpaid)
              'rgba(75, 192, 192, 0.7)',   // teal for completed (paid)
              'rgba(75, 192, 75, 0.7)',    // green for paid
              'rgba(153, 102, 255, 0.7)',  // purple for warranty
            ],
            borderColor: [
              'rgba(255, 206, 86, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(75, 192, 75, 1)',
              'rgba(153, 102, 255, 1)',
            ],
            borderWidth: 1,
          },
        ],
      });
      
      // Set recent invoices
      setRecentInvoices(invoiceData.slice(0, 5));
      
    } catch (error) {
      console.error('Error processing dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add a handleRefresh function
  const handleRefresh = () => {
    refreshInvoices();
  };

  // Format duration for display
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  // Get status icon
  const getStatusIcon = (invoice) => {
    if (!invoice.trackingSummary) {
      return <BsClock className="text-yellow-500" />;
    }
    
    switch (invoice.trackingSummary.status) {
      case 'completed_unpaid':
        return <FaCheckCircle className="text-blue-500" />;
      case 'completed_paid':
        return <FaCheckCircle className="text-green-500" />;
      case 'paid':
        return <FaMoneyBillWave className="text-green-500" />;
      default:
        return <BsClock className="text-yellow-500" />;
    }
  };

  const toggleTrackingAnalytics = () => {
    setShowTrackingAnalytics(prev => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          
          {/* Time filter dropdown */}
          <div className="flex items-center space-x-2">
            <label htmlFor="time-filter" className="text-sm font-medium text-gray-600">
              View:
            </label>
            <select
              id="time-filter"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="year">This Year</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <FaSync className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Invoices</h2>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{stats.totalInvoices}</p>
          <div className="mt-1 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 mr-2">Completed:</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">{stats.completedCount}</span>
          </div>
          <div className="mt-1 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 mr-2">Completed & Paid:</span>
            <span className="font-medium text-green-600 dark:text-green-400">{stats.completedPaidCount}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</h2>
          <p className="mt-2 text-3xl font-semibold text-green-600 dark:text-green-400">
            ${stats.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-1 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 mr-2">Received:</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              ${stats.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Invoice</h2>
          <p className="mt-2 text-3xl font-semibold text-blue-600 dark:text-blue-400">
            ${stats.averageInvoice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-1 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 mr-2">Highest:</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              ${stats.highestInvoice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
      
      {/* Completion Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed (Unpaid)</h2>
            <FaCheckCircle className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
            {stats.completedUnpaidCount}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ${stats.completedUnpaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed (Paid)</h2>
            <FaCheckCircle className="text-green-500 dark:text-green-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-green-600 dark:text-green-400">
            {stats.completedPaidCount}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ${stats.completedPaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Time to Complete</h2>
            <FaHourglass className="text-blue-500 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-blue-600 dark:text-blue-400">
            {formatDuration(stats.avgTimeToComplete)}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            From creation to completion
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Time to Payment</h2>
            <FaMoneyBillWave className="text-green-500 dark:text-green-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-green-600 dark:text-green-400">
            {formatDuration(stats.avgTimeToPay)}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            From completion to payment
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold dark:text-white mb-4">Monthly Revenue</h2>
          <div className="h-[300px]">
            <Line 
              data={monthlyData} 
              options={{ 
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: {
                      color: document.documentElement.classList.contains('dark') ? 'rgb(229, 231, 235)' : 'rgb(55, 65, 81)'
                    }
                  }
                },
                scales: {
                  y: {
                    ticks: { color: document.documentElement.classList.contains('dark') ? 'rgb(229, 231, 235)' : 'rgb(55, 65, 81)' },
                    grid: { color: document.documentElement.classList.contains('dark') ? 'rgba(229, 231, 235, 0.1)' : 'rgba(55, 65, 81, 0.1)' }
                  },
                  x: {
                    ticks: { color: document.documentElement.classList.contains('dark') ? 'rgb(229, 231, 235)' : 'rgb(55, 65, 81)' },
                    grid: { color: document.documentElement.classList.contains('dark') ? 'rgba(229, 231, 235, 0.1)' : 'rgba(55, 65, 81, 0.1)' }
                  }
                }
              }} 
            />
          </div>
        </div>
        
        {/* Invoice Status Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold dark:text-white mb-4">Invoice Status</h2>
          <div className="h-[300px] flex items-center justify-center">
            <Doughnut
              data={statusChartData}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      color: document.documentElement.classList.contains('dark') ? 'rgb(229, 231, 235)' : 'rgb(55, 65, 81)'
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold dark:text-white">Recent Invoices</h2>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No invoices found
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {recentInvoices.map(invoice => (
              <Link 
                key={invoice.id}
                to={`/invoicehistory`}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium dark:text-white">{invoice.customer?.name || 'Unnamed Customer'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {invoice.createdAt?.toDate?.() 
                      ? format(invoice.createdAt.toDate(), 'MMM dd, yyyy') 
                      : invoice.createdAt instanceof Date 
                        ? format(invoice.createdAt, 'MMM dd, yyyy')
                        : 'No date'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {invoice.invoiceNumber || '#' + invoice.id.substring(0, 6)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 mb-2">
                    {getStatusIcon(invoice)}
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      invoice.trackingSummary?.status === 'completed_unpaid'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
                      : invoice.trackingSummary?.status === 'completed_paid' || invoice.trackingSummary?.status === 'paid'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {invoice.trackingSummary?.status === 'completed_unpaid'
                        ? 'Completed (Unpaid)'
                        : invoice.trackingSummary?.status === 'completed_paid'
                          ? 'Completed (Paid)'
                          : invoice.trackingSummary?.status === 'paid'
                            ? 'Paid'
                            : invoice.status || 'Pending'}
                    </span>
                  </div>
                  <p className="font-semibold text-lg dark:text-white">
                    {invoice.preferences?.currency || '$'}{Number(invoice.total).toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="p-4 border-t dark:border-gray-700">
          <Link 
            to="/invoicehistory" 
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            View all invoices →
          </Link>
        </div>
      </div>

      {/* Invoice Tracking Analytics */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Tracking Analytics</h2>
          <button
            onClick={toggleTrackingAnalytics}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1"
          >
            {showTrackingAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            <span className="text-xs">
              {showTrackingAnalytics ? '▲' : '▼'}
            </span>
          </button>
        </div>
        
        {showTrackingAnalytics && (
          <InvoiceTrackingAnalytics />
        )}
      </div>
    </div>
  );
}
