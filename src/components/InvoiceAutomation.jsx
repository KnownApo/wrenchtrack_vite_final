import React, { useState } from 'react';
import { 
  FiCalendar, 
  FiMail, 
  FiClock, 
  FiRepeat, 
  FiDollarSign,
  FiUsers,
  FiFileText,
  FiSend,
  FiAlert
} from 'react-icons/fi';

const AUTOMATION_SETTINGS = {
  autoSend: false,
  sendReminders: true,
  generateRecurring: false,
  autoStatusUpdate: true,
  emailOnCreate: true,
  smsNotifications: false,
  overdueDays: 30,
  reminderDays: [7, 3, 1],
  autoPaymentFollowup: false,
  duplicateDetection: true,
  autoBackup: true,
  backupFrequency: 'daily'
};

export default function InvoiceAutomation({ settings = AUTOMATION_SETTINGS, onSettingsChange }) {
  const [automationSettings, setAutomationSettings] = useState(settings);

  const handleToggle = (setting) => {
    const newSettings = {
      ...automationSettings,
      [setting]: !automationSettings[setting]
    };
    setAutomationSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleValueChange = (setting, value) => {
    const newSettings = {
      ...automationSettings,
      [setting]: value
    };
    setAutomationSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`flex items-center justify-center w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
          enabled ? 'translate-x-3' : '-translate-x-3'
        }`}
      />
    </button>
  );

  const SettingItem = ({ icon: Icon, title, description, setting, disabled = false, children }) => (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
      <div className="flex items-start gap-3 flex-1">
        <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          {children}
        </div>
      </div>
      <div className="ml-4">
        <ToggleSwitch
          enabled={automationSettings[setting]}
          onChange={() => handleToggle(setting)}
          disabled={disabled}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invoice Automation</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Automate your invoicing workflow to save time and reduce manual tasks
        </p>
      </div>

      <div className="space-y-6">
        {/* Email & Communication */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiMail className="w-5 h-5" />
            Email & Communication
          </h3>
          <div className="space-y-4">
            <SettingItem
              icon={FiSend}
              title="Auto-send invoices"
              description="Automatically send invoices to customers when created"
              setting="autoSend"
            />
            
            <SettingItem
              icon={FiMail}
              title="Email notifications"
              description="Send email notifications when invoices are created or updated"
              setting="emailOnCreate"
            />
            
            <SettingItem
              icon={FiAlert}
              title="SMS notifications"
              description="Send SMS notifications for important invoice updates"
              setting="smsNotifications"
            />
          </div>
        </div>

        {/* Payment & Reminders */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiDollarSign className="w-5 h-5" />
            Payment & Reminders
          </h3>
          <div className="space-y-4">
            <SettingItem
              icon={FiCalendar}
              title="Payment reminders"
              description="Automatically send payment reminders to customers"
              setting="sendReminders"
            >
              {automationSettings.sendReminders && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Send reminders before due date (days):
                  </label>
                  <div className="flex gap-2">
                    {[1, 3, 7, 14, 30].map(days => (
                      <button
                        key={days}
                        onClick={() => {
                          const current = automationSettings.reminderDays || [];
                          const newDays = current.includes(days)
                            ? current.filter(d => d !== days)
                            : [...current, days].sort((a, b) => b - a);
                          handleValueChange('reminderDays', newDays);
                        }}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          (automationSettings.reminderDays || []).includes(days)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </SettingItem>
            
            <SettingItem
              icon={FiClock}
              title="Payment follow-up"
              description="Automatically follow up on overdue payments"
              setting="autoPaymentFollowup"
            >
              {automationSettings.autoPaymentFollowup && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mark as overdue after (days):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={automationSettings.overdueDays || 30}
                    onChange={(e) => handleValueChange('overdueDays', parseInt(e.target.value))}
                    className="w-20 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white"
                  />
                </div>
              )}
            </SettingItem>
          </div>
        </div>

        {/* Workflow Automation */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiRepeat className="w-5 h-5" />
            Workflow Automation
          </h3>
          <div className="space-y-4">
            <SettingItem
              icon={FiFileText}
              title="Auto status updates"
              description="Automatically update invoice status based on payment and actions"
              setting="autoStatusUpdate"
            />
            
            <SettingItem
              icon={FiRepeat}
              title="Recurring invoices"
              description="Automatically generate recurring invoices based on schedule"
              setting="generateRecurring"
            />
            
            <SettingItem
              icon={FiUsers}
              title="Duplicate detection"
              description="Automatically detect and prevent duplicate invoices"
              setting="duplicateDetection"
            />
          </div>
        </div>

        {/* Data & Backup */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiFileText className="w-5 h-5" />
            Data & Backup
          </h3>
          <div className="space-y-4">
            <SettingItem
              icon={FiFileText}
              title="Auto backup"
              description="Automatically backup invoice data and settings"
              setting="autoBackup"
            >
              {automationSettings.autoBackup && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Backup frequency:
                  </label>
                  <select
                    value={automationSettings.backupFrequency || 'daily'}
                    onChange={(e) => handleValueChange('backupFrequency', e.target.value)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}
            </SettingItem>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={() => {
            // Save settings logic here
            console.log('Saving automation settings:', automationSettings);
          }}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
        >
          Save Automation Settings
        </button>
      </div>
    </div>
  );
}
