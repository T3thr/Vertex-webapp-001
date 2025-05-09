// src/app/user/[username]/components/UserProfileHeader.tsx
"use client";

// นำเข้าโมดูลที่จำเป็นสำหรับการแสดงผลและการจัดการข้อมูล
import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { toast } from "react-toastify";

// อินเทอร์เฟซสำหรับข้อมูลโปรไฟล์ผู้ใช้ (สอดคล้องกับ API response)
interface UserProfile {
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
  socialStats: {
    followersCount: number;
    followingCount: number;
    novelsCreatedCount: number;
  };
  createdAt: string;
  isSocialMediaUser: boolean;
}

// อินเทอร์เฟซสำหรับ props ของคอมโพเนนต์
interface UserProfileHeaderProps {
  username: string; // รับ username จาก params แทนการส่ง user object
}

// คอมโพเนนต์หลักสำหรับแสดงส่วนหัวของโปรไฟล์ผู้ใช้
const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({ username }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ฟังก์ชันสำหรับดึงข้อมูลโปรไฟล์ผู้ใช้
  const fetchUserProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${username}/profile`, {
        cache: "no-store", // ป้องกันการแคชเพื่อข้อมูลล่าสุด
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "ไม่สามารถดึงข้อมูลโปรไฟล์");
      }
      const data: UserProfile = await response.json();
      setUser(data);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการโหลดโปรไฟล์");
      toast.error(err.message || "ไม่สามารถโหลดโปรไฟล์ได้");
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  // ดึงข้อมูลเมื่อคอมโพเนนต์ถูกเมานต์
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // แสดงสถานะการโหลด
  if (isLoading) {
    return (
      <div className="p-4 bg-card rounded-lg shadow-md my-4 animate-pulse text-center text-foreground">
        กำลังโหลดโปรไฟล์...
      </div>
    );
  }

  // แสดงข้อผิดพลาด
  if (error || !user) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 rounded-lg shadow-md my-4">
        ข้อผิดพลาด: {error || "ไม่พบผู้ใช้"}
      </div>
    );
  }

  const profileImage = user.profile.avatar || "/placeholder-avatar.png";
  const coverImage = user.profile.coverImage || "/placeholder-cover.jpg";
  const displayName = user.profile.displayName || user.username;
  const bio = user.profile.bio || "ยังไม่มีคำอธิบาย";

  return (
    <div className="bg-card shadow-lg rounded-lg overflow-hidden mb-6 animate-fadeIn">
      {/* ส่วนปกและรูปโปรไฟล์ */}
      <div className="relative h-48 md:h-64 w-full">
        <Image
          src={coverImage}
          alt={`รูปปกของ ${displayName}`}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 flex flex-col items-center justify-center p-4">
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-primary mb-2">
            <Image
              src={profileImage}
              alt={`รูปโปรไฟล์ของ ${displayName}`}
              fill
              className="object-cover"
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white text-center">
            {displayName}
          </h1>
          <p className="text-sm text-gray-200 text-center">@{user.username}</p>
        </div>
      </div>
      {/* ส่วนข้อมูลโปรไฟล์ */}
      <div className="p-4 bg-background-alt">
        <h2 className="text-lg font-semibold text-foreground mb-1">คำอธิบาย</h2>
        <p className="text-sm text-muted-foreground text-justify">{bio}</p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <p className="text-xs text-gray-500">
            สมัครเมื่อ: {new Date(user.createdAt).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="text-xs text-gray-500">บทบาท: {user.role}</p>
          <p className="text-xs text-gray-500">
            ผู้ติดตาม: {user.socialStats.followersCount}
          </p>
          <p className="text-xs text-gray-500">
            กำลังติดตาม: {user.socialStats.followingCount}
          </p>
          <p className="text-xs text-gray-500">
            นิยายที่เขียน: {user.socialStats.novelsCreatedCount}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfileHeader;