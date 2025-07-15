import React from 'react';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaHourglass, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { formatCurrency } from '../utils/helpers/helpers';

const StatCard = ({ title, value, icon, bgColor, textColor, subtitle, subtitleValue }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className={`rounded-lg p-3 ${bgColor}`}>
          <div className={textColor}>
            {icon}
          </div>
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}: <span className="font-medium">{subtitleValue}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const InvoiceDashboard = ({ stats }) => {
  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue || stats.totalBilled || 0)}
          icon={<FaFileInvoiceDollar size={24} />}
          bgColor="bg-blue-100 dark:bg-blue-900"
          textColor="text-blue-600 dark:text-blue-400"
          subtitle="Total Invoices"
          subtitleValue={stats.totalInvoices || 0}
        />
        <StatCard
          title="Pending Amount"
          value={formatCurrency(stats.pendingAmount || 0)}
          icon={<FaHourglass size={24} />}
          bgColor="bg-yellow-100 dark:bg-yellow-900"
          textColor="text-yellow-600 dark:text-yellow-400"
          subtitle="Pending"
          subtitleValue={`${stats.pendingCount || 0} invoices`}
        />
        <StatCard
          title="Paid Amount"
          value={formatCurrency(stats.paidAmount || 0)}
          icon={<FaMoneyBillWave size={24} />}
          bgColor="bg-green-100 dark:bg-green-900"
          textColor="text-green-600 dark:text-green-400"
          subtitle="Paid"
          subtitleValue={`${stats.paidCount || 0} invoices`}
        />
        <StatCard
          title="Overdue Amount"
          value={formatCurrency(stats.overdueAmount || 0)}
          icon={<FaExclamationTriangle size={24} />}
          bgColor="bg-red-100 dark:bg-red-900"
          textColor="text-red-600 dark:text-red-400"
          subtitle="Overdue"
          subtitleValue={`${stats.overdueCount || 0} invoices`}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Draft Invoices"
          value={stats.draftCount || 0}
          icon={<FaFileInvoiceDollar size={24} />}
          bgColor="bg-gray-100 dark:bg-gray-700"
          textColor="text-gray-600 dark:text-gray-400"
          subtitle="Status"
          subtitleValue="Draft"
        />
        <StatCard
          title="Average Invoice"
          value={formatCurrency(stats.totalInvoices > 0 ? (stats.totalRevenue || stats.totalBilled || 0) / stats.totalInvoices : 0)}
          icon={<FaFileInvoiceDollar size={24} />}
          bgColor="bg-purple-100 dark:bg-purple-900"
          textColor="text-purple-600 dark:text-purple-400"
          subtitle="Per Invoice"
          subtitleValue="Average"
        />
        <StatCard
          title="Collection Rate"
          value={`${stats.totalRevenue > 0 ? Math.round(((stats.paidAmount || 0) / (stats.totalRevenue || stats.totalBilled || 1)) * 100) : 0}%`}
          icon={<FaCheckCircle size={24} />}
          bgColor="bg-indigo-100 dark:bg-indigo-900"
          textColor="text-indigo-600 dark:text-indigo-400"
          subtitle="Payment Rate"
          subtitleValue="Success"
        />
      </div>
    </div>
  );
};

export default InvoiceDashboard; 