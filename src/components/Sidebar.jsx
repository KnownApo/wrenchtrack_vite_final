import React from 'react';
import { Link } from 'react-router-dom';
import { FaMoon, FaSun, FaSignOutAlt } from 'react-icons/fa';

export default function Sidebar({ isOpen, toggleSidebar, menuItems, theme, toggleTheme, handleLogout }) {
  return (
    <div 
      className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 w-64 bg-white dark:bg-gray-800 shadow-lg transition-transform duration-300 ease-in-out z-50`}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">WrenchTrack</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              onClick={toggleSidebar}
              className="flex items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t dark:border-gray-700">
          <button
            onClick={toggleTheme}
            className="flex items-center w-full p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white mb-2"
          >
            {theme === 'dark' ? <FaSun className="mr-3" /> : <FaMoon className="mr-3" />}
            Toggle Theme
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
          >
            <FaSignOutAlt className="mr-3" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}