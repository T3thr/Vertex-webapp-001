// src/components/UserFollowSystemSection.tsx
// คอมโพเนนต์สำหรับแสดงระบบการติดตาม (ผู้ติดตาม / กำลังติดตาม)
"use client";

// นำเข้าโมดูลที่จำเป็นสำหรับการจัดการสถานะ, การยืนยันตัวตน, และการแสดงผล
import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { UserPlus, UserMinus, Users, Heart } from "lucide-react";
import { toast } from "react-toastify";

// กำหนด interface สำหรับ props ของคอมโพเนนต์
interface UserFollowSystemSectionProps {
  viewedUserId: string;
  viewedUsername: string;
  currentLoggedInUserId?: string | null;
}

// กำหนด interface สำหรับข้อมูลผู้ใช้ที่ติดตาม
interface FollowUser {
  _id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

// กำหนด interface สำหรับการตอบกลับจาก API การติดตาม
interface FollowListResponse {
  followers?: FollowUser[];
  following?: FollowUser[];
  currentPage: number;
  totalPages: number;
  totalFollowers?: number;
  totalFollowing?: number;
}

// คอมโพเนนต์หลักสำหรับระบบการติดตามผู้ใช้
const UserFollowSystemSection: React.FC<UserFollowSystemSectionProps> = ({
  viewedUserId,
  viewedUsername,
  currentLoggedInUserId,
}) => {
  const { data: session, status: sessionStatus } = useSession();
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followersPage, setFollowersPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);
  const [totalFollowersPages, setTotalFollowersPages] = useState(1);
  const [totalFollowingPages, setTotalFollowingPages] = useState(1);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isLoadingFollowAction, setIsLoadingFollowAction] = useState(false);
  const [activeTab, setActiveTab] = useState<"followers" | "following">("followers");

  const isOwnProfile = currentLoggedInUserId === viewedUserId;

  // ตรวจสอบสถานะการติดตามเมื่อผู้ใช้ล็อกอินและไม่ใช่โปรไฟล์ของตัวเอง
  useEffect(() => {
    if (sessionStatus === "authenticated" && currentLoggedInUserId && !isOwnProfile) {
      const checkFollowStatus = async () => {
        try {
          // แก้ไขตรงนี้: ใช้ URL path ที่ถูกต้อง
          const res = await fetch(`/api/users/${session?.user?.username}/following?limit=1000`, {
            cache: "no-store", // ป้องกันการแคชเพื่อข้อมูลล่าสุด
          });
          if (res.ok) {
            const data: FollowListResponse = await res.json();
            setIsFollowingUser(data.following?.some(user => user._id === viewedUserId) || false);
          }
        } catch (error) {
          console.error("ไม่สามารถตรวจสอบสถานะการติดตาม:", error);
        }
      };
      checkFollowStatus();
    }
  }, [currentLoggedInUserId, viewedUserId, isOwnProfile, sessionStatus, session]);

  // ดึงข้อมูลผู้ติดตามด้วยการจัดการหน้า
  const fetchFollowers = useCallback(async (page: number) => {
    setIsLoadingFollowers(true);
    try {
      // แก้ไขตรงนี้: ใช้ URL path ที่ถูกต้อง
      const res = await fetch(`/api/users/${viewedUsername}/followers?page=${page}&limit=10`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลผู้ติดตาม");
      const data: FollowListResponse = await res.json();
      setFollowers(prev => page === 1 ? (data.followers || []) : [...prev, ...(data.followers || [])]);
      setTotalFollowersPages(data.totalPages);
      setFollowersPage(data.currentPage);
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถโหลดผู้ติดตามได้");
    } finally {
      setIsLoadingFollowers(false);
    }
  }, [viewedUsername]);

  // ดึงข้อมูลผู้ที่กำลังติดตามด้วยการจัดการหน้า
  const fetchFollowing = useCallback(async (page: number) => {
    setIsLoadingFollowing(true);
    try {
      // แก้ไขตรงนี้: ใช้ URL path ที่ถูกต้อง
      const res = await fetch(`/api/users/${viewedUsername}/following?page=${page}&limit=10`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลผู้ที่กำลังติดตาม");
      const data: FollowListResponse = await res.json();
      setFollowing(prev => page === 1 ? (data.following || []) : [...prev, ...(data.following || [])]);
      setTotalFollowingPages(data.totalPages);
      setFollowingPage(data.currentPage);
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถโหลดรายการผู้ที่กำลังติดตามได้");
    } finally {
      setIsLoadingFollowing(false);
    }
  }, [viewedUsername]);

  // โหลดข้อมูลเริ่มต้นเมื่อคอมโพเนนต์ถูกเมานต์
  useEffect(() => {
    fetchFollowers(1);
    fetchFollowing(1);
  }, [fetchFollowers, fetchFollowing]);

  // จัดการการสลับสถานะการติดตาม/เลิกติดตาม
  const handleFollowToggle = async () => {
    if (!currentLoggedInUserId || isOwnProfile || sessionStatus !== "authenticated") {
      toast.info("กรุณาล็อกอินเพื่อติดตามผู้ใช้");
      return;
    }
    setIsLoadingFollowAction(true);
    const method = isFollowingUser ? "DELETE" : "POST";
    try {
      // แก้ไขตรงนี้: ใช้ URL path ที่ถูกต้อง
      const response = await fetch(`/api/users/${viewedUsername}/follow`, {
        method,
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `ไม่สามารถ${isFollowingUser ? "เลิกติดตาม" : "ติดตาม"}`);
      }
      setIsFollowingUser(!isFollowingUser);
      toast.success(`สำเร็จ! ${isFollowingUser ? "เลิกติดตาม" : "ติดตาม"} ${viewedUsername} แล้ว`);
      fetchFollowers(1); // รีเฟรชรายการผู้ติดตาม
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoadingFollowAction(false);
    }
  };

  // แสดงรายการผู้ใช้ (ผู้ติดตามหรือผู้ที่กำลังติดตาม)
  const renderUserList = (users: FollowUser[], isLoading: boolean, loadMore: () => void, hasMore: boolean) => {
    if (isLoading && users.length === 0) {
      return <p className="text-muted-foreground text-center py-4 animate-pulse">กำลังโหลด...</p>;
    }
    if (users.length === 0) {
      return <p className="text-muted-foreground text-center py-4">ไม่พบผู้ใช้</p>;
    }

    return (
      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user._id}
            className="flex items-center justify-between p-3 bg-secondary rounded-md shadow-sm transition-all hover:bg-accent animate-slideIn"
          >
            <Link href={`/user/${user.username}`} className="flex items-center space-x-3 group">
              <Image
                src={user.profile?.avatar || "/placeholder-avatar.png"}
                alt={user.profile?.displayName || user.username}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {user.profile?.displayName || user.username}
                </p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
            </Link>
          </div>
        ))}
        {hasMore && (
          <div className="text-center mt-4">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className={`px-4 py-2 border border-border rounded-md text-sm font-medium transition-colors ${
                isLoading
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-background text-foreground hover:bg-primary hover:text-primary-foreground"
              }`}
            >
              {isLoading ? "กำลังโหลด..." : "โหลดเพิ่ม"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-card shadow-lg rounded-lg my-6 animate-fadeIn">
      {/* ส่วนหัวและปุ่มติดตาม */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h2 className="text-xl font-semibold text-foreground mb-2 sm:mb-0">การเชื่อมต่อ</h2>
        {!isOwnProfile && sessionStatus === "authenticated" && (
          <button
            onClick={handleFollowToggle}
            disabled={isLoadingFollowAction}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors w-full sm:w-auto ${
              isFollowingUser
                ? "border border-border bg-background text-foreground hover:bg-muted"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            } ${isLoadingFollowAction ? "cursor-not-allowed opacity-70" : ""}`}
          >
            {isLoadingFollowAction ? (
              "กำลังดำเนินการ..."
            ) : isFollowingUser ? (
              <>
                <UserMinus className="mr-2 h-4 w-4" /> เลิกติดตาม
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" /> ติดตาม
              </>
            )}
          </button>
        )}
      </div>

      {/* แท็บสำหรับสลับระหว่างผู้ติดตามและผู้ที่กำลังติดตาม */}
      <div className="w-full">
        <div className="grid w-full grid-cols-2 mb-4">
          <button
            onClick={() => setActiveTab("followers")}
            className={`flex items-center justify-center py-2 text-sm font-medium transition-colors ${
              activeTab === "followers"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-accent"
            } rounded-l-md`}
          >
            <Users className="mr-2 h-4 w-4" />
            ผู้ติดตาม
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`flex items-center justify-center py-2 text-sm font-medium transition-colors ${
              activeTab === "following"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-accent"
            } rounded-r-md`}
          >
            <Heart className="mr-2 h-4 w-4" />
            กำลังติดตาม
          </button>
        </div>
        <div>
          {activeTab === "followers" && (
            <div className="animate-slideIn">
              {renderUserList(
                followers,
                isLoadingFollowers,
                () => fetchFollowers(followersPage + 1),
                followersPage < totalFollowersPages
              )}
            </div>
          )}
          {activeTab === "following" && (
            <div className="animate-slideIn">
              {renderUserList(
                following,
                isLoadingFollowing,
                () => fetchFollowing(followingPage + 1),
                followingPage < totalFollowingPages
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserFollowSystemSection;