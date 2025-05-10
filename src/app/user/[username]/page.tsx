// src/app/user/[username]/page.tsx
// หน้าโปรไฟล์ผู้ใช้แบบไดนามิก
// แสดงข้อมูลโปรไฟล์ กิจกรรม และการตั้งค่าสำหรับผู้ใช้ตาม username

import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import UserProfileHeader from "@/components/user/UserProfileHeader";
import UserDashboardSection from "@/components/user/UserDashboardSection";
import UserHistorySection from "@/components/user/UserHistorySection";
import UserSettingsSection from "@/components/user/UserSettingsSection";
import UserFollowSystemSection from "@/components/user/UserFollowSystemSection";

// อินเทอร์เฟซสำหรับ props ของหน้าโปรไฟล์
interface UserProfilePageProps {
  params: Promise<{ username: string }>; // รองรับ async params ใน Next.js 15
}

// อินเทอร์เฟซสำหรับข้อมูลผู้ใช้ที่รวมจาก User และ SocialMediaUser
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
  createdAt: string; // เปลี่ยนเป็น string เพื่อให้สอดคล้องกับ API
}

// อินเทอร์เฟซสำหรับข้อมูลกิจกรรม
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
  timestamp: string; // เปลี่ยนเป็น string เพื่อให้สอดคล้องกับ API
  novelTitle?: string;
  novelSlug?: string;
  episodeTitle?: string;
  episodeNumber?: number;
  targetUserName?: string;
  targetUserSlug?: string;
}

// อินเทอร์เฟซสำหรับการตอบกลับจาก API กิจกรรม
interface ActivityHistoryResponse {
  activities: ActivityItem[];
  currentPage: number;
  totalPages: number;
  totalActivities: number;
}

/**
 * ดึงข้อมูลผู้ใช้จาก API ตาม username
 * @param username ชื่อผู้ใช้ที่ต้องการค้นหา
 * @returns ข้อมูลผู้ใช้หรือ null หากไม่พบ
 */
async function getUserData(username: string): Promise<CombinedUser | null> {
  try {
    console.log(`📡 [UserProfilePage] กำลังดึงข้อมูลผู้ใช้: ${username} จาก API`);
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/${username}/profile`, {
      cache: "no-store", // ใช้ข้อมูลล่าสุดเสมอ
    });

    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`⚠️ [UserProfilePage] ไม่พบผู้ใช้: ${username}`);
        return null;
      }
      throw new Error(`ไม่สามารถดึงข้อมูลผู้ใช้ได้: ${res.statusText}`);
    }

    const data: CombinedUser = await res.json();
    return data;
  } catch (error) {
    console.error(`❌ [UserProfilePage] ข้อผิดพลาดในการดึงข้อมูลผู้ใช้ ${username}:`, error);
    return null;
  }
}

/**
 * ดึงประวัติกิจกรรมของผู้ใช้จาก API
 * @param username ชื่อผู้ใช้ที่ต้องการดึงประวัติ
 * @returns รายการกิจกรรมหรือ array ว่างหากเกิดข้อผิดพลาด
 */
async function getUserActivityHistory(username: string): Promise<ActivityItem[]> {
  try {
    console.log(`📡 [UserProfilePage] กำลังดึงประวัติกิจกรรมสำหรับผู้ใช้: ${username}`);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/${username}/activity-history?page=1&limit=10`,
      {
        cache: "no-store", // ใช้ข้อมูลล่าสุด
      }
    );

    if (!res.ok) {
      throw new Error(`ไม่สามารถดึงประวัติกิจกรรมได้: ${res.statusText}`);
    }

    const data: ActivityHistoryResponse = await res.json();
    return data.activities;
  } catch (error) {
    console.error(
      `❌ [UserProfilePage] ข้อผิดพลาดในการดึงประวัติกิจกรรมสำหรับ ${username}:`,
      error
    );
    return [];
  }
}

/**
 * หน้าโปรไฟล์ผู้ใช้หลัก
 * @param props พารามิเตอร์ของหน้า รวมถึง params ที่มี username
 * @returns JSX element สำหรับหน้าโปรไฟล์
 */
export default async function UserProfilePage({ params }: UserProfilePageProps) {
  try {
    // แก้ไข params ให้รองรับ Promise
    const { username } = await params;
    if (!username) {
      console.error("❌ [UserProfilePage] ไม่พบ username ใน params");
      notFound();
    }

    // ดึงข้อมูลผู้ใช้
    const user = await getUserData(username);
    if (!user) {
      console.warn(`⚠️ [UserProfilePage] ไม่พบผู้ใช้สำหรับ username: ${username}`);
      notFound();
    }

    // ดึงข้อมูลเซสชันของผู้ใช้ที่ล็อกอิน
    const session = await getServerSession(authOptions);
    const loggedInUser = session?.user as { id: string; username: string; role: string } | undefined;
    const loggedInUserId = loggedInUser?.id;

    // ตรวจสอบว่าเป็นโปรไฟล์ของผู้ใช้ที่ล็อกอินหรือไม่
    const isOwnProfile = loggedInUserId === user._id;

    // ดึงประวัติกิจกรรมเริ่มต้น
    const initialActivities = await getUserActivityHistory(username);

    // แสดงผลหน้าโปรไฟล์
    return (
      <div className="container-custom py-6 md:py-8">
        <UserProfileHeader username={username} />
        <UserDashboardSection user={user} isOwnProfile={isOwnProfile} />
        <UserHistorySection
          viewedUser={user}
          initialActivities={initialActivities}
          isOwnProfile={isOwnProfile}
        />
        {isOwnProfile && <UserSettingsSection userId={user._id} />}
        <UserFollowSystemSection
          viewedUserId={user._id}
          viewedUsername={user.username}
          currentLoggedInUserId={loggedInUserId}
        />
      </div>
    );
  } catch (error) {
    console.error("❌ [UserProfilePage] ข้อผิดพลาดในหน้าโปรไฟล์:", error);
    notFound();
  }
}