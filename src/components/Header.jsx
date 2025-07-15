import React, { useState, useEffect } from "react";
import { Menu, Bell, UserCircle, Search, LogOut, Settings, User, Building } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Header({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationCount] = useState(0); // This could be connected to actual notifications
  const [businessInfo, setBusinessInfo] = useState(null);

  // Load business info
  useEffect(() => {
    const loadBusinessInfo = async () => {
      if (!user) return;
      
      try {
        const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'userSettings'));
        if (settingsDoc.exists()) {
          setBusinessInfo(settingsDoc.data());
        }
      } catch (error) {
        console.error('Error loading business info:', error);
      }
    };

    loadBusinessInfo();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
  };

  // Get user display name
  const getDisplayName = () => {
    if (businessInfo?.businessName) {
      return businessInfo.businessName;
    }
    return user?.displayName || user?.email?.split('@')[0] || 'User';
  };

  // Get user avatar
  const getUserAvatar = () => {
    if (user?.photoURL) {
      return (
        <img 
          src={user.photoURL} 
          alt="Profile" 
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    }
    return <UserCircle size={20} />;
  };

  return (
    <header className="flex items-center gap-4 px-6 py-4 bg-white dark:bg-gray-800 shadow-md relative">
      <button
        className="lg:hidden text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        onClick={toggleSidebar}
      >
        <Menu size={24} />
      </button>

      <div className="relative flex-1 max-w-lg">
        <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
          <Search size={18} />
        </span>
        <input
          type="search"
          placeholder="Quick search..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300
                     dark:border-gray-700 bg-gray-50 dark:bg-gray-700
                     text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 
                     dark:text-white transition-colors"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Bell size={20} />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600
                             text-white text-[10px] flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {getUserAvatar()}
            <span className="text-sm font-medium hidden md:block">
              {getDisplayName()}
            </span>
          </button>

          {userMenuOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              
              {/* Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                  {businessInfo?.businessName && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1">
                      <Building size={12} />
                      {businessInfo.businessName}
                    </p>
                  )}
                </div>
                
                <button
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <User size={16} />
                  Profile
                </button>
                
                <button
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Settings size={16} />
                  Settings
                </button>
                
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
