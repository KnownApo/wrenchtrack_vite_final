import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiX, FiUser, FiFileText, FiTool, FiDollarSign, FiSettings, FiActivity } from 'react-icons/fi';

const actions = [
  { id: 'new-invoice', label: 'Create New Invoice', icon: <FiFileText />, path: '/invoice' },
  { id: 'new-customer', label: 'Add New Customer', icon: <FiUser />, path: '/customers', action: 'add-customer' },
  { id: 'new-part', label: 'Add New Part', icon: <FiTool />, path: '/parts', action: 'add-part' },
  { id: 'record-payment', label: 'Record Payment', icon: <FiDollarSign />, path: '/payment' },
  { id: 'dashboard', label: 'Go to Dashboard', icon: <FiActivity />, path: 'dashboard' },
  { id: 'customers', label: 'Go to Customers', icon: <FiUser />, path: 'customers' },
  { id: 'parts', label: 'Go to Parts', icon: <FiTool />, path: 'parts' },
  { id: 'invoices', label: 'Go to Invoices', icon: <FiFileText />, path: 'invoice' },
  { id: 'invoice-history', label: 'Go to Invoice History', icon: <FiFileText />, path: 'invoicehistory' },
  { id: 'settings', label: 'Go to Settings', icon: <FiSettings />, path: 'settings' },
];

export default function QuickActions({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredActions, setFilteredActions] = useState(actions);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Filter actions based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredActions(actions);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = actions.filter(action => 
        action.label.toLowerCase().includes(lowercaseSearch)
      );
      setFilteredActions(filtered);
    }
    // Reset selected index when search changes
    setSelectedIndex(0);
  }, [searchTerm]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredActions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredActions[selectedIndex]) {
            executeAction(filteredActions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredActions, onClose]);

  const executeAction = (action) => {
    if (action.path.startsWith('/')) {
      navigate(action.path);
    } else {
      // Dispatch custom event for the HomeScreen to handle
      const event = new CustomEvent('navigateTo', {
        detail: { path: action.path, action: action.action }
      });
      window.dispatchEvent(event);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-[15vh] z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-10 pr-10 py-4 text-lg bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-white"
            placeholder="Search for actions or type / to see all commands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={onClose}
          >
            <FiX className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
          </button>
        </div>

        {/* Actions List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredActions.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No actions found
            </div>
          ) : (
            <ul>
              {filteredActions.map((action, index) => (
                <li 
                  key={action.id}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    selectedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                  onClick={() => executeAction(action)}
                >
                  <div className="text-blue-500 dark:text-blue-400">
                    {action.icon}
                  </div>
                  <span className="text-gray-800 dark:text-white">
                    {action.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
