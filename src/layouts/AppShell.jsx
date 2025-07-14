import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { motion, AnimatePresence } from "framer-motion";

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        className="z-50"
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <Header toggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}
