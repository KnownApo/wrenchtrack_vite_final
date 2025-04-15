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

          // Handle payment status - check multiple flags
          const isPaid = Boolean(
            data.paid === true || 
            data.status === 'paid' || 
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

        // Set recent invoices
        const recentOnes = invoiceSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            total: doc.data().parts ? 
              doc.data().parts.reduce((sum, part) => sum + (parseFloat(part.price) || 0), 0) :
              parseFloat(doc.data().total) || 0
          }))
          .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
          .slice(0, 5);

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Analytics</h1>
          <select
            className="border rounded-md p-2"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="year">This Year</option>
            <option value="month">This Month</option>
            <option value="week">This Week</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500">Total Invoices</h2>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalInvoices}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500">Total Revenue</h2>
            <p className="mt-2 text-3xl font-semibold text-green-600">
              ${stats.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500">Average Invoice</h2>
            <p className="mt-2 text-3xl font-semibold text-blue-600">
              ${stats.averageInvoice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500">Unpaid Amount</h2>
            <p className="mt-2 text-3xl font-semibold text-red-600">
              ${stats.unpaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-sm text-gray-500">{stats.unpaidCount} invoices</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500">Paid Amount</h2>
            <p className="mt-2 text-3xl font-semibold text-green-600">
              ${stats.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-sm text-gray-500">{stats.paidCount} invoices</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500">Highest Invoice</h2>
            <p className="mt-2 text-3xl font-semibold text-purple-600">
              ${stats.highestInvoice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Monthly Revenue Chart */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Revenue</h2>
          <div className="h-[300px]">
            <Line data={monthlyData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Recent Invoices</h2>
          </div>
          <div className="divide-y">
            {recentInvoices.map(invoice => (
              <Link 
                key={invoice.id}
                to={`/invoices/${invoice.id}`}
                className="p-4 hover:bg-gray-50 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{invoice.customer?.name || 'Unnamed Customer'}</p>
                  <p className="text-sm text-gray-500">
                    {invoice.createdAt?.toDate()?.toLocaleDateString() || 'No date'}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    invoice.status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status || 'pending'}
                  </span>
                  <span className="font-semibold">
                    ${(invoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="p-4 border-t">
            <Link 
              to="/invoices" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View all invoices →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
