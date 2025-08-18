'use client';
import React from "react";
import Image from "next/image";

// Update the interface to match the populated achievement data
interface Achievement {
  _id: string;
  title: string;
  description?: string;
  customIconUrl?: string;
  rarity?: string;
  progress?: {
    current: number;
    target: number;
    tier: number;
  };
  // We don't have a date received directly on the achievement model itself
  // This would typically come from the UserAchievement model
}

interface TrophyProps {
  achievements: Achievement[];
}

export const Trophy = ({ achievements }: TrophyProps) => {
  if (achievements.length === 0) {
    return <div className="text-center text-gray-500 py-8">ยังไม่มีถ้วยรางวัล</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-4">
      {achievements.map((achievement) => (
        <div
          key={achievement._id}
          className="flex flex-col items-center bg-white rounded-lg shadow p-4 border border-gray-200 aspect-square justify-center text-center"
        >
          {achievement.customIconUrl ? (
            <Image
              src={achievement.customIconUrl}
              alt={achievement.title}
              width={80}
              height={80}
              className="rounded-full object-contain w-20 h-20 mb-4"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold mb-4">
              🏆
            </div>
          )}
          <div className="flex flex-col items-center w-full">
            <div className="font-semibold text-lg truncate w-full" title={achievement.title}>{achievement.title}</div>
            {achievement.description && (
              <div className="text-gray-700 text-sm text-ellipsis line-clamp-2" title={achievement.description}>{achievement.description}</div>
            )}
            {achievement.rarity && (
              <div className="text-xs font-semibold uppercase tracking-wider mt-2" style={{ color: getRarityColor(achievement.rarity) }}>{achievement.rarity}</div>
            )}
            {achievement.progress != null && (
              <div className="w-full mt-4">
                {achievement.progress.tier > 1 && (
                  <div className="text-[11px] text-green-700 font-medium mb-1">ปลดล็อกแล้ว: Tier {achievement.progress.tier - 1}</div>
                )}
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>กำลังทำ Tier {achievement.progress.tier}</span>
                  <span>{achievement.progress.current}/{achievement.progress.target}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${(achievement.progress.current / achievement.progress.target) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper function to get a color based on rarity
const getRarityColor = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'common': return '#6b7280'; // gray-500
    case 'uncommon': return '#10b981'; // emerald-500
    case 'rare': return '#3b82f6'; // blue-500
    case 'epic': return '#8b5cf6'; // violet-500
    case 'legendary': return '#ec4899'; // pink-500
    case 'mythic': return '#f59e0b'; // amber-500
    default: return '#6b7280';
  }
}