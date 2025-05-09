// src/components/layouts/NavBar.tsx

"use client";

import {
  Bell,
  Bookmark,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  User,
  X,
  BookOpen,
  Home,
  Grid,
  Layout,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "./AuthModal";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
import SearchBar from "./SearchBar";
import { useQuery } from "@tanstack/react-query";
import { getSession } from "next-auth/react";

// อินเทอร์เฟซสำหรับข้อมูลผู้ใช้ในเซสชัน
interface SessionUser {
  id: string;
  name: string;
  email?: string;
  username: string;
  role: "Reader" | "Writer" | "Admin";
  profile: {
    avatar?: string;
    bio?: string;
    displayName?: string;
  };
  image?: string;
}

// คอมโพเนนต์ UserAvatar
interface UserAvatarProps {
  user: SessionUser | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const UserAvatar = React.memo(({ user, size = "md", className = "" }: UserAvatarProps) => {
  const avatarUrl = user?.profile?.avatar || user?.image;
  const displayName = user?.profile?.displayName || user?.name || user?.username;

  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const fontClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const sizeInPixels = {
    sm: 28,
    md: 32,
    lg: 40,
  };

  if (avatarUrl && avatarUrl.startsWith("http")) {
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full overflow-hidden shadow-sm`}>
        <Image
          src={avatarUrl}
          alt={displayName ? `${displayName}'s avatar` : "User avatar"}
          width={sizeInPixels[size]}
          height={sizeInPixels[size]}
          className="h-full w-full object-cover"
          priority
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${className} rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium overflow-hidden shadow-sm`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName ? `${displayName}'s avatar` : "User avatar"}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className={fontClasses[size]}>
          {displayName ? displayName.charAt(0).toUpperCase() : <User size={parseInt(sizeClasses[size].replace(/[^\d]/g, "")) * 0.6} />}
        </span>
      )}
    </div>
  );
});

// Add display name to UserAvatar component
UserAvatar.displayName = "UserAvatar";

// อินเทอร์เฟซสำหรับ NavBar
interface NavBarProps {
  logoText?: string;
}

