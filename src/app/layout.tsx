// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalProvider } from "@/context/GlobalContext";
import NavBarWrapper from "@/components/layouts/NavBarWrapper";
import Footer from "@/components/layouts/Footer";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import UserSettingsModel from "@/backend/models/UserSettings";
import { Toaster } from 'sonner';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import type { Theme } from "@/context/ThemeContext";
import type { SessionUser } from "@/app/api/auth/[...nextauth]/options";

// --- การตั้งค่า Font ---
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

// --- Metadata และ Viewport ---
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: {
    default: "DivWy",
    template: "%s — DivWy",
  },
  description: "แพลตฟอร์ม Visual Novel ที่ทันสมัยและหลากหลายแนวสำหรับคุณ",
  openGraph: {
    title: { default: "DivWy", template: "%s — DivWy" },
    description: "ค้นพบและดื่มด่ำกับ Visual Novels คุณภาพสูงบน DivWy",
    url: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    siteName: "DivWy",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "DivWy - ประตูสู่โลกแห่งนิยายภาพ",
      },
    ],
    locale: 'th_TH',
    type: 'website',
  },
  twitter: {
    card: "summary_large_image",
    title: { default: "DivWy", template: "%s — DivWy" },
    description: "ดำดิ่งสู่เรื่องราวอันน่าทึ่งกับ Visual Novels บน DivWy",
    images: [{ url: "/twitter-image.png", alt: "DivWy" }],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.webmanifest',
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION_TOKEN,
  },
  appleWebApp: {
    title: 'DivWy',
    statusBarStyle: 'default',
    capable: true,
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 2,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" }, // สีสำหรับ light mode
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },  // สีสำหรับ dark mode (slate-900)
    // พิจารณาเพิ่มสีสำหรับ sepia ถ้าต้องการให้แถบ BrowserBar เปลี่ยนสีตาม
    // { media: "[data-theme='sepia']", color: "#f4ecd8" } // ตัวอย่างสีสำหรับ sepia
  ],
};

// --- Script สำหรับการตั้งค่า Theme เริ่มต้น ---
function ThemeInitializerScript(theme: Theme | null) {
  const scriptContent = `
(function() { // IIFE
  try {
    const storageKey = 'divwy-theme';
    const defaultCssTheme = 'light'; // Fallback CSS class สุดท้ายหากเกิดข้อผิดพลาด
    const userDbThemeFromServer = ${theme ? JSON.stringify(theme) : 'null'};

    function determineEffectiveTheme() {
      let themeToApply;
      let themeToStoreInLocalStorage;

      // 1. ตรวจสอบธีมจาก server (ผ่าน data-attribute) ถ้าผู้ใช้ login และมี preference
      if (userDbThemeFromServer && ['light', 'dark', 'system', 'sepia'].includes(userDbThemeFromServer)) {
        themeToStoreInLocalStorage = userDbThemeFromServer; // นี่คือ "ตัวเลือก" ของผู้ใช้
        if (userDbThemeFromServer === 'system') {
          themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
          themeToApply = userDbThemeFromServer; // light, dark, sepia
        }
        localStorage.setItem(storageKey, themeToStoreInLocalStorage);
        return themeToApply;
      }

      // 2. ถ้าไม่มีธีมจาก server (เช่น ผู้ใช้ guest), ตรวจสอบ localStorage
      const storedTheme = localStorage.getItem(storageKey);
      if (storedTheme && ['light', 'dark', 'system', 'sepia'].includes(storedTheme)) {
        themeToStoreInLocalStorage = storedTheme; // "ตัวเลือก" ที่เคยบันทึกไว้
        if (storedTheme === 'system') {
          themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
          themeToApply = storedTheme; // light, dark, sepia
        }
        return themeToApply;
      }

      // 3. ถ้าไม่มีทั้งจาก server และ localStorage, ใช้ system preference เป็น default
      themeToStoreInLocalStorage = 'system';
      localStorage.setItem(storageKey, themeToStoreInLocalStorage);
      themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      return themeToApply;
    }

    const finalThemeToApply = determineEffectiveTheme() || defaultCssTheme;
    document.documentElement.className = '';
    document.documentElement.classList.add(finalThemeToApply);
    document.documentElement.setAttribute('data-theme', finalThemeToApply);
    document.documentElement.setAttribute('data-theme-ready', 'true');
  } catch (e) {
    console.warn('[Layout ThemeScript] Error setting initial theme:', e);
    document.documentElement.className = ''; // Clear classes on error
    document.documentElement.classList.add('light'); // Fallback to light
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('data-theme-ready', 'true');
  }
})();`;

  return (
    <script
      id="theme-initializer-script"
      dangerouslySetInnerHTML={{ __html: scriptContent }}
    />
  );
}

function toPlainObject(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toPlainObject);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      const value = obj[key];
      if (value && typeof value === 'object' && typeof value.toHexString === 'function') {
        // Mongoose ObjectId
        result[key] = value.toHexString();
      } else if (value instanceof Date) {
        result[key] = value.toISOString();
      } else {
        result[key] = toPlainObject(value);
      }
    }
    return result;
  }
  return obj;
}

// --- RootLayout Component ---
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await dbConnect(); // เชื่อมต่อ DB

  const session = await getServerSession(authOptions);
  let userDbTheme: Theme | null = null;
  const user: SessionUser | null = session?.user ? toPlainObject(session.user) : null;

  // ✅ ส่วนสำคัญ: ถ้าผู้ใช้ล็อกอินอยู่ ให้ดึง theme ล่าสุดจาก DB โดยตรง
  if (session?.user?.id) {
    try {
      const userSettings = await UserSettingsModel.findOne({ userId: session.user.id })
        .select("display.theme") // เลือกเฉพาะ field ที่ต้องการ
        .lean()
        .exec();

      if (userSettings?.display?.theme) {
        userDbTheme = userSettings.display.theme as Theme;
      }
    } catch (dbError) {
      console.error("[RootLayout Server] Error fetching user settings directly from DB:", dbError);
    }
  }

  return (
    <html lang="th" suppressHydrationWarning data-server-theme={userDbTheme || 'null'}>
      <head>
        {ThemeInitializerScript(userDbTheme)}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <GlobalProvider>
          <NavBarWrapper user={user} />
          <main className="flex-grow w-full">
            {children}
          </main>
          <Footer />        
          <Analytics />
          <SpeedInsights />
        </GlobalProvider>
      </body>
    </html>
  );
}