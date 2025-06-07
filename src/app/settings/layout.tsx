'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const settingsTabs = [
  { name: 'General', href: '/settings' },
  { name: 'Account', href: '/settings/account' },
  { name: 'Display & Reading', href: '/settings/display' },
  { name: 'Notifications', href: '/settings/notifications' },
  { name: 'Privacy & Content', href: '/settings/privacy' },
  { name: 'Security', href: '/settings/security' },
  { name: 'Visual Novel Settings', href: '/settings/visual-novel' },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-12">
          {/* Navigation Sidebar */}
          <aside className="sm:col-span-3">
            <nav className="space-y-1">
              {settingsTabs.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`${
                      isActive
                        ? 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    } group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                  >
                    {tab.name}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="sm:col-span-9">
            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
} 