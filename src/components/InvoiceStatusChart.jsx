import React from 'react';

const statusColors = {
  draft: 'bg-gray-500',
  sent: 'bg-blue-500',
  pending: 'bg-yellow-500',
  paid: 'bg-green-500',
  overdue: 'bg-red-500',
  deleted: 'bg-purple-500',
};

export default function InvoiceStatusChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Invoice Status Distribution</h3>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.status} className="flex items-center">
            <div className="w-24 text-sm text-gray-700 dark:text-gray-300">{item.status}</div>
            <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`${statusColors[item.status] || 'bg-blue-500'} h-full`}
                style={{ width: `${(item.count / total) * 100}%` }}
              />
            </div>
            <div className="w-12 text-right text-sm text-gray-700 dark:text-gray-300">{item.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}