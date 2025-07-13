import React from 'react';

export default function RecentActivity({ activities }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Recent Activity</h3>
      <ul className="space-y-3">
        {activities.map((activity, index) => (
          <li key={index} className="flex items-center text-sm">
            <span className="font-medium text-gray-900 dark:text-white mr-2">{activity.title}</span>
            <span className="text-gray-500 dark:text-gray-400">was {activity.action}</span>
            <span className="ml-auto text-gray-400 dark:text-gray-500">
              {new Date(activity.time).toLocaleTimeString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}