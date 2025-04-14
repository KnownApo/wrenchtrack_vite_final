import React, { useState, useEffect } from 'react';
import Dashboard from './DashboardScreen';
import Customers from './CustomersScreen';
import JobTimer from './JobTimerScreen';
import PartsCatalog from './PartsScreen';
import InvoiceBuilder from './InvoiceBuilderScreen';
import InvoiceHistory from './InvoiceHistoryScreen';
import SignatureScreen from './SignatureScreen';
import Payments from './PaymentScreen';
import Settings from './SettingsScreen';
import { useAuth } from '../AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function HomeScreen() {
  const [activePage, setActivePage] = useState('dashboard'); // Track the active page
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        const settingsRef = doc(db, 'settings', user.uid);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setAvatarUrl(data.avatarUrl || '');
          setUserName(data.businessInfo?.name || user.email);
        }
      }
    };
    loadUserProfile();
  }, [user]);

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
    { key: 'invoice', label: 'Invoices', icon: '📄', component: <InvoiceBuilder /> },
    { key: 'invoicehistory', label: 'Invoice History', icon: '📜', component: <InvoiceHistory /> },
    { key: 'signature', label: 'Signatures', icon: '✍️', component: <SignatureScreen /> },
    { key: 'payment', label: 'Payments', icon: '💳', component: <Payments /> },
    { key: 'settings', label: 'Settings', icon: '⚙️', component: <Settings /> },
  ];

  const activePageComponent = pages.find((page) => page.key === activePage)?.component;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg overflow-y-auto">
        <div className="p-6">
          <h1 className="text-3xl font-extrabold text-blue-600 mb-8">🔧 WrenchTrack</h1>
          <nav className="space-y-4">
            {pages.map((page) => (
              <button
                key={page.key}
                onClick={() => setActivePage(page.key)}
                className={`flex items-center gap-4 p-3 rounded-lg hover:bg-blue-50 transition w-full text-left ${
                  activePage === page.key ? 'bg-blue-100' : ''
                }`}
              >
                <span className="text-2xl">{page.icon}</span>
                <span className="text-lg font-medium text-gray-700">{page.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Welcome to WrenchTrack</h2>
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
                  {userName?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <span className="text-gray-700 font-medium">{userName}</span>
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
        <main className="p-6 overflow-y-auto">
          {activePageComponent || (
            <div className="text-center text-gray-500">
              <p>Select a page from the sidebar to get started.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
