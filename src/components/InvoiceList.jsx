import React from 'react';

export default function InvoiceList({ invoices, onView }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700">
            <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">Invoice #</th>
            <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">Customer</th>
            <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">Amount</th>
            <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">Status</th>
            <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">Due Date</th>
            <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-2 border text-gray-900 dark:text-white">{invoice.invoiceNumber || invoice.id}</td>
              <td className="px-4 py-2 border text-gray-900 dark:text-white">{invoice.customerName || 'N/A'}</td>
              <td className="px-4 py-2 border text-gray-900 dark:text-white">${(invoice.totalAmount || 0).toFixed(2)}</td>
              <td className="px-4 py-2 border">
                <span className={`px-2 py-1 rounded text-sm ${
                  invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {invoice.status}
                </span>
              </td>
              <td className="px-4 py-2 border text-gray-900 dark:text-white">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
              </td>
              <td className="px-4 py-2 border">
                <button onClick={() => onView(invoice.id)} className="text-blue-600 dark:text-blue-400 hover:underline">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}