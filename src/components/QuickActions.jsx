import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiUser, FiTool, FiBarChart2, FiSettings } from 'react-icons/fi';

const quickActions = [
  { 
    id: 'new-invoice', 
    label: 'Create Invoice', 
    icon: <FiFileText />, 
    path: '/invoices/create',
    description: 'Create a new invoice for a customer',
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  { 
    id: 'add-customer', 
    label: 'Add Customer', 
    icon: <FiUser />, 
    path: '/customers',
    description: 'Add a new customer to your database',
    color: 'bg-green-500 hover:bg-green-600'
  },
  { 
    id: 'manage-parts', 
    label: 'Manage Parts', 
    icon: <FiTool />, 
    path: '/parts',
    description: 'View and manage your parts inventory',
    color: 'bg-purple-500 hover:bg-purple-600'
  },
  { 
    id: 'view-analytics', 
    label: 'View Analytics', 
    icon: <FiBarChart2 />, 
    path: '/analytics',
    description: 'View business performance and metrics',
    color: 'bg-orange-500 hover:bg-orange-600'
  },
  { 
    id: 'settings', 
    label: 'Settings', 
    icon: <FiSettings />, 
    path: '/settings',
    description: 'Configure your business settings',
    color: 'bg-gray-500 hover:bg-gray-600'
  },
];

export default function QuickActions() {
  const navigate = useNavigate();

  const handleActionClick = (action) => {
    navigate(action.path);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Quick Actions
      </h3>
      
      <div className="space-y-3">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg text-white transition-colors duration-200 ${action.color}`}
          >
            <div className="flex-shrink-0">
              {action.icon}
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">{action.label}</div>
              <div className="text-sm opacity-90">{action.description}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          💡 Tip: Use keyboard shortcuts to navigate faster throughout the app.
        </p>
      </div>
    </div>
  );
}
