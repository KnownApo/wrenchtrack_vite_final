import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; 
import { useAuth } from '../AuthContext';
import { Bar } from 'react-chartjs-2';
import { FaClock, FaCheckCircle, FaMoneyBillWave, FaChartLine } from 'react-icons/fa';
import { getTrackingSummary } from '../utils/invoiceTracking';

/**
 * Component to display invoice tracking analytics dashboard
 */
export default function InvoiceTrackingAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalInvoices: 0,
    completedInvoices: 0,
    completedUnpaidInvoices: 0,
    completedPaidInvoices: 0,
    avgTimeToComplete: 0,
    avgTimeToPay: 0,
    avgMilestones: 0,
    totalRevenue: 0,
    completionRates: {
      datasets: [],
      labels: []
    },
    timeToComplete: [], // For distribution chart
    timeToPay: []  // For distribution chart
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const invoicesRef = collection(db, 'users', user.uid, 'invoices');
        const snapshot = await getDocs(invoicesRef);
        
        if (snapshot.empty) {
          setAnalytics({
            ...analytics,
            totalInvoices: 0
          });
          return;
        }
        
        // Process all invoices and calculate analytics
        let stats = {
          totalInvoices: 0,
          completedInvoices: 0,
          completedUnpaidInvoices: 0,
          completedPaidInvoices: 0,
          pendingInvoices: 0,
          totalRevenue: 0,
          collectedRevenue: 0,
          timeToCompleteValues: [],
          timeToPayValues: [],
          milestoneCounts: [],
          
          // For charts
          invoicesByWeek: {},
          invoicesByStatus: {
            pending: 0,
            completed_unpaid: 0,
            completed_paid: 0,
            paid: 0
          }
        };
        
        // Get current date for week calculations
        const currentDate = new Date();
        const weeksToShow = 8; // Number of weeks to include in chart
        
        // Initialize weeks data structure
        for (let i = 0; i < weeksToShow; i++) {
          const weekDate = new Date(currentDate);
          weekDate.setDate(currentDate.getDate() - (i * 7));
          const weekKey = `${weekDate.getFullYear()}-${weekDate.getMonth() + 1}-${Math.floor(weekDate.getDate() / 7)}`;
          stats.invoicesByWeek[weekKey] = {
            completed: 0,
            paid: 0,
            created: 0
          };
        }
        
        // Process each invoice
        snapshot.docs.forEach(doc => {
          const invoice = { id: doc.id, ...doc.data() };
          const total = parseFloat(invoice.total) || 0;
          const trackingSummary = invoice.tracking ? getTrackingSummary(invoice) : null;
          
          stats.totalInvoices++;
          stats.totalRevenue += total;
          
          if (trackingSummary) {
            // Update status counts
            stats.invoicesByStatus[trackingSummary.status] = 
              (stats.invoicesByStatus[trackingSummary.status] || 0) + 1;
            
            // Log milestone counts
            stats.milestoneCounts.push(trackingSummary.milestoneCount || 0);
            
            // Handle completed invoices
            if (trackingSummary.status === 'completed_unpaid' || 
                trackingSummary.status === 'completed_paid') {
              stats.completedInvoices++;
              
              if (trackingSummary.status === 'completed_unpaid') {
                stats.completedUnpaidInvoices++;
              } else {
                stats.completedPaidInvoices++;
                stats.collectedRevenue += total;
              }
              
              // Track time to complete
              if (trackingSummary.timeToComplete) {
                stats.timeToCompleteValues.push(trackingSummary.timeToComplete);
              }
            }
            
            // Track time to pay for paid invoices
            if (trackingSummary.status === 'completed_paid' || trackingSummary.status === 'paid') {
              if (trackingSummary.timeToPay) {
                stats.timeToPayValues.push(trackingSummary.timeToPay);
              }
              
              if (trackingSummary.status === 'paid') {
                stats.collectedRevenue += total;
              }
            }
            
            // Add to weekly data
            const createdAt = invoice.createdAt?.toDate?.() || new Date(invoice.createdAt || Date.now());
            const weekKey = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}-${Math.floor(createdAt.getDate() / 7)}`;
            
            if (stats.invoicesByWeek[weekKey]) {
              stats.invoicesByWeek[weekKey].created++;
              
              if (trackingSummary.status === 'completed_unpaid' || 
                  trackingSummary.status === 'completed_paid') {
                stats.invoicesByWeek[weekKey].completed++;
              }
              
              if (trackingSummary.status === 'completed_paid' || 
                  trackingSummary.status === 'paid') {
                stats.invoicesByWeek[weekKey].paid++;
              }
            }
          } else {
            // Consider pending if no tracking
            stats.pendingInvoices++;
            stats.invoicesByStatus.pending = (stats.invoicesByStatus.pending || 0) + 1;
          }
        });
        
        // Calculate averages
        const avgTimeToComplete = stats.timeToCompleteValues.length ? 
          stats.timeToCompleteValues.reduce((sum, time) => sum + time, 0) / stats.timeToCompleteValues.length : 0;
          
        const avgTimeToPay = stats.timeToPayValues.length ? 
          stats.timeToPayValues.reduce((sum, time) => sum + time, 0) / stats.timeToPayValues.length : 0;
          
        const avgMilestones = stats.milestoneCounts.length ? 
          stats.milestoneCounts.reduce((sum, count) => sum + count, 0) / stats.milestoneCounts.length : 0;
        
        // Prepare chart data
        const weeks = Object.keys(stats.invoicesByWeek).sort();
        const completionRates = {
          labels: weeks.map(week => {
            const [year, month, weekNum] = week.split('-');
            return `W${weekNum}, ${month}/${year}`;
          }),
          datasets: [
            {
              label: 'Created',
              data: weeks.map(week => stats.invoicesByWeek[week].created),
              backgroundColor: 'rgba(53, 162, 235, 0.5)',
              borderColor: 'rgba(53, 162, 235, 1)',
              borderWidth: 1
            },
            {
              label: 'Completed',
              data: weeks.map(week => stats.invoicesByWeek[week].completed),
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
            },
            {
              label: 'Paid',
              data: weeks.map(week => stats.invoicesByWeek[week].paid),
              backgroundColor: 'rgba(75, 192, 75, 0.5)',
              borderColor: 'rgba(75, 192, 75, 1)',
              borderWidth: 1
            }
          ]
        };
        
        // Set all analytics
        setAnalytics({
          totalInvoices: stats.totalInvoices,
          completedInvoices: stats.completedInvoices,
          completedUnpaidInvoices: stats.completedUnpaidInvoices,
          completedPaidInvoices: stats.completedPaidInvoices,
          pendingInvoices: stats.pendingInvoices,
          avgTimeToComplete,
          avgTimeToPay,
          avgMilestones,
          totalRevenue: stats.totalRevenue,
          collectedRevenue: stats.collectedRevenue,
          completionRates,
          timeToComplete: stats.timeToCompleteValues,
          timeToPay: stats.timeToPayValues,
          invoicesByStatus: stats.invoicesByStatus
        });
        
      } catch (err) {
        console.error('Error fetching invoice analytics:', err);
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  // Format duration for display
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
  
  // Calculate completion percentage
  const calculateCompletionRate = () => {
    if (analytics.totalInvoices === 0) return 0;
    return Math.round((analytics.completedInvoices / analytics.totalInvoices) * 100);
  };
  
  // Calculate payment percentage
  const calculatePaymentRate = () => {
    if (analytics.completedInvoices === 0) return 0;
    return Math.round(((analytics.completedPaidInvoices) / analytics.completedInvoices) * 100);
  };
  
  // Calculate revenue collection rate
  const calculateRevenueCollectionRate = () => {
    if (analytics.totalRevenue === 0) return 0;
    return Math.round((analytics.collectedRevenue / analytics.totalRevenue) * 100);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-700">
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <FaChartLine />
        <span>Invoice Tracking Analytics</span>
      </h2>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Completion Rate</div>
          <div className="flex items-center gap-2 mt-1">
            <FaCheckCircle className="text-blue-500" />
            <span className="text-2xl font-bold">{calculateCompletionRate()}%</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {analytics.completedInvoices} of {analytics.totalInvoices} invoices completed
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Payment Rate</div>
          <div className="flex items-center gap-2 mt-1">
            <FaMoneyBillWave className="text-green-500" />
            <span className="text-2xl font-bold">{calculatePaymentRate()}%</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {analytics.completedPaidInvoices} of {analytics.completedInvoices} completed invoices paid
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Avg. Time to Complete</div>
          <div className="flex items-center gap-2 mt-1">
            <FaClock className="text-blue-500" />
            <span className="text-2xl font-bold">{formatDuration(analytics.avgTimeToComplete)}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            From creation to completion
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Avg. Time to Payment</div>
          <div className="flex items-center gap-2 mt-1">
            <FaClock className="text-green-500" />
            <span className="text-2xl font-bold">{formatDuration(analytics.avgTimeToPay)}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            From completion to payment
          </div>
        </div>
      </div>
      
      {/* Revenue Metrics */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-medium mb-2">Revenue Collection</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500">Total Revenue</div>
            <div className="text-xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Collected Revenue</div>
            <div className="text-xl font-bold text-green-600">${analytics.collectedRevenue.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Collection Rate</div>
            <div className="text-xl font-bold">{calculateRevenueCollectionRate()}%</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full" 
              style={{ width: `${calculateRevenueCollectionRate()}%` }} 
            />
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-medium mb-2">Weekly Completion Rates</h3>
        <div className="h-64">
          <Bar
            data={analytics.completionRates}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: {
                  stacked: false,
                },
                y: {
                  stacked: false,
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      </div>
      
      {/* Status Breakdown */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-medium mb-2">Invoice Status Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-yellow-700 font-medium">Pending</div>
            <div className="text-2xl">{analytics.invoicesByStatus?.pending || 0}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-700 font-medium">Completed (Unpaid)</div>
            <div className="text-2xl">{analytics.completedUnpaidInvoices}</div>
          </div>
          <div className="bg-teal-50 p-3 rounded-lg">
            <div className="text-teal-700 font-medium">Completed (Paid)</div>
            <div className="text-2xl">{analytics.completedPaidInvoices}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-700 font-medium">Paid</div>
            <div className="text-2xl">{analytics.invoicesByStatus?.paid || 0}</div>
          </div>
        </div>
      </div>
      
      {/* Efficiency Metrics */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-medium mb-2">Efficiency Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500">Average Milestones</div>
            <div className="text-xl font-bold">{analytics.avgMilestones.toFixed(1)}</div>
            <div className="text-xs text-gray-500 mt-1">Milestones per invoice</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Completion Efficiency</div>
            <div className="text-xl font-bold">
              {analytics.avgTimeToComplete ? 
                ((1000000 / analytics.avgTimeToComplete) * calculateCompletionRate() / 100).toFixed(2) : 
                'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Higher is better</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Payment Efficiency</div>
            <div className="text-xl font-bold">
              {analytics.avgTimeToPay ? 
                ((1000000 / analytics.avgTimeToPay) * calculatePaymentRate() / 100).toFixed(2) : 
                'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Higher is better</div>
          </div>
        </div>
      </div>
      
      {/* No Data State */}
      {analytics.totalInvoices === 0 && (
        <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
          <p>No invoice data available for analysis.</p>
          <p className="mt-2 text-sm">Create and complete invoices to see analytics here.</p>
        </div>
      )}
    </div>
  );
} 