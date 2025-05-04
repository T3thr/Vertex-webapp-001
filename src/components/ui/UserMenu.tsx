"use client";

import { SessionUser } from "@/app/api/auth/[...nextauth]/options";
import {
    Bell,
    BookMarked,
    BookOpen,
    Heart,
    LogOut,
    Settings,
    User
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

interface UserMenuProps {
  user: SessionUser | null;
  onSignOut: () => Promise<void>;
  onClose: () => void;
}

export default function UserMenu({ user, onSignOut, onClose }: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (!user) return null;

  const handleSignOut = async () => {
    await onSignOut();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      tabIndex={0}
      className="absolute right-0 top-10 mt-2 w-56 bg-background border border-accent rounded-lg shadow-lg py-1 z-50 focus:outline-none"
    >
      {/* User Info */}
      <div className="px-4 py-3 border-b border-accent">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
            {user.image ? (
              <img
                src={user.image}
                alt={user.username || user.email || "User Avatar"}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">
              {user.username || (user.email?.split("@")[0]) || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email || "No email"}
            </p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          <User className="w-4 h-4 text-muted-foreground" />
          <span>โปรไฟล์</span>
        </Link>
        <Link
          href="/my-novels"
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <span>นิยายของฉัน</span>
        </Link>
        <Link
          href="/bookmarks"
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          <BookMarked className="w-4 h-4 text-muted-foreground" />
          <span>คั่นหน้า</span>
        </Link>
        <Link
          href="/favorites"
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          <Heart className="w-4 h-4 text-muted-foreground" />
          <span>ชื่นชอบ</span>
        </Link>
        <Link
          href="/notifications"
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span>การแจ้งเตือน</span>
        </Link>
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span>ตั้งค่า</span>
        </Link>
      </div>

      {/* Sign Out */}
      <div className="py-1 border-t border-accent">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 w-full text-left text-sm text-foreground hover:bg-secondary"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </div>
  );
}