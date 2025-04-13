import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <Router>
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
      </Routes>
      
    </Router>
  );
}

