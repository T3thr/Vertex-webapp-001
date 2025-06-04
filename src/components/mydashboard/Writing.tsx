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
    <div className="grid grid-cols-1 gap-6">
      {novels.map((novel) => (
        <div key={novel.id} className="flex gap-6 py-4 border-b border-gray-200">
          <img
            src={novel.coverUrl}
            alt={novel.title}
            className="w-32 h-44 object-cover rounded"
          />
          <div className="flex flex-col">
            <div className="font-bold text-lg">{novel.title}</div>
            <div className="text-gray-300 text-sm mb-2">โดย {novel.author}</div>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>👁️ {novel.views}</span>
              <span>❤️ {novel.likes}</span>
              <span>📄 {novel.episodes} ตอน</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
