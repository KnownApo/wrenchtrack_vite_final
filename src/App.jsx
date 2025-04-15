import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/modern.css';
import 'react-toastify/dist/ReactToastify.css';

import AuthGuard from './components/AuthGuard.jsx';
import HomeScreen from './screens/HomeScreen';
import CustomersScreen from './screens/CustomersScreen';
import JobTimerScreen from './screens/JobTimerScreen';
import PartsScreen from './screens/PartsScreen';
import InvoiceBuilderScreen from './screens/InvoiceBuilderScreen';
import SignatureScreen from './screens/SignatureScreen';
import PaymentScreen from './screens/PaymentScreen';
import SettingsScreen from './screens/SettingsScreen';
import InvoiceHistoryScreen from './screens/InvoiceHistoryScreen';
import CustomerHistoryScreen from './screens/CustomerHistoryScreen';
import DashboardScreen from './screens/DashboardScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import InvoiceDetailScreen from './screens/InvoiceDetailScreen';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <Router>
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="font-sans antialiased">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/register" element={<RegisterScreen />} />

                {/* Protected Routes */}
                <Route path="/" element={<AuthGuard><HomeScreen /></AuthGuard>} />
                <Route path="/dashboard" element={<AuthGuard><DashboardScreen /></AuthGuard>} />
                <Route path="/customers" element={<AuthGuard><CustomersScreen /></AuthGuard>} />
                <Route path="/history" element={<AuthGuard><CustomerHistoryScreen /></AuthGuard>} />
                <Route path="/job" element={<AuthGuard><JobTimerScreen /></AuthGuard>} />
                <Route path="/parts" element={<AuthGuard><PartsScreen /></AuthGuard>} />
                <Route path="/invoice" element={<AuthGuard><InvoiceBuilderScreen /></AuthGuard>} />
                <Route path="/invoicehistory" element={<AuthGuard><InvoiceHistoryScreen /></AuthGuard>} />
                <Route path="/signature" element={<AuthGuard><SignatureScreen /></AuthGuard>} />
                <Route path="/payment" element={<AuthGuard><PaymentScreen /></AuthGuard>} />
                <Route path="/settings" element={<AuthGuard><SettingsScreen /></AuthGuard>} />
                <Route path="/customerhistory" element={<AuthGuard><CustomerHistoryScreen /></AuthGuard>} />
                <Route path="/invoices/:id" element={<AuthGuard><InvoiceDetailScreen /></AuthGuard>} />
                              </Routes>
            </div>
          </Router>
        </ErrorBoundary>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;

