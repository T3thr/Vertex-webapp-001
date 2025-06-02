// src/components/layouts/NavBar.tsx
"use client";

import {
  LogOut,
  Menu,
  Search,
  User,
  X,
  BookOpen as IconBookOpen, // เปลี่ยนชื่อเพื่อหลีกเลี่ยงการชนกับ ThemeContext
  Home,
  Grid,
  Layout, // สำหรับ Dashboard
  Settings,
  Sun,
  Moon,
  // Laptop, // ไม่ได้ใช้ในโค้ดที่แสดง
  ChevronDown,
  Bookmark,
} from "lucide-react"; // ตรวจสอบว่า Laptop icon จำเป็นหรือไม่
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState, useCallback, useMemo, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "./AuthModal";
import { useAuth } from "@/context/AuthContext";
import { useTheme, ResolvedTheme } from "@/context/ThemeContext";
import Image from "next/image";
import SearchBar from "./SearchBar";
import { SessionUser as AppSessionUser } from "@/app/api/auth/[...nextauth]/options";

// Interface สำหรับ UserAvatarProps (คงเดิม)
interface UserAvatarProps {
  user: AppSessionUser | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const UserAvatar = React.memo(({ user, size = "md", className = "" }: UserAvatarProps) => {
  const avatarUrl = user?.profile?.avatarUrl;
  const displayName = user?.profile?.displayName || user?.name || user?.username;
  const sizeClasses = { sm: "w-7 h-7", md: "w-8 h-8", lg: "w-10 h-10" };
  const fontClasses = { sm: "text-xs", md: "text-sm", lg: "text-base" };

  if (avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("/") || avatarUrl.startsWith("data:image"))) {
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full overflow-hidden shadow-sm relative bg-muted`}> {/* เพิ่ม bg-muted เป็น fallback */}
        <Image
          src={avatarUrl}
          alt={displayName ? `${displayName}'s avatar` : "User avatar"}
          fill
          className="object-cover"
          priority={size === "md" || size === "lg"}
          referrerPolicy="no-referrer"
          sizes="(max-width: 768px) 28px, 32px" // ปรับ sizes ให้เหมาะสม
        />
      </div>
    );
  }
  return (
    <div
      className={`${sizeClasses[size]} ${className} rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium overflow-hidden shadow-sm`}
      aria-label={displayName || "User avatar"}
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

export default function NavBar({ logoText = "DIVWY" }: NavBarProps) {
  const { user: authContextUser, status: authStatus, signOut } = useAuth();
  const {
    theme: currentThemeChoice,
    resolvedTheme,
    setTheme,
    themes: availableThemes,
    mounted: themeMounted,
  } = useTheme();

  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // userDisplay จะเป็น AppSessionUser หรือ null (ตรงกับ user จาก AuthContext)
  const userDisplay = authContextUser;

  const handleScroll = useCallback(() => setIsScrolled(window.scrollY > 20), []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node) && isSearchOpen) setIsSearchOpen(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && isMenuOpen && !isMobileSearchOpen) {
          setIsMenuOpen(false);
      }
      // ไม่ต้องจัดการการคลิกนอก AuthModal ที่นี่ เพราะ AuthModal จะจัดการเอง
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen, isSearchOpen, isMenuOpen, isMobileSearchOpen]);

  const toggleMenu = useCallback(() => setIsMenuOpen((prev) => !prev), []);
  const toggleDropdown = useCallback(() => setIsDropdownOpen((prev) => !prev), []);

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => {
      if (!prev && isMenuOpen) setIsMenuOpen(false);
      return !prev;
    });
  }, [isMenuOpen]);

  const toggleMobileSearch = useCallback(() => {
    setIsMobileSearchOpen((prev) => !prev);
  }, []);

  const openAuthModal = useCallback(() => {
    console.log("🔵 [NavBar] openAuthModal called");
    setIsAuthModalOpen(true);
    if (isMenuOpen) setIsMenuOpen(false); // ปิดเมนูมือถือถ้าเปิดอยู่
    if (isDropdownOpen) setIsDropdownOpen(false); // ปิด dropdown ผู้ใช้ถ้าเปิดอยู่
  }, [isMenuOpen, isDropdownOpen]);

  const closeAuthModal = useCallback(() => {
    console.log("🔵 [NavBar] closeAuthModal called");
    setIsAuthModalOpen(false);
  }, []);


  const handleSignOut = useCallback(async () => {
    setIsDropdownOpen(false); // ปิด dropdown ก่อน
    await signOut();
    // ไม่ต้อง redirect ที่นี่ ปล่อยให้ AuthContext หรือ NextAuth จัดการ
  }, [signOut]);

  const cycleThemeInDropdown = useCallback(() => {
    if (!themeMounted || !availableThemes.length) return;
    const currentIndex = availableThemes.findIndex(t => t.name === currentThemeChoice);
    const nextThemeName = availableThemes[(currentIndex + 1) % availableThemes.length].name;
    setTheme(nextThemeName);
    setIsDropdownOpen(false);
  }, [currentThemeChoice, setTheme, availableThemes, themeMounted]);

  const navLinks = useMemo(
    () => [
      { href: "/", label: "หน้าหลัก", icon: <Home size={18} /> },
      { href: "/search/novels", label: "หมวดหมู่", icon: <Grid size={18} /> },
      { href: "/novels", label: "คลังนิยาย", icon: <IconBookOpen size={18} /> },
    ],
    []
  );

  const userDropdownLinks = useMemo(
    () => [
      {
        href: `/u/${userDisplay?.username}`, // ใช้ username จาก AppSessionUser
        label: "โปรไฟล์ของฉัน",
        icon: <User size={16} />,
        condition: !!userDisplay?.username,
      },
      {
        href: userDisplay?.roles?.includes("Writer") ? `/dashboard/writer` : `/dashboard/reader`,
        label: "แดชบอร์ด",
        icon: <Layout size={16} />,
        condition: !!userDisplay,
      },
      {
        href: "/me/bookmarks", // Path สำหรับ bookmarks
        label: "บุ๊คมาร์ค",
        icon: <Bookmark size={16} />,
        condition: !!userDisplay,
      },
      {
        href: `/settings/account`, // Path สำหรับ settings
        label: "การตั้งค่า",
        icon: <Settings size={16} />,
        condition: !!userDisplay,
      },
    ],
    [userDisplay]
  );

  const AuthSection = () => {
    if (authStatus === "loading" || !themeMounted) {
      return (
        <div className="flex items-center space-x-2 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-muted"></div>
          <div className="h-5 w-20 rounded bg-muted hidden sm:block"></div>
        </div>
      );
    }

    if (authStatus === "unauthenticated") {
      return (
        <motion.button
          onClick={openAuthModal}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap cursor-pointer"
        >
          เข้าสู่ระบบ
        </motion.button>
      );
    }

    if (userDisplay) { // userDisplay คือ AppSessionUser | null
      return (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleDropdown}
            className="flex items-center space-x-2 p-1 rounded-full hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors" // ใช้สีจาก theme
            aria-expanded={isDropdownOpen}
            aria-label="เมนูผู้ใช้"
          >
            <UserAvatar user={userDisplay} size="md" />
            <span className="hidden sm:inline text-sm font-medium text-foreground truncate max-w-[100px]">
              {userDisplay.profile?.displayName || userDisplay.name || userDisplay.username}
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
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl bg-popover border border-border text-popover-foreground z-50 overflow-hidden" // ใช้สี popover
              >
                <div className="p-3 border-b border-border"> {/* ใช้ border-border */}
                  <div className="font-semibold truncate">
                    {userDisplay.profile?.displayName || userDisplay.name || userDisplay.username}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {userDisplay.email || `@${userDisplay.username}`}
                  </div>
                </div>
                <div className="py-1">
                  {userDropdownLinks.map(
                    (link) =>
                      link.condition && (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="flex items-center px-4 py-2.5 text-sm hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors w-full text-left" // ใช้สี text-popover-foreground จาก parent และ hover:bg-muted
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          {React.cloneElement(link.icon, { className: "mr-2.5 text-muted-foreground" })}
                          {link.label}
                        </Link>
                      )
                  )}
                  {themeMounted && ( // Theme switcher section
                    <button
                      onClick={cycleThemeInDropdown}
                      className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors text-left"
                      aria-label={`เปลี่ยนธีม, ธีมปัจจุบัน: ${availableThemes.find(t => t.name === currentThemeChoice)?.label || currentThemeChoice}`}
                    >
                      {/* Icons for theme, should use foreground/muted-foreground for consistency */}
                      {resolvedTheme === "dark" ? ( <Sun size={16} className="mr-2.5 text-muted-foreground" /> )
                       : resolvedTheme === "sepia" ? ( <Moon size={16} className="mr-2.5 text-muted-foreground" /> ) // สมมติว่ามีไอคอน Moon สำหรับ Sepia
                       : ( <IconBookOpen size={16} className="mr-2.5 text-muted-foreground" /> ) // ใช้ BookOpen สำหรับ light หรือ default
                      }
                      <span>
                        เปลี่ยนธีม (
                        {availableThemes.find(t => t.name === currentThemeChoice)?.label || currentThemeChoice}
                        {currentThemeChoice === "system" && ` -> ${resolvedTheme === "dark" ? "มืด" : resolvedTheme === "sepia" ? "ซีเปีย" : "สว่าง"}`}
                        )
                      </span>
                    </button>
                  )}
                </div>
                <div className="border-t border-border p-1"> {/* ใช้ border-border */}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors" // ใช้สี destructive
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
    return null; // กรณี authStatus อื่นๆ หรือ userDisplay ไม่มีค่า
  };

  // NavBar header styling
  // ลบ navBarDynamicClasses ออก เพราะ AuthModal จะจัดการ backdrop ของตัวเอง
  const navBarBaseClasses = `sticky top-0 z-30 w-full transition-all duration-300 border-b`; // ลด z-index ของ NavBar ลงเล็กน้อย
  const navBarScrollClasses = isScrolled
      ? "bg-background/80 shadow-md backdrop-blur-md border-border/30" // ใช้สี background และ border จาก theme
      : "bg-background border-transparent"; // กรณีไม่ได้ scroll

  return (
    <>
      <header className={`${navBarBaseClasses} ${navBarScrollClasses}`}>
        <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8"> {/* Container หลัก */}
          <div className="flex items-center justify-between h-16"> {/* Flex container สำหรับ items ใน navbar */}
            {/* Logo Section */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2" aria-label="หน้าหลัก DivWy">
                {/* SVG Logo with primary color */}
                <svg width="32" height="32" viewBox="0 0 100 100" className="text-primary" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 10L10 30L10 70L50 90L90 70L90 30L50 10ZM20 35L20 65L50 80L80 65L80 35L50 20L20 35Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
                  <path d="M50 45L20 60L50 75L80 60L50 45Z" fillOpacity="0.5" />
                </svg>
                <span className="text-xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {logoText}
                </span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2" aria-label="เมนูหลัก">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${pathname === link.href
                      ? "bg-primary/10 text-primary" // Active link: primary color
                      : "text-foreground hover:bg-muted hover:text-primary" // Default & Hover: foreground/muted/primary color
                    }`}
                >
                  {React.cloneElement(link.icon, { "aria-hidden": true })}
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            {/* Right Section: Search, Auth, Mobile Menu Toggle */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Desktop Search */}
              <div className="hidden md:block relative" ref={searchRef}>
                <button
                  onClick={toggleSearch}
                  className="p-2 rounded-full hover:bg-muted transition-colors" // Hover: muted color
                  aria-label="ค้นหา"
                  aria-expanded={isSearchOpen}
                >
                  <Search size={20} className="text-foreground" />
                </button>
                <AnimatePresence>
                  {isSearchOpen && (
                    <motion.div
                      initial={{ opacity: 0, width: 0, x: 50 }}
                      animate={{ opacity: 1, width: 320, x: 0 }}
                      exit={{ opacity: 0, width: 0, x: 50 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="absolute right-0 mt-2 origin-top-right z-50 bg-card border border-border shadow-lg rounded-md" // SearchBar container
                    >
                      <SearchBar onClose={() => setIsSearchOpen(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Authentication Section (Login/User Menu) */}
              <AuthSection />

              {/* Mobile Menu Toggle */}
              <div className="md:hidden">
                  <button
                    className="p-2 rounded-full hover:bg-muted transition-colors" // Hover: muted color
                    onClick={toggleMenu}
                    aria-label={isMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
                    aria-expanded={isMenuOpen}
                    aria-controls="mobile-menu-content"
                  >
                    {isMenuOpen ? <X size={24} className="text-foreground"/> : <Menu size={24} className="text-foreground"/>}
                  </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Content */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                id="mobile-menu-content"
                ref={mobileMenuRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="md:hidden border-t border-border bg-background" // Mobile menu background
              >
                <nav className="px-2 pt-2 pb-3 space-y-1" aria-label="เมนูมือถือ">
                  {navLinks.map((link) => (
                    <Link
                      key={`mobile-${link.href}`}
                      href={link.href}
                      className={`flex items-center space-x-2 px-3 py-2.5 rounded-md text-base font-medium transition-colors
                        ${pathname === link.href
                          ? "bg-muted text-primary" // Active mobile link
                          : "text-foreground hover:bg-muted hover:text-primary" // Default mobile link
                        }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {React.cloneElement(link.icon, { "aria-hidden": true })}
                      <span>{link.label}</span>
                    </Link>
                  ))}
                  <button // Mobile search toggle
                    onClick={toggleMobileSearch}
                    className="flex items-center space-x-2 px-3 py-2.5 rounded-md text-base font-medium text-foreground hover:bg-muted hover:text-primary transition-colors w-full text-left"
                    aria-expanded={isMobileSearchOpen}
                    aria-controls="mobile-search-bar-container"
                  >
                    <Search size={18} aria-hidden="true" />
                    <span>ค้นหา</span>
                  </button>
                  {isMobileSearchOpen && (
                    <motion.div
                      id="mobile-search-bar-container"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{duration: 0.2}}
                      className="px-3 py-2 bg-background" // Mobile search bar container background
                    >
                      <SearchBar onClose={() => setIsMobileSearchOpen(false)} />
                    </motion.div>
                  )}
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
      {/* AuthModal จะถูก render ที่นี่ แต่จะใช้ fixed positioning เพื่อแสดงผลเต็มจอ */}
      {/* isOpen และ onClose จะถูกส่งมาจาก state ของ NavBar */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
    </>
  );
}