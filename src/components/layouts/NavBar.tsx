// src/components/layouts/NavBar.tsx
"use client";

import {
  Bell,
  Bookmark,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  User,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

// กำหนดประเภทสำหรับผู้ใช้ในเซสชัน
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
}

// คอมโพเนนต์ SearchBar
interface SearchBarProps {
  onClose: () => void;
}

const SearchBar = ({ onClose }: SearchBarProps) => {
  return (
    <div className="w-full bg-card rounded-lg shadow-lg p-3 border border-accent">
      <div className="flex items-center space-x-2">
        <Search size={18} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="ค้นหางานเขียน..."
          className="bg-transparent w-full focus:outline-none text-sm"
          autoFocus
        />
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

// คอมโพเนนต์ UserAvatar
interface UserAvatarProps {
  user: SessionUser | null;
  size?: 'sm' | 'md' | 'lg';
}

const UserAvatar = ({ user, size = 'md' }: UserAvatarProps) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium overflow-hidden`}>
      {user?.profile?.avatar ? (
        <img
          src={user.profile.avatar}
          alt={user.name}
          className="h-full w-full object-cover"
        />
      ) : (
        user?.username?.charAt(0).toUpperCase() || "U"
      )}
    </div>
  );
};

// คอมโพเนนต์ ThemeToggle
const ThemeToggle = () => {
  const [theme, setTheme] = useState("light");

  // ตั้งค่าธีมตามที่บันทึกไว้หรือตามระบบ
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") ||
                       (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-secondary transition-colors flex items-center justify-center"
      aria-label="สลับธีม"
    >
      {theme === "light" ? (
        <Moon size={20} className="text-foreground" />
      ) : (
        <Sun size={20} className="text-foreground" />
      )}
    </button>
  );
};

export interface NavBarProps {
  logoText?: string;
}

export const NavBar = ({ logoText = "NOVELMAZE" }: NavBarProps) => {
  const { user, status, signOut, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // จัดการเมื่อเลื่อนหน้าเว็บ
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ปิดเมนูเมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await signOut();
  };

  const navLinks = [
    { href: "/", label: "หน้าหลัก", isActive: pathname === "/" },
    { href: "/categories", label: "หมวดหมู่", isActive: pathname === "/categories" },
    { href: "/novels", label: "งานเขียน", isActive: pathname.startsWith("/novels") },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled ? "bg-card/90 backdrop-blur-md shadow-md" : "bg-background"
        }`}
      >
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            {/* ซ้าย: ลิงก์นำทาง */}
            <nav className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${link.isActive ? "nav-link-active" : ""}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* กลาง: โลโก้ */}
            <div className="flex-1 flex justify-center md:justify-start md:flex-none">
              <Link href="/" className="flex items-center">
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                  {logoText}
                </span>
              </Link>
            </div>

            {/* ขวา: การกระทำ */}
            <div className="flex items-center space-x-4">
              {/* ค้นหา */}
              <div className="relative">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors flex items-center justify-center"
                  aria-label="ค้นหา"
                >
                  <Search size={20} className="text-foreground" />
                </button>
                {isSearchOpen && (
                  <div className="absolute right-0 top-12 w-80 z-10">
                    <SearchBar onClose={() => setIsSearchOpen(false)} />
                  </div>
                )}
              </div>

              {/* สลับธีม */}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>

              {/* สถานะการเข้าสู่ระบบ */}
              {status === "loading" && (
                <div className="h-8 w-20 bg-secondary rounded animate-pulse"></div>
              )}

              {status === "unauthenticated" && (
                <div className="hidden md:flex items-center space-x-2">
                  <button
                    onClick={openModal}
                    className="btn-outline text-sm"
                  >
                    เข้าสู่ระบบ
                  </button>
                  <button
                    onClick={openModal}
                    className="btn-primary text-sm"
                  >
                    สมัครสมาชิก
                  </button>
                </div>
              )}

              {status === "authenticated" && user && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-secondary transition-colors"
                    aria-expanded={isDropdownOpen}
                    aria-label="เมนูผู้ใช้"
                  >
                    <UserAvatar user={user} />
                    <ChevronDown size={18} className="text-foreground hidden md:block" />
                  </button>

                  {/* เมนูแบบดร็อปดาวน์ */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-card border border-accent z-10">
                      <div className="p-3 border-b border-accent">
                        <div className="font-medium text-foreground truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email || "ไม่มีอีเมล"}
                        </div>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/profile"
                          className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <User size={16} className="mr-2" />
                          โปรไฟล์
                        </Link>
                        <Link
                          href="/bookmarks"
                          className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Bookmark size={16} className="mr-2" />
                          บุ๊คมาร์ค
                        </Link>
                        <Link
                          href="/notifications"
                          className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Bell size={16} className="mr-2" />
                          การแจ้งเตือน
                        </Link>
                        <button
                          onClick={handleSignOut}
                          disabled={authLoading}
                          className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut size={16} className="mr-2" />
                          {authLoading ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ปุ่มเมนูมือถือ */}
              <button
                onClick={toggleMenu}
                className="p-2 rounded-full hover:bg-secondary md:hidden flex items-center justify-center"
                aria-expanded={isMenuOpen}
                aria-label="สลับเมนู"
              >
                {isMenuOpen ? (
                  <X size={24} className="text-foreground" />
                ) : (
                  <Menu size={24} className="text-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* เมนูมือถือ */}
        {isMenuOpen && (
          <div className="md:hidden bg-card border-t border-accent">
            <div className="px-4 py-2 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    link.isActive
                      ? "bg-secondary text-primary"
                      : "text-foreground hover:bg-secondary"
                  } transition-colors`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <div className="flex items-center justify-between pt-4 pb-2 border-t border-accent">
                <ThemeToggle />
                
                {status === "unauthenticated" && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        openModal();
                        setIsMenuOpen(false);
                      }}
                      className="btn-outline text-sm py-1.5"
                    >
                      เข้าสู่ระบบ
                    </button>
                    <button
                      onClick={() => {
                        openModal();
                        setIsMenuOpen(false);
                      }}
                      className="btn-primary text-sm py-1.5"
                    >
                      สมัครสมาชิก
                    </button>
                  </div>
                )}
              </div>

              {status === "authenticated" && user && (
                <div className="pt-2 space-y-1">
                  <div className="px-3 py-2 flex items-center">
                    <UserAvatar user={user} size="lg" />
                    <div className="ml-3">
                      <div className="text-base font-medium text-foreground truncate">
                        {user.name}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {user.email || "ไม่มีอีเมล"}
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-secondary transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User size={16} className="inline mr-2" />
                    โปรไฟล์
                  </Link>
                  <Link
                    href="/bookmarks"
                    className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-secondary transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Bookmark size={16} className="inline mr-2" />
                    บุ๊คมาร์ค
                  </Link>
                  <Link
                    href="/notifications"
                    className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-secondary transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Bell size={16} className="inline mr-2" />
                    การแจ้งเตือน
                  </Link>
                  <button
                    onClick={handleSignOut}
                    disabled={authLoading}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={16} className="inline mr-2" />
                    {authLoading ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* โมดัลเข้าสู่ระบบ/สมัครสมาชิก (ต้องสร้างคอมโพเนนต์ AuthModal แยก) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">เข้าสู่ระบบ / สมัครสมาชิก</h2>
            {/* ส่วนของฟอร์มเข้าสู่ระบบ/สมัครสมาชิก */}
            <div className="space-y-4">
              {/* เพิ่มฟอร์มเข้าสู่ระบบ/สมัครสมาชิกตรงนี้ */}
            </div>
          </div>
        </div>
      )}
    </>
  );
};