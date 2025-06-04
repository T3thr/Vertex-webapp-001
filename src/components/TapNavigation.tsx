"use client";

import { BookOpen, Clock, Star } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'recent', label: 'ดูล่าสุด', icon: <Clock size={16} /> },
  { id: 'history', label: 'ประวัติการอ่าน', icon: <BookOpen size={16} /> },
  { id: 'favorites', label: 'My favourite', icon: <Star size={16} /> }
];

const TabNavigation = () => {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'recent';

  return (
    <div className="flex space-x-1 mb-8">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`?tab=${tab.id}`}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          {tab.icon}
          <span className="ml-2">{tab.label}</span>
        </Link>
      ))}
    </div>
  );
};

export default TabNavigation;