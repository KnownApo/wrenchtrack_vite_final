import React from "react";
import { Outlet } from "react-router-dom";
import AppShell from "../layouts/AppShell";   // <- correct relative path

/**
 * Thin wrapper: AppShell gives you the modern header + sidebar,
 * <Outlet/> swaps in Dashboard, Invoices, Parts, etc.
 */
export default function HomeScreen() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
