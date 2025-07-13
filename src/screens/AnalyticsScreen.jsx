import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({
    revenue: 0,
    invoicesCount: 0,
    partsUsed: 0,
    averageJobTime: 0,
    revenueChart: { labels: [], data: [] },
    partsChart: { labels: [], data: [] },
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch invoices
        const invoicesRef = collection(db, 'users', user.uid, 'invoices');
        const invoicesSnap = await getDocs(invoicesRef);
        const invoices = invoicesSnap.docs.map(doc => doc.data());
        const invoicesCount = invoices.length;
        const revenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

        // Revenue chart (monthly example)
        const monthlyRevenue = {};
        invoices.forEach(inv => {
          const month = new Date(inv.createdAt?.seconds * 1000).toLocaleString('default', { month: 'short' });
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (inv.totalAmount || 0);
        });
        const revenueLabels = Object.keys(monthlyRevenue);
        const revenueData = Object.values(monthlyRevenue);

        // Fetch parts
        const partsRef = collection(db, 'users', user.uid, 'parts');
        const partsSnap = await getDocs(partsRef);
        const parts = partsSnap.docs.map(doc => doc.data());
        const partsUsed = parts.reduce((sum, part) => sum + (part.quantity || 0), 0);

        // Parts chart (top used)
        const sortedParts = parts.sort((a, b) => b.quantity - a.quantity).slice(0, 5);
        const partsLabels = sortedParts.map(p => p.name);
        const partsData = sortedParts.map(p => p.quantity);

        // Fetch jobs for average time
        const jobsRef = collection(db, 'users', user.uid, 'jobs');
        const jobsSnap = await getDocs(jobsRef);
        const jobs = jobsSnap.docs.map(doc => doc.data());
        const totalJobTime = jobs.reduce((sum, job) => sum + (job.duration || 0), 0);
        const averageJobTime = jobs.length ? (totalJobTime / jobs.length).toFixed(2) : 0;

        setAnalyticsData({
          revenue,
          invoicesCount,
          partsUsed,
          averageJobTime,
          revenueChart: { labels: revenueLabels, data: revenueData },
          partsChart: { labels: partsLabels, data: partsData },
        });
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics');
        toast.error('Error loading analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  const revenueChartOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' }, title: { display: true, text: 'Monthly Revenue' } },
  };

  const revenueChartData = {
    labels: analyticsData.revenueChart.labels,
    datasets: [{ label: 'Revenue ($)', data: analyticsData.revenueChart.data, borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.5)' }],
  };

  const partsChartOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' }, title: { display: true, text: 'Top Parts Used' } },
  };

  const partsChartData = {
    labels: analyticsData.partsChart.labels,
    datasets: [{ label: 'Quantity', data: analyticsData.partsChart.data, backgroundColor: 'rgba(153, 102, 255, 0.5)' }],
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${analyticsData.revenue.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoices</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.invoicesCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Parts Used</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.partsUsed}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Job Time (hrs)</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.averageJobTime}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <Line options={revenueChartOptions} data={revenueChartData} />
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <Bar options={partsChartOptions} data={partsChartData} />
        </div>
      </div>
    </div>
  );
}