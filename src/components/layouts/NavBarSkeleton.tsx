// src/components/layouts/NavBarSkeleton.tsx

import Link from "next/link";
import { BookOpen, Grid, Home, Search } from "lucide-react";

// NavBarSkeleton - คอมโพเนนต์แสดง placeholder ระหว่างรอข้อมูลผู้ใช้โหลด
export default function NavBarSkeleton() {
  const navLinks = [
    { href: "/", label: "หน้าหลัก", icon: <Home size={18} /> },
    { href: "/categories", label: "หมวดหมู่", icon: <Grid size={18} /> },
    { href: "/novels", label: "งานเขียน", icon: <BookOpen size={18} /> },
  ];

  return (
    <nav className="border-b border-border w-full bg-background/90 backdrop-blur-md transition-all shadow-sm">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-lg tracking-tight text-foreground">DIVWY</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {link.icon && <span className="mr-2">{link.icon}</span>}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          {/* Search Icon */}
          <button
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            aria-label="ค้นหา"
          >
            <Search size={20} />
          </button>
          
          {/* Auth Placeholder - แสดง skeleton ของปุ่มล็อกอินระหว่างรอข้อมูล */}
          <div className="h-9 w-24 rounded-full bg-muted/50 animate-pulse"></div>
        </div>
      </div>
    </nav>
  );
}