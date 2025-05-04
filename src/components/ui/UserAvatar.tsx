"use client";

import Image from "next/image";
import { useMemo } from "react";

interface User {
  username: string;
  avatar?: string;
  email?: string;
}

interface UserAvatarProps {
  user: User;
  size?: "sm" | "md" | "lg";
}

const UserAvatar = ({ user, size = "md" }: UserAvatarProps) => {
  const dimensions = useMemo(() => {
    switch (size) {
      case "sm":
        return { width: 6, height: 6, text: "text-xs" }; // 24px
      case "lg":
        return { width: 10, height: 10, text: "text-lg" }; // 40px
      case "md":
      default:
        return { width: 8, height: 8, text: "text-sm" }; // 32px
    }
  }, [size]);

  // สร้างตัวอักษรแรกของชื่อผู้ใช้
  const initial = useMemo(() => {
    if (!user?.username) return "?";
    return user.username.charAt(0).toUpperCase();
  }, [user?.username]);

  // สร้างสีพื้นหลังแบบสุ่มแต่คงที่สำหรับผู้ใช้แต่ละคน
  const backgroundColor = useMemo(() => {
    if (!user?.username) return "bg-primary";
    
    // สร้างค่าสีจากชื่อผู้ใช้ (ทำให้ผู้ใช้เดียวกันได้สีเดิมเสมอ)
    const hash = user.username.split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-yellow-500", 
      "bg-pink-500", "bg-purple-500", "bg-indigo-500", 
      "bg-red-500", "bg-orange-500", "bg-teal-500"
    ];
    
    return colors[hash % colors.length];
  }, [user?.username]);

  if (user?.avatar) {
    return (
      <div 
        className={`w-${dimensions.width} h-${dimensions.height} rounded-full overflow-hidden relative`}
      >
        <Image
          src={user.avatar}
          alt={user.username || "User avatar"}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div 
      className={`w-${dimensions.width} h-${dimensions.height} rounded-full ${backgroundColor} flex items-center justify-center text-white font-medium ${dimensions.text}`}
    >
      {initial}
    </div>
  );
};

export default UserAvatar;