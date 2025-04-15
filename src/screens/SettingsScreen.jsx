import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
  const [theme, setTheme] = useState('light');
  const [businessInfo, setBusinessInfo] = useState({ name: '', address: '', phone: '', email: '' });
  const [preferences, setPreferences] = useState({ currency: 'USD', invoiceTerms: 'Net 30', defaultInvoiceTitle: 'Service Invoice' });
  const [loading, setLoading] = useState(false);

  const user = auth.currentUser;
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTheme(data.theme || 'light');
        setBusinessInfo(data.businessInfo || {});
        setPreferences(data.preferences || { currency: 'USD', invoiceTerms: 'Net 30', defaultInvoiceTitle: 'Service Invoice' });
        setAvatarUrl(data.avatarUrl || '');
      }
    };
    fetchSettings();
  }, [user]);

  const handleChange = (e, type) => {
    const { name, value } = e.target;
    if (type === 'business') {
      setBusinessInfo(prev => ({ ...prev, [name]: value }));
    } else if (type === 'preferences') {
      setPreferences(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      const maxSize = 2 * 1024 * 1024; // 2MB max
      if (file.size > maxSize) {
        throw new Error('File size must be less than 2MB');
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setAvatarUrl(base64String);
        setAvatarFile(null); // We don't need to store the file anymore
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Avatar selection error:', error);
      toast.error(error.message);
    }
  };

  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    toggleTheme(newTheme);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please log in to save settings');
      return;
    }
    setLoading(true);
    try {
      const settingsRef = doc(db, 'settings', user.uid);
      await setDoc(settingsRef, {
        theme,
        businessInfo,
        preferences,
        avatarUrl,
        updatedAt: new Date(),
      }, { merge: true });

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    }
    setLoading(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-8">
          ⚙️ Settings & Preferences
        </h1>

        <div className="grid gap-6">
          {/* Profile Settings Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              👤 Profile Settings
            </h2>
            
            <div className="flex items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-32 h-32 rounded-2xl shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <span className="text-4xl">👤</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="mt-4 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              <div className="flex-grow">
                <label className="block font-medium mb-2">Theme Preference</label>
                <select 
                  value={theme} 
                  onChange={handleThemeChange}
                  className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>
            </div>
          </div>

          {/* Business Info Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              🏢 Business Information
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              {['name', 'address', 'phone', 'email'].map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </label>
                  <input
                    name={field}
                    value={businessInfo[field]}
                    onChange={e => handleChange(e, 'business')}
                    className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter ${field}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preferences Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              🎯 Invoice Preferences
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(preferences).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {key.split(/(?=[A-Z])/).join(' ')}
                  </label>
                  <input
                    name={key}
                    value={value}
                    onChange={e => handleChange(e, 'preferences')}
                    className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-4 mt-6">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Saving Changes...' : '💾 Save All Changes'}
            </button>
            
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
