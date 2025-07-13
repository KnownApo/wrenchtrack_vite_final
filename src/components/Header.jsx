import React from 'react';
import { FaBars, FaBell, FaUserCircle, FaSearch } from 'react-icons/fa';

export default function Header({ toggleSidebar, notifications = [], userProfile }) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex items-center justify-between">
      <button onClick={toggleSidebar} className="text-gray-900 dark:text-white md:hidden">
        <FaBars size={24} />
      </button>
      <div className="flex-1 mx-4">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search..."
            className="w-full p-2 pl-8 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          />
          <FaSearch className="absolute left-2 top-3 text-gray-400" />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <button className="text-gray-900 dark:text-white">
            <FaBell size={24} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        <button onClick={userProfile} className="text-gray-900 dark:text-white">
          <FaUserCircle size={24} />
        </button>
      </div>
    </header>
  );
}