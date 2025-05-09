// src/app/user/[username]/page.tsx
// หน้าโปรไฟล์ผู้ใช้แบบไดนามิก

import { notFound } from "next/navigation";
import { getServerSession } from "next-auth"; // สำหรับ NextAuth
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // นำเข้า authOptions
import UserProfileHeader from "@/components/user/UserProfileHeader";
import UserDashboardSection from "@/components/user/UserDashboardSection";
import UserHistorySection from "@/components/user/UserHistorySection";
import UserSettingsSection from "@/components/user/UserSettingsSection";
import UserFollowSystemSection from "@/components/user/UserFollowSystemSection";

// Interface for User Profile Page Props (params from URL)
interface UserProfilePageProps {
  params: { username: string }; // username is directly available
}

// Interface for combined User data (User + SocialMediaUser)
// This should be consistent with the API response from /api/users/[username]/profile
interface CombinedUser {
  _id: string;
  username: string;
  email?: string;
  role: "Reader" | "Writer" | "Admin";
  profile: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    coverImage?: string;
  };
  createdAt: Date;
}

// Interface for ActivityItem (for UserHistorySection)
// This should be consistent with the API response from /api/users/[username]/activity-history
interface ActivityItem {
  _id: string; // Assuming API returns _id
  userId: string;
  type: "READ_EPISODE" | "COMMENT" | "RATING" | "FOLLOW_USER" | "LIKE_NOVEL" | "PURCHASE_EPISODE" | "RECEIVE_DONATION" | string; // Allow for other types
  description?: string; // Made optional as per ActivityHistory model
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
  content?: string; // For comments etc.
  timestamp: Date;
  // For UI display, these might be populated or constructed
  novelTitle?: string;
  novelSlug?: string;
  episodeTitle?: string;
  episodeNumber?: number;
  targetUserName?: string;
  targetUserSlug?: string;
}

interface ActivityHistoryResponse {
  activities: ActivityItem[];
  currentPage: number;
  totalPages: number;
  totalActivities: number;
}

// Fetch user data by username from the API
async function getUserData(username: string): Promise<CombinedUser | null> {
  console.log(`[UserProfilePage] Fetching data for user: ${username} from API`);
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/users/${username}/profile`, {
      cache: "no-store", // เพื่อข้อมูลล่าสุด
    });
    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`User ${username} not found via API.`);
        return null;
      }
      throw new Error(`Failed to fetch user data: ${res.statusText}`);
    }
    const data: CombinedUser = await res.json();
    return data;
  } catch (error) {
    console.error(`Error in getUserData for ${username}:`, error);
    return null;
  }
}

// Fetch user activity history from the API
async function getUserActivityHistory(username: string): Promise<ActivityItem[]> {
  console.log(`[UserProfilePage] Fetching activity history for user: ${username} from API`);
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/users/${username}/activity-history?page=1&limit=10`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch activity history: ${res.statusText}`);
    }
    const data: ActivityHistoryResponse = await res.json();
    return data.activities; // คืนค่าเฉพาะ array ของ activities สำหรับการโหลดครั้งแรก
  } catch (error) {
    console.error(`Error in getUserActivityHistory for ${username}:`, error);
    return []; // คืนค่า array ว่างเมื่อเกิดข้อผิดพลาด
  }
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = params; // username is directly available
  const user = await getUserData(username);

  if (!user) {
    notFound();
  }

  // ดึงข้อมูลเซสชันของผู้ใช้ที่ล็อกอินด้วย NextAuth
  const session = await getServerSession(authOptions);
  const loggedInUser = session?.user as { id: string; username: string; role: string } | undefined;
  const loggedInUserId = loggedInUser?.id;

  // ตรวจสอบว่าเป็นโปรไฟล์ของผู้ใช้ที่ล็อกอินหรือไม่
  const isOwnProfile = loggedInUserId === user._id;

  // ดึง activities เริ่มต้นสำหรับหน้าโปรไฟล์ผู้ใช้
  // หมายเหตุ: การแบ่งหน้าและการกรองจะถูกจัดการที่ฝั่ง client ใน UserHistorySection
  const initialActivities = await getUserActivityHistory(username);

  return (
    <div className="container-custom py-6 md:py-8">
      <UserProfileHeader username={username} />
      {/* ส่ง isOwnProfile ไปยัง UserDashboardSection หากต้องการเปลี่ยนการแสดงผลตามความเป็นเจ้าของ */}
      <UserDashboardSection user={user} isOwnProfile={isOwnProfile} />
      <UserHistorySection viewedUser={user} initialActivities={initialActivities} isOwnProfile={isOwnProfile} />
      
      {/* User Settings - แสดงเฉพาะเมื่อเป็นโปรไฟล์ของผู้ใช้เอง */}
      {isOwnProfile && <UserSettingsSection userId={user._id} />}

      {/* Follow System - แสดงเสมอ แต่ฟังก์ชันอาจแตกต่างตาม isOwnProfile */}
      <UserFollowSystemSection viewedUserId={user._id} viewedUsername={user.username} currentLoggedInUserId={loggedInUserId} />
    </div>
  );
}