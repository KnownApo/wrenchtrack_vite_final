import React, { useState, useEffect } from "react";
import { Menu, UserCircle, Search, LogOut, Settings, User, Building, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { motion, AnimatePresence } from "framer-motion";
import NotificationCenter from "./NotificationCenter";

export default function Header({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

  const handleProfileClick = () => {
    window.location.href = '/user-profile';
    setUserMenuOpen(false);
  };

  const handleSettingsClick = () => {
    window.location.href = '/settings';
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
          className="w-8 h-8 rounded-full object-cover ring-2 ring-white/20"
        />
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <UserCircle className="w-5 h-5 text-white" />
      </div>
    );
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      console.log('Search query:', searchQuery);
    }
  };

  return (
    <header className="nav-blur dark:nav-blur-dark border-b border-white/10 dark:border-gray-800/50 relative z-40">
      <div className="flex items-center gap-4 px-6 py-4">
        {/* Mobile menu button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-700 dark:text-gray-200 transition-all duration-200"
          onClick={toggleSidebar}
        >
          <Menu size={20} />
        </motion.button>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <motion.form
            onSubmit={handleSearchSubmit}
            className={`relative transition-all duration-200 ${
              isSearchFocused ? 'scale-105' : 'scale-100'
            }`}
          >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search 
                size={18} 
                className={`transition-colors duration-200 ${
                  isSearchFocused ? 'text-primary-500' : 'text-gray-400'
                }`}
              />
            </div>
            <input
              type="search"
              placeholder="Search invoices, customers, vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 dark:bg-gray-800/50 
                       backdrop-blur-sm border border-white/20 dark:border-gray-700/50 
                       rounded-xl text-sm placeholder-gray-400 dark:placeholder-gray-500 
                       text-gray-900 dark:text-gray-100 
                       focus:outline-none focus:ring-2 focus:ring-primary-500/50 
                       focus:border-primary-500/50 focus:bg-white/20 dark:focus:bg-gray-800/70
                       transition-all duration-200"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <div className="w-4 h-4 rounded-full bg-gray-400 hover:bg-gray-500 flex items-center justify-center">
                    <span className="text-xs text-white">×</span>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.form>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-gray-800/50 dark:hover:bg-gray-800/70 
                     text-gray-700 dark:text-gray-200 transition-all duration-200 
                     hover:shadow-lg backdrop-blur-sm"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <AnimatePresence mode="wait">
              {theme === 'light' ? (
                <motion.div
                  key="moon"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon size={18} />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun size={18} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Notifications */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <NotificationCenter />
          </motion.div>

          {/* User Menu */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 p-2 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-gray-800/50 dark:hover:bg-gray-800/70 
                       text-gray-700 dark:text-gray-200 transition-all duration-200 
                       hover:shadow-lg backdrop-blur-sm"
            >
              {getUserAvatar()}
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium">
                  {getDisplayName()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {businessInfo?.businessName ? 'Business Owner' : 'User'}
                </div>
              </div>
            </motion.button>

            <AnimatePresence>
              {userMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  
                  {/* Menu */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white/95 dark:bg-gray-800/95 
                             backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 
                             py-2 z-50 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex items-center gap-3">
                        {getUserAvatar()}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user?.displayName || 'User'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                      {businessInfo?.businessName && (
                        <div className="mt-2 px-2 py-1 bg-primary-50 dark:bg-primary-900/20 
                                      rounded-lg flex items-center gap-2">
                          <Building size={12} className="text-primary-600 dark:text-primary-400" />
                          <span className="text-xs text-primary-700 dark:text-primary-400 font-medium">
                            {businessInfo.businessName}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <motion.button
                        whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                        onClick={handleProfileClick}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 
                                 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
                      >
                        <User size={16} />
                        <span>Profile Settings</span>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                        onClick={handleSettingsClick}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 
                                 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
                      >
                        <Settings size={16} />
                        <span>App Settings</span>
                      </motion.button>
                    </div>
                    
                    <div className="border-t border-gray-200/50 dark:border-gray-700/50 mt-1 pt-1">
                      <motion.button
                        whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 
                                 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </motion.button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
