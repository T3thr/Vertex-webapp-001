// src/components/TabNavigation.tsx (ชื่อไฟล์ควรตรงกับ import)
"use client"; // จำเป็นสำหรับ useSearchParams

import { BookOpen, Clock, Star } from 'lucide-react'; // ตรวจสอบว่า lucide-react ติดตั้งแล้ว
import Link from 'next/link';
import { useSearchParams } from 'next/navigation'; // ถูกต้องสำหรับ App Router

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'recent', label: 'ดูล่าสุด', icon: <Clock size={16} /> },
  { id: 'history', label: 'ประวัติการอ่าน', icon: <BookOpen size={16} /> },
  { id: 'favorites', label: 'My favourite', icon: <Star size={16} /> }
  // สามารถเพิ่ม Tab อื่นๆ ได้ เช่น 'all' สำหรับแสดงทั้งหมด
  // { id: 'all', label: 'ทั้งหมด', icon: <List size={16} /> },
];

const TabNavigation = () => {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'recent'; // ค่าเริ่มต้นเป็น 'recent'

  return (
    <div className="flex space-x-1 mb-8">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/library?tab=${tab.id}`} // ควรระบุ path เต็มเพื่อให้ชัดเจน หรือ ?tab=... ถ้าอยู่ใน page เดียวกัน
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-blue-500 text-white' // สไตล์สำหรับ active tab
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' // สไตล์สำหรับ inactive tab
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