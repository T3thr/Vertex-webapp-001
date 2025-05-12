// src/components/layouts/NavBar.tsx
"use client";

import {
  LogOut,
  Menu,
  Search,
  User,
  X,
  BookOpen as IconBookOpen, // Rename to avoid conflict with ThemeContext's BookOpen
  Home,
  Grid,
  Layout,
  Settings,
  Sun,
  Moon,
  Laptop,
  ChevronDown,
  Bookmark, // เพิ่ม Bookmark icon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState, useCallback, useMemo, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "./AuthModal"; // สมมติว่ามี AuthModal component นี้อยู่
import { useAuth } from "@/context/AuthContext"; // ตรวจสอบ path
import { useTheme, Theme as AppTheme, ResolvedTheme } from "@/context/ThemeContext"; // ตรวจสอบ path และ import ResolvedTheme
import Image from "next/image";
import SearchBar from "./SearchBar"; // สมมติว่ามี SearchBar component นี้อยู่
import { useQuery } from "@tanstack/react-query";
import { getSession, useSession } from "next-auth/react";

// อินเทอร์เฟซสำหรับข้อมูลผู้ใช้ในเซสชัน (ควรตรงกับใน AuthContext หรือ options.ts)
interface SessionUser {
  id: string;
  name?: string; // อาจจะไม่มี name ถ้าใช้ username เป็นหลัก
  email?: string;
  username: string;
  role: "Reader" | "Writer" | "Admin";
  profile?: { // profile อาจจะ optional
    avatar?: string;
    bio?: string;
    displayName?: string;
  };
  image?: string; // จาก NextAuth session โดยตรง
  preferences?: { // เพิ่ม preferences เข้ามาใน SessionUser ถ้า NextAuth callback ส่งมา
    theme?: AppTheme;
    language?: string;
  };
}

// คอมโพเนนต์ UserAvatar
interface UserAvatarProps {
  user: SessionUser | null; // user อาจจะเป็น null
  size?: "sm" | "md" | "lg";
  className?: string;
}

const UserAvatar = React.memo(({ user, size = "md", className = "" }: UserAvatarProps) => {
  const avatarUrl = user?.profile?.avatar || user?.image;
  const displayName = user?.profile?.displayName || user?.name || user?.username;

  const sizeClasses = { sm: "w-7 h-7", md: "w-8 h-8", lg: "w-10 h-10" };
  const fontClasses = { sm: "text-xs", md: "text-sm", lg: "text-base" };
  const sizeInPixels = { sm: 28, md: 32, lg: 40 };

  if (avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("/"))) {
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full overflow-hidden shadow-sm relative`}>
        <Image
          src={avatarUrl}
          alt={displayName ? `${displayName}'s avatar` : "User avatar"}
          fill // ใช้ fill prop เพื่อให้ Image component จัดการขนาด
          className="object-cover" // ใช้ object-cover เพื่อให้ภาพเต็มพื้นที่โดยไม่เสียสัดส่วน
          priority // ถ้าเป็น avatar ที่แสดงบ่อย
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${className} rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium overflow-hidden shadow-sm`}
    >
      {displayName ? (
        <span className={fontClasses[size]}>{displayName.charAt(0).toUpperCase()}</span>
      ) : (
        <User size={parseInt(sizeClasses[size].replace(/[^\d]/g, "")) * 0.6} />
      )}
    </div>
  );
});
UserAvatar.displayName = "UserAvatar";


interface NavBarProps {
  logoText?: string;
}

export default function NavBar({ logoText = "NOVELMAZE" }: NavBarProps) {
  const { user: authUser, status: authStatus, signOut } = useAuth(); // user จาก useAuth อาจจะมีโครงสร้างที่ต่างจาก session โดยตรงเล็กน้อย
  const {
    theme: currentThemeChoice, // ธีมที่ผู้ใช้เลือก (light, dark, system, sepia)
    resolvedTheme,           // ธีมที่แสดงผลจริง (light, dark, sepia)
    setTheme,                // ฟังก์ชันสำหรับเปลี่ยนธีม
    themes: availableThemes, // รายการธีมทั้งหมดจาก context
    mounted: themeMounted,   // สถานะว่า ThemeContext mounted หรือยัง
  } = useTheme();

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

  // ดึง session จาก NextAuth โดยตรงเพื่อเข้าถึง user object ที่สมบูรณ์กว่า (ถ้าจำเป็น)
  // หรือปรับ useAuth() ให้คืน user object ที่มี preferences
  const { data: session, status: sessionStatus } = useSession();
  const user = session?.user as SessionUser | null; // User จาก session โดยตรง

  const handleScroll = useCallback(() => setIsScrolled(window.scrollY > 20), []);

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

  // ฟังก์ชันเปลี่ยนธีมใน Dropdown ของ User Menu
  const cycleThemeInDropdown = useCallback(() => {
    if (!themeMounted || !availableThemes.length) return;

    const currentIndex = availableThemes.findIndex(t => t.name === currentThemeChoice);
    const nextIndex = (currentIndex + 1) % availableThemes.length;
    const nextThemeName = availableThemes[nextIndex].name;
    
    // ใช้ console log เพื่อดู debugging
    console.log(`[NavBar] Cycling theme from ${currentThemeChoice} to ${nextThemeName}`);
    
    // ใช้ setTheme จาก ThemeContext จะจัดการ localStorage และ DB update
    setTheme(nextThemeName);
    
    // ปิด dropdown หลังเลือก
    setIsDropdownOpen(false);
  }, [currentThemeChoice, setTheme, availableThemes, themeMounted]);

  const navLinks = useMemo(
    () => [
      { href: "/", label: "หน้าหลัก", icon: <Home size={18} /> },
      { href: "/search/novels", label: "หมวดหมู่", icon: <Grid size={18} /> },
      { href: "/novels", label: "งานเขียน", icon: <IconBookOpen size={18} /> },
    ],
    []
  );

  const userDropdownLinks = useMemo(
    () => [
      {
        href: `/user/${user?.username}`,
        label: "โปรไฟล์ของฉัน",
        icon: <User size={16} />,
        condition: !!user?.username,
      },
      {
        href: user?.role === "Writer" ? `/dashboard/writer` : `/dashboard`, // Path ที่เหมาะสม
        label: "แดชบอร์ด", // อาจจะเป็น "แดชบอร์ดนักเขียน" หรือ "แดชบอร์ดผู้ใช้"
        icon: <Layout size={16} />,
        condition: !!user, // แสดงถ้า login
      },
      {
        href: "/bookmarks",
        label: "บุ๊คมาร์ค",
        icon: <Bookmark size={16} />,
        condition: !!user,
      },
      {
        href: `/settings/profile`, // Path ที่เหมาะสมสำหรับการตั้งค่า
        label: "การตั้งค่า",
        icon: <Settings size={16} />,
        condition: !!user,
      },
    ],
    [user]
  );


  const AuthSection = () => {
    if (sessionStatus === "loading" || !themeMounted) { // รอ themeMounted ด้วย
      return (
        <div className="flex items-center space-x-2">
          <div className="h-9 w-8 rounded-full bg-muted animate-pulse"></div> {/* Avatar placeholder */}
          <div className="h-5 w-20 rounded bg-muted animate-pulse hidden sm:block"></div> {/* Name placeholder */}
        </div>
      );
    }

    if (sessionStatus === "unauthenticated") {
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
    // sessionStatus === "authenticated"
    if (user) {
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
              {user.profile?.displayName || user.name || user.username}
            </span>
            <ChevronDown
              size={18}
              className={`text-muted-foreground transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
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
                    {user.profile?.displayName || user.name || user.username}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user.email || `@${user.username}`}
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
                  {/* ปุ่มเปลี่ยนธีมใน Dropdown ของ User Menu */}
                  {themeMounted && (
                    <button
                      onClick={cycleThemeInDropdown}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                    >
                      {/* แสดง Icon และ Text ตาม resolvedTheme หรือ currentThemeChoice */}
                      {resolvedTheme === "dark" ? (
                        <Sun size={16} className="mr-2.5 text-muted-foreground" />
                      ) : resolvedTheme === "sepia" ? (
                        <Moon size={16} className="mr-2.5 text-muted-foreground" />
                      ) : ( // light
                        <IconBookOpen size={16} className="mr-2.5 text-muted-foreground" />
                      )}
                      <span>
                        เปลี่ยนธีม (ปัจจุบัน:{" "}
                        {availableThemes.find(t => t.name === currentThemeChoice)?.label || currentThemeChoice}
                        {currentThemeChoice === "system" && ` -> ${resolvedTheme === "dark" ? "มืด" : resolvedTheme === "sepia" ? "ซีเปีย" : "สว่าง"}`}
                        )
                      </span>
                    </button>
                  )}
                </div>
                <div className="border-t border-border p-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
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
    }
    return null; // กรณี user ไม่มีข้อมูล (ไม่ควรเกิดถ้า authenticated)
  };


  return (
    <header // เปลี่ยน nav เป็น header เพื่อ semantic correctness
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${ // ใช้ sticky top-0
        isScrolled ? "bg-background/90 shadow-md backdrop-blur-sm" : "bg-background" // เพิ่ม backdrop-blur
      } border-b border-border/50`}
    >
      <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2" aria-label="หน้าหลัก NovelMaze">
              {/* <img src="/logo.svg" alt="NovelMaze Logo" className="h-8 w-auto" /> */}
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {logoText}
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2" aria-label="เมนูหลัก">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary hover:text-primary"
                } transition-colors`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden md:block relative" ref={searchRef}>
              <button
                onClick={toggleSearch}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="ค้นหา"
                aria-expanded={isSearchOpen}
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
              aria-label={isMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              ref={mobileMenuRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="md:hidden border-t border-border/50 overflow-hidden" // เพิ่ม overflow-hidden
            >
              <nav className="px-2 pt-2 pb-3 space-y-1" aria-label="เมนูมือถือ">
                {navLinks.map((link) => (
                  <Link
                    key={`mobile-${link.href}`}
                    href={link.href}
                    className={`flex items-center space-x-2 px-3 py-2.5 rounded-md text-base font-medium ${ // ปรับ padding
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
                  className="flex items-center space-x-2 px-3 py-2.5 rounded-md text-base font-medium text-foreground hover:bg-secondary hover:text-primary transition-colors w-full text-left"
                  aria-expanded={isMobileSearchOpen}
                >
                  <Search size={18} />
                  <span>ค้นหา</span>
                </button>
                {isMobileSearchOpen && (
                  <div className="px-3 py-2">
                    <SearchBar onClose={() => setIsMobileSearchOpen(false)} />
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AuthModal isOpen={isModalOpen} onClose={closeModal} />
    </header>
  );
}