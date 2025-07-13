import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useInvoice } from '../context/InvoiceContext'; // Updated to useInvoice (singular)
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import InvoiceAnalytics from '../components/InvoiceAnalytics';
import InvoiceList from '../components/InvoiceList';
import InvoiceStatusChart from '../components/InvoiceStatusChart';
import RecentActivity from '../components/RecentActivity';
import QuickActions from '../components/QuickActions';

export default function DashboardScreen() {
  const navigate = useNavigate();
  const { invoices, loading: invoicesLoading, error: invoicesError } = useInvoice(); // Updated hook name
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    overdueInvoices: 0,
  });
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!auth.currentUser) {
          throw new Error('User not authenticated');
        }

        // Use invoices from context if available, else fetch
        let invoiceData = invoices;
        if (!invoiceData || invoiceData.length === 0) {
          const invoicesRef = collection(db, 'users', auth.currentUser.uid, 'invoices');
          const q = query(invoicesRef, where('status', '!=', 'deleted'), orderBy('createdAt', 'desc'));
          const querySnapshot = await getDocs(q);
          invoiceData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            dueDate: doc.data().dueDate?.toDate() || new Date(),
          }));
        }

        // Process data
        const now = new Date();
        const totalInvoices = invoiceData.length;
        const totalRevenue = invoiceData.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const pendingAmount = invoiceData
          .filter(inv => inv.status === 'pending' || inv.status === 'sent')
          .reduce((sum, inv) => sum + (inv.totalAmount || 0) - (inv.paidAmount || 0), 0);
        const overdueInvoices = invoiceData.filter(inv => 
          (inv.status === 'pending' || inv.status === 'sent') && inv.dueDate < now
        ).length;

        setAnalyticsData({ totalInvoices, totalRevenue, pendingAmount, overdueInvoices });

        // Status distribution for chart
        const statusCounts = invoiceData.reduce((acc, inv) => {
          acc[inv.status] = (acc[inv.status] || 0) + 1;
          return acc;
        }, {});
        setStatusDistribution(Object.entries(statusCounts).map(([status, count]) => ({ status, count })));

        // Recent invoices (last 5)
        setRecentInvoices(invoiceData.slice(0, 5));

        // Recent activity (stub; expand with actual logs if available)
        setRecentActivity(invoiceData.slice(0, 3).map(inv => ({
          type: 'invoice',
          action: inv.status === 'draft' ? 'created' : 'updated',
          title: `Invoice #${inv.invoiceNumber || inv.id}`,
          time: inv.updatedAt || inv.createdAt,
        })));

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
        toast.error('Error loading dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [invoices]);

  if (isLoading || invoicesLoading) return <LoadingSpinner />;
  if (error || invoicesError) return <div className="p-6 text-red-500">{error || invoicesError}</div>;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <QuickActions onCreateInvoice={() => navigate('/invoices/new')} />
      </div>

      <InvoiceAnalytics data={analyticsData} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <InvoiceStatusChart data={statusDistribution} />
        <RecentActivity activities={recentActivity} />
      </div>

      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Recent Invoices</h2>
      <InvoiceList invoices={recentInvoices} onView={(id) => navigate(`/invoices/${id}`)} />
    </div>
  );
}