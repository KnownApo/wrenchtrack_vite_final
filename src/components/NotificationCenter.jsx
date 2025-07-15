import React, { useState, useEffect, useCallback } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import { useVehicles } from '../context/VehicleContext';
import { useCustomers } from '../context/CustomerContext';
import { differenceInDays } from 'date-fns';
import { 
  FiBell, FiX, FiCalendar, FiDollarSign,
  FiTool, FiTruck, FiCheckCircle
} from 'react-icons/fi';

export default function NotificationCenter() {
  const { invoices } = useInvoice();
  const { vehicles } = useVehicles();
  const { customers } = useCustomers();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const generateNotifications = useCallback(() => {
    const newNotifications = [];
    const now = new Date();

    // Overdue invoices
    invoices.forEach(invoice => {
      if (invoice.status !== 'paid' && invoice.dueDate) {
        const dueDate = new Date(invoice.dueDate);
        const daysDiff = differenceInDays(now, dueDate);
        
        if (daysDiff > 0) {
          newNotifications.push({
            id: `overdue-${invoice.id}`,
            type: 'overdue',
            title: 'Overdue Invoice',
            message: `Invoice ${invoice.invoiceNumber} is ${daysDiff} days overdue`,
            data: invoice,
            priority: 'high',
            icon: FiDollarSign,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-900/20'
          });
        }
      }
    });

    // Invoices due soon (within 3 days)
    invoices.forEach(invoice => {
      if (invoice.status !== 'paid' && invoice.dueDate) {
        const dueDate = new Date(invoice.dueDate);
        const daysDiff = differenceInDays(dueDate, now);
        
        if (daysDiff >= 0 && daysDiff <= 3) {
          newNotifications.push({
            id: `due-soon-${invoice.id}`,
            type: 'due-soon',
            title: 'Invoice Due Soon',
            message: `Invoice ${invoice.invoiceNumber} is due in ${daysDiff} days`,
            data: invoice,
            priority: 'medium',
            icon: FiCalendar,
            color: 'text-yellow-600 dark:text-yellow-400',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
          });
        }
      }
    });

    // Vehicles needing service
    vehicles.forEach(vehicle => {
      if (vehicle.status === 'needs_service') {
        const customer = customers.find(c => c.id === vehicle.customerId);
        newNotifications.push({
          id: `service-${vehicle.id}`,
          type: 'service',
          title: 'Vehicle Needs Service',
          message: `${vehicle.year} ${vehicle.make} ${vehicle.model} needs service${customer ? ` for ${customer.name}` : ''}`,
          data: vehicle,
          priority: 'medium',
          icon: FiTool,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20'
        });
      }
    });

    // High mileage vehicles (over 100k miles)
    vehicles.forEach(vehicle => {
      if (vehicle.mileage && parseInt(vehicle.mileage) > 100000) {
        const customer = customers.find(c => c.id === vehicle.customerId);
        newNotifications.push({
          id: `high-mileage-${vehicle.id}`,
          type: 'high-mileage',
          title: 'High Mileage Vehicle',
          message: `${vehicle.year} ${vehicle.make} ${vehicle.model} has ${vehicle.mileage} miles${customer ? ` (${customer.name})` : ''}`,
          data: vehicle,
          priority: 'low',
          icon: FiTruck,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20'
        });
      }
    });

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    newNotifications.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    setNotifications(newNotifications);
  }, [invoices, vehicles, customers]);

  useEffect(() => {
    generateNotifications();
  }, [generateNotifications]);

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationCount = () => {
    return notifications.filter(n => n.priority === 'high').length;
  };

  const handleNotificationClick = (notification) => {
    // Handle navigation based on notification type
    switch (notification.type) {
      case 'overdue':
      case 'due-soon':
        // Navigate to invoice
        window.location.href = `/invoices/${notification.data.id}`;
        break;
      case 'service':
      case 'high-mileage':
        // Navigate to vehicle service records
        window.location.href = `/vehicles/${notification.data.id}/service-records`;
        break;
      default:
        break;
    }
    setIsOpen(false);
  };

  const urgentCount = getNotificationCount();

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <FiBell className="w-5 h-5" />
        {urgentCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {urgentCount > 9 ? '9+' : urgentCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            {notifications.length > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <FiCheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map(notification => {
                  const Icon = notification.icon;
                  return (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-l-4 ${
                        notification.priority === 'high' ? 'border-red-500' :
                        notification.priority === 'medium' ? 'border-yellow-500' :
                        'border-blue-500'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${notification.bgColor} flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${notification.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setNotifications([])}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
