'use client';
import React, { useEffect, useState } from "react";
import Image from "next/image";

interface TrophyItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  dateReceived: string;
  type: string;
  rarity?: string;
}

export const Trophy = () => {
  const [trophies, setTrophies] = useState<TrophyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrophies = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/trophies/mine');
        if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลถ้วยรางวัลได้');
        const data = await res.json();
        setTrophies(data.trophies || []);
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาด');
      } finally {
        setLoading(false);
      }
    };
    fetchTrophies();
  }, []);

  if (loading) return <div>กำลังโหลด...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (trophies.length === 0) return <div className="text-gray-500">ยังไม่มีถ้วยรางวัล</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {trophies.map((trophy) => (
        <div
          key={trophy.id}
          className="flex flex-col items-center bg-white rounded-lg shadow p-4 border border-gray-200"
        >
          {trophy.imageUrl ? (
            <Image
              src={trophy.imageUrl}
              alt={trophy.name}
              width={80}
              height={80}
              className="rounded-full object-contain w-20 h-20 mb-4"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold mb-4">
              🏆
            </div>
          )}
          <div className="flex flex-col items-center text-center w-full">
            <div className="font-semibold text-lg truncate w-full">{trophy.name}</div>
            <div className="text-gray-500 text-sm mb-1">
              ได้รับเมื่อ {new Date(trophy.dateReceived).toLocaleDateString("th-TH")}
            </div>
            {trophy.description && (
              <div className="text-gray-700 text-sm text-ellipsis line-clamp-2">{trophy.description}</div>
            )}
            {trophy.rarity && (
              <div className="text-xs text-yellow-600 mb-1">{trophy.rarity}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};