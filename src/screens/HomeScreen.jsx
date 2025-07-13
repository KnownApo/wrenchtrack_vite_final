import React, { useState, useEffect } from 'react';
import Dashboard from './DashboardScreen';
import Customers from './CustomersScreen';
import PartsCatalog from './PartsScreen';
import InvoiceScreen from './InvoiceScreen';
import InvoiceHistory from './InvoiceHistoryScreen';
import SignatureScreen from './SignatureScreen';
import Payments from './PaymentScreen';
import Settings from './SettingsScreen';
import VehicleServiceRecordScreen from './VehicleServiceRecordsScreen';
import QuickActions from '../components/QuickActions';
import { useAuth } from '../AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useInvoices } from '../context/InvoiceContext';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import firebaseService from '../services/firebaseService';
import { 
  FiCommand, FiMenu, FiX, FiSearch, FiGrid, FiUsers, FiTool, 
  FiFileText, FiClock, FiClipboard, FiCreditCard, FiSettings,
  FiLogOut, FiSun, FiMoon, FiBell, FiChevronDown, FiActivity,
  FiHome, FiChevronRight, FiAlertCircle, FiCheckCircle, FiInfo
} from 'react-icons/fi';

export default function HomeScreen({ activePage = 'dashboard' }) {
  const [currentPage, setCurrentPage] = useState(activePage);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { invoices, refreshInvoices } = useInvoices();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userName, setUserName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [businessLogo, setBusinessLogo] = useState('');
  const [hasNewFeatures, setHasNewFeatures] = useState(true);
  const navigate = useNavigate();

  // Helper function to format activity descriptions
  const getActivityDescription = (activity) => {
    if (!activity) return '';
    
    switch (activity.type) {
      case 'payment_received':
        return `Payment received for Invoice ${activity.invoiceNumber} - $${activity.amount}`;
      case 'invoice_created':
        return `New invoice created for ${activity.customerName}`;
      case 'customer_added':
        return `New customer added: ${activity.customerName}`;
      case 'part_updated':
        return `Inventory updated for ${activity.partName}`;
      default:
        return 'Activity recorded';
    }
  };

  // Effect for loading user profile with improved error handling
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) {
        console.log("No user available");
        return;
      }

      try {
        // Ensure Firebase service is properly initialized
        await firebaseService.ensureInitialized();
        
        // Try loading from local storage first for immediate UI feedback
        let avatar;
        try {
          avatar = localStorage.getItem(`user_avatar_${user.uid}`);
          if (avatar) {
            setAvatarUrl(avatar);
          }
        } catch (e) {
          console.warn("LocalStorage access failed:", e);
        }

        // Get settings from Firestore
        const settingsData = await firebaseService.getSettingsDoc();
        
        if (settingsData) {
          console.log("Successfully loaded settings:", settingsData);
          
          if (settingsData.avatar && !avatarUrl) {
            setAvatarUrl(settingsData.avatar);
            
            // Update localStorage
            try {
              localStorage.setItem(`user_avatar_${user.uid}`, settingsData.avatar);
            } catch (e) {
              console.warn("Failed to save avatar to localStorage:", e);
            }
          }
          
          if (settingsData.businessInfo?.name) {
            setBusinessName(settingsData.businessInfo.name);
          }
          
          setUserName(user.displayName || user.email || 'User');
        }
      } catch (error) {
        console.error("Profile loading error:", error);
        if (error.code === 'permission-denied') {
          console.error("Permission denied. Please check Firebase rules.");
        }
        toast.error("Failed to load profile. Please refresh the page.");
      }
    };
    
    loadUserProfile();
  }, [user]);

  // Initialize last activity tracking
  const [lastActivity, setLastActivity] = useState(null);

  // Track last activity using actual invoice data
  useEffect(() => {
    // Only try to get activity if we have invoices
    if (invoices && invoices.length > 0) {
      // Sort invoices by date to find the most recent one
      const sortedInvoices = [...invoices].sort((a, b) => {
        // Use createdAt if available, otherwise use lastUpdated
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(a.lastUpdated || 0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(b.lastUpdated || 0);
        return dateB - dateA; // Most recent first
      });

      const mostRecentInvoice = sortedInvoices[0];
      
      if (mostRecentInvoice) {
        // Create activity object from the most recent invoice
        const activity = {
          type: mostRecentInvoice.status === 'paid' ? 'payment_received' : 'invoice_created',
          invoiceNumber: mostRecentInvoice.invoiceNumber || mostRecentInvoice.id,
          customerName: mostRecentInvoice.customer?.name || 'Customer',
          timestamp: mostRecentInvoice.createdAt || mostRecentInvoice.lastUpdated || new Date().toISOString(),
          id: mostRecentInvoice.id,
          amount: mostRecentInvoice.total || 0
        };
        
        setLastActivity(activity);
        
        // Store in localStorage but don't overwrite if the stored activity is newer
        try {
          const storedActivity = localStorage.getItem('last_activity');
          if (storedActivity) {
            const parsedActivity = JSON.parse(storedActivity);
            const storedDate = new Date(parsedActivity.timestamp);
            const currentDate = new Date(activity.timestamp);
            
            // Only update if the new activity is more recent
            if (currentDate > storedDate) {
              localStorage.setItem('last_activity', JSON.stringify(activity));
            }
          } else {
            localStorage.setItem('last_activity', JSON.stringify(activity));
          }
        } catch (e) {
          console.warn("Could not store activity in localStorage", e);
        }
      }
    } else {
      // If no invoices are available, check localStorage for last activity
      try {
        const storedActivity = localStorage.getItem('last_activity');
        if (storedActivity) {
          setLastActivity(JSON.parse(storedActivity));
        }
      } catch (e) {
        console.warn("Could not parse stored activity", e);
      }
    }
  }, [invoices]);

  // Improved notification system with persistence
  useEffect(() => {
    // First check for saved notifications in localStorage
    const savedNotifications = localStorage.getItem('notifications');
    let initialNotifications = [];
    
    try {
      if (savedNotifications) {
        initialNotifications = JSON.parse(savedNotifications);
        
        // Set the retrieved notifications
        setNotifications(initialNotifications);
      } else {
        // If no saved notifications, create initial demo notifications
        initialNotifications = [
          { 
            id: 'note-1', 
            title: 'New Customer Inquiry',
            text: 'John Smith submitted a request for a quote', 
            read: false,
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            type: 'info'
          },
          { 
            id: 'note-2', 
            title: 'Payment Received',
            text: 'Invoice #1234 paid - $345.67', 
            read: false,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
            type: 'success'
          },
          { 
            id: 'note-3', 
            title: 'Inventory Alert',
            text: 'Low inventory: Oil Filters (3 remaining)', 
            read: false,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            type: 'warning'
          }
        ];
        
        // Set and save the initial notifications
        setNotifications(initialNotifications);
        localStorage.setItem('notifications', JSON.stringify(initialNotifications));
      }
    } catch (e) {
      console.warn("Error handling notifications", e);
      
      // Fallback to default notifications
      initialNotifications = [
        { 
          id: 'note-fallback', 
          title: 'Welcome to WrenchTrack',
          text: 'Start managing your auto repair business efficiently', 
          read: false,
          timestamp: new Date().toISOString(),
          type: 'info'
        }
      ];
      setNotifications(initialNotifications);
    }
    
    // Check for "new features" setting in localStorage
    try {
      const newFeaturesViewed = localStorage.getItem('new_features_viewed');
      if (newFeaturesViewed === 'true') {
        setHasNewFeatures(false);
      }
    } catch (e) {
      console.warn("Could not access localStorage for features flag", e);
    }
    
  }, []);

  // Update localStorage when notifications change
  useEffect(() => {
    if (notifications.length > 0) {
      try {
        localStorage.setItem('notifications', JSON.stringify(notifications));
      } catch (e) {
        console.warn("Could not save notifications to localStorage", e);
      }
    }
  }, [notifications]);

  // Save new features state when changed
  useEffect(() => {
    if (!hasNewFeatures) {
      try {
        localStorage.setItem('new_features_viewed', 'true');
      } catch (e) {
        console.warn("Could not save features flag to localStorage", e);
      }
    }
  }, [hasNewFeatures]);

  // Enhanced mark notification as read - KEEP THIS ONE, REMOVE THE DUPLICATE BELOW
  const markNotificationRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };
  
  // Add a notification
  const addNotification = (notification) => {
    // Ensure notification has all required properties
    const newNotification = {
      id: `note-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'info',
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };
  
  // Enhanced activity navigation that works with actual invoice data
  const navigateToActivity = () => {
    if (!lastActivity) return;
    
    switch (lastActivity.type) {
      case 'invoice_created':
        // Navigate to the specific invoice if possible
        if (lastActivity.id) {
          handlePageChange('invoicehistory');
          // In a real implementation, we might pass the ID to view a specific invoice
          // For example: navigate(`/invoice/${lastActivity.id}`);
        } else {
          handlePageChange('invoicehistory');
        }
        break;
        
      case 'payment_received':
        handlePageChange('payment');
        break;
        
      case 'customer_added':
        handlePageChange('customers');
        break;
        
      case 'part_updated':
        handlePageChange('parts');
        break;
        
      default:
        handlePageChange('dashboard');
        break;
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  // Handle page changes with smooth transitions
  const handlePageChange = (pageKey) => {
    // First mark that we're transitioning
    setIsPageTransitioning(true);
    
    // Wait a bit before actually changing the page to allow for animation
    setTimeout(() => {
      setCurrentPage(pageKey);
      
      // Refresh invoice data when switching to these pages
      if (pageKey === 'dashboard' || pageKey === 'invoicehistory') {
        refreshInvoices();
      }
      
      // After a short delay, mark the transition as complete
      setTimeout(() => {
        setIsPageTransitioning(false);
      }, 50);
    }, 200);
    
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };

  const pages = [
    { key: 'dashboard', label: 'Dashboard', icon: <FiGrid />, component: <Dashboard /> },
    { key: 'customers', label: 'Customers', icon: <FiUsers />, component: <Customers /> },
    { key: 'parts', label: 'Parts Catalog', icon: <FiTool />, component: <PartsCatalog /> },
    { key: 'invoice', label: 'Invoices', icon: <FiFileText />, component: <InvoiceScreen /> },
    { key: 'invoicehistory', label: 'Invoice History', icon: <FiClock />, component: <InvoiceHistory /> },
    { key: 'service-records', label: 'Service Records', icon: <FiClipboard />, component: <VehicleServiceRecordScreen /> },
    { key: 'payment', label: 'Payments', icon: <FiCreditCard />, component: <Payments /> },
    { key: 'settings', label: 'Settings', icon: <FiSettings />, component: <Settings /> },
  ];

  const activePageComponent = pages.find((page) => page.key === currentPage)?.component;
  const activePageTitle = pages.find((page) => page.key === currentPage)?.label || 'Dashboard';

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Quick Actions shortcut (Ctrl+K or Cmd+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickActionsOpen(prev => !prev);
      }
      
      // Toggle sidebar shortcut (Ctrl+B or Cmd+B)
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Event listener for navigation events
  useEffect(() => {
    const handleNavigateEvent = (e) => {
      if (e.detail && e.detail.path) {
        setCurrentPage(e.detail.path);
        
        // Handle specific actions
        if (e.detail.action) {
          // Example handling for actions
          switch(e.detail.action) {
            case 'add-customer':
              // Could trigger a modal or state change
              break;
            case 'add-part':
              // Could trigger a modal or state change
              break;
            default:
              break;
          }
        }
      }
    };

    window.addEventListener('navigateTo', handleNavigateEvent);
    return () => window.removeEventListener('navigateTo', handleNavigateEvent);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Mark all notifications as read
  const markAllNotificationsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Format timestamp to relative time
  const formatRelativeTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'success':
        return <FiCheckCircle className="text-green-500" />;
      case 'warning':
        return <FiAlertCircle className="text-yellow-500" />;
      case 'error':
        return <FiAlertCircle className="text-red-500" />;
      case 'info':
      default:
        return <FiInfo className="text-blue-500" />;
    }
  };

  // Get breadcrumb for current page
  const getBreadcrumbs = () => {
    const currentPageObject = pages.find(page => page.key === currentPage);
    if (!currentPageObject) return [];
    
    return [
      { label: 'Home', icon: <FiHome />, path: 'dashboard' },
      { label: currentPageObject.label, icon: currentPageObject.icon, path: currentPageObject.key }
    ];
  };

  // Handle click outside of user menu to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (isUserMenuOpen && !event.target.closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar - with CSS transitions */}
      <aside 
        className={`bg-white dark:bg-gray-800 shadow-lg z-20 transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'fixed inset-y-0 left-0 -translate-x-full lg:translate-x-0 lg:w-[70px] lg:relative' : 'relative w-[280px]'}`}
      >
        <div className="flex flex-col h-full">
          {/* App Logo & Brand - Always WrenchTrack */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-xl">
                <FiTool className="text-white text-2xl" />
              </div>
              
              {!isSidebarCollapsed && (
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    WrenchTrack
                  </h1>
                  <p className="text-gray-500 text-sm">Auto Repair Management</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            {!isSidebarCollapsed && (
              <div className="mb-4 px-2">
                <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">Main</div>
              </div>
            )}
            
            {pages.map((page) => (
              <button
                key={page.key}
                onClick={() => handlePageChange(page.key)}
                className={`flex items-center gap-3 p-3 mb-1 rounded-lg transition-all duration-200 w-full text-left hover:translate-x-1
                  ${currentPage === page.key 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/30'
                  }`}
              >
                <span className={`${currentPage === page.key ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {page.icon}
                </span>
                {!isSidebarCollapsed && (
                  <span className="font-medium">{page.label}</span>
                )}
                
                {/* Show active indicator */}
                {currentPage === page.key && !isSidebarCollapsed && (
                  <div 
                    className="ml-auto h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400"
                  />
                )}
              </button>
            ))}
            
            {!isSidebarCollapsed && (
              <div className="mt-8 mb-4 px-2">
                <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">Account</div>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200 w-full text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/30 hover:translate-x-1"
            >
              <span className="text-gray-500 dark:text-gray-400">
                <FiLogOut />
              </span>
              {!isSidebarCollapsed && (
                <span className="font-medium">Logout</span>
              )}
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              {/* Sidebar toggle for mobile/tablet */}
              <button
                onClick={() => setSidebarCollapsed(prev => !prev)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle sidebar"
              >
                <FiMenu size={20} />
              </button>
              
              {/* Breadcrumbs navigation */}
              <div className="hidden md:flex items-center">
                {getBreadcrumbs().map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && (
                      <FiChevronRight className="mx-2 text-gray-400" size={16} />
                    )}
                    <button 
                      onClick={() => handlePageChange(crumb.path)}
                      className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <span className="text-gray-500">{crumb.icon}</span>
                      <span>{crumb.label}</span>
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Page title for mobile */}
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white md:hidden">{activePageTitle}</h1>
              
              {/* Quick search */}
              <div className="ml-4 relative hidden sm:block">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" size={16} />
                </div>
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 w-full md:w-64"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* New Feature Indicator */}
              {hasNewFeatures && (
                <button 
                  onClick={() => setHasNewFeatures(false)}
                  className="relative group"
                >
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse"></span>
                  <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-medium group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                    New
                  </span>
                </button>
              )}

              {/* Quick Actions Button */}
              <button
                onClick={() => setIsQuickActionsOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors active:scale-95 transform"
                aria-label="Open quick actions"
              >
                <FiCommand size={16} />
                <span className="hidden md:inline">Quick Actions</span>
                <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">⌘K</span>
              </button>
              
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110 active:scale-90"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
              </button>
              
              {/* Notifications */}
              <div className="relative">
                <button
                  className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110 active:scale-90"
                  onClick={() => setIsNotificationDrawerOpen(true)}
                  aria-label={`${unreadNotifications} unread notifications`}
                >
                  <FiBell size={18} />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
                
                {/* Notification Drawer */}
                {isNotificationDrawerOpen && (
                  <div className="fixed inset-0 z-30 bg-black bg-opacity-30 flex justify-end">
                    <div 
                      className="bg-white dark:bg-gray-800 h-full w-full max-w-md overflow-hidden shadow-xl flex flex-col animate-slide-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Notifications</h2>
                          {unreadNotifications > 0 && (
                            <span className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded-full">
                              {unreadNotifications} new
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {unreadNotifications > 0 && (
                            <button 
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                              onClick={markAllNotificationsRead}
                            >
                              Mark all as read
                            </button>
                          )}
                          <button 
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            onClick={() => setIsNotificationDrawerOpen(false)}
                          >
                            <FiX size={20} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-6 text-center">
                            <FiBell size={40} className="mb-2 opacity-30" />
                            <p>No notifications yet</p>
                          </div>
                        ) : (
                          <ul>
                            {notifications.map((notification) => (
                              <li 
                                key={notification.id} 
                                className={`border-b border-gray-100 dark:border-gray-700 ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                              >
                                <button 
                                  className="p-4 w-full text-left flex"
                                  onClick={() => markNotificationRead(notification.id)}
                                >
                                  <div className="flex-shrink-0 mr-4">
                                    {getNotificationIcon(notification.type)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <p className="font-medium text-gray-800 dark:text-white">
                                        {notification.title}
                                        {!notification.read && (
                                          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full ml-2"></span>
                                        )}
                                      </p>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                        {formatRelativeTime(notification.timestamp)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                      {notification.text}
                                    </p>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      
                      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                        <button 
                          className="w-full py-2 text-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          onClick={() => setIsNotificationDrawerOpen(false)}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      className="hidden md:block flex-1"
                      onClick={() => setIsNotificationDrawerOpen(false)}
                    ></div>
                  </div>
                )}
              </div>
              
              {/* Business Name / User Info - Now includes business name */}
              <div className="relative user-menu-container">
                <button 
                  className="flex items-center gap-2 transition-transform active:scale-95"
                  onClick={() => setUserMenuOpen(prev => !prev)}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="User Avatar"
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-medium">
                      {userName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {businessName || "My Workshop"}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[120px]">
                      {userName || "Administrator"}
                    </div>
                  </div>
                  <FiChevronDown size={16} className="text-gray-500 hidden md:block" />
                </button>
                
                {/* Dropdown menu */}
                {isUserMenuOpen && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50 border border-gray-200 dark:border-gray-700 transition-all duration-200 origin-top-right animate-dropdown"
                  >
                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                      Signed in as <span className="font-semibold text-gray-900 dark:text-white">{userName || 'User'}</span>
                    </div>
                    
                    <button 
                      onClick={() => {
                        handlePageChange('settings');
                        setUserMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FiSettings size={14} />
                      <span>Profile Settings</span>
                    </button>
                    
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FiLogOut size={14} />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        {/* Enhanced Activity Banner with real invoice data */}
        {lastActivity && (
          <div className="bg-blue-50 dark:bg-blue-900/20 py-2 px-4 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 overflow-hidden">
              <FiActivity size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-blue-700 dark:text-blue-300 truncate">
                Last activity: {getActivityDescription(lastActivity)}
              </span>
              <span className="text-blue-500 dark:text-blue-400 text-xs whitespace-nowrap">
                ({formatRelativeTime(lastActivity.timestamp)})
              </span>
            </div>
            <button 
              className="text-blue-700 dark:text-blue-300 font-medium hover:underline flex-shrink-0 ml-2"
              onClick={navigateToActivity}
            >
              View
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div
            key={currentPage}
            className={`transition-opacity duration-300 ease-in-out p-6 max-w-7xl mx-auto ${isPageTransitioning ? 'opacity-0' : 'opacity-100'}`}
          >
            {activePageComponent || (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400 flex flex-col items-center">
                <FiGrid size={48} className="mb-4 opacity-20" />
                <p className="text-xl font-medium mb-2">Select a page from the sidebar to get started</p>
                <p>Or use Quick Actions (⌘+K) to navigate quickly</p>
              </div>
            )}
          </div>
        </main>
        
        {/* Quick Actions */}
        <QuickActions 
          isOpen={isQuickActionsOpen} 
          onClose={() => setIsQuickActionsOpen(false)} 
        />
        
        {/* Mobile sidebar overlay */}
        {!isSidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden transition-opacity duration-300"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
      </div>
    </div>
  );
}
