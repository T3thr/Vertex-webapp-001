// src/components/mydashboard/Writing.tsx
import React, { useEffect, useState } from 'react';
import { Eye, Heart, Menu } from 'lucide-react';

export const Writing = () => {
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNovels = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/novels/mine?limit=20');
        if (!res.ok) throw new Error('เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย');
        const data = await res.json();
        setNovels(data.novels || []);
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ');
      } finally {
        setLoading(false);
      }
    };
    fetchNovels();
  }, []);

  if (loading) return <div>กำลังโหลดข้อมูลนิยาย...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="divide-y">
      {novels.length === 0 && <div>ไม่พบนิยาย</div>}
      {novels.map((novel) => (
        <div key={novel._id} className="flex items-center gap-4 py-4">
          {/* ปกนิยาย */}
          <img
            src={novel.coverImageUrl || '/images/placeholder-cover.webp'}
            alt={novel.title}
            className="w-32 h-44 object-cover rounded"
          />
          {/* ข้อมูลนิยาย */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="font-semibold text-lg truncate">{novel.title}</div>
            <div className="flex items-center text-gray-600 mt-1 mb-2">
              <span className="flex items-center mr-2">
                <svg width="18" height="18" fill="none" stroke="currentColor" className="mr-1"><path d="M16 18v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                {novel.author?.profile?.penName || novel.author?.username || 'ไม่ระบุ'}
              </span>
            </div>
            <div className="flex items-center gap-6 text-gray-700 text-base">
              <span className="flex items-center"><Menu size={18} className="mr-1" />{novel.publishedEpisodesCount ?? 0}</span>
              <span className="flex items-center"><Eye size={18} className="mr-1" />{novel.stats?.viewsCount?.toLocaleString() ?? 0}</span>
              <span className="flex items-center"><Heart size={18} className="mr-1" />{novel.stats?.likesCount?.toLocaleString() ?? 0}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
