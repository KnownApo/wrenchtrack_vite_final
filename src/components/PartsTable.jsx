import React, { useState } from 'react';

export default function PartsTable({ parts, onEdit, onDelete, onAddToInvoice }) {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedParts = [...parts].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedParts = sortedParts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(sortedParts.length / itemsPerPage);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700">
            <th onClick={() => requestSort('name')} className="px-4 py-2 border cursor-pointer text-gray-900 dark:text-white">Name</th>
            <th onClick={() => requestSort('partNumber')} className="px-4 py-2 border cursor-pointer text-gray-900 dark:text-white">Part Number</th>
            <th onClick={() => requestSort('quantity')} className="px-4 py-2 border cursor-pointer text-gray-900 dark:text-white">Quantity</th>
            <th onClick={() => requestSort('cost')} className="px-4 py-2 border cursor-pointer text-gray-900 dark:text-white">Cost</th>
            <th className="px-4 py-2 border text-gray-900 dark:text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedParts.map((part) => (
            <tr key={part.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-2 border text-gray-900 dark:text-white">{part.name}</td>
              <td className="px-4 py-2 border text-gray-900 dark:text-white">{part.partNumber}</td>
              <td className="px-4 py-2 border text-gray-900 dark:text-white">{part.quantity} {part.quantity < part.minStock && <span className="text-red-500">(Low)</span>}</td>
              <td className="px-4 py-2 border text-gray-900 dark:text-white">${part.cost.toFixed(2)}</td>
              <td className="px-4 py-2 border">
                <button onClick={() => onEdit(part)} className="text-blue-600 dark:text-blue-400 mr-2 hover:underline">Edit</button>
                <button onClick={() => onDelete(part.id)} className="text-red-600 dark:text-red-400 mr-2 hover:underline">Delete</button>
                <button onClick={() => onAddToInvoice(part)} className="text-green-600 dark:text-green-400 hover:underline">Add to Invoice</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between mt-4">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded disabled:opacity-50">Previous</button>
        <span className="text-gray-900 dark:text-white">Page {currentPage} of {totalPages}</span>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}