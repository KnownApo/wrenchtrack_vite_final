import React from "react";
import { Menu, Bell, UserCircle, Search } from "lucide-react";

export default function Header({ toggleSidebar }) {
  return (
    <header className="flex items-center gap-4 px-6 py-4 bg-white dark:bg-gray-800 shadow-md">
      <button
        className="lg:hidden text-gray-700 dark:text-gray-200"
        onClick={toggleSidebar}
      >
        <Menu size={24} />
      </button>

      <div className="relative flex-1 max-w-lg">
        <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
          <Search size={18} />
        </span>
        <input
          type="search"
          placeholder="Quick search..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300
                     dark:border-gray-700 bg-gray-50 dark:bg-gray-700
                     text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <button className="relative text-gray-700 dark:text-gray-200">
        <Bell size={22} />
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600
                         text-white text-[10px] flex items-center justify-center">
          3
        </span>
      </button>

      <button className="ml-2 text-gray-700 dark:text-gray-200">
        <UserCircle size={24} />
      </button>
    </header>
  );
}
