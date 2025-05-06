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
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
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
}

// SearchBar Component
interface SearchBarProps {
  onClose: () => void;
}

const SearchBar = ({ onClose }: SearchBarProps) => {
  return (
    <div className="w-full bg-card rounded-md shadow-lg p-2 border border-accent">
      <div className="flex items-center space-x-2">
        <Search size={16} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="ค้นหางานเขียน..."
          className="bg-transparent w-full focus:outline-none text-sm"
        />
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

// UserAvatar Component
interface UserAvatarProps {
  user: SessionUser | null;
}

const UserAvatar = ({ user }: UserAvatarProps) => {
  return (
    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium overflow-hidden">
      {user?.profile?.avatar ? (
        <img
          src={user.profile.avatar}
          alt="User Avatar"
          className="h-full w-full object-cover"
        />
      ) : (
        user?.username?.charAt(0).toUpperCase() || "U"
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
    document.documentElement.classList.toggle("dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-secondary flex items-center justify-center"
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
    { href: "/", label: "หน้าหลัก", isActive: pathname === "/", icon: <BookOpen size={18} className="mr-2" /> },
    { href: "/categories", label: "หมวดหมู่", isActive: pathname === "/categories", icon: <Bookmark size={18} className="mr-2" /> },
    { href: "/novels", label: "งานเขียน", isActive: pathname === "/novels", icon: <BookOpen size={18} className="mr-2" /> },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled ? "bg-card/90 backdrop-blur-md shadow-md" : "bg-background"
        }`}
      >
        <div className="w-full px-4 md:px-6">
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
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                  {logoText}
                </span>
              </Link>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 rounded-full hover:bg-secondary flex items-center justify-center"
                aria-label="Search"
              >
                <Search size={20} className="text-foreground" />
              </button>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Authentication */}
              {status === "loading" && (
                <div className="h-8 w-20 bg-secondary rounded animate-pulse"></div>
              )}

              {status === "unauthenticated" && (
                <button
                  onClick={openModal}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm"
                >
                  เข้าสู่ระบบ
                </button>
              )}

              {status === "authenticated" && user && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-secondary"
                    aria-expanded={isDropdownOpen}
                    aria-label="User menu"
                  >
                    <UserAvatar user={user} />
                    <ChevronDown size={18} className="text-foreground" />
                  </button>

                  {/* User Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-card border border-accent z-10">
                      <div className="p-2 border-b border-accent">
                        <div className="font-medium text-foreground truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email || "ไม่มีอีเมล"}
                        </div>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/profile"
                          className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-secondary"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <User size={16} className="mr-2" />
                          โปรไฟล์
                        </Link>
                        <Link
                          href="/bookmarks"
                          className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-secondary"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Bookmark size={16} className="mr-2" />
                          บุ๊คมาร์ค
                        </Link>
                        <Link
                          href="/notifications"
                          className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-secondary"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Bell size={16} className="mr-2" />
                          การแจ้งเตือน
                        </Link>
                        <button
                          onClick={handleSignOut}
                          disabled={authLoading}
                          className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <LogOut size={16} className="mr-2" />
                          {authLoading ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
                        </button>
                      </div>
                    </div>
                  )}
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

        {/* Search Overlay */}
        {isSearchOpen && (
          <div className="absolute top-16 left-0 right-0 px-4 py-2 bg-card border-t border-accent shadow-md">
            <SearchBar onClose={() => setIsSearchOpen(false)} />
          </div>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-card border-t border-accent shadow-lg">
            <div className="px-4 py-2 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
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
            </div>
          </div>
        )}
      </header>

      <AuthModal
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
};