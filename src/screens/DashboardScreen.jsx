import React, { useMemo } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import InvoiceDashboard from '../components/InvoiceDashboard';
import RecentActivity from '../components/RecentActivity';
import QuickActions from '../components/QuickActions';
import TestCustomerCreator from '../components/TestCustomerCreator';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen() {
  const { invoices, loading, error, setError } = useInvoice();
  const { user } = useAuth();

  // Memoized stats computation
  const stats = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return {
        totalBilled: 0,
        totalRevenue: 0,
        pendingAmount: 0,
        pendingCount: 0,
        paidAmount: 0,
        paidCount: 0,
        overdueAmount: 0,
        overdueCount: 0,
        draftCount: 0,
        totalInvoices: 0,
      };
    }

    const totalBilled = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
    const draftInvoices = invoices.filter(inv => inv.status === 'draft');

    return {
      totalBilled,
      totalRevenue: totalBilled,
      pendingAmount: pendingInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      pendingCount: pendingInvoices.length,
      paidAmount: paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      paidCount: paidInvoices.length,
      overdueAmount: overdueInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      overdueCount: overdueInvoices.length,
      draftCount: draftInvoices.length,
      totalInvoices: invoices.length,
    };
  }, [invoices]);

  // Recent activities (last 5 invoices)
  const recentActivities = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    
    return invoices
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
      .map(invoice => ({
        id: invoice.id,
        type: 'invoice',
        description: `Invoice ${invoice.invoiceNumber || `#${invoice.id.slice(0, 8)}`} for ${invoice.customerName || 'Unknown Customer'}`,
        amount: invoice.totalAmount,
        status: invoice.status,
        timestamp: invoice.updatedAt,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
      }));
  }, [invoices]);

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
        onDismiss={() => setError(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'User'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {/* Invoice Dashboard */}
      <InvoiceDashboard stats={stats} />

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentActivity activities={recentActivities} />
        <QuickActions />
      </div>

      {/* Test Customer Creator (development only) */}
      {import.meta.env.DEV && <TestCustomerCreator />}
    </div>
  );
}