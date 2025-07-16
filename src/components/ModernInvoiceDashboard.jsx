import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Users, 
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  Activity
} from 'lucide-react';

const ModernStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  subtitle, 
  gradient,
  index = 0 
}) => {
  const isPositiveTrend = trend === 'up';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="card card-hover group relative overflow-hidden"
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
      
      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
              isPositiveTrend 
                ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' 
                : 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
            }`}>
              {isPositiveTrend ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trendValue}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const QuickMetric = ({ label, value, icon: Icon, color = "blue" }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className="flex items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
  >
    <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
      <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  </motion.div>
);

const ModernInvoiceDashboard = ({ stats }) => {
  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card">
              <div className="p-6">
                <div className="animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const primaryStats = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue || stats.totalBilled || 0),
      icon: DollarSign,
      trend: stats.totalRevenue > 0 ? 'up' : null,
      trendValue: '+12.5%',
      subtitle: "This month",
      gradient: "from-green-500 to-emerald-600"
    },
    {
      title: "Pending Invoices",
      value: stats.pendingCount || 0,
      icon: FileText,
      trend: 'up',
      trendValue: '+3',
      subtitle: formatCurrency(stats.pendingAmount || 0),
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      title: "Paid Invoices",
      value: stats.paidCount || 0,
      icon: CheckCircle,
      trend: 'up',
      trendValue: '+8',
      subtitle: formatCurrency(stats.paidAmount || 0),
      gradient: "from-purple-500 to-pink-600"
    },
    {
      title: "Active Customers",
      value: "24", // This would come from customer stats
      icon: Users,
      trend: 'up',
      trendValue: '+2',
      subtitle: "This week",
      gradient: "from-orange-500 to-red-600"
    }
  ];

  const quickMetrics = [
    { label: "Overdue", value: stats.overdueCount || 0, icon: AlertCircle, color: "red" },
    { label: "Drafts", value: stats.draftCount || 0, icon: Clock, color: "yellow" },
    { label: "This Week", value: "8", icon: Calendar, color: "green" },
    { label: "Active Jobs", value: "12", icon: Activity, color: "purple" }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Business Overview
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your business performance at a glance
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg"
        >
          <Activity className="w-4 h-4" />
          <span className="text-sm font-medium">Live Data</span>
        </motion.div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {primaryStats.map((stat, index) => (
          <ModernStatCard
            key={stat.title}
            {...stat}
            index={index}
          />
        ))}
      </div>

      {/* Quick Metrics */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickMetrics.map((metric) => (
              <QuickMetric
                key={metric.label}
                {...metric}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="card">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Revenue Trend
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">This Year</span>
            </div>
          </div>
          <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">Chart coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernInvoiceDashboard;
