#!/usr/bin/env node
// Simple verification script to test key components

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function checkFileExists(filePath) {
  try {
    const fullPath = join(__dirname, filePath);
    readFileSync(fullPath, 'utf8');
    console.log(`✓ ${filePath} exists`);
    return true;
  } catch (error) {
    console.error(`✗ ${filePath} missing or invalid`);
    return false;
  }
}

// Key files to verify
const keyFiles = [
  'src/screens/DashboardScreen.jsx',
  'src/screens/CustomersScreen.jsx',
  'src/screens/InvoiceScreen.jsx',
  'src/screens/VehiclesScreen.jsx',
  'src/screens/JobTimerScreen.jsx',
  'src/screens/UserProfileScreen.jsx',
  'src/screens/AnalyticsScreen.jsx',
  'src/screens/PartsScreen.jsx',
  'src/screens/SettingsScreen.jsx',
  'src/context/AuthContext.jsx',
  'src/context/CustomerContext.jsx',
  'src/context/VehicleContext.jsx',
  'src/context/InvoiceContext.jsx',
  'src/components/Header.jsx',
  'src/components/Sidebar.jsx',
  'src/App.jsx',
  'src/main.jsx'
];

console.log('WrenchTrack Component Verification');
console.log('==================================');

let allGood = true;
for (const file of keyFiles) {
  if (!checkFileExists(file)) {
    allGood = false;
  }
}

console.log('==================================');
if (allGood) {
  console.log('✓ All key components are present!');
  process.exit(0);
} else {
  console.log('✗ Some components are missing!');
  process.exit(1);
}
