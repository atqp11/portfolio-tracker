'use client';

import { useState } from 'react';
import { useTheme } from '@lib/contexts/ThemeContext';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    notifications: true,
    autoRefresh: true,
    refreshInterval: 15,
  });

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <div className="max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">General Settings</h2>

        {/* Theme */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Theme
          </label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Choose between light, dark, or auto mode that follows your system preference
          </p>
        </div>

        {/* Notifications */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) =>
                setSettings({ ...settings, notifications: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable notifications
            </span>
          </label>
          <p className="ml-6 text-sm text-gray-500 dark:text-gray-400 mt-1">
            Receive alerts for stop-loss and take-profit triggers
          </p>
        </div>

        {/* Auto Refresh */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.autoRefresh}
              onChange={(e) =>
                setSettings({ ...settings, autoRefresh: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Auto-refresh portfolio data
            </span>
          </label>
        </div>

        {/* Refresh Interval */}
        {settings.autoRefresh && (
          <div className="mb-6 ml-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Refresh interval (minutes)
            </label>
            <input
              type="number"
              value={settings.refreshInterval}
              onChange={(e) =>
                setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })
              }
              min="1"
              max="60"
              className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Account Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Account</h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Tier</p>
            <p className="text-lg text-gray-900 dark:text-gray-100">Free</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">API Usage</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
