import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, User, Wrench, BarChart2, Settings, Shield, Zap, ArrowRight } from 'lucide-react';

const quickActions = [
  { 
    id: 'new-invoice', 
    label: 'Create Invoice', 
    icon: FileText, 
    path: '/invoices/create',
    description: 'Create a new invoice for a customer',
    color: 'from-blue-500 to-blue-600',
    hoverColor: 'hover:from-blue-600 hover:to-blue-700'
  },
  { 
    id: 'vehicle-inspection', 
    label: 'Vehicle Inspection', 
    icon: Shield, 
    path: '/inspection',
    description: 'Perform comprehensive vehicle safety inspection',
    color: 'from-red-500 to-red-600',
    hoverColor: 'hover:from-red-600 hover:to-red-700'
  },
  { 
    id: 'add-customer', 
    label: 'Add Customer', 
    icon: User, 
    path: '/customers',
    description: 'Add a new customer to your database',
    color: 'from-green-500 to-green-600',
    hoverColor: 'hover:from-green-600 hover:to-green-700'
  },
  { 
    id: 'manage-parts', 
    label: 'Manage Parts', 
    icon: Wrench, 
    path: '/parts',
    description: 'View and manage your parts inventory',
    color: 'from-purple-500 to-purple-600',
    hoverColor: 'hover:from-purple-600 hover:to-purple-700'
  },
  { 
    id: 'view-analytics', 
    label: 'View Analytics', 
    icon: BarChart2, 
    path: '/analytics',
    description: 'View business performance and metrics',
    color: 'from-orange-500 to-orange-600',
    hoverColor: 'hover:from-orange-600 hover:to-orange-700'
  },
  { 
    id: 'settings', 
    label: 'Settings', 
    icon: Settings, 
    path: '/settings',
    description: 'Configure your business settings',
    color: 'from-gray-500 to-gray-600',
    hoverColor: 'hover:from-gray-600 hover:to-gray-700'
  },
];

export default function QuickActions() {
  const navigate = useNavigate();

  const handleActionClick = (action) => {
    navigate(action.path);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="card-glass"
    >
      <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Quick Actions
          </h3>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-3">
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                onClick={() => handleActionClick(action)}
                className={`group w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${action.color} ${action.hoverColor} text-white transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]`}
              >
                <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold mb-1">{action.label}</div>
                  <div className="text-sm opacity-90 leading-snug">{action.description}</div>
                </div>
                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
              </motion.button>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-sm">💡</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Pro Tip
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Use keyboard shortcuts to navigate faster throughout the app.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
