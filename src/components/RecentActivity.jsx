import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiDollarSign, FiClock, FiUser } from 'react-icons/fi';
import { formatCurrency } from '../utils/helpers/helpers';

const ActivityIcon = ({ type, status }) => {
  const getIconAndColor = () => {
    if (type === 'invoice') {
      switch (status) {
        case 'paid':
          return { icon: <FiDollarSign size={16} />, color: 'text-green-500 bg-green-100 dark:bg-green-900' };
        case 'pending':
          return { icon: <FiClock size={16} />, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900' };
        case 'overdue':
          return { icon: <FiFileText size={16} />, color: 'text-red-500 bg-red-100 dark:bg-red-900' };
        default:
          return { icon: <FiFileText size={16} />, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900' };
      }
    }
    return { icon: <FiUser size={16} />, color: 'text-gray-500 bg-gray-100 dark:bg-gray-700' };
  };

  const { icon, color } = getIconAndColor();
  
  return (
    <div className={`p-2 rounded-full ${color}`}>
      {icon}
    </div>
  );
};

export default function RecentActivity({ activities = [] }) {
  const navigate = useNavigate();
  
  const formatTimeAgo = (date) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now - activityDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return activityDate.toLocaleDateString();
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h3>
        <div className="text-center py-8">
          <FiClock size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Your recent invoices and activities will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Recent Activity
      </h3>
      
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={activity.id || index} className="flex items-start gap-3">
            <ActivityIcon type={activity.type} status={activity.status} />
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {activity.type === 'invoice' && activity.customerId ? (
                  <span>
                    Invoice {activity.id?.slice(0, 8)} for{' '}
                    <button
                      onClick={() => navigate(`/customers/${activity.customerId}`)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      {activity.customerName || 'Unknown Customer'}
                    </button>
                  </span>
                ) : (
                  activity.description || activity.title || 'Unknown activity'
                )}
              </p>
              
              <div className="flex items-center gap-2 mt-1">
                {activity.amount && (
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {formatCurrency(activity.amount)}
                  </span>
                )}
                
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  activity.status === 'paid' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : activity.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : activity.status === 'overdue'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {activity.status}
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimeAgo(activity.timestamp || activity.time)}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {activities.length >= 5 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium">
            View all activity →
          </button>
        </div>
      )}
    </div>
  );
}