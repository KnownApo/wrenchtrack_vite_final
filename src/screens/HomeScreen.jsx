import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import Notifications from '../components/Notifications';
import { useTheme } from '../context/ThemeContext';  // Assuming ThemeContext provides useTheme

export default function HomeScreen() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme } = useTheme();  // Retrieve current theme from context

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Header toggleSidebar={toggleSidebar} notifications={[]} userProfile={() => {}} />
      <div className="flex flex-1">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />  {/* Renders child routes like DashboardScreen, InvoiceScreen, etc. */}
        </main>
      </div>
      <Footer theme={theme} />
      <Notifications notifications={[]} onClose={() => {}} />
    </div>
  );
}