// src/app/user/[username]/page.tsx
// หน้าโปรไฟล์ผู้ใช้แบบไดนามิก
// แสดงข้อมูลโปรไฟล์ผู้ใช้ ประวัติกิจกรรม และการตั้งค่าสำหรับเจ้าของโปรไฟล์

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
  params: { username: string };
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
  createdAt: string;
}

// อินเทอร์เฟซสำหรับข้อมูลกิจกรรม
interface ActivityItem {
  _id: string;
  userId: string;
  type: string;
  description?: string;
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
  content?: string;
  timestamp: string;
  novelTitle?: string;
  novelSlug?: string;
  episodeTitle?: string;
  episodeNumber?: number;
  targetUserName?: string;
  targetUserSlug?: string;
}

// อินเทอร์เฟซสำหรับการตอบกลับจาก API ประวัติกิจกรรม
interface ActivityHistoryResponse {
  activities: ActivityItem[];
  currentPage: number;
  totalPages: number;
  totalActivities: number;
}

/**
 * ดึงข้อมูลผู้ใช้จาก API ตาม username
 * @param username ชื่อผู้ใช้จาก URL
 * @returns ข้อมูลผู้ใช้หรือ null หากไม่พบ
 */
async function getUserData(username: string): Promise<CombinedUser | null> {
  try {
    // ส่งคำขอไปยัง API เพื่อดึงข้อมูลโปรไฟล์
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/${username}/profile`,
      {
        cache: "no-store",
      }
    );

    // ตรวจสอบสถานะการตอบกลับ
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`❌ [Page] ไม่พบผู้ใช้ ${username} จาก API`);
        return null;
      }
      throw new Error(`ไม่สามารถดึงข้อมูลผู้ใช้: ${response.statusText}`);
    }

    const data: CombinedUser = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ [Page] ข้อผิดพลาดใน getUserData สำหรับ ${username}:`, error);
    return null;
  }
}

/**
 * ดึงประวัติกิจกรรมของผู้ใช้จาก API
 * @param username ชื่อผู้ใช้จาก URL
 * @returns รายการกิจกรรมหรือ array ว่างหากเกิดข้อผิดพลาด
 */
async function getUserActivityHistory(username: string): Promise<ActivityItem[]> {
  try {
    // ส่งคำขอไปยัง API เพื่อดึงประวัติกิจกรรม
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/${username}/activity-history?page=1&limit=10`,
      {
        cache: "no-store",
      }
    );

    // ตรวจสอบสถานะการตอบกลับ
    if (!response.ok) {
      throw new Error(`ไม่สามารถดึงประวัติกิจกรรม: ${response.statusText}`);
    }

    const data: ActivityHistoryResponse = await response.json();
    return data.activities;
  } catch (error) {
    console.error(
      `❌ [Page] ข้อผิดพลาดใน getUserActivityHistory สำหรับ ${username}:`,
      error
    );
    return [];
  }
}

/**
 * หน้าโปรไฟล์ผู้ใช้
 * @param props Props ที่มีพารามิเตอร์ username
 * @returns JSX element สำหรับหน้าโปรไฟล์
 */
export default async function UserProfilePage({ params }: UserProfilePageProps) {
  try {
    // ดึง username จาก params
    const { username } = params;
    if (!username) {
      throw new Error("ต้องระบุชื่อผู้ใช้");
    }

    // ดึงข้อมูลผู้ใช้
    const user = await getUserData(username);
    if (!user) {
      notFound();
    }

    // ดึงข้อมูลเซสชันของผู้ใช้ที่ล็อกอิน
    const session = await getServerSession(authOptions);
    const loggedInUser = session?.user as
      | { id: string; username: string; role: string }
      | undefined;
    const loggedInUserId = loggedInUser?.id;

    // ตรวจสอบว่าเป็นโปรไฟล์ของผู้ใช้ที่ล็อกอินหรือไม่
    const isOwnProfile = loggedInUserId === user._id;

    // ดึงประวัติกิจกรรมเริ่มต้น
    const initialActivities = await getUserActivityHistory(username);

    // สร้าง JSX สำหรับหน้าโปรไฟล์
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
    console.error("❌ [Page] ข้อผิดพลาดใน /user/[username]:", error);
    notFound();
  }
}