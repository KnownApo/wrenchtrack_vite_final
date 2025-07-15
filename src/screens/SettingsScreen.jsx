import React, { useState, useEffect } from 'react';
import { FaCog, FaUser, FaBell, FaPalette, FaMoon, FaSun, FaSave, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import firebaseService from '../services/firebaseService';
import BusinessInfo from '../components/BusinessInfo';

export default function SettingsScreen() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications: true,
    emailAlerts: true,
    businessName: '',
    address: '',
    phone: '',
    email: '',
    taxRate: 0,
    currency: 'USD',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const userSettings = await firebaseService.getSettingsDoc();
        if (userSettings) {
          setSettings(prev => ({ ...prev, ...userSettings }));
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings');
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveSettings = async () => {
    if (!user) {
      toast.error('No user logged in');
      return;
    }
    setIsSaving(true);
    try {
      if (settings.taxRate < 0 || settings.taxRate > 100) {
        throw new Error('Tax rate must be between 0 and 100');
      }
      if (typeof firebaseService.updateSettingsDocument !== 'function') {
        throw new Error('Update method not available - check service import');
      }
      const success = await firebaseService.updateSettingsDocument(settings);
      if (success) {
        toast.success('Settings saved successfully');
      } else {
        throw new Error('Save operation failed');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
        <FaCog className="mr-2" /> Settings
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <BusinessInfo mode="edit" />
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
            <FaUser className="mr-2" /> General
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Business Name</label>
              <input name="businessName" value={settings.businessName} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
              <input name="address" value={settings.address} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
              <input name="phone" value={settings.phone} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input name="email" value={settings.email} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
            <FaBell className="mr-2" /> Notifications
          </h2>
          <div className="space-y-2">
            <label className="flex items-center">
              <input name="notifications" type="checkbox" checked={settings.notifications} onChange={handleInputChange} className="mr-2" />
              Enable Notifications
            </label>
            <label className="flex items-center">
              <input name="emailAlerts" type="checkbox" checked={settings.emailAlerts} onChange={handleInputChange} className="mr-2" />
              Email Alerts
            </label>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
            <FaPalette className="mr-2" /> Appearance
          </h2>
          <button onClick={toggleTheme} className="flex items-center p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {theme === 'dark' ? <FaSun className="mr-2" /> : <FaMoon className="mr-2" />}
            Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
            <FaCog className="mr-2" /> Billing
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tax Rate (%)</label>
              <input name="taxRate" type="number" value={settings.taxRate} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
              <select name="currency" value={settings.currency} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-4">
        <button onClick={() => window.history.back()} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
          <FaTimes className="mr-2" /> Cancel
        </button>
        <button onClick={handleSaveSettings} disabled={isSaving} className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          <FaSave className="mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}