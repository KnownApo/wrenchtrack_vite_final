import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ToastSetup from './components/ToastSetup';
import AuthGuard from './components/AuthGuard';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

import DashboardScreen from './screens/DashboardScreen';
import CustomersScreen from './screens/CustomersScreen';
import CustomerHistoryScreen from './screens/CustomerHistoryScreen';
import PartsScreen from './screens/PartsScreen';
import JobTimerScreen from './screens/JobTimerScreen';
import InvoiceBuilderScreen from './screens/InvoiceBuilderScreen';
import InvoiceHistoryScreen from './screens/InvoiceHistoryScreen';
import SignatureScreen from './screens/SignatureScreen';
import PaymentScreen from './screens/PaymentScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  return (
    <Router>
      <ToastSetup />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />

        {/* Protected Routes */}
        <Route path="/" element={<AuthGuard><DashboardScreen /></AuthGuard>} />
        <Route path="/customers" element={<AuthGuard><CustomersScreen /></AuthGuard>} />
        <Route path="/history" element={<AuthGuard><CustomerHistoryScreen /></AuthGuard>} />
        <Route path="/parts" element={<AuthGuard><PartsScreen /></AuthGuard>} />
        <Route path="/job" element={<AuthGuard><JobTimerScreen /></AuthGuard>} />
        <Route path="/invoice" element={<AuthGuard><InvoiceBuilderScreen /></AuthGuard>} />
        <Route path="/invoices" element={<AuthGuard><InvoiceHistoryScreen /></AuthGuard>} />
        <Route path="/signature" element={<AuthGuard><SignatureScreen /></AuthGuard>} />
        <Route path="/payment" element={<AuthGuard><PaymentScreen /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><SettingsScreen /></AuthGuard>} />
      </Routes>
    </Router>
  );
}
