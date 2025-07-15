import React from 'react';
import { FiCheck, FiUsers, FiTruck, FiFileText, FiTool, FiBarChart3, FiShoppingCart, FiClock } from 'react-icons/fi';

export default function SystemSummary() {
  const features = [
    {
      category: 'Customer Management',
      icon: FiUsers,
      color: 'blue',
      items: [
        'Real-time customer data synchronization',
        'Customer analytics and statistics',
        'Customer search and filtering',
        'Customer payment history tracking',
        'Quick customer actions (invoice, vehicle)',
        'Customer-specific vehicle management'
      ]
    },
    {
      category: 'Vehicle Management',
      icon: FiTruck,
      color: 'green',
      items: [
        'Vehicle-to-customer linking',
        'Vehicle service history tracking',
        'Vehicle analytics and maintenance status',
        'Vehicle filtering and search',
        'VIN and license plate tracking',
        'Mileage tracking and updates'
      ]
    },
    {
      category: 'Service Records',
      icon: FiTool,
      color: 'purple',
      items: [
        'Comprehensive service record management',
        'Quick service templates',
        'Service cost and labor tracking',
        'Parts usage documentation',
        'Service recommendations',
        'CSV export functionality'
      ]
    },
    {
      category: 'Invoice System',
      icon: FiFileText,
      color: 'red',
      items: [
        'Pre-filled invoice creation',
        'Customer and vehicle integration',
        'Purchase order number support',
        'Tax calculation and management',
        'Invoice status tracking',
        'Payment history integration'
      ]
    },
    {
      category: 'Maintenance Scheduling',
      icon: FiClock,
      color: 'yellow',
      items: [
        'Automated maintenance scheduling',
        'Overdue service alerts',
        'Maintenance priority system',
        'Service interval tracking',
        'Mileage-based scheduling',
        'Visual maintenance status'
      ]
    },
    {
      category: 'Analytics & Reporting',
      icon: FiBarChart3,
      color: 'indigo',
      items: [
        'Customer analytics dashboard',
        'Vehicle performance metrics',
        'Service cost analysis',
        'Revenue tracking',
        'Maintenance scheduling overview',
        'Real-time data visualization'
      ]
    },
    {
      category: 'Quick Actions',
      icon: FiShoppingCart,
      color: 'orange',
      items: [
        'Quick invoice creation from vehicles',
        'Service template selection',
        'Customer-specific quick actions',
        'Vehicle-specific quick actions',
        'Maintenance reminder actions',
        'Export and reporting tools'
      ]
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
      purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
      red: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
      yellow: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
      indigo: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400',
      orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        WrenchTrack System Features
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <div key={index} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(feature.color)}`}>
                  <IconComponent size={20} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {feature.category}
                </h3>
              </div>
              
              <ul className="space-y-2">
                {feature.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-2">
                    <FiCheck className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
          System Integration Status: Complete ✅
        </h3>
        <p className="text-sm text-green-700 dark:text-green-400">
          All customer, vehicle, service, and invoice systems are fully integrated with real-time synchronization,
          modern UI, comprehensive analytics, and workflow optimization features.
        </p>
      </div>
    </div>
  );
}
