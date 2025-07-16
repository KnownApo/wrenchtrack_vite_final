import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home, FileText, Users, Truck, Settings,
  BarChart2, Clock, Package, Archive, Wrench, User, Shield, 
  Zap, TrendingUp, Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { 
    to: "/", 
    label: "Dashboard", 
    icon: Home, 
    description: "Overview & analytics",
    gradient: "from-blue-500 to-purple-600"
  },
  { 
    to: "/invoices", 
    label: "Invoices", 
    icon: FileText, 
    description: "Manage invoices",
    gradient: "from-green-500 to-emerald-600"
  },
  { 
    to: "/customers", 
    label: "Customers", 
    icon: Users, 
    description: "Customer management",
    gradient: "from-orange-500 to-red-600"
  },
  { 
    to: "/vehicles", 
    label: "Vehicles", 
    icon: Truck, 
    description: "Vehicle registry",
    gradient: "from-purple-500 to-pink-600"
  },
  { 
    to: "/vehicle-service-records", 
    label: "Service Records", 
    icon: Wrench, 
    description: "Service history",
    gradient: "from-indigo-500 to-blue-600"
  },
  { 
    to: "/inspection", 
    label: "Vehicle Inspection", 
    icon: Shield, 
    description: "Safety inspections",
    gradient: "from-red-500 to-orange-600"
  },
  { 
    to: "/records", 
    label: "Records", 
    icon: Archive, 
    description: "Document storage",
    gradient: "from-gray-500 to-gray-600"
  },
  { 
    to: "/parts", 
    label: "Parts", 
    icon: Package, 
    description: "Inventory management",
    gradient: "from-teal-500 to-cyan-600"
  },
  { 
    to: "/jobs", 
    label: "Job Timer", 
    icon: Clock, 
    description: "Time tracking",
    gradient: "from-yellow-500 to-orange-600"
  },
  { 
    to: "/analytics", 
    label: "Analytics", 
    icon: BarChart2, 
    description: "Business insights",
    gradient: "from-pink-500 to-rose-600"
  },
  { 
    to: "/user-profile", 
    label: "Profile", 
    icon: User, 
    description: "User settings",
    gradient: "from-slate-500 to-gray-600"
  },
  { 
    to: "/settings", 
    label: "Settings", 
    icon: Settings, 
    description: "App configuration",
    gradient: "from-neutral-500 to-stone-600"
  },
];

const quickStats = [
  { label: "Active Jobs", value: "12", icon: Activity, color: "text-green-500" },
  { label: "Pending", value: "5", icon: Clock, color: "text-yellow-500" },
  { label: "Revenue", value: "$24.5K", icon: TrendingUp, color: "text-blue-500" },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  const NavItem = ({ to, label, icon: Icon, description, isActive }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <NavLink
        to={to}
        onClick={onClose}
        className={({ isActive }) => `
          group relative flex items-center gap-3 px-4 py-3 mx-3 rounded-xl text-sm font-medium
          transition-all duration-200 hover:bg-white/10 hover:backdrop-blur-sm
          ${isActive 
            ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/20' 
            : 'text-gray-300 hover:text-white'
          }
        `}
      >
        <div className={`
          p-2 rounded-lg transition-all duration-200 group-hover:scale-110
          ${isActive ? 'bg-white/20' : 'bg-white/10'}
        `}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{label}</div>
          <div className="text-xs text-gray-400 truncate">{description}</div>
        </div>
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute right-2 w-2 h-2 bg-white rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </NavLink>
    </motion.div>
  );

  const sidebarContent = (
    <div className="h-full w-64 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 
                    shadow-2xl flex flex-col relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20" />
        <div className="absolute top-0 -left-4 w-72 h-72 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-4 w-72 h-72 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">WrenchTrack</h1>
            <p className="text-xs text-gray-400">Pro Service Manager</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="relative p-4 border-b border-white/10">
        <div className="grid grid-cols-3 gap-2">
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
              <div className="text-white text-sm font-semibold">{stat.value}</div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        <AnimatePresence>
          {links.map((link, index) => (
            <motion.div
              key={link.to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <NavItem
                to={link.to}
                label={link.label}
                icon={link.icon}
                description={link.description}
                gradient={link.gradient}
                isActive={location.pathname === link.to}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </nav>

      {/* Footer */}
      <div className="relative p-4 border-t border-white/10">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>System Status: </span>
            <span className="text-green-400 font-medium">Online</span>
          </div>
          <div className="mt-2 bg-white/10 rounded-full h-1 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-400 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: "85%" }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile slide-in drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 lg:hidden"
            initial={{ x: -264 }}
            animate={{ x: 0 }}
            exit={{ x: -264 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop always visible */}
      <aside className="hidden lg:block relative z-10">
        {sidebarContent}
      </aside>
    </>
  );
}
