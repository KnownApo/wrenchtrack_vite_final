import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home, FileText, Users, Truck, Settings, BarChart2, Clock, Package,
} from "lucide-react";
import { motion } from "framer-motion";

const links = [
  { to: "/",          label: "Dashboard", icon: <Home size={18} /> },
  { to: "/invoices",  label: "Invoices",  icon: <FileText size={18} /> },
  { to: "/customers", label: "Customers", icon: <Users size={18} /> },
  { to: "/vehicles",  label: "Vehicles",  icon: <Truck size={18} /> },
  { to: "/parts",     label: "Parts",     icon: <Package size={18} /> },
  { to: "/analytics", label: "Analytics", icon: <BarChart2 size={18} /> },
  { to: "/jobs",      label: "Job Timer", icon: <Clock size={18} /> },
  { to: "/settings",  label: "Settings",  icon: <Settings size={18} /> },
];

export default function Sidebar({ open, onClose, className = "" }) {
  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: open ? 0 : -260 }}
      transition={{ type: "tween", duration: 0.2 }}
      className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800
                  shadow-lg flex flex-col ${className} lg:static lg:translate-x-0`}
    >
      <div className="px-6 py-4 font-extrabold text-xl tracking-tight text-brand-600">
        WrenchTrack
      </div>

      <nav className="flex-1 overflow-y-auto">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 border-l-4 text-sm font-medium
               transition-colors ${
                 isActive
                   ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200"
                   : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
               }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>
    </motion.aside>
  );
}
