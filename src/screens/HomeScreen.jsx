import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import QuickActions from '../components/QuickActions';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  FiHome, 
  FiUsers, 
  FiFileText, 
  FiTool, 
  FiClock, 
  FiSettings, 
  FiBarChart, 
  FiArchive,
  FiTruck 
} from 'react-icons/fi';

const menuItems = [
  { label: 'Dashboard', path: '/', icon: <FiHome className="w-5 h-5" /> },
  { label: 'Invoices', path: '/invoices', icon: <FiFileText className="w-5 h-5" /> },
  { label: 'History', path: '/history', icon: <FiArchive className="w-5 h-5" /> },
  { label: 'Customers', path: '/customers', icon: <FiUsers className="w-5 h-5" /> },
  { label: 'Vehicles', path: '/vehicles', icon: <FiTruck className="w-5 h-5" /> },
  { label: 'Parts', path: '/parts', icon: <FiTool className="w-5 h-5" /> },
  { label: 'Jobs', path: '/jobs', icon: <FiClock className="w-5 h-5" /> },
  { label: 'Analytics', path: '/analytics', icon: <FiBarChart className="w-5 h-5" /> },
  { label: 'Settings', path: '/settings', icon: <FiSettings className="w-5 h-5" /> },
];

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // CMD/Ctrl + K for quick actions
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickActionsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle custom navigation events from QuickActions
  useEffect(() => {
    const handleNavigate = (e) => {
      navigate(`/${e.detail.path}`);
    };

    window.addEventListener('navigateTo', handleNavigate);
    return () => window.removeEventListener('navigateTo', handleNavigate);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleUserProfile = () => {
    navigate('/settings');
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect will happen)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        menuItems={menuItems}
        theme={theme}
        toggleTheme={toggleTheme}
        handleLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          toggleSidebar={toggleSidebar}
          notifications={[]}
          userProfile={handleUserProfile}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Quick Actions Modal */}
      <QuickActions 
        isOpen={quickActionsOpen}
        onClose={() => setQuickActionsOpen(false)}
      />

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}