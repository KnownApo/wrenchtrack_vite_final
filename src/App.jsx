import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import HomeScreen          from "./screens/HomeScreen";          // wrapper → AppShell + <Outlet/>
import DashboardScreen     from "./screens/DashboardScreen";
import InvoiceScreen       from "./screens/InvoiceScreen";       // <-- correct filename
import InvoiceDetailScreen from "./screens/InvoiceDetailScreen";
import CustomersScreen     from "./screens/CustomersScreen";     // <-- correct filename
import VehiclesScreen      from "./screens/VehiclesScreen";      // <-- correct filename
import PartsScreen         from "./screens/PartsScreen";         // <-- correct filename
import JobTimerScreen      from "./screens/JobTimerScreen";
import AnalyticsScreen     from "./screens/AnalyticsScreen";
import SettingsScreen      from "./screens/SettingsScreen";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Shell wrapper – gives header & sidebar to every child */}
        <Route element={<HomeScreen />}>
          <Route index                 element={<DashboardScreen />} />
          <Route path="invoices"       element={<InvoiceScreen />} />
          <Route path="invoices/:id"   element={<InvoiceDetailScreen />} />
          <Route path="customers"      element={<CustomersScreen />} />
          <Route path="vehicles"       element={<VehiclesScreen />} />
          <Route path="parts"          element={<PartsScreen />} />
          <Route path="jobs"           element={<JobTimerScreen />} />
          <Route path="analytics"      element={<AnalyticsScreen />} />
          <Route path="settings"       element={<SettingsScreen />} />
        </Route>

        {/* Anything unknown → dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
