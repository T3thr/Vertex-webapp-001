// src/components/mydashboard/Penname.tsx
import React, { useState } from 'react'

const pennames = [
  {
    id: 1,
    name: 'นามปากกา A',
    novels: [
      { id: 1, coverUrl: '/novel-cover-1.jpg', title: 'นิยาย A1', author: 'ผู้แต่ง A', views: 100, followers: 50, comments: 10, episodes: 5 },
      { id: 2, coverUrl: '/novel-cover-2.jpg', title: 'นิยาย A2', author: 'ผู้แต่ง A', views: 200, followers: 80, comments: 20, episodes: 10 },
    ],
  },
  {
    id: 2,
    name: 'นามปากกา B',
    novels: [
      { id: 3, coverUrl: '/novel-cover-3.jpg', title: 'นิยาย B1', author: 'ผู้แต่ง B', views: 150, followers: 60, comments: 15, episodes: 7 },
      { id: 4, coverUrl: '/novel-cover-4.jpg', title: 'นิยาย B2', author: 'ผู้แต่ง B', views: 250, followers: 90, comments: 25, episodes: 12 },
    ],
  },
];

export const Penname = () => {
  const [selectedPennameId, setSelectedPennameId] = useState<number | null>(pennames[0].id);

  const selectedPenname = pennames.find((p) => p.id === selectedPennameId);
  const novels = selectedPenname ? selectedPenname.novels : [];

  // สรุปสถิติรวมของนามปากกาที่เลือก
  const totalNovels = novels.length;
  const totalViews = novels.reduce((sum, n) => sum + n.views, 0);
  const totalFollowers = novels.reduce((sum, n) => sum + n.followers, 0);
  const totalComments = novels.reduce((sum, n) => sum + n.comments, 0);

  return (
    <div>
      {/* ปุ่มเลือกนามปากกา */}
      <div className="flex items-center gap-4 mb-8 border-b border-gray-300 py-4">
        <div className="text-gray-600 font-medium">นามปากกา:</div>
        <div className="flex items-center ">
          {pennames.map((pen, index) => (
            <React.Fragment key={pen.id}>
              <button
                className={`px-3 py-1 font-medium transition-colors ${
                  selectedPennameId === pen.id ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'
                }`}
                onClick={() => setSelectedPennameId(pen.id)}
              >
                {pen.name}
              </button>
              {index < pennames.length - 1 && (
                <div className="h-5 w-px bg-gray-300 mx-2" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* สรุปสถิติรวม */}
      <div className="flex justify-between items-center mb-8 ">
        <div className="text-center">
          <div className="text-gray-500">งานเขียน {totalNovels} เรื่อง</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">อ่าน {totalViews} คน</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">ติดตาม {totalFollowers} คน</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">คอมเมนต์ {totalComments} คน</div>
        </div>
      </div>

      {/* รายการนิยาย */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {novels.map((novel) => (
          <div key={novel.id} className="bg-white rounded-lg shadow p-4 flex flex-col">
            <div className="flex items-start">
              <img
                src={novel.coverUrl}
                alt={novel.title}
                className="w-28 h-40 object-cover rounded mr-4"
              />
              <div className="flex-1">
                <div className="font-bold text-lg mb-1">{novel.title}</div>
                <div className="text-gray-500 mb-1">ผู้แต่ง: {novel.author || 'ชื่อผู้แต่ง'}</div>
                <div className="flex gap-4 text-sm text-gray-600 mb-2">
                  <span>👁️ {novel.views} ดูตอน</span>
                  <span>❤️ {novel.followers} หัวใจ</span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-gray-700 text-sm">
              {(novel as any).summary || 'เรื่องย่อของนิยายเรื่องนี้...'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
