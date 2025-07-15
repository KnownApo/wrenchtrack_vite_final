import React, { useMemo } from 'react';
import { useVehicles } from '../context/VehicleContext';
import { FiAlertTriangle, FiClock, FiCheck, FiTool, FiCalendar } from 'react-icons/fi';
import { format, addMonths, isAfter, isBefore } from 'date-fns';

export default function MaintenanceScheduler({ customerId }) {
  const { 
    getVehiclesByCustomer, 
    getServiceRecordsByVehicle 
  } = useVehicles();

  const maintenanceSchedule = useMemo(() => {
    const vehicles = getVehiclesByCustomer(customerId);
    const schedule = [];

    vehicles.forEach(vehicle => {
      const serviceRecords = getServiceRecordsByVehicle(vehicle.id);
      
      // Standard maintenance intervals
      const maintenanceTypes = [
        {
          name: 'Oil Change',
          intervalMonths: 3,
          intervalMiles: 5000,
          priority: 'high'
        },
        {
          name: 'Tire Rotation',
          intervalMonths: 6,
          intervalMiles: 7500,
          priority: 'medium'
        },
        {
          name: 'Brake Inspection',
          intervalMonths: 12,
          intervalMiles: 15000,
          priority: 'high'
        },
        {
          name: 'General Maintenance',
          intervalMonths: 12,
          intervalMiles: 12000,
          priority: 'medium'
        }
      ];

      maintenanceTypes.forEach(maintenance => {
        const lastServiceOfType = serviceRecords.find(record => 
          record.serviceType.toLowerCase().includes(maintenance.name.toLowerCase().split(' ')[0])
        );

        let dueDate = new Date();
        let dueMileage = (vehicle.mileage || 0) + maintenance.intervalMiles;
        let status = 'due';

        if (lastServiceOfType) {
          const lastServiceDate = new Date(lastServiceOfType.serviceDate);
          dueDate = addMonths(lastServiceDate, maintenance.intervalMonths);
          dueMileage = (lastServiceOfType.mileage || 0) + maintenance.intervalMiles;
          
          const now = new Date();
          if (isAfter(now, dueDate)) {
            status = 'overdue';
          } else if (isBefore(dueDate, addMonths(now, 1))) {
            status = 'due-soon';
          } else {
            status = 'upcoming';
          }
        }

        schedule.push({
          vehicleId: vehicle.id,
          vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          licensePlate: vehicle.licensePlate,
          serviceType: maintenance.name,
          dueDate,
          dueMileage,
          status,
          priority: maintenance.priority,
          lastService: lastServiceOfType ? new Date(lastServiceOfType.serviceDate) : null
        });
      });
    });

    // Sort by priority and due date
    return schedule.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const statusOrder = { overdue: 0, 'due-soon': 1, due: 2, upcoming: 3 };
      
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      if (a.status !== b.status) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      
      return a.dueDate - b.dueDate;
    });
  }, [customerId, getVehiclesByCustomer, getServiceRecordsByVehicle]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'overdue':
        return <FiAlertTriangle className="text-red-500" size={16} />;
      case 'due-soon':
        return <FiClock className="text-yellow-500" size={16} />;
      case 'due':
        return <FiTool className="text-orange-500" size={16} />;
      case 'upcoming':
        return <FiCalendar className="text-blue-500" size={16} />;
      default:
        return <FiCheck className="text-green-500" size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'due-soon':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'due':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'upcoming':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
    }
  };

  if (maintenanceSchedule.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Maintenance Schedule
        </h4>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <FiTool className="mx-auto mb-2" size={32} />
          <p>No maintenance schedule available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Maintenance Schedule
      </h4>
      
      <div className="space-y-3">
        {maintenanceSchedule.slice(0, 8).map((item, index) => (
          <div
            key={`${item.vehicleId}-${item.serviceType}-${index}`}
            className={`p-3 rounded-lg border ${getStatusColor(item.status)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(item.status)}
                <div>
                  <p className="font-medium text-sm">{item.serviceType}</p>
                  <p className="text-xs opacity-75">
                    {item.vehicle} {item.licensePlate && `(${item.licensePlate})`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {format(item.dueDate, 'MMM d, yyyy')}
                </p>
                <p className="text-xs opacity-75">
                  {item.dueMileage.toLocaleString()} miles
                </p>
              </div>
            </div>
            
            {item.lastService && (
              <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                <p className="text-xs opacity-75">
                  Last service: {format(item.lastService, 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {maintenanceSchedule.length > 8 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            +{maintenanceSchedule.length - 8} more maintenance items
          </p>
        </div>
      )}
    </div>
  );
}
