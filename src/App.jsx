import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import InvoiceScreen from './screens/InvoiceScreen';
import InvoiceHistoryScreen from './screens/InvoiceHistoryScreen';
import VehicleServiceRecordsScreen from './screens/VehicleServiceRecordsScreen';
import PaymentScreen from './screens/PaymentScreen';
import SettingsScreen from './screens/SettingsScreen';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { InvoiceProvider } from './context/InvoiceContext';
import ErrorBoundary from './components/ErrorBoundary';
import firebaseService from './services/firebaseService';
import { setupLaborGuide } from './utils/setupLaborGuide';
import LaborGuideDebugger from './utils/laborGuideDebugger';

// Simple ForgotPasswordScreen component
function ForgotPasswordScreen() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">Reset Password</h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Send Reset Link
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// PrivateRoute component for protected routes
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <ThemeProvider>
            <InvoiceProvider>
              <AppContent />
            </InvoiceProvider>
          </ThemeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState('light'); // Default theme
  const [isSettingUpLaborGuide, setIsSettingUpLaborGuide] = useState(false);
  
  // Handle manual setup of labor guide data
  const handleSetupLaborGuide = async () => {
    if (!user) return;
    
    try {
      setIsSettingUpLaborGuide(true);
      const result = await setupLaborGuide();
      if (result) {
        alert("Labor guide setup complete! Sample operations added.");
      } else {
        alert("Labor guide data already exists.");
      }
    } catch (error) {
      console.error("Error setting up labor guide:", error);
      alert("Error setting up labor guide. Check console for details.");
    } finally {
      setIsSettingUpLaborGuide(false);
    }
  };
  
  // Initialize user documents when logged in
  useEffect(() => {
    const initializeUser = async () => {
      if (user) {
        try {
          // Ensure user documents are initialized
          await firebaseService.initializeUserDocuments();
          
          // Initialize labor guide data if needed
          await setupLaborGuide();
        } catch (error) {
          console.error("Error initializing user documents:", error);
        }
      }
    };

    if (user && !loading) {
      initializeUser();
    }

    // Cleanup when unmounting
    return () => {
      if (user) {
        try {
          firebaseService.cleanup();
        } catch (error) {
          console.error("Error cleaning up:", error);
        }
      }
    };
  }, [user, loading]);

  return (
    <div className={`app ${theme}`}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        
        {/* Protected routes */}
        <Route path="/" element={<PrivateRoute><HomeScreen /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><HomeScreen activePage="dashboard" /></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute><HomeScreen activePage="customers" /></PrivateRoute>} />
        <Route path="/job" element={<PrivateRoute><HomeScreen activePage="job" /></PrivateRoute>} />
        <Route path="/parts" element={<PrivateRoute><HomeScreen activePage="parts" /></PrivateRoute>} />
        <Route path="/invoice" element={<PrivateRoute><InvoiceScreen /></PrivateRoute>} />
        <Route path="/invoicehistory" element={<PrivateRoute><InvoiceHistoryScreen /></PrivateRoute>} />
        <Route path="/service-records" element={<PrivateRoute><VehicleServiceRecordsScreen /></PrivateRoute>} />
        <Route path="/payment" element={<PrivateRoute><PaymentScreen /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsScreen /></PrivateRoute>} />
        
        {/* Debug route */}
        <Route path="/debug/labor-guide" element={<PrivateRoute><LaborGuideDebugger /></PrivateRoute>} />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;

