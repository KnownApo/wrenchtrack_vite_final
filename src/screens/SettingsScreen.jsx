import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function SettingsScreen() {
  const [theme, setTheme] = useState('light');
  const [businessInfo, setBusinessInfo] = useState({ name: '', address: '', phone: '', email: '' });
  const [preferences, setPreferences] = useState({ currency: 'USD', invoiceTerms: 'Net 30', defaultInvoiceTitle: 'Service Invoice' });
  const [loading, setLoading] = useState(false);

  const user = auth.currentUser;
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const navigate = useNavigate();

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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setAvatarFile(file);
    } else {
      toast.error('Please select an image file');
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please log in to save settings');
      return;
    }
    setLoading(true);
    try {
      let avatarURL = avatarUrl;
      if (avatarFile) {
        const storageRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(storageRef, avatarFile);
        avatarURL = await getDownloadURL(storageRef);
      }

      await setDoc(doc(db, 'settings', user.uid), {
        theme,
        businessInfo,
        preferences,
        avatarUrl: avatarURL,
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
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
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="bg-white max-w-2xl mx-auto rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">⚙️ Project Settings</h1>

        <div className="mb-6">
          <label className="block font-medium mb-1">Theme</label>
          <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full p-2 border rounded">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="mb-6">
          <h2 className="font-semibold text-lg mb-2">Business Info</h2>
          {['name', 'address', 'phone', 'email'].map(field => (
            <input
              key={field}
              name={field}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={businessInfo[field]}
              onChange={e => handleChange(e, 'business')}
              className="w-full border p-2 mb-3 rounded"
            />
          ))}
        </div>

        <div className="mb-6">
          <h2 className="font-semibold text-lg mb-2">Preferences</h2>
          <input
            name="currency"
            placeholder="Currency"
            value={preferences.currency}
            onChange={e => handleChange(e, 'preferences')}
            className="w-full border p-2 mb-3 rounded"
          />
          <input
            name="invoiceTerms"
            placeholder="Invoice Terms"
            value={preferences.invoiceTerms}
            onChange={e => handleChange(e, 'preferences')}
            className="w-full border p-2 mb-3 rounded"
          />
          <input
            name="defaultInvoiceTitle"
            placeholder="Default Invoice Title"
            value={preferences.defaultInvoiceTitle}
            onChange={e => handleChange(e, 'preferences')}
            className="w-full border p-2 rounded"
          />
        </div>

        <div className="bg-white max-w-2xl mx-auto rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
          
          <div className="mb-6">
            <label className="block font-medium mb-2">Avatar</label>
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full mb-4 object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="flex justify-between">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
            
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white py-2 px-6 rounded hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
