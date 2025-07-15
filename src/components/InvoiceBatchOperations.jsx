import React, { useState } from 'react';
import { 
  FiDownload, 
  FiFile, 
  FiFileText, 
  FiMail, 
  FiPrinter, 
  FiArchive,
  FiTrash2,
  FiEdit3,
  FiCopy,
  FiX,
  FiFilter,
  FiSettings
} from 'react-icons/fi';

const EXPORT_FORMATS = [
  { id: 'pdf', name: 'PDF', icon: FiFile, description: 'Individual PDF files' },
  { id: 'csv', name: 'CSV', icon: FiFileText, description: 'Spreadsheet data' },
  { id: 'excel', name: 'Excel', icon: FiFileText, description: 'Excel workbook' },
  { id: 'zip', name: 'ZIP Archive', icon: FiArchive, description: 'All files in ZIP' }
];

const BATCH_ACTIONS = [
  { id: 'send', name: 'Send Email', icon: FiMail, description: 'Email selected invoices' },
  { id: 'print', name: 'Print All', icon: FiPrinter, description: 'Print selected invoices' },
  { id: 'duplicate', name: 'Duplicate', icon: FiCopy, description: 'Create copies' },
  { id: 'archive', name: 'Archive', icon: FiArchive, description: 'Archive selected' },
  { id: 'delete', name: 'Delete', icon: FiTrash2, description: 'Delete selected', destructive: true },
  { id: 'status', name: 'Update Status', icon: FiEdit3, description: 'Change status' }
];

const MOCK_INVOICES = [
  { id: 'inv-001', number: 'WRT-12345678-PO123456', customer: 'John Smith', amount: 450.00, status: 'paid', date: '2024-01-15' },
  { id: 'inv-002', number: 'WRT-87654321-PO789012', customer: 'ABC Corp', amount: 1200.00, status: 'pending', date: '2024-01-20' },
  { id: 'inv-003', number: 'WRT-11223344-PO345678', customer: 'Mary Johnson', amount: 650.00, status: 'overdue', date: '2024-01-10' },
  { id: 'inv-004', number: 'WRT-99887766-PO901234', customer: 'Tech Solutions', amount: 890.00, status: 'draft', date: '2024-01-25' },
  { id: 'inv-005', number: 'WRT-55443322-PO567890', customer: 'Green Industries', amount: 320.00, status: 'paid', date: '2024-01-18' }
];

export default function InvoiceBatchOperations() {
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportOptions, setExportOptions] = useState({
    includeAttachments: false,
    dateRange: 'all',
    statusFilter: 'all',
    groupByCustomer: false,
    includeNotes: true
  });

  const handleSelectAll = () => {
    setSelectedInvoices(
      selectedInvoices.length === MOCK_INVOICES.length 
        ? [] 
        : MOCK_INVOICES.map(invoice => invoice.id)
    );
  };

  const handleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleExport = () => {
    console.log('Exporting invoices:', {
      invoices: selectedInvoices,
      format: exportFormat,
      options: exportOptions
    });
    setShowExportModal(false);
  };

  const handleBatchAction = () => {
    console.log('Executing batch action:', {
      action: selectedAction,
      invoices: selectedInvoices
    });
    setShowBatchModal(false);
    setSelectedAction(null);
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Batch operations and export tools for your invoices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedInvoices.length} of {MOCK_INVOICES.length} selected
          </span>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={selectedInvoices.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiDownload className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowBatchModal(true)}
            disabled={selectedInvoices.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSettings className="w-4 h-4" />
            Batch Actions
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <FiFilter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
          <option>All Statuses</option>
          <option>Paid</option>
          <option>Pending</option>
          <option>Overdue</option>
          <option>Draft</option>
        </select>
        <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
          <option>All Time</option>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 3 months</option>
          <option>Custom Range</option>
        </select>
        <input
          type="text"
          placeholder="Search invoices..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Invoice List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === MOCK_INVOICES.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Invoice Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {MOCK_INVOICES.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice.id)}
                      onChange={() => handleSelectInvoice(invoice.id)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {invoice.number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {invoice.customer}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    ${invoice.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(invoice.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Invoices"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_FORMATS.map(format => (
                <button
                  key={format.id}
                  onClick={() => setExportFormat(format.id)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    exportFormat === format.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <format.icon className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">{format.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{format.description}</div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportOptions.includeAttachments}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeAttachments: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include attachments</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportOptions.groupByCustomer}
                onChange={(e) => setExportOptions(prev => ({ ...prev, groupByCustomer: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Group by customer</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportOptions.includeNotes}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeNotes: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include notes</span>
            </label>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowExportModal(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Export {selectedInvoices.length} Invoice{selectedInvoices.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </Modal>

      {/* Batch Actions Modal */}
      <Modal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title="Batch Actions"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {BATCH_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => setSelectedAction(action.id)}
                className={`p-3 rounded-lg border-2 transition-colors text-left ${
                  selectedAction === action.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : `border-gray-200 dark:border-gray-600 hover:border-gray-300 ${
                        action.destructive ? 'hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20' : ''
                      }`
                }`}
              >
                <div className="flex items-center gap-3">
                  <action.icon className={`w-5 h-5 ${action.destructive ? 'text-red-500' : 'text-gray-500'}`} />
                  <div>
                    <div className={`font-medium ${action.destructive ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>
                      {action.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{action.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowBatchModal(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleBatchAction}
              disabled={!selectedAction}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Execute Action
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
