import React from 'react';
import { FiTool, FiDroplet, FiRotateCw, FiZap, FiDisc } from 'react-icons/fi';

const COMMON_SERVICES = [
  {
    id: 'oil-change',
    name: 'Oil Change',
    icon: FiDroplet,
    color: 'blue',
    defaultCost: 45,
    defaultLaborCost: 25,
    defaultDescription: 'Regular oil change with filter replacement',
    defaultParts: 'Engine oil, Oil filter',
    estimatedTime: '30 minutes'
  },
  {
    id: 'tire-service',
    name: 'Tire Service',
    icon: FiDisc,
    color: 'green',
    defaultCost: 120,
    defaultLaborCost: 40,
    defaultDescription: 'Tire rotation, balancing, and inspection',
    defaultParts: 'Tire weights, Valve stems (if needed)',
    estimatedTime: '45 minutes'
  },
  {
    id: 'brake-service',
    name: 'Brake Service',
    icon: FiRotateCw,
    color: 'red',
    defaultCost: 180,
    defaultLaborCost: 80,
    defaultDescription: 'Brake pad replacement and rotor inspection',
    defaultParts: 'Brake pads, Brake fluid',
    estimatedTime: '90 minutes'
  },
  {
    id: 'battery-service',
    name: 'Battery Service',
    icon: FiZap,
    color: 'yellow',
    defaultCost: 150,
    defaultLaborCost: 30,
    defaultDescription: 'Battery replacement and electrical system check',
    defaultParts: 'Car battery, Terminal cleaner',
    estimatedTime: '30 minutes'
  },
  {
    id: 'tune-up',
    name: 'Tune-Up',
    icon: FiTool,
    color: 'purple',
    defaultCost: 250,
    defaultLaborCost: 120,
    defaultDescription: 'Complete engine tune-up and inspection',
    defaultParts: 'Spark plugs, Air filter, Fuel filter',
    estimatedTime: '2 hours'
  },
  {
    id: 'general-maintenance',
    name: 'General Maintenance',
    icon: FiTool,
    color: 'gray',
    defaultCost: 80,
    defaultLaborCost: 60,
    defaultDescription: 'General maintenance and inspection',
    defaultParts: 'Various fluids and filters',
    estimatedTime: '60 minutes'
  }
];

export default function QuickServiceActions({ onServiceSelect, vehicle }) {
  const handleServiceClick = (service) => {
    const serviceData = {
      serviceDate: new Date().toISOString().split('T')[0],
      serviceType: service.name,
      description: service.defaultDescription,
      partsUsed: service.defaultParts,
      cost: service.defaultCost.toString(),
      laborCost: service.defaultLaborCost.toString(),
      mileage: vehicle?.mileage || '',
      vehicleId: vehicle?.id || '',
      recommendations: '',
      technician: '',
      nextServiceDate: '',
      nextServiceMileage: ''
    };
    
    onServiceSelect(serviceData);
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800',
      green: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800',
      red: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800',
      yellow: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800',
      purple: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800',
      gray: 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Quick Service Templates
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {COMMON_SERVICES.map((service) => {
          const IconComponent = service.icon;
          return (
            <button
              key={service.id}
              onClick={() => handleServiceClick(service)}
              className={`p-3 rounded-lg transition-colors text-left ${getColorClasses(service.color)}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <IconComponent size={16} />
                <span className="font-medium text-sm">{service.name}</span>
              </div>
              <p className="text-xs opacity-75 mb-1">{service.estimatedTime}</p>
              <p className="text-xs font-medium">
                ${service.defaultCost + service.defaultLaborCost} est.
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
