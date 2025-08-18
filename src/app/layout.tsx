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
import DisableContextMenu from "@/components/layouts/DisableContextMenu";
import { registerAppListeners } from "@/backend/listeners"; // Import our listener registrar

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

// --- Optimized Non-blocking Theme Script ---
function ThemeInitializerScript(theme: Theme | null) {
  // Minified and optimized theme script
  const scriptContent = `!function(){try{const e='divwy-theme',t=${JSON.stringify(theme)};let n;const o=()=>{if(t&&'system'!==t)return localStorage.setItem(e,t),t;const n=localStorage.getItem(e);if(n)return'system'===n?window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light':n;return localStorage.setItem(e,'system'),window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'};n=o()||'light',document.documentElement.className='',document.documentElement.classList.add(n),document.documentElement.setAttribute('data-theme',n),document.documentElement.setAttribute('data-theme-ready','true')}catch(e){document.documentElement.className='',document.documentElement.classList.add('light'),document.documentElement.setAttribute('data-theme','light'),document.documentElement.setAttribute('data-theme-ready','true')}}();`;

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
  registerAppListeners(); // Register all application listeners

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
        suppressHydrationWarning={true}
      >
        <GlobalProvider>
          <DisableContextMenu />
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