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
  subsets: ["latin"],
  display: "swap", // ใช้ swap เพื่อป้องกัน FOUT (Flash Of Unstyled Text)
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: {
    default: "NovelMaze",
    template: "%s — NovelMaze",
  },
  description: "สวัสดีจ้า โฮะๆๆ แพลตฟอร์ม Visual Novel หลากหลายแนว",
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
        url: "/opengraph-image.png", 
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
    images: [{ url: "/twitter-image.png", alt: "NovelMaze" }],
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
    title: 'NovelMaze',
    statusBarStyle: 'default',
    capable: true,
  },
  formatDetection: { telephone: false, email: false, address: false },
  // Next.js 15+ เพิ่ม metadataBase เพื่อแก้ปัญหา hydration mismatch
  other: {
    'csrf-protection': process.env.CSRF_SECRET || 'true',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 2, // เปลี่ยนเป็น 2 เพื่อให้ zoom ได้บ้างแต่ไม่มากเกินไป
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" }, // ใช้สีตรงๆ แทน CSS var
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
    { media: "(prefers-color-scheme: sepia)", color: "#f5eadd" },
  ],
};

// Script สำหรับการตั้งค่า theme เริ่มต้นเพื่อป้องกัน FOUC (Flash Of Unstyled Content)
// และช่วยลด Hydration Mismatch. Script นี้ควรจะ run ก่อนที่ React จะ render.
function InitializeTheme() {
  const scriptContent = `
(function() {
  try {
    // ฟังก์ชันนี้จะพยายามอ่าน theme จาก localStorage ก่อน
    function getInitialTheme() {
      const storedTheme = localStorage.getItem('novelmaze-theme');
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'sepia') {
        return storedTheme;
      }
      // ถ้า storedTheme เป็น 'system' หรือไม่มีค่า, ให้เช็ค system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light'; // Default theme
    }
    
    // ทำการตั้งค่า theme ทันที
    const theme = getInitialTheme();
    document.documentElement.classList.remove('light', 'dark', 'sepia');
    document.documentElement.classList.add(theme);
    
    // ป้องกัน FOUC โดยซ่อน body ไว้จนกว่า theme จะโหลดเสร็จ
    document.documentElement.style.visibility = 'visible';
  } catch (e) {
    console.warn('[Layout ThemeScript] Error setting initial theme:', e);
    document.documentElement.classList.add('light'); // Fallback theme
    document.documentElement.style.visibility = 'visible';
  }
})();`;

  return (
    <script
      id="theme-initializer-script"
      dangerouslySetInnerHTML={{ __html: scriptContent }}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ทำการเชื่อมต่อ MongoDB เฉพาะเมื่อจำเป็น - สามารถปิดไว้ได้ถ้าไม่ได้ query ข้อมูลในส่วนนี้โดยตรง
  // await dbConnect();

  return (
    <html lang="th" suppressHydrationWarning className="invisible">
      <head>
        <InitializeTheme />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary flex flex-col`}
      >
        <GlobalProvider>
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