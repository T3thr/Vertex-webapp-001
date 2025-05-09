// src/components/layout/Footer.tsx
// คอมโพเนนต์สำหรับส่วนท้ายของเว็บไซต์ (Footer)
"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle"; 
import { Facebook, Twitter, Instagram, Youtube, Rss } from "lucide-react"; // Social media icons

export default function Footer()  {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { name: "Facebook", icon: <Facebook size={20} />, href: "#" },
    { name: "Twitter", icon: <Twitter size={20} />, href: "#" },
    { name: "Instagram", icon: <Instagram size={20} />, href: "#" },
    { name: "YouTube", icon: <Youtube size={20} />, href: "#" },
    { name: "RSS Feed", icon: <Rss size={20} />, href: "#" },
  ];

  const footerNavLinks = [
    { label: "เกี่ยวกับเรา", href: "/about" },
    { label: "ติดต่อเรา", href: "/contact" },
    { label: "เงื่อนไขการใช้งาน", href: "/terms" },
    { label: "นโยบายความเป็นส่วนตัว", href: "/privacy" },
    { label: "คำถามที่พบบ่อย", href: "/faq" },
  ];

  return (
    <footer className="bg-card text-card-foreground border-t border-border mt-auto">
      <div className="container-custom py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Logo and About */}
          <div className="md:col-span-1 lg:col-span-1">
            <Link href="/" className="inline-block mb-3">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                NOVELMAZE
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              แพลตฟอร์มสำหรับนักอ่านและนักเขียนนิยายออนไลน์ ที่จะพาคุณผจญภัยไปในโลกแห่งจินตนาการไม่รู้จบ
            </p>
            <div className="mt-4">
              <p className="text-sm font-semibold text-foreground mb-2">เปลี่ยนธีม:</p>
              <ThemeToggle />
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="md:col-span-1 lg:col-span-1">
            <h5 className="text-md font-semibold text-foreground mb-3">ลิงก์ด่วน</h5>
            <ul className="space-y-2">
              {footerNavLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Categories (Placeholder) */}
          <div className="md:col-span-1 lg:col-span-1">
            <h5 className="text-md font-semibold text-foreground mb-3">หมวดหมู่นิยม</h5>
            <ul className="space-y-2">
              {["แฟนตาซี", "โรแมนติก", "สืบสวนสอบสวน", "นิยายวาย", "ผจญภัย"].map((category) => (
                <li key={category}>
                  <Link href={`/categories/${category.toLowerCase().replace(" ", "-")}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Social Media & Newsletter (Placeholder) */}
          <div className="md:col-span-3 lg:col-span-1">
            <h5 className="text-md font-semibold text-foreground mb-3">ติดตามเรา</h5>
            <div className="flex space-x-3 mb-6">
              {socialLinks.map((social) => (
                <Link 
                  key={social.name} 
                  href={social.href} 
                  aria-label={social.name}
                  className="text-muted-foreground hover:text-primary transition-colors p-2 bg-secondary hover:bg-secondary/80 rounded-full"
                >
                  {social.icon}
                </Link>
              ))}
            </div>
            <h5 className="text-md font-semibold text-foreground mb-3">รับข่าวสารจากเรา</h5>
            <form className="flex flex-col sm:flex-row gap-2">
              <input 
                type="email" 
                placeholder="อีเมลของคุณ"
                className="flex-grow px-3 py-2 rounded-md border border-input bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button 
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                ติดตาม
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} NOVELMAZE. สงวนลิขสิทธิ์ทั้งหมด
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            พัฒนาโดยทีม NovelMaze
          </p>
        </div>
      </div>
    </footer>
  );
};
