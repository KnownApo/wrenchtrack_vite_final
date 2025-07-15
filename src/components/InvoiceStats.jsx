import React from 'react';
import { 
  FiDollarSign, FiClock, FiCheckCircle, FiAlertTriangle, 
  FiTrendingUp, FiTrendingDown, FiCalendar, FiFileText
} from 'react-icons/fi';

export default function InvoiceStats({ invoices }) {
  const stats = React.useMemo(() => {
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
    const overdueInvoices = invoices.filter(inv => {
      return inv.status !== 'paid' && inv.dueDate && new Date(inv.dueDate) < new Date();
    }).length;
    
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const paidAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const pendingAmount = invoices
      .filter(inv => inv.status === 'pending')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const overdueAmount = invoices
      .filter(inv => inv.status !== 'paid' && inv.dueDate && new Date(inv.dueDate) < new Date())
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    // Calculate trends (last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const recentInvoices = invoices.filter(inv => 
      inv.createdAt && new Date(inv.createdAt) >= thirtyDaysAgo
    );
    const previousInvoices = invoices.filter(inv => 
      inv.createdAt && new Date(inv.createdAt) >= sixtyDaysAgo && new Date(inv.createdAt) < thirtyDaysAgo
    );
    
    const recentTotal = recentInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const previousTotal = previousInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    const revenueGrowth = previousTotal > 0 ? ((recentTotal - previousTotal) / previousTotal) * 100 : 0;
    const invoiceGrowth = previousInvoices.length > 0 ? 
      ((recentInvoices.length - previousInvoices.length) / previousInvoices.length) * 100 : 0;
    
    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      revenueGrowth,
      invoiceGrowth,
      averageInvoiceValue: totalInvoices > 0 ? totalAmount / totalInvoices : 0,
      paymentRate: totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0
    };
  }, [invoices]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trendValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {trendValue >= 0 ? <FiTrendingUp className="w-4 h-4" /> : <FiTrendingDown className="w-4 h-4" />}
            {formatPercentage(trendValue)}
          </div>
        )}
      </div>
      
      <div className="mb-2">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      </div>
      
      {subtitle && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Revenue"
        value={formatCurrency(stats.totalAmount)}
        subtitle={`${stats.totalInvoices} invoices`}
        icon={FiDollarSign}
        color="bg-green-500"
        trend={true}
        trendValue={stats.revenueGrowth}
      />
      
      <StatCard
        title="Paid Invoices"
        value={formatCurrency(stats.paidAmount)}
        subtitle={`${stats.paidInvoices} invoices (${stats.paymentRate.toFixed(1)}%)`}
        icon={FiCheckCircle}
        color="bg-blue-500"
        trend={false}
      />
      
      <StatCard
        title="Pending Payments"
        value={formatCurrency(stats.pendingAmount)}
        subtitle={`${stats.pendingInvoices} invoices`}
        icon={FiClock}
        color="bg-yellow-500"
        trend={false}
      />
      
      <StatCard
        title="Overdue Invoices"
        value={formatCurrency(stats.overdueAmount)}
        subtitle={`${stats.overdueInvoices} invoices`}
        icon={FiAlertTriangle}
        color="bg-red-500"
        trend={false}
      />
      
      <StatCard
        title="Avg Invoice Value"
        value={formatCurrency(stats.averageInvoiceValue)}
        subtitle="Per invoice"
        icon={FiFileText}
        color="bg-purple-500"
        trend={false}
      />
      
      <StatCard
        title="Invoice Growth"
        value={formatPercentage(stats.invoiceGrowth)}
        subtitle="Last 30 days"
        icon={FiTrendingUp}
        color="bg-indigo-500"
        trend={true}
        trendValue={stats.invoiceGrowth}
      />
      
      <StatCard
        title="Payment Rate"
        value={`${stats.paymentRate.toFixed(1)}%`}
        subtitle="Invoices paid"
        icon={FiCheckCircle}
        color="bg-teal-500"
        trend={false}
      />
      
      <StatCard
        title="This Month"
        value={formatCurrency(stats.totalAmount)}
        subtitle="Total revenue"
        icon={FiCalendar}
        color="bg-orange-500"
        trend={false}
      />
    </div>
  );
}
