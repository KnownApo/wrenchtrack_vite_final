import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import HomeScreen          from "./screens/HomeScreen";
import DashboardScreen     from "./screens/DashboardScreen";
import InvoiceScreen       from "./screens/InvoiceScreen";
import InvoiceDetailScreen from "./screens/InvoiceDetailScreen";
import InvoiceCreateScreen from "./screens/InvoiceCreateScreen";
import CustomersScreen     from "./screens/CustomersScreen";
import CustomerProfileScreen from "./screens/CustomerProfileScreen";
import VehiclesScreen      from "./screens/VehiclesScreen";
import VehicleServiceRecordsScreen from "./screens/VehicleServiceRecordsScreen";
import RecordsScreen       from "./screens/RecordsScreen";
import PartsScreen         from "./screens/PartsScreen";
import JobTimerScreen      from "./screens/JobTimerScreen";
import AnalyticsScreen     from "./screens/AnalyticsScreen";
import SettingsScreen      from "./screens/SettingsScreen";
import LoginScreen         from "./screens/LoginScreen";
import RegisterScreen      from "./screens/RegisterScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// Public Route Component (redirects to dashboard if already logged in)
function PublicRoute({ children }) {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <LoginScreen />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <RegisterScreen />
          </PublicRoute>
        } />
        <Route path="/forgot-password" element={
          <PublicRoute>
            <ForgotPasswordScreen />
          </PublicRoute>
        } />

        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <HomeScreen />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardScreen />} />
          <Route path="invoices" element={<InvoiceScreen />} />
          <Route path="invoices/create" element={<InvoiceCreateScreen />} />
          <Route path="invoices/:id/edit" element={<InvoiceCreateScreen />} />
          <Route path="invoices/:id" element={<InvoiceDetailScreen />} />
          <Route path="customers" element={<CustomersScreen />} />
          <Route path="customers/:id" element={<CustomerProfileScreen />} />
          <Route path="vehicles" element={<VehiclesScreen />} />
          <Route path="vehicle-service-records" element={<VehicleServiceRecordsScreen />} />
          <Route path="records" element={<RecordsScreen />} />
          <Route path="parts" element={<PartsScreen />} />
          <Route path="jobs" element={<JobTimerScreen />} />
          <Route path="analytics" element={<AnalyticsScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
