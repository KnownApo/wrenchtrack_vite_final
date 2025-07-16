import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useInvoice } from '../context/InvoiceContext';
import ModernInvoiceDashboard from '../components/ModernInvoiceDashboard';
import RecentActivity from '../components/RecentActivity';
import QuickActions from '../components/QuickActions';
import TestCustomerCreator from '../components/TestCustomerCreator';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Coffee } from 'lucide-react';

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

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserName = () => {
    return user?.displayName || user?.email?.split('@')[0] || 'User';
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
        onDismiss={() => setError(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="space-y-8">
        {/* Enhanced Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="card-glass relative overflow-hidden"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10" />
          
          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {getGreeting()}, {getUserName()}!
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Ready to tackle another productive day? Here&apos;s your business overview.
                  </p>
                </div>
              </div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm rounded-xl"
              >
                <Coffee className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Modern Invoice Dashboard */}
        <ModernInvoiceDashboard stats={stats} />

        {/* Activity & Actions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 xl:grid-cols-2 gap-8"
        >
          <RecentActivity activities={recentActivities} />
          <QuickActions />
        </motion.div>

        {/* Development Tools */}
        {import.meta.env.DEV && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <TestCustomerCreator />
          </motion.div>
        )}
      </div>
    </div>
  );
}