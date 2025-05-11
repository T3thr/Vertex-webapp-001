// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css"; // globals.css ควร import ก่อน components อื่นๆ
import { GlobalProvider } from "@/context/GlobalContext"; 
import NavBarWrapper from "@/components/layouts/NavBarWrapper"; // ถ้า NavBarWrapper เป็น client component ที่ห่อ NavBar
import Footer from "@/components/layouts/Footer"; 
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import dbConnect from "@/backend/lib/mongodb";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"], // ควรมี subsets
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"], // ควรมี subsets
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: {
    default: "NovelMaze", // ชื่อเว็บของคุณ +
    template: "%s — NovelMaze",
  },
  description: "สวัสดีจ้า โฮะๆๆ แพลตฟอร์ม Visual Novel หลากหลายแนว", // คำอธิบายเว็บ
  applicationName: "NovelMaze",
  authors: [{ name: "NovelMaze Team" }],
  generator: "Next.js",
  keywords: ["นิยาย", "อ่านนิยาย", "visual novel", "nextjs", "skibidi", "tailwind"],
  referrer: 'origin-when-cross-origin',
  creator: 'NovelMaze Team',
  publisher: 'NovelMaze Publisher',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: { default: "NovelMaze", template: "%s — NovelMaze" },
    description: "ค้นพบและอ่านนิยาย Visual Novel บน NovelMaze",
    url: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    siteName: "NovelMaze",
    images: [
      {
        url: "/opengraph-image.png", // ควรมีไฟล์นี้ใน public folder
        width: 1200,
        height: 630,
        alt: "NovelMaze - ประตูสู่โลกแห่งนิยาย",
      },
    ],
    locale: 'th_TH',
    type: 'website',
  },
  twitter: {
    card: "summary_large_image",
    title: { default: "NovelMaze", template: "%s — NovelMaze" },
    description: "ดำดิ่งสู่โลกแห่งนิยายกับ NovelMaze",
    images: [{ url: "/twitter-image.png", alt: "NovelMaze" }], // ควรมีไฟล์นี้ใน public folder
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }, // แก้ไข type
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-icon.png', // Apple touch icon
  },
  manifest: '/manifest.webmanifest',
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION_TOKEN, // ใช้ environment variable
  },
  appleWebApp: {
    title: 'NovelMaze',
    statusBarStyle: 'default',
    capable: true,
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = { // ใช้ viewport object โดยตรง
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // หรือ 5 ถ้าต้องการให้ zoom ได้
  userScalable: true,
  themeColor: [ // themeColor ควรเป็น array ของ objects
    { media: "(prefers-color-scheme: light)", color: "hsl(0 0% 100%)" }, //  ค่าสีตรงๆ หรือ CSS var ที่ define ใน global แต่ไม่แนะนำให้ใช้ var ที่นี่
    { media: "(prefers-color-scheme: dark)", color: "hsl(222.2 84% 4.9%)" },
    { media: "(prefers-color-scheme: sepia)", color: "var(--background)" }, // sepia theme
  ],
};


// Script สำหรับการตั้งค่า theme เริ่มต้นเพื่อป้องกัน FOUC (Flash Of Unstyled Content)
// และช่วยลด Hydration Mismatch. Script นี้ควรจะ run ก่อนที่ React จะ render.
function InitializeTheme() {
  // Nonce สำหรับ CSP (Content Security Policy) ถ้ามีการใช้งาน
  // const nonce = (globalThis as any).__webpack_nonce__ || (globalThis as any).__NEXT_NONCE__;
  // ใน Next.js 14+ การเข้าถึง nonce อาจจะเปลี่ยนไป ควรตรวจสอบเอกสารล่าสุด
  // ถ้าไม่ได้ใช้ CSP ที่ strict มากๆ อาจจะไม่จำเป็นต้องใส่ nonce ที่นี่

  const scriptContent = `
(function() {
  // ฟังก์ชันนี้จะพยายามอ่าน theme จาก localStorage หรือ user preferences ถ้าเป็นไปได้
  // แต่ในขั้นตอนนี้ (ก่อน React render) เราอาจจะยังไม่มีข้อมูล user session
  // ดังนั้นจะเน้นที่ localStorage และ system preference
  function getInitialTheme() {
    try {
      const storedTheme = localStorage.getItem('novelmaze-theme'); // Key ควรตรงกับใน ThemeContext
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'sepia') {
        return storedTheme;
      }
      // ถ้า storedTheme เป็น 'system' หรือค่าอื่นๆ หรือไม่มี, ให้เช็ค system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {
      // console.warn('[Layout ThemeScript] Error accessing localStorage:', e);
    }
    return 'light'; // Default theme ถ้าไม่มีอะไรเลย หรือเกิด error
  }
  const theme = getInitialTheme();
  document.documentElement.classList.add(theme);
  // console.log('[Layout ThemeScript] Initial theme set on <html>:', theme);
})();`;

  return (
    <script
      id="theme-initializer-script"
      // nonce={nonce} // ใส่ nonce ถ้ามี
      dangerouslySetInnerHTML={{ __html: scriptContent }}
    />
  );
}


export default async function RootLayout({
  children,
}:Readonly< {
  children: React.ReactNode;
}>) {
  await dbConnect(); // ไม่จำเป็นถ้าไม่มีการ query DB ใน Server Component นี้โดยตรง

  return (
    <html lang="th" suppressHydrationWarning> 
      <head>
        {/*
          Theme Initializer Script:
          - ควรอยู่สูงที่สุดใน <head> เพื่อทำงานก่อน CSS อื่นๆ และ JavaScript ของ React.
          - script นี้จะเพิ่ม class (light/dark/sepia) ให้กับ <html> tag โดยตรง.
          - ThemeProvider ใน GlobalContext จะอ่านค่านี้อีกครั้งและ re-hydrate state
            และจะจัดการการเปลี่ยนแปลง theme หลังจากนี้.
        */}
        <InitializeTheme />
        {/*
          ไม่จำเป็นต้องใส่ <meta charSet="utf-8" /> และ <meta name="viewport" ... /> อีก
          เพราะ Next.js 13+ (App Router) จัดการให้โดยอัตโนมัติจาก metadata และ viewport exports.
        */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary flex flex-col`}
      >
        <GlobalProvider>
          {/*
            NavBarWrapper หรือ NavBar ควรเป็น Client Component ถ้ามีการใช้ hooks เช่น usePathname, useState, useEffect, useTheme, useAuth
            ถ้า NavBarWrapper เป็น Server Component ที่ render NavBar (Client Component) ก็ถูกต้อง
          */}
          <NavBarWrapper />
          <main className="flex-grow w-full"> 
            {children}
          </main>
          <Footer /> 
        </GlobalProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}