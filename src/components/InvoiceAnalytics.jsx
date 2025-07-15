import React from 'react';

export default function InvoiceAnalytics({ data }) {
  // Provide safe defaults if data is undefined or missing properties
  const safeData = {
    totalInvoices: data?.totalInvoices || 0,
    totalRevenue: data?.totalRevenue || 0,
    pendingAmount: data?.pendingAmount || 0,
    overdueInvoices: data?.overdueInvoices || 0
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Invoices</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{safeData.totalInvoices}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">${safeData.totalRevenue.toFixed(2)}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Amount</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">${safeData.pendingAmount.toFixed(2)}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Overdue Invoices</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{safeData.overdueInvoices}</p>
      </div>
    </div>
  );
}