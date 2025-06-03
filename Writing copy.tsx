// src/components/mydashboard/Writing.tsx
import React from 'react'

const novels = [
  {
    id: 1,
    coverUrl: '/novel-cover-1.jpg',
    title: 'ชื่อเรื่องนิยาย 1',
    author: 'Penname1',
    views: 1234,
    likes: 567,
    episodes: 10,
  },
  {
    id: 2,
    coverUrl: '/novel-cover-2.jpg',
    title: 'ชื่อเรื่องนิยาย 2',
    author: 'Penname2',
    views: 2345,
    likes: 678,
    episodes: 20,
  },
  // เพิ่มข้อมูลนิยายอื่นๆ ตามต้องการ
];

export const Writing = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {novels.map((novel) => (
        <div key={novel.id} className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <img
            src={novel.coverUrl}
            alt={novel.title}
            className="w-32 h-44 object-cover rounded mb-4"
          />
          <div className="font-bold text-lg mb-1">{novel.title}</div>
          <div className="text-gray-500 text-sm mb-2">โดย {novel.author}</div>
          <div className="flex gap-4 text-sm text-gray-600 mb-2">
            <span>👁️ {novel.views}</span>
            <span>❤️ {novel.likes}</span>
            <span>📄 {novel.episodes} ตอน</span>
          </div>
        </div>
      ))}
    </div>
  )
}
