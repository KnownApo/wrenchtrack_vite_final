import React from 'react';

export default function InvoiceAnalytics({ data }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Invoices</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalInvoices}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">${data.totalRevenue.toFixed(2)}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Amount</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">${data.pendingAmount.toFixed(2)}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Overdue Invoices</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.overdueInvoices}</p>
      </div>
    </div>
  );
}