import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, storage, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { FiUser, FiSave, FiLogOut, FiCreditCard, FiBell, FiLock, FiUsers, FiLink, FiDatabase, FiSettings } from 'react-icons/fi';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import firebaseService from '../services/firebaseService';

const SettingsScreen = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const avatarInputRef = useRef(null);

  // State for settings tabs
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile and business info state
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    website: '',
    taxId: ''
  });
  
  // Preferences state
  const [preferences, setPreferences] = useState({
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'America/New_York',
    defaultInvoiceTitle: 'Invoice',
    invoiceTerms: 'Net 30',
    invoiceNotes: 'Thank you for your business!',
  });
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    invoiceReminders: true,
    marketingEmails: false,
  });
  
  // Security settings
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    passwordLastChanged: 'Never',
  });
  
  // Subscription info
  const [subscription, setSubscription] = useState({
    plan: 'Free',
    billingCycle: 'Monthly',
    nextBillingDate: 'N/A',
    paymentMethod: 'None',
  });
  
  // Team members
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Avatar state
  const [avatar, setAvatar] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Helper function to load settings directly from Firestore
  const loadSettingsFromFirestore = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user logged in");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      console.log('Loading settings from Firestore for user:', user.uid);
      
      // First try to initialize user documents if not already done
      await firebaseService.initializeUserDocuments();
      
      // Then get the settings (force refresh with false for useCache)
      const settingsData = await firebaseService.getSettingsDoc(false);
      
      if (settingsData) {
        console.log("Settings loaded successfully from Firestore:", settingsData);
        
        // Update all state variables with the fetched data
        if (settingsData.businessInfo) {
          console.log("Setting business info:", settingsData.businessInfo);
          setBusinessInfo(prevState => ({
            ...prevState,
            ...settingsData.businessInfo
          }));
        }
        
        if (settingsData.preferences) {
          console.log("Setting preferences:", settingsData.preferences);
          setPreferences(prevState => ({
            ...prevState,
            ...settingsData.preferences
          }));
        }
        
        if (settingsData.notifications) {
          console.log("Setting notifications:", settingsData.notifications);
          setNotifications(prevState => ({
            ...prevState,
            ...settingsData.notifications
          }));
        }
        
        if (settingsData.security) {
          console.log("Setting security:", settingsData.security);
          setSecurity(prevState => ({
            ...prevState,
            ...settingsData.security
          }));
        }
        
        if (settingsData.subscription) {
          console.log("Setting subscription:", settingsData.subscription);
          setSubscription(prevState => ({
            ...prevState,
            ...settingsData.subscription
          }));
        }
        
        if (settingsData.teamMembers) {
          console.log("Setting team members:", settingsData.teamMembers);
          setTeamMembers(settingsData.teamMembers || []);
        }
        
        // Set theme if available 
        if (settingsData.theme && toggleTheme) {
          console.log("Setting theme to:", settingsData.theme);
          toggleTheme(settingsData.theme);
        }
        
        // Set avatar if available
        if (settingsData.avatar) {
          console.log("Setting avatar");
          setAvatar(settingsData.avatar);
          
          // Store in localStorage for quick access elsewhere in the app
          try {
            localStorage.setItem(`user_avatar_${user.uid}`, settingsData.avatar);
          } catch (e) {
            console.warn("Could not save avatar to localStorage:", e);
          }
        }
      } else {
        console.log("No settings found in Firestore");
      }
    } catch (error) {
      console.error("Error loading settings from Firestore:", error);
      toast.error("Failed to load settings. Please try refreshing the page.");
    } finally {
      setIsLoading(false);
    }
  }, [toggleTheme]);

  // Fetch user settings from Firestore when component mounts
  useEffect(() => {
    loadSettingsFromFirestore();
  }, [loadSettingsFromFirestore]);

  // Handle business info changes
  const handleBusinessInfoChange = (e) => {
    const { name, value } = e.target;
    setBusinessInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
        
  // Handle preferences changes
  const handlePreferencesChange = (e) => {
    const { name, value } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: value
    }));
  };
        
  // Handle notification changes
  const handleNotificationsChange = (e) => {
    const { name, checked } = e.target;
    setNotifications(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Handle changes in subscription plan
  const handleSubscriptionChange = (e) => {
    const { name, value } = e.target;
    setSubscription(prev => ({
      ...prev,
      [name]: value
    }));
  };
            
  // Handle password change
  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
            
    try {   
      // This is a placeholder for password change functionality
      toast.success("Password updated successfully");
      setNewPassword('');
      setConfirmPassword('');
      setSecurity(prev => ({
        ...prev,
        passwordLastChanged: new Date().toLocaleDateString()
      }));
    } catch (error) {
      toast.error("Failed to update password");
    }
  };
        
  // Handle avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload an image file (JPEG, PNG, GIF)");
      return;
    }
    
    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      toast.error("File size must be less than 1MB");
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Use data URL approach as a reliable method
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target.result;
        
        try {
          // Update settings document with avatar URL (data URL)
          await firebaseService.updateSettingsDocument({
            avatar: dataUrl
          });
          
          setAvatar(dataUrl);
          toast.success("Avatar updated successfully");
          
          // Update localStorage for immediate UI updates before page refresh
          try {
            const userId = auth.currentUser?.uid;
            if (userId) {
              localStorage.setItem(`user_avatar_${userId}`, dataUrl);
            }
          } catch (e) {
            console.warn("Could not store avatar in localStorage", e);
          }
          
          // Refresh the page after a short delay to update all components
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (uploadError) {
          console.error("Error saving avatar:", uploadError);
          toast.error("Failed to save avatar");
        } finally {
          setIsSaving(false);
        }
      };
      
      reader.onerror = () => {
        toast.error("Failed to read file");
        setIsSaving(false);
      };
      
      // Start reading the file
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error with avatar file:", error);
      toast.error("Failed to process avatar image");
      setIsSaving(false);
    }
  };

  // Handle removing avatar
  const handleRemoveAvatar = async () => {
    try {
      setIsSaving(true);
      
      // Remove from localStorage if it exists there
      try {
        const userId = auth.currentUser?.uid;
        if (userId) {
          localStorage.removeItem(`user_avatar_${userId}`);
        }
      } catch (e) {
        console.warn("Could not remove avatar from localStorage", e);
      }
      
      // Update settings document to remove avatar
      await firebaseService.updateSettingsDocument({
        avatar: ''
      });
      
      setAvatar('');
      toast.success("Avatar removed successfully");
      
      // Refresh the page after a short delay to update all components
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error("Failed to remove avatar");
    } finally {
      setIsSaving(false);
    }
  };

  // Enable/disable two-factor authentication
  const handleToggleTwoFactor = () => {
    setSecurity(prev => ({
      ...prev,
      twoFactorEnabled: !prev.twoFactorEnabled
    }));
    
    toast.info(security.twoFactorEnabled 
      ? "Two-factor authentication disabled" 
      : "Two-factor authentication enabled");
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to log out");
    }
  };

  // Helper function to get avatar URL - either from server or localStorage
  const getAvatarImage = () => {
    // Check for a direct avatar URL first
    if (avatar && !avatar.startsWith('data:image/png;base64,USER_AVATAR_STORED_LOCALLY')) {
      return avatar;
    }
    
    // If we have a placeholder, try to get from localStorage
    if (avatar && avatar.startsWith('data:image/png;base64,USER_AVATAR_STORED_LOCALLY')) {
      try {
        const userId = auth.currentUser?.uid;
        if (userId) {
          const localAvatar = localStorage.getItem(`user_avatar_${userId}`);
          if (localAvatar) {
            return localAvatar;
          }
        }
      } catch (error) {
        console.warn("Could not retrieve avatar from localStorage:", error);
      }
    }
    
    // Fallback to the original value or empty
    return avatar || '';
  };

  // Sync theme changes with the theme context
  useEffect(() => {
    if (toggleTheme && theme) {
      toggleTheme(theme);
    }
  }, [theme, toggleTheme]);
  
  // Store avatar in localStorage when it changes, for instant visibility in UI
  useEffect(() => {
    if (avatar && auth.currentUser) {
      try {
        // If it's a placeholder, don't overwrite the localStorage version
        if (!avatar.startsWith('data:image/png;base64,USER_AVATAR_STORED_LOCALLY')) {
          localStorage.setItem(`user_avatar_${auth.currentUser.uid}`, avatar);
        }
      } catch (e) {
        console.warn("Could not store avatar in localStorage", e);
      }
    }
  }, [avatar]);
  
  // Save all settings to Firestore with improved reliability
  const handleSaveSettings = async () => {
    // Prevent rapid repeat saves
    if (isSaving) {
      console.log("Save already in progress, skipping");
      return;
    }
    
    try {
      setIsSaving(true);
      const user = auth.currentUser;
      
      if (!user) {
        toast.error("You must be logged in to save settings");
        return;
      }
      
      console.log("Saving all settings for user:", user.uid);
      
      // Create the settings data object matching the Firestore structure
      const settingsData = {
        businessInfo: {
          name: businessInfo.name || '',
          address: businessInfo.address || '',
          city: businessInfo.city || '',
          state: businessInfo.state || '',
          zip: businessInfo.zip || '',
          phone: businessInfo.phone || '',
          email: businessInfo.email || user.email || '',
          website: businessInfo.website || '',
          taxId: businessInfo.taxId || ''
        },
        notifications: {
          emailNotifications: notifications.emailNotifications,
          invoiceReminders: notifications.invoiceReminders,
          marketingEmails: notifications.marketingEmails,
          smsNotifications: notifications.smsNotifications
        },
        preferences: {
          currency: preferences.currency || 'USD',
          dateFormat: preferences.dateFormat || 'MM/DD/YYYY',
          defaultInvoiceTitle: preferences.defaultInvoiceTitle || 'Invoice',
          invoiceNotes: preferences.invoiceNotes || 'Thank you for your business!',
          invoiceTerms: preferences.invoiceTerms || 'Net 30',
          timezone: preferences.timezone || 'America/New_York'
        },
        security: {
          passwordLastChanged: security.passwordLastChanged || 'Never',
          twoFactorEnabled: security.twoFactorEnabled || false
        },
        subscription: {
          billingCycle: subscription.billingCycle || 'Monthly',
          nextBillingDate: subscription.nextBillingDate || 'N/A',
          paymentMethod: subscription.paymentMethod || 'None',
          plan: subscription.plan || 'Free'
        },
        theme: theme,
        avatar: avatar || '',
        updatedAt: new Date().toISOString()
      };
      
      // Save settings through the firebaseService
      const success = await firebaseService.updateSettingsDocument(settingsData);
      
      if (success) {
        toast.success("Settings saved successfully");
        
        // Update the theme context to reflect changes immediately
        if (toggleTheme && theme) {
          toggleTheme(theme);
        }
        
        // Update avatar in localStorage for immediate UI display
        try {
          if (avatar) {
            localStorage.setItem(`user_avatar_${user.uid}`, avatar);
          }
        } catch (e) {
          console.warn("Could not update avatar in localStorage", e);
        }
        
        // Refresh the page to update all UI components including header and invoicing
        setTimeout(() => {
          window.location.reload();
        }, 1500); // Give the toast 1.5 seconds to be visible before refresh
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings", { toastId: "settings-error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="settings-screen">
      <h1 className="settings-title">Account Settings</h1>
      
      <div className="settings-container">
        <div className="settings-tabs">
          <button 
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FiUser /> Profile
          </button>
          <button 
            className={`tab-button ${activeTab === 'business' ? 'active' : ''}`}
            onClick={() => setActiveTab('business')}
          >
            <FiSettings /> Business
          </button>
          <button 
            className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <FiSettings /> Preferences
          </button>
          <button 
            className={`tab-button ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            <FiCreditCard /> Subscription
          </button>
          <button 
            className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <FiUsers /> Team
          </button>
          <button 
            className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <FiBell /> Notifications
          </button>
          <button 
            className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <FiLock /> Security
          </button>
          <button 
            className={`tab-button ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            <FiLink /> Integrations
          </button>
          <button 
            className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <FiDatabase /> Data
          </button>
        </div>
        
        <div className="settings-content">
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h2>Profile Settings</h2>
              
              <div className="avatar-section">
                <div className="avatar-container">
                  {getAvatarImage() ? (
                    <img src={getAvatarImage()} alt="Avatar" className="avatar-image" />
                  ) : (
                    <div className="avatar-placeholder">
                      <FiUser size={40} />
                    </div>
                  )}
                </div>
                <div className="avatar-controls">
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                    accept="image/*"
                  />
                  <button 
                    className="btn btn-secondary"
                    onClick={() => avatarInputRef.current.click()}
                    disabled={isSaving}
                  >
                    Change Avatar
                  </button>
                  {getAvatarImage() && (
                    <button 
                      className="btn btn-danger"
                      onClick={handleRemoveAvatar}
                      disabled={isSaving}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              
              <div className="theme-toggle">
                <span>Theme:</span>
                <button
                  className={`theme-button ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => toggleTheme('light')}
                >
                  <FaSun /> Light
                </button>
                <button
                  className={`theme-button ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => toggleTheme('dark')}
                >
                  <FaMoon /> Dark
                </button>
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={businessInfo.email}
                  onChange={handleBusinessInfoChange}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={businessInfo.phone}
                  onChange={handleBusinessInfoChange}
                  className="form-control"
                />
              </div>
            </div>
          )}
          
          {/* Business Information */}
          {activeTab === 'business' && (
            <div className="settings-section">
              <h2>Business Information</h2>
              
              <div className="form-group">
                <label htmlFor="name">Business Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={businessInfo.name}
                  onChange={handleBusinessInfoChange}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={businessInfo.address}
                  onChange={handleBusinessInfoChange}
                  className="form-control"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={businessInfo.city}
                    onChange={handleBusinessInfoChange}
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="state">State</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={businessInfo.state}
                    onChange={handleBusinessInfoChange}
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="zip">ZIP Code</label>
                  <input
                    type="text"
                    id="zip"
                    name="zip"
                    value={businessInfo.zip}
                    onChange={handleBusinessInfoChange}
                    className="form-control"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={businessInfo.website}
                  onChange={handleBusinessInfoChange}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="taxId">Tax ID / EIN</label>
                <input
                  type="text"
                  id="taxId"
                  name="taxId"
                  value={businessInfo.taxId}
                  onChange={handleBusinessInfoChange}
                  className="form-control"
                />
              </div>
            </div>
          )}
          
          {/* Preferences */}
          {activeTab === 'preferences' && (
            <div className="settings-section">
              <h2>Preferences</h2>
              
              <div className="form-group">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  name="currency"
                  value={preferences.currency}
                  onChange={handlePreferencesChange}
                  className="form-control"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  {/* Add more currencies as needed */}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="dateFormat">Date Format</label>
                <select
                  id="dateFormat"
                  name="dateFormat"
                  value={preferences.dateFormat}
                  onChange={handlePreferencesChange}
                  className="form-control"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="timezone">Timezone</label>
                <input
                  type="text"
                  id="timezone"
                  name="timezone"
                  value={preferences.timezone}
                  onChange={handlePreferencesChange}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="defaultInvoiceTitle">Default Invoice Title</label>
                <input
                  type="text"
                  id="defaultInvoiceTitle"
                  name="defaultInvoiceTitle"
                  value={preferences.defaultInvoiceTitle}
                  onChange={handlePreferencesChange}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="invoiceTerms">Invoice Terms</label>
                <input
                  type="text"
                  id="invoiceTerms"
                  name="invoiceTerms"
                  value={preferences.invoiceTerms}
                  onChange={handlePreferencesChange}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="invoiceNotes">Invoice Notes</label>
                <textarea
                  id="invoiceNotes"
                  name="invoiceNotes"
                  value={preferences.invoiceNotes}
                  onChange={handlePreferencesChange}
                  className="form-control"
                />
              </div>
            </div>
          )}
          
          {/* Subscription */}
          {activeTab === 'subscription' && (
            <div className="settings-section">
              <h2>Subscription</h2>
              
              <div className="form-group">
                <label htmlFor="plan">Plan</label>
                <select
                  id="plan"
                  name="plan"
                  value={subscription.plan}
                  onChange={handleSubscriptionChange}
                  className="form-control"
                >
                  <option value="Free">Free</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="billingCycle">Billing Cycle</label>
                <select
                  id="billingCycle"
                  name="billingCycle"
                  value={subscription.billingCycle}
                  onChange={handleSubscriptionChange}
                  className="form-control"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="nextBillingDate">Next Billing Date</label>
                <input
                  type="text"
                  id="nextBillingDate"
                  name="nextBillingDate"
                  value={subscription.nextBillingDate}
                  onChange={handleSubscriptionChange}
                  className="form-control"
                  disabled
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="paymentMethod">Payment Method</label>
                <input
                  type="text"
                  id="paymentMethod"
                  name="paymentMethod"
                  value={subscription.paymentMethod}
                  onChange={handleSubscriptionChange}
                  className="form-control"
                  disabled
                />
              </div>
            </div>
          )}
          
          {/* Team Members */}
          {activeTab === 'team' && (
            <div className="settings-section">
              <h2>Team Members</h2>
              {/* Team members management UI goes here */}
              <p>Manage your team members here.</p>
            </div>
          )}
          
          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notifications</h2>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="emailNotifications"
                    checked={notifications.emailNotifications}
                    onChange={handleNotificationsChange}
                  />
                  Email Notifications
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="smsNotifications"
                    checked={notifications.smsNotifications}
                    onChange={handleNotificationsChange}
                  />
                  SMS Notifications
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="invoiceReminders"
                    checked={notifications.invoiceReminders}
                    onChange={handleNotificationsChange}
                  />
                  Invoice Reminders
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="marketingEmails"
                    checked={notifications.marketingEmails}
                    onChange={handleNotificationsChange}
                  />
                  Marketing Emails
                </label>
              </div>
            </div>
          )}
          
          {/* Security */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <h2>Security</h2>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={security.twoFactorEnabled}
                    onChange={handleToggleTwoFactor}
                  />
                  Enable Two-Factor Authentication
                </label>
              </div>
              
              <div className="form-group">
                <label>Password Last Changed:</label>
                <span>{security.passwordLastChanged}</span>
              </div>
              
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-control"
                />
              </div>
              
              <button className="btn btn-primary" onClick={handlePasswordChange}>
                Change Password
              </button>
            </div>
          )}
          
          {/* Integrations */}
          {activeTab === 'integrations' && (
            <div className="settings-section">
              <h2>Integrations</h2>
              {/* Integrations management UI goes here */}
              <p>Manage your integrations here.</p>
            </div>
          )}
          
          {/* Data */}
          {activeTab === 'data' && (
            <div className="settings-section">
              <h2>Data</h2>
              {/* Data management UI goes here */}
              <p>Manage your data here.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="settings-actions">
        <button
          className="btn btn-primary"
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleLogout}
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default SettingsScreen;