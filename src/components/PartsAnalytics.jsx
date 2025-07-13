import React from 'react';
import { CubeIcon, CurrencyDollarIcon, ExclamationIcon } from '@heroicons/react/outline'; // Add dep if needed: npm i @heroicons/react

export default function PartsAnalytics({ data }) {
  if (!data) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded flex items-center">
        <CubeIcon className="h-8 w-8 text-blue-600 dark:text-blue-300 mr-3" />
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Total Parts</h3>
          <p className="text-2xl text-gray-900 dark:text-white">{data.totalParts}</p>
        </div>
      </div>
      <div className="bg-green-100 dark:bg-green-900 p-4 rounded flex items-center">
        <CurrencyDollarIcon className="h-8 w-8 text-green-600 dark:text-green-300 mr-3" />
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Total Value</h3>
          <p className="text-2xl text-gray-900 dark:text-white">${data.totalValue.toFixed(2)}</p>
        </div>
      </div>
      <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded flex items-center">
        <ExclamationIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-300 mr-3" />
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Low Stock Items</h3>
          <p className="text-2xl text-gray-900 dark:text-white">{data.lowStock}</p>
        </div>
      </div>
    </div>
  );
}