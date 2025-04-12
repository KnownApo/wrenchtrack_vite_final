import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

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
        <Route path="/" element={<HomeScreen />} />
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/customers" element={<CustomersScreen />} />
        <Route path="/history" element={<CustomerHistoryScreen />} />
        <Route path="/job" element={<JobTimerScreen />} />
        <Route path="/parts" element={<PartsScreen />} />
        <Route path="/invoice" element={<InvoiceBuilderScreen />} />
        <Route path="/invoices" element={<InvoiceHistoryScreen />} />
        <Route path="/signature" element={<SignatureScreen />} />
        <Route path="/payment" element={<PaymentScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
      </Routes>
    </Router>
  );
}
