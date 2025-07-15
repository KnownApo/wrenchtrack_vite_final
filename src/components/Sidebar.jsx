import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home, FileText, Users, Truck, Settings,
  BarChart2, Clock, Package, Archive, Wrench
} from "lucide-react";
import { motion } from "framer-motion";

const links = [
  { to: "/",          label: "Dashboard", icon: <Home size={18} /> },
  { to: "/invoices",  label: "Invoices",  icon: <FileText size={18} /> },
  { to: "/customers", label: "Customers", icon: <Users size={18} /> },
  { to: "/vehicles",  label: "Vehicles",  icon: <Truck size={18} /> },
  { to: "/vehicle-service-records", label: "Service Records", icon: <Wrench size={18} /> },
  { to: "/records",   label: "Records",   icon: <Archive size={18} /> },
  { to: "/parts",     label: "Parts",     icon: <Package size={18} /> },
  { to: "/jobs",      label: "Job Timer", icon: <Clock size={18} /> },
  { to: "/analytics", label: "Analytics", icon: <BarChart2 size={18} /> },
  { to: "/settings",  label: "Settings",  icon: <Settings size={18} /> },
];

export default function Sidebar({ open, onClose }) {
  /* Only animate on < lg (desktop shows it statically) */
  const sidebar = (
    <div className="h-full w-64 bg-gray-50/90 dark:bg-gray-800/75
                    backdrop-blur-xs shadow-card border-r
                    border-gray-200/60 dark:border-gray-700/60
                    flex flex-col">
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
              `flex items-center gap-3 px-6 py-3 text-sm font-medium
               transition-colors ${isActive
                 ? "bg-brand-500/10 text-brand-700 dark:text-brand-200"
                 : "hover:bg-gray-200/50 dark:hover:bg-gray-700"}`
            }
          >
            {icon} {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* ----- small screens: slide-in drawer ----- */}
      <motion.aside
        className="fixed inset-y-0 left-0 z-50 lg:hidden"
        initial={{ x: -260 }}
        animate={{ x: open ? 0 : -260 }}
        transition={{ type: "tween", duration: 0.25 }}
      >
        {sidebar}
      </motion.aside>

      {/* ----- desktop: always visible, no animation ----- */}
      <aside className="hidden lg:block">{sidebar}</aside>
    </>
  );
}
