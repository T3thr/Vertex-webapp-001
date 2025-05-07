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
  X,
  BookOpen,
  Home,
  Grid,
  BookMarked
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "./AuthModal";
import { useAuth } from "@/context/AuthContext";

// Session User Interface
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
  image?: string; // เพิ่มฟิลด์ image สำหรับผู้ใช้จากโซเชียลมีเดีย
}

// SearchBar Component
interface SearchBarProps {
  onClose: () => void;
}

const SearchBar = ({ onClose }: SearchBarProps) => {
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Focus input when search bar opens
    inputRef.current?.focus();
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchValue)}`;
      onClose();
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="w-full bg-card rounded-lg shadow-lg p-3 border border-accent">
        <div className="flex items-center gap-3">
          <Search size={18} className="text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="ค้นหานิยาย ผู้เขียน หรือหมวดหมู่..."
            className="bg-transparent w-full focus:outline-none text-foreground"
          />
          {isSearching ? (
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
          ) : searchValue ? (
            <button 
              type="button"
              onClick={() => setSearchValue('')}
              className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary"
            >
              <X size={16} />
            </button>
          ) : null}
          <button 
            type="button"
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground ml-1 p-1 rounded-full hover:bg-secondary"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Search suggestions - can be expanded */}
        {searchValue.length > 0 && (
          <div className="mt-2 pt-2 border-t border-accent">
            <div className="text-xs text-muted-foreground mb-2">คำแนะนำยอดนิยม</div>
            <div className="flex flex-wrap gap-2">
              {['แฟนตาซี', 'โรแมนติก', 'สืบสวน', 'แอคชั่น'].map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setSearchValue(tag);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1 bg-secondary hover:bg-secondary/70 rounded-full text-xs"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

// UserAvatar Component
interface UserAvatarProps {
  user: SessionUser | null;
  size?: "sm" | "md" | "lg";
}

const UserAvatar = ({ user, size = "md" }: UserAvatarProps) => {
  // ตรวจสอบว่ามีรูปโปรไฟล์จาก provider (เช่น Google) หรือไม่
  const hasProviderImage = user?.image;
  // ตรวจสอบว่ามีรูปโปรไฟล์จากระบบหรือไม่
  const hasCustomAvatar = user?.profile?.avatar;
  // ตรวจสอบว่ามีชื่อผู้ใช้หรือไม่
  const hasUsername = user?.username;
  
  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10"
  };
  
  const fontClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium overflow-hidden shadow-sm`}>
      {hasProviderImage ? (
        // แสดงรูปจาก provider (เช่น Google)
        <img
          src={user.image}
          alt="User Avatar"
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer" // ป้องกันปัญหารูปโปรไฟล์ Google
        />
      ) : hasCustomAvatar ? (
        // แสดงรูปที่ผู้ใช้อัพโหลดเอง
        <img
          src={user.profile.avatar}
          alt="User Avatar"
          className="h-full w-full object-cover"
        />
      ) : (
        // แสดงตัวอักษรแรกของชื่อผู้ใช้
        <span className={fontClasses[size]}>
          {hasUsername?.charAt(0).toUpperCase() || "U"}
        </span>
      )}
    </div>
  );
};

// ThemeToggle Component
const ThemeToggle = () => {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") ||
                     (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(savedTheme);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
      aria-label="Toggle theme"
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
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      
      if (searchRef.current && !searchRef.current.contains(event.target as Node) && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, isSearchOpen]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const toggleSearch = () => setIsSearchOpen(!isSearchOpen);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await signOut();
  };

  const navLinks = [
    { href: "/", label: "หน้าหลัก", isActive: pathname === "/", icon: <Home size={18} className="mr-2" /> },
    { href: "/categories", label: "หมวดหมู่", isActive: pathname === "/categories", icon: <Grid size={18} className="mr-2" /> },
    { href: "/novels", label: "งานเขียน", isActive: pathname === "/novels", icon: <BookOpen size={18} className="mr-2" /> },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled ? "bg-card/90 backdrop-blur-md shadow-md" : "bg-background"
        }`}
      >
        <div className="w-full px-4 sm:px-6 max-w-screen-2xl mx-auto">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo on mobile / Navigation Links on desktop */}
            <div className="flex items-center">
              {/* Mobile Logo */}
              <div className="md:hidden">
                <Link href="/" className="flex items-center">
                  <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                    {logoText}
                  </span>
                </Link>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-8 ml-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center text-sm font-medium transition-colors hover:text-primary ${
                      link.isActive ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Center: Logo on desktop only */}
            <div className="hidden md:flex justify-center flex-1">
              <Link href="/" className="flex items-center">
                <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-blue-500 bg-clip-text text-transparent">
                  {logoText}
                </span>
              </Link>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative" ref={searchRef}>
                <button
                  onClick={toggleSearch}
                  className="p-2 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
                  aria-label="Search"
                >
                  <Search size={20} className="text-foreground" />
                </button>
                
                {/* Search Overlay */}
                <AnimatePresence>
                  {isSearchOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-12 w-80 z-50"
                    >
                      <SearchBar onClose={() => setIsSearchOpen(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Authentication */}
              {status === "loading" && (
                <div className="h-8 w-20 bg-secondary rounded animate-pulse"></div>
              )}

              {status === "unauthenticated" && (
                <motion.button
                  onClick={openModal}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm"
                >
                  เข้าสู่ระบบ
                </motion.button>
              )}

              {status === "authenticated" && user && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-secondary transition-colors"
                    aria-expanded={isDropdownOpen}
                    aria-label="User menu"
                  >
                    <UserAvatar user={user} />
                    <ChevronDown size={18} className="text-foreground" />
                  </button>

                  {/* User Dropdown */}
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-card border border-accent z-10 overflow-hidden"
                      >
                        <div className="p-3 border-b border-accent">
                          <div className="font-medium text-foreground truncate">
                            {user.profile?.displayName || user.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email || user.username || "ไม่มีอีเมล"}
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={toggleMenu}
                className="p-2 rounded-full hover:bg-secondary flex md:hidden items-center justify-center"
                aria-expanded={isMenuOpen}
                aria-label="Toggle menu"
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

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden bg-card border-t border-accent shadow-lg"
            >
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                      link.isActive
                        ? "bg-secondary text-primary"
                        : "text-foreground hover:bg-secondary"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
                
                {/* Additional mobile menu items */}
                <div className="mt-4 pt-4 border-t border-accent">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsSearchOpen(true);
                    }}
                    className="flex w-full items-center px-3 py-2 rounded-lg text-base font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <Search size={18} className="mr-2" />
                    ค้นหา
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AuthModal
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
};