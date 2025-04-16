import React, { useState, useEffect } from 'react';
import Dashboard from './DashboardScreen';
import Customers from './CustomersScreen';
import JobTimer from './JobTimerScreen';
import PartsCatalog from './PartsScreen';
import InvoiceScreen from './InvoiceScreen';
import InvoiceHistory from './InvoiceHistoryScreen';
import SignatureScreen from './SignatureScreen';
import Payments from './PaymentScreen';
import Settings from './SettingsScreen';
import { useAuth } from '../AuthContext';
import { useTheme } from '../context/ThemeContext';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import firebaseService from '../services/firebaseService';

export default function HomeScreen({ activePage = 'dashboard' }) {
  const [currentPage, setCurrentPage] = useState(activePage);
  const { user } = useAuth();
  const { theme } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userName, setUserName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        try {
          // First check localStorage for avatar (faster)
          let avatar = '';
          try {
            avatar = localStorage.getItem(`user_avatar_${user.uid}`);
            if (avatar) {
              setAvatarUrl(avatar);
            }
          } catch (e) {
            console.warn("Could not access localStorage for avatar", e);
          }

          // Get settings from Firestore
          await firebaseService.initializeUserDocuments(); // Make sure documents exist
          const settingsData = await firebaseService.getSettingsDoc();
          
          if (settingsData) {
            console.log("Loaded user settings for HomeScreen:", settingsData);
            
            // Set avatar from Firestore if available and not already set from localStorage
            if (settingsData.avatar && !avatarUrl) {
              setAvatarUrl(settingsData.avatar);
              
              // Update localStorage for future use
              try {
                localStorage.setItem(`user_avatar_${user.uid}`, settingsData.avatar);
              } catch (e) {
                console.warn("Could not save avatar to localStorage", e);
              }
            }
            
            // Set business name from settings
            if (settingsData.businessInfo?.name) {
              setBusinessName(settingsData.businessInfo.name);
            }
            
            // Set username (email as fallback)
            setUserName(user.displayName || user.email || 'User');
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
        }
      }
    };
    
    loadUserProfile();
  }, [user, avatarUrl]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const pages = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊', component: <Dashboard /> },
    { key: 'customers', label: 'Customers', icon: '👥', component: <Customers /> },
    { key: 'job', label: 'Job Timer', icon: '⏱️', component: <JobTimer /> },
    { key: 'parts', label: 'Parts Catalog', icon: '🛠️', component: <PartsCatalog /> },
    { key: 'invoice', label: 'Invoices', icon: '📄', component: <InvoiceScreen /> },
    { key: 'invoicehistory', label: 'Invoice History', icon: '📜', component: <InvoiceHistory /> },
    { key: 'signature', label: 'Signatures', icon: '✍️', component: <SignatureScreen /> },
    { key: 'payment', label: 'Payments', icon: '💳', component: <Payments /> },
    { key: 'settings', label: 'Settings', icon: '⚙️', component: <Settings /> },
  ];

  const activePageComponent = pages.find((page) => page.key === currentPage)?.component;

  // Add event listener for navigation events
  useEffect(() => {
    const handleNavigateEvent = (e) => {
      if (e.detail && e.detail.path) {
        console.log('HomeScreen handling navigation to:', e.detail.path);
        setCurrentPage(e.detail.path);
      }
    };

    window.addEventListener('navigateTo', handleNavigateEvent);

    return () => {
      window.removeEventListener('navigateTo', handleNavigateEvent);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg overflow-y-auto">
        <div className="p-6">
          <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mb-8">🔧 WrenchTrack</h1>
          <nav className="space-y-4">
            {pages.map((page) => (
              <button
                key={page.key}
                onClick={() => setCurrentPage(page.key)}
                className={`flex items-center gap-4 p-3 rounded-lg transition w-full text-left ${
                  currentPage === page.key 
                    ? 'bg-blue-100 dark:bg-blue-900' 
                    : 'hover:bg-blue-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-2xl">{page.icon}</span>
                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">{page.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Welcome to WrenchTrack</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="User Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {userName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {businessName || userName || 'User'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <main className="p-6 overflow-y-auto dark:bg-gray-900">
          {activePageComponent || (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p>Select a page from the sidebar to get started.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
