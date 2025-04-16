import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSettings, FiLogOut, FiUser } from 'react-icons/fi';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';
import firebaseService from '../services/firebaseService';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [userName, setUserName] = useState('');
  const [businessName, setBusinessName] = useState('');

  // Load user avatar and business name
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        // First check localStorage for avatar (fastest)
        let avatarUrl = '';
        try {
          avatarUrl = localStorage.getItem(`user_avatar_${user.uid}`);
        } catch (e) {
          console.warn("Could not access localStorage for avatar");
        }
        
        // If avatar not in localStorage, try to get from Firestore
        if (!avatarUrl) {
          console.log("Avatar not found in localStorage, fetching from Firestore");
          const settings = await firebaseService.getSettingsDoc();
          if (settings?.avatar) {
            avatarUrl = settings.avatar;
            
            // Save to localStorage for future use
            try {
              localStorage.setItem(`user_avatar_${user.uid}`, avatarUrl);
            } catch (e) {
              console.warn("Could not save avatar to localStorage");
            }
          }
        }
        
        // Set the avatar if found
        if (avatarUrl) {
          setAvatar(avatarUrl);
        }
        
        // Get business name from settings
        const settings = await firebaseService.getSettingsDoc();
        if (settings?.businessInfo?.name) {
          setBusinessName(settings.businessInfo.name);
        }
        
        // Set user name (email or display name)
        setUserName(user.displayName || user.email || 'User');
      } catch (error) {
        console.error("Error loading user data for header:", error);
      }
    };
    
    loadUserData();
  }, [user]);
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className={`header ${theme}`}>
      <div className="logo">
        <Link to="/">WrenchTrack</Link>
      </div>
      
      {user && (
        <div className="user-menu">
          <div 
            className="avatar-container" 
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {avatar ? (
              <img 
                src={avatar} 
                alt="User Avatar" 
                className="avatar-image"
              />
            ) : (
              <div className="avatar-placeholder">
                <FiUser />
              </div>
            )}
            <span className="user-name">{businessName || userName}</span>
          </div>
          
          {dropdownOpen && (
            <div className="dropdown-menu">
              <Link to="/settings" className="dropdown-item">
                <FiSettings /> Settings
              </Link>
              <button onClick={handleLogout} className="dropdown-item">
                <FiLogOut /> Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