export default function NavBar({ logoText = "NOVELMAZE" }: NavBarProps) {
  const { user, status, signOut, loading: authLoading } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // ใช้ React Query เพื่อแคชข้อมูลเซสชัน
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const session = await getSession();
      return session;
    },
    staleTime: 5 * 60 * 1000, // แคช 5 นาที
    refetchOnWindowFocus: false,
  });

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node) && isSearchOpen) setIsSearchOpen(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && isMenuOpen) setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen, isSearchOpen, isMenuOpen]);

  const toggleMenu = useCallback(() => setIsMenuOpen((prev) => !prev), []);
  const toggleDropdown = useCallback(() => setIsDropdownOpen((prev) => !prev), []);
  const toggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => !prev);
    if (isMenuOpen) setIsMenuOpen(false);
  }, [isMenuOpen]);
  const toggleMobileSearch = useCallback(() => {
    setIsMobileSearchOpen((prev) => !prev);
    if (isMenuOpen) setIsMenuOpen(false);
  }, [isMenuOpen]);
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);
  const openModal = useCallback(() => {
    setIsModalOpen(true);
    if (isMenuOpen) setIsMenuOpen(false);
    if (isDropdownOpen) setIsDropdownOpen(false);
  }, [isMenuOpen, isDropdownOpen]);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const handleSignOut = useCallback(async () => {
    setIsDropdownOpen(false);
    await signOut();
  }, [signOut]);

  // ใช้ useMemo เพื่อป้องกันการสร้าง navLinks ใหม่ทุกครั้ง
  const navLinks = useMemo(
    () => [
      { href: "/", label: "หน้าหลัก", icon: <Home size={18} /> },
      { href: "/categories", label: "หมวดหมู่", icon: <Grid size={18} /> },
      { href: "/novels", label: "งานเขียน", icon: <BookOpen size={18} /> },
    ],
    []
  );

  // ใช้ useMemo สำหรับ userDropdownLinks
  const userDropdownLinks = useMemo(
    () => [
      {
        href: `/user/${user?.username}`,
        label: "โปรไฟล์ของฉัน",
        icon: <User size={16} />,
        condition: !!user?.username,
      },
      {
        href: user?.role === "Writer" ? `/user/${user?.username}` : `/dashboard`,
        label: "แดชบอร์ดนักเขียน",
        icon: <Layout size={16} />,
        condition: user?.role === "Writer",
      },
      {
        href: "/bookmarks",
        label: "บุ๊คมาร์ค",
        icon: <Bookmark size={16} />,
        condition: !!user,
      },
      {
        href: `/user/${user?.username}#settings`,
        label: "การตั้งค่า",
        icon: <Settings size={16} />,
        condition: !!user?.username,
      },
    ],
    [user]
  );

  // คอมโพเนนต์ AuthSection
  const AuthSection = () => {
    if (sessionLoading || status === "loading") {
      return (
        <div className="flex items-center space-x-2">
          <div className="h-9 w-[88px] rounded-full bg-muted animate-pulse"></div>
        </div>
      );
    }

    if (status === "unauthenticated") {
      return (
        <motion.button
          onClick={openModal}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
        >
          เข้าสู่ระบบ
        </motion.button>
      );
    }

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={toggleDropdown}
          className="flex items-center space-x-2 p-1 rounded-full hover:bg-secondary transition-colors"
          aria-expanded={isDropdownOpen}
          aria-label="เมนูผู้ใช้"
        >
          <UserAvatar user={user} size="md" />
          <span className="hidden sm:inline text-sm font-medium text-foreground truncate max-w-[100px]">
            {user?.profile?.displayName || user?.name || user?.username}
          </span>
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 rounded-lg shadow-xl bg-card border border-border z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-border">
                <div className="font-semibold text-foreground truncate">
                  {user?.profile?.displayName || user?.name || user?.username}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.email || `@${user?.username}`}
                </div>
              </div>
              <div className="py-1">
                {userDropdownLinks.map(
                  (link) =>
                    link.condition && (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors w-full text-left"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        {React.cloneElement(link.icon, { className: "mr-2.5 text-muted-foreground" })}
                        {link.label}
                      </Link>
                    )
                )}
                <button
                  onClick={() => {
                    toggleTheme();
                    setIsDropdownOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                >
                  {resolvedTheme === "dark" ? (
                    <>
                      <Sun size={16} className="mr-2.5 text-muted-foreground" />
                      <span>เปลี่ยนเป็นธีมสว่าง</span>
                    </>
                  ) : (
                    <>
                      <Moon size={16} className="mr-2.5 text-muted-foreground" />
                      <span>เปลี่ยนเป็นธีมมืด</span>
                    </>
                  )}
                </button>
              </div>
              <div className="border-t border-border p-1">
                <button
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="flex w-full items-center px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors rounded-md disabled:opacity-50"
                >
                  <LogOut size={16} className="mr-2.5" />
                  ออกจากระบบ
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <nav
      className={`w-full transition-all duration-300 ${
        isScrolled ? "bg-background/95 shadow-md" : "bg-background"
      } border-b border-border/50`}
    >
      <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* โลโก้ */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-foreground">{logoText}</span>
            </Link>
          </div>

          {/* ลิงก์นำทางสำหรับเดสก์ท็อป */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-1 text-sm font-medium ${
                  pathname === link.href ? "text-primary" : "text-foreground hover:text-primary"
                } transition-colors`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* ส่วนขวา: ค้นหาและผู้ใช้ */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:block relative" ref={searchRef}>
              <button
                onClick={toggleSearch}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="สลับการค้นหา"
              >
                <Search size={20} className="text-foreground" />
              </button>
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 300 }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 z-50"
                  >
                    <SearchBar onClose={() => setIsSearchOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <AuthSection />
            <button
              className="md:hidden p-2 rounded-full hover:bg-secondary transition-colors"
              onClick={toggleMenu}
              aria-label="สลับเมนู"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* เมนูมือถือ */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              ref={mobileMenuRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-border/50"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                      pathname === link.href
                        ? "bg-secondary text-primary"
                        : "text-foreground hover:bg-secondary hover:text-primary"
                    } transition-colors`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                ))}
                <button
                  onClick={toggleMobileSearch}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-secondary hover:text-primary transition-colors w-full text-left"
                >
                  <Search size={18} />
                  <span>ค้นหา</span>
                </button>
                {isMobileSearchOpen && (
                  <div className="px-3 py-2">
                    <SearchBar onClose={() => setIsMobileSearchOpen(false)} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AuthModal isOpen={isModalOpen} onClose={closeModal} />
    </nav>
  );
}