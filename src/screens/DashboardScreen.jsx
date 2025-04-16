import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';
import { format, subDays, isWithinInterval, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { BsArrowUpRight, BsArrowDownRight, BsClock, BsCheckCircle } from 'react-icons/bs';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [monthlyData, setMonthlyData] = useState({ labels: [], datasets: [] });
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
    pendingAmount: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const invoicesRef = collection(db, 'users', user.uid, 'invoices');
        const invoiceSnapshot = await getDocs(invoicesRef);
        
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
          invoiceTotals: []
        };

        const monthlyTotals = {};

        invoiceSnapshot.forEach(doc => {
          const data = doc.data();
          // Calculate total from parts
          const invoiceTotal = data.parts?.reduce((sum, part) => sum + (parseFloat(part.price) || 0), 0) || 
                             parseFloat(data.paidAmount) || 
                             parseFloat(data.total) || 0;

          // Add to running totals
          statsData.totalInvoices++;
          statsData.totalBilled += invoiceTotal;
          statsData.invoiceTotals.push(invoiceTotal);

          // Update payment status logic to include completed invoices
          const isPaid = Boolean(
            data.paid === true || 
            data.status === 'paid' || 
            data.status === 'completed' ||  // Consider completed as paid
            data.completed === true ||      // Also check completed flag
            (data.paidAmount && data.paidAmount > 0)
          );

          if (isPaid) {
            statsData.paidAmount += invoiceTotal;
            statsData.paidCount++;
          } else {
            statsData.unpaidAmount += invoiceTotal;
            statsData.unpaidCount++;
          }

          // Handle completion status
          const isCompleted = data.status === 'completed' || data.completed;
          if (isCompleted) {
            statsData.completedAmount += invoiceTotal;
            statsData.completedCount++;
          } else {
            statsData.pendingAmount += invoiceTotal;
            statsData.pendingCount++;
          }

          // Update monthly totals
          const date = data.createdAt?.toDate() || new Date();
          const monthKey = format(date, 'MM/yyyy');
          monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + invoiceTotal;
        });

        // Calculate derived stats
        const averageInvoice = statsData.totalInvoices > 0 ? 
          statsData.totalBilled / statsData.totalInvoices : 0;
        
        const highestInvoice = Math.max(...statsData.invoiceTotals, 0);
        const lowestInvoice = statsData.invoiceTotals.length > 0 ? 
          Math.min(...statsData.invoiceTotals) : 0;

        // Set final stats
        setStats({
          ...statsData,
          averageInvoice,
          highestInvoice,
          lowestInvoice
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

        // Set recent invoices - Fix price calculation
        const recentOnes = invoiceSnapshot.docs
          .map(doc => {
            const data = doc.data();
            // Correctly calculate total from invoice data
            let invoiceTotal = 0;
            
            // Try different ways to get the total
            if (data.total) {
              // Use total directly if it exists
              invoiceTotal = parseFloat(data.total);
            } else if (data.parts && Array.isArray(data.parts)) {
              // Calculate from parts if available
              invoiceTotal = data.parts.reduce((sum, part) => {
                const cost = parseFloat(part.cost) || 0;
                const quantity = parseInt(part.quantity) || 1;
                return sum + (cost * quantity);
              }, 0);
            } else if (data.subtotal) {
              // Fall back to subtotal if parts calculation not possible
              invoiceTotal = parseFloat(data.subtotal);
            }
            
            return {
              id: doc.id,
              ...data,
              total: invoiceTotal
            };
          })
          .sort((a, b) => {
            // Sort by timestamp if available, otherwise by createdAt date
            const timeA = a.timestamp || (a.createdAt?.toDate?.() || new Date(a.createdAt || 0)).getTime();
            const timeB = b.timestamp || (b.createdAt?.toDate?.() || new Date(b.createdAt || 0)).getTime();
            return timeB - timeA;
          })
          .slice(0, 5);

        console.log("Recent invoices with totals:", recentOnes); // Debug log
        setRecentInvoices(recentOnes);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, timeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Analytics</h1>
          <select
            className="border rounded-md p-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="year">This Year</option>
            <option value="month">This Month</option>
            <option value="week">This Week</option>
          </select>
        </div>

        {/* Stats Cards - Revert to previous UI style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Invoices</h2>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{stats.totalInvoices}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</h2>
            <p className="mt-2 text-3xl font-semibold text-green-600 dark:text-green-400">
              ${stats.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Invoice</h2>
            <p className="mt-2 text-3xl font-semibold text-blue-600 dark:text-blue-400">
              ${stats.averageInvoice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Unpaid Amount</h2>
            <p className="mt-2 text-3xl font-semibold text-red-600 dark:text-red-400">
              ${stats.unpaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stats.unpaidCount} invoices</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Paid Amount</h2>
            <p className="mt-2 text-3xl font-semibold text-green-600 dark:text-green-400">
              ${stats.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stats.paidCount} invoices</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Highest Invoice</h2>
            <p className="mt-2 text-3xl font-semibold text-purple-600 dark:text-purple-400">
              ${stats.highestInvoice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Monthly Revenue Chart */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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

        {/* Recent Invoices - Fix the price display and revert UI style */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow">
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
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      invoice.status === 'paid' || invoice.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {invoice.status || 'pending'}
                    </span>
                    <p className="mt-1 font-semibold text-lg dark:text-white">
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
      </div>
    </div>
  );
}
