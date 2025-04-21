import React from 'react';
import { FaClock, FaCheckCircle, FaMoneyBillWave, FaArchive, FaHourglass } from 'react-icons/fa';
import { getTrackingSummary, getTrackingStatus } from '../utils/invoiceTracking';

/**
 * Component to display invoice tracking status with visual indicators
 */
export default function InvoiceTrackingStatus({ invoice, showDetails = false }) {
  if (!invoice) return null;
  
  // Get tracking information
  const trackingStatus = getTrackingStatus(invoice);
  const trackingSummary = getTrackingSummary(invoice);
  
  // Helper to render the appropriate icon
  const renderIcon = (iconType) => {
    switch (iconType) {
      case 'check_unpaid':
        return <FaCheckCircle className="text-indigo-600" />;
      case 'check_paid':
        return <FaCheckCircle className="text-green-600" />;
      case 'money':
        return <FaMoneyBillWave className="text-green-600" />;
      case 'archive':
        return <FaArchive className="text-gray-600" />;
      case 'clock':
      default:
        return <FaClock className="text-yellow-600" />;
    }
  };
  
  // Format time duration in a human-readable way
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <div className="w-full">
      {/* Status Badge */}
      <div className="flex items-center">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${trackingStatus.colorClass}`}>
          {renderIcon(trackingStatus.iconType)}
          <span>{trackingStatus.label}</span>
        </div>
      </div>
      
      {/* Progress Visualization */}
      {showDetails && trackingSummary && (
        <div className="mt-4 space-y-3">
          {/* Completion Progress */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-600">Completion</span>
              <span className="text-xs font-medium text-gray-600">{trackingSummary.completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${trackingSummary.completionPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Payment Progress */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-600">Payment</span>
              <span className="text-xs font-medium text-gray-600">{trackingSummary.paymentPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${trackingSummary.paymentPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Time Metrics */}
          <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-medium text-gray-500">Time to Complete:</div>
              <div className="font-medium">{formatDuration(trackingSummary.timeToComplete)}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-medium text-gray-500">Time to Payment:</div>
              <div className="font-medium">{formatDuration(trackingSummary.timeToPay)}</div>
            </div>
          </div>
          
          {/* Last Activity */}
          <div className="flex items-center gap-2 text-xs mt-2">
            <FaHourglass className="text-gray-400" />
            <div>
              <span className="font-medium">Last activity: </span>
              <span>{trackingSummary.lastActivity.description}</span>
              <div className="text-gray-500">{formatTimestamp(trackingSummary.lastActivity.timestamp)}</div>
            </div>
          </div>
          
          {/* Milestone Count */}
          <div className="text-xs text-gray-500 mt-1">
            {trackingSummary.milestoneCount} milestone{trackingSummary.milestoneCount !== 1 ? 's' : ''} recorded
          </div>
        </div>
      )}
    </div>
  );
} 