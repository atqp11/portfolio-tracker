'use client';

interface TabsProps {
  activeTab: 'users' | 'billing';
  onTabChange: (tab: 'users' | 'billing') => void;
}

export default function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange('users')}
          className={`
            py-4 px-1 border-b-2 font-medium text-sm transition-colors
            ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
        >
          Users
        </button>
        <button
          onClick={() => onTabChange('billing')}
          className={`
            py-4 px-1 border-b-2 font-medium text-sm transition-colors
            ${
              activeTab === 'billing'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
        >
          Billing Admin
        </button>
      </nav>
    </div>
  );
}


