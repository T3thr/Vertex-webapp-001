import React from 'react';

// ข้อมูลตัวอย่างรางวัล
const trophies = [
  {
    id: 1,
    imageUrl: '/trophy-gold.png', // path รูปถ้วยรางวัล
    name: 'นักเขียนยอดเยี่ยม',
    dateReceived: '2024-05-01',
  },
  {
    id: 2,
    imageUrl: '/trophy-silver.png',
    name: 'นิยายยอดนิยม',
    dateReceived: '2024-04-15',
  },
  // เพิ่มรางวัลอื่นๆ ได้ตามต้องการ
];

export const Trophy = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {trophies.map((trophy) => (
        <div key={trophy.id} className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <img
            src={trophy.imageUrl}
            alt={trophy.name}
            className="w-20 h-20 object-contain mb-4"
          />
          <div className="font-bold text-lg mb-1">{trophy.name}</div>
          <div className="text-gray-500 text-sm">
            ได้รับเมื่อ {new Date(trophy.dateReceived).toLocaleDateString('th-TH')}
          </div>
        </div>
      ))}
    </div>
  );
};