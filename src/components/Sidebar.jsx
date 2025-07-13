import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaFileInvoice, FaUsers, FaCar, FaTools, FaCog, FaChartBar } from 'react-icons/fa';  // Icons for menu items

const Sidebar = ({ isOpen, toggleSidebar }) => {
  // Define default menu items array to prevent undefined 'map' error
  const menuItems = [
    { path: '/', name: 'Dashboard', icon: <FaHome /> },
    { path: '/invoices', name: 'Invoices', icon: <FaFileInvoice /> },
    { path: '/history', name: 'Invoice History', icon: <FaFileInvoice /> },
    { path: '/customers', name: 'Customers', icon: <FaUsers /> },
    { path: '/vehicles', name: 'Vehicles', icon: <FaCar /> },
    { path: '/parts', name: 'Parts', icon: <FaTools /> },
    { path: '/jobs', name: 'Jobs', icon: <FaTools /> },
    { path: '/settings', name: 'Settings', icon: <FaCog /> },
    { path: '/analytics', name: 'Analytics', icon: <FaChartBar /> },
  ];

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:relative md:translate-x-0`}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">WrenchTrack</h2>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      isActive ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                    }`
                  }
                  onClick={() => toggleSidebar(false)}  // Close sidebar on mobile after click
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;