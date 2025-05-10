// src/app/layout.tsx

import { Metadata } from "next";
import dbConnect from "@/backend/lib/mongodb";
import NavBarWrapper from "@/components/layouts/NavBarWrapper";
import { GlobalProvider } from "@/context/GlobalContext";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Define static metadata for the entire application
export const metadata: Metadata = {
  title: {
    default: "NovelMaze",
    template: "%s — NovelMaze",
  },
  description: "Explore a vast collection of novels across various genres.",
  openGraph: {
    title: "NovelMaze",
    description: "Discover and read novels from different genres.",
    url: "https://novelmaze.vercel.app/",
    siteName: "NovelMaze",
    images: [
      {
        url: "/opengraph-image.jpg", 
        width: 1200,
        height: 630,
        alt: "NovelMaze - Your Gateway to Novels",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NovelMaze",
    description: "Dive into a world of novels with NovelMaze.",
    images: ["/twitter-image.jpg"], 
  },
  icons: {
    icon: "/favicon.ico", 
  },
};

// ปรับปรุงฟังก์ชันเพื่อจัดการธีมก่อนที่เพจจะถูกเรนเดอร์ (ป้องกัน flickering)
function ThemeScript() {
  return (
    <script
      id="theme-initializer"
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            // เพิ่มฟังก์ชันตรวจสอบว่าเป็น dark mode หรือไม่
            function isSystemDarkMode() {
              return window.matchMedia('(prefers-color-scheme: dark)').matches;
            }

            // ตั้งค่า theme class ทันทีเพื่อป้องกัน flickering
            function applyTheme(theme) {
              document.documentElement.classList.remove('light', 'dark');
              document.documentElement.classList.add(theme);
            }

            try {
              // พยายามเรียกค่า theme จาก localStorage ก่อน
              const storedTheme = localStorage.getItem('novelmaze-theme');
              
              if (storedTheme === 'light') {
                applyTheme('light');
                return;
              }
              
              if (storedTheme === 'dark') {
                applyTheme('dark'); 
                return;
              }
              
              // ถ้าเป็น system theme หรือไม่ได้ตั้งค่า, ตรวจสอบ system preference
              const theme = isSystemDarkMode() ? 'dark' : 'light';
              applyTheme(theme);
            } catch (e) {
              // ถ้าเกิด error (เช่น localStorage ไม่สามารถเข้าถึงได้), ใช้ light theme เป็นค่าเริ่มต้น
              applyTheme('light');
            }
          })();
        `,
      }}
    />
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await dbConnect();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}>
        <GlobalProvider>
          <NavBarWrapper />
          {children}
        </GlobalProvider>
      </body>
    </html>
  );
}