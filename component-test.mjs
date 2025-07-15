// Test script to verify all components load correctly
import React from 'react';

// Test all main screens
import DashboardScreen from './src/screens/DashboardScreen.jsx';
import InvoiceScreen from './src/screens/InvoiceScreen.jsx';
import InvoiceDetailScreen from './src/screens/InvoiceDetailScreen.jsx';
import CustomersScreen from './src/screens/CustomersScreen.jsx';
import VehiclesScreen from './src/screens/VehiclesScreen.jsx';
import AnalyticsScreen from './src/screens/AnalyticsScreen.jsx';

// Test context providers
import { AuthProvider } from './src/context/AuthContext.jsx';
import { InvoiceProvider } from './src/context/InvoiceContext.jsx';
import { CustomerProvider } from './src/context/CustomerContext.jsx';
import { VehicleProvider } from './src/context/VehicleContext.jsx';

// Test key components
import LoadingSpinner from './src/components/LoadingSpinner.jsx';
import ErrorMessage from './src/components/ErrorMessage.jsx';
import InvoiceAnalytics from './src/components/InvoiceAnalytics.jsx';
import InvoiceList from './src/components/InvoiceList.jsx';
import Sidebar from './src/components/Sidebar.jsx';
import Header from './src/components/Header.jsx';

console.log('✅ All components imported successfully!');
console.log('✅ AuthProvider:', AuthProvider);
console.log('✅ InvoiceProvider:', InvoiceProvider);
console.log('✅ CustomerProvider:', CustomerProvider);
console.log('✅ VehicleProvider:', VehicleProvider);
console.log('✅ DashboardScreen:', DashboardScreen);
console.log('✅ InvoiceScreen:', InvoiceScreen);
console.log('✅ InvoiceDetailScreen:', InvoiceDetailScreen);
console.log('✅ CustomersScreen:', CustomersScreen);
console.log('✅ VehiclesScreen:', VehiclesScreen);
console.log('✅ AnalyticsScreen:', AnalyticsScreen);
console.log('✅ LoadingSpinner:', LoadingSpinner);
console.log('✅ ErrorMessage:', ErrorMessage);
console.log('✅ InvoiceAnalytics:', InvoiceAnalytics);
console.log('✅ InvoiceList:', InvoiceList);
console.log('✅ Sidebar:', Sidebar);
console.log('✅ Header:', Header);
