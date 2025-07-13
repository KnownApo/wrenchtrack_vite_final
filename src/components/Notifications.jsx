import React from 'react';
import { FaTimes } from 'react-icons/fa';

export default function Notifications({ notifications = [], onClose }) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-h-96 overflow-y-auto">
      {notifications.map((note, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded shadow-md border dark:border-gray-700 flex items-start space-x-4">
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 dark:text-white">{note.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">{note.message}</p>
          </div>
          <button onClick={() => onClose(index)} className="text-gray-500 dark:text-gray-400">
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
}