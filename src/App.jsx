import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { InvoiceProvider } from './context/InvoiceContext';
import { JobLogProvider } from './context/JobLogContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import InvoiceScreen from './screens/InvoiceScreen';
import InvoiceDetailScreen from './screens/InvoiceDetailScreen';
import InvoiceHistoryScreen from './screens/InvoiceHistoryScreen';
import CustomersScreen from './screens/CustomersScreen';
import CustomerHistoryScreen from './screens/CustomerHistoryScreen';
import VehiclesScreen from './screens/VehiclesScreen';
import VehicleServiceRecordsScreen from './screens/VehicleServiceRecordsScreen';
import PartsScreen from './screens/PartsScreen';
import JobTimerScreen from './screens/JobTimerScreen';
import SettingsScreen from './screens/SettingsScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import PaymentScreen from './screens/PaymentScreen';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  return user ? children : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginScreen />,
  },
  {
    path: "/register",
    element: <RegisterScreen />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordScreen />,
  },
  {
    path: "/",
    element: <PrivateRoute><HomeScreen /></PrivateRoute>,
    children: [
      { index: true, element: <DashboardScreen /> },
      { path: "invoices", element: <InvoiceScreen /> },
      { path: "invoices/:id", element: <InvoiceDetailScreen /> },
      { path: "history", element: <InvoiceHistoryScreen /> },
      { path: "customers", element: <CustomersScreen /> },
      { path: "customers/:id/history", element: <CustomerHistoryScreen /> },
      { path: "vehicles", element: <VehiclesScreen /> },
      { path: "vehicles/:id/service-records", element: <VehicleServiceRecordsScreen /> },
      { path: "parts", element: <PartsScreen /> },
      { path: "jobs", element: <JobTimerScreen /> },
      { path: "settings", element: <SettingsScreen /> },
      { path: "analytics", element: <AnalyticsScreen /> },
      { path: "payments/:invoiceId", element: <PaymentScreen /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <InvoiceProvider>
          <JobLogProvider>
            <ErrorBoundary>
              <Suspense fallback={<LoadingSpinner />}>
                <RouterProvider router={router} />
              </Suspense>
              <ToastContainer position="top-right" autoClose={3000} theme="colored" />
            </ErrorBoundary>
          </JobLogProvider>
        </InvoiceProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}