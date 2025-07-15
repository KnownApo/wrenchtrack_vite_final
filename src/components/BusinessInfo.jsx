import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import { FiHome, FiMail, FiPhone, FiMapPin, FiGlobe, FiEdit2, FiCheck, FiX } from 'react-icons/fi';

export default function BusinessInfo({ mode = 'display', onUpdate }) {
  const { user } = useAuth();
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxId: '',
    licenseNumber: ''
  });
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'settings', 'business');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setBusinessInfo(docSnap.data());
        } else {
          // Set default values from user profile
          setBusinessInfo(prev => ({
            ...prev,
            name: user.displayName || '',
            email: user.email || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching business info:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBusinessInfo();
    }
  }, [user]);

  const refetchBusinessInfo = async () => {
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'business');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setBusinessInfo(docSnap.data());
      }
    } catch (error) {
      console.error('Error fetching business info:', error);
    }
  };

  const handleSave = async () => {
    if (!businessInfo.name || !businessInfo.email) {
      toast.error('Business name and email are required');
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'business');
      await setDoc(docRef, {
        ...businessInfo,
        updatedAt: new Date().toISOString()
      });
      
      toast.success('Business information updated successfully');
      setIsEditing(false);
      
      if (onUpdate) {
        onUpdate(businessInfo);
      }
    } catch (error) {
      console.error('Error saving business info:', error);
      toast.error('Error saving business information');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    refetchBusinessInfo(); // Reset to original values
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (mode === 'display' && !isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FiHome className="w-5 h-5" />
            {businessInfo.name || 'Business Name'}
          </h3>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          {businessInfo.address && (
            <div className="flex items-center gap-2">
              <FiMapPin className="w-4 h-4" />
              <span>{businessInfo.address}</span>
            </div>
          )}
          
          {businessInfo.phone && (
            <div className="flex items-center gap-2">
              <FiPhone className="w-4 h-4" />
              <span>{businessInfo.phone}</span>
            </div>
          )}
          
          {businessInfo.email && (
            <div className="flex items-center gap-2">
              <FiMail className="w-4 h-4" />
              <span>{businessInfo.email}</span>
            </div>
          )}
          
          {businessInfo.website && (
            <div className="flex items-center gap-2">
              <FiGlobe className="w-4 h-4" />
              <a 
                href={businessInfo.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {businessInfo.website}
              </a>
            </div>
          )}
          
          {businessInfo.taxId && (
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Tax ID: {businessInfo.taxId}
            </div>
          )}
          
          {businessInfo.licenseNumber && (
            <div className="text-xs text-gray-500 dark:text-gray-500">
              License: {businessInfo.licenseNumber}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <FiHome className="w-5 h-5" />
        Business Information
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Name *
          </label>
          <input
            type="text"
            value={businessInfo.name}
            onChange={(e) => setBusinessInfo({...businessInfo, name: e.target.value})}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Your Business Name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={businessInfo.email}
            onChange={(e) => setBusinessInfo({...businessInfo, email: e.target.value})}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="business@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone
          </label>
          <input
            type="tel"
            value={businessInfo.phone}
            onChange={(e) => setBusinessInfo({...businessInfo, phone: e.target.value})}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Website
          </label>
          <input
            type="url"
            value={businessInfo.website}
            onChange={(e) => setBusinessInfo({...businessInfo, website: e.target.value})}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="https://example.com"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Address
          </label>
          <textarea
            value={businessInfo.address}
            onChange={(e) => setBusinessInfo({...businessInfo, address: e.target.value})}
            rows={2}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="123 Main St, City, State, ZIP"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tax ID
          </label>
          <input
            type="text"
            value={businessInfo.taxId}
            onChange={(e) => setBusinessInfo({...businessInfo, taxId: e.target.value})}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="12-3456789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            License Number
          </label>
          <input
            type="text"
            value={businessInfo.licenseNumber}
            onChange={(e) => setBusinessInfo({...businessInfo, licenseNumber: e.target.value})}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="LIC-123456"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <FiX className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
        >
          <FiCheck className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
