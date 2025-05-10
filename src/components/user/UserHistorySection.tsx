// src/app/user/[username]/components/UserHistorySection.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  MessageSquare,
  Star,
  UserPlus,
  ThumbsUp,
  ShoppingCart,
  Gift,
} from 'lucide-react';

// อินเทอร์เฟซสำหรับ props ของคอมโพเนนต์
interface UserHistorySectionProps {
  viewedUser: CombinedUser | null;
  initialActivities: ActivityItem[];
  isOwnProfile: boolean;
}

// อินเทอร์เฟซสำหรับข้อมูลผู้ใช้
interface CombinedUser {
  _id: string;
  username: string;
}

// อินเทอร์เฟซสำหรับรายการกิจกรรม
interface ActivityItem {
  _id: string;
  userId: string;
  type: string;
  content?: string;
  novelId?: string;
  episodeId?: string;
  commentId?: string;
  ratingId?: string;
  followedUserId?: string;
  likedNovelId?: string;
  purchaseId?: string;
  donationId?: string;
  relatedUser?: string;
  relatedNovel?: string;
  relatedEpisode?: string;
  coinAmount?: number;
  timestamp: string; // เปลี่ยนเป็น string เพื่อให้สอดคล้องกับ API และ UserProfilePage
  novelTitle?: string;
  novelSlug?: string;
  episodeTitle?: string;
  episodeNumber?: number;
  targetUserName?: string;
  targetUserSlug?: string;
}

// อินเทอร์เฟซสำหรับการตอบกลับจาก API
interface ActivityHistoryResponse {
  activities: ActivityItem[];
  currentPage: number;
  totalPages: number;
  totalActivities: number;
}

// ฟังก์ชันสำหรับเลือกไอคอนตามประเภทกิจกรรม
const getActivityIcon = (type: string) => {
  switch (type) {
    case 'EPISODE_READ':
      return <Clock className="w-5 h-5 text-blue-500" />;
    case 'COMMENT_CREATED':
      return <MessageSquare className="w-5 h-5 text-green-500" />;
    case 'RATING_GIVEN':
      return <Star className="w-5 h-5 text-yellow-500" />;
    case 'USER_FOLLOWED':
      return <UserPlus className="w-5 h-5 text-purple-500" />;
    case 'NOVEL_LIKED':
      return <ThumbsUp className="w-5 h-5 text-red-500" />;
    case 'COIN_SPENT_EP ประวัติกิจกรรมISODE':
      return <ShoppingCart className="w-5 h-5 text-indigo-500" />;
    case 'COIN_SPENT_DONATION_WRITER':
    case 'COIN_EARNED_WRITER_DONATION':
      return <Gift className="w-5 h-5 text-pink-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-500" />;
  }
};

// คอมโพเนนต์หลัก
const UserHistorySection: React.FC<UserHistorySectionProps> = ({
  viewedUser,
  initialActivities,
  isOwnProfile,
}) => {
  // สถานะสำหรับจัดการข้อมูลและการโหลด
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ฟังก์ชันสำหรับดึงข้อมูลจาก API
  const fetchActivities = useCallback(
    async (pageToFetch: number) => {
      if (!viewedUser) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/${viewedUser.username}/activity-history?page=${pageToFetch}&limit=10`
        );
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Failed to fetch activity history: ${res.statusText}`);
        }
        const data: ActivityHistoryResponse = await res.json();
        setActivities((prev) =>
          pageToFetch === 1 ? data.activities : [...prev, ...data.activities]
        );
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'ไม่สามารถโหลดประวัติกิจกรรมได้';
        setError(errorMessage);
        console.error('ข้อสูญหายในการดึงข้อมูลกิจกรรม:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [viewedUser]
  );

  // อัปเดตข้อมูลเมื่อ viewedUser หรือ initialActivities เปลี่ยน
  useEffect(() => {
    if (viewedUser) {
      setActivities(initialActivities);
      // ถ้า initialActivities มีข้อมูลอยู่แล้ว ให้คำนวณ totalPages
      if (initialActivities.length > 0) {
        setTotalPages(Math.ceil(initialActivities.length / 10));
      } else {
        // ถ้าไม่มี initialActivities ให้ดึงข้อมูลจาก API
        fetchActivities(1);
      }
    }
  }, [viewedUser, initialActivities, fetchActivities]);

  // ฟังก์ชันสำหรับโหลดข้อมูลเพิ่ม
  const handleLoadMore = () => {
    if (currentPage < totalPages && !isLoading) {
      fetchActivities(currentPage + 1);
    }
  };

  // ตรวจสอบกรณีไม่มีผู้ใช้
  if (!viewedUser) {
    return (
      <div className="p-4 bg-secondary rounded-lg shadow-md my-4">
        กำลังโหลดประวัติ...
      </div>
    );
  }

  // แสดงผลคอมโพเนนต์
  return (
    <div className="p-4 bg-card shadow-lg rounded-lg my-4">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        ประวัติกิจกรรม
      </h2>
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md mb-4">
          ข้อผิดพลาด: {error}
        </div>
      )}
      {activities.length === 0 && !isLoading && !error && (
        <p className="text-muted-foreground">ไม่พบกิจกรรม</p>
      )}
      <ul className="space-y-4">
        {activities.map((activity) => (
          <li
            key={activity._id}
            className="flex items-start space-x-3 p-3 bg-background rounded-md shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex-shrink-0 pt-1">{getActivityIcon(activity.type)}</div>
            <div className="flex-grow">
              <p className="text-sm text-foreground">
                {activity.content || `กิจกรรม: ${activity.type}`}
                {activity.novelTitle && (
                  <span className="font-semibold"> ใน &quot;{activity.novelTitle}&quot;</span>
                )}
                {activity.episodeTitle && (
                  <span className="italic"> - {activity.episodeTitle}</span>
                )}
                {activity.targetUserName && (
                  <span className="font-semibold"> กับ {activity.targetUserName}</span>
                )}
                {activity.coinAmount && (
                  <span className="text-yellow-600"> ({activity.coinAmount} เหรียญ)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {isLoading && (
        <div className="text-center py-4 text-primary">
          กำลังโหลดกิจกรรมเพิ่มเติม...
        </div>
      )}
      {!isLoading && currentPage < totalPages && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            โหลดเพิ่ม
          </button>
        </div>
      )}
    </div>
  );
};

export default UserHistorySection;