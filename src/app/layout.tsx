// src/app/layout.tsx
import { Metadata } from "next";
import dbConnect from "@/backend/lib/mongodb";
import NavBarWrapper from "@/components/layouts/NavBarWrapper";
import { GlobalProvider } from "@/context/GlobalContext";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { randomBytes } from "crypto";

// สร้าง nonce สำหรับ CSP
const nonce = randomBytes(16).toString("base64");

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// กำหนด metadata คงที่สำหรับแอปพลิเคชันทั้งหมด
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

// กำหนด CSP header
export const generateViewport = () => {
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
    ],
  };
};

export const headers = () => {
  return [
    {
      key: "Content-Security-Policy",
      value: `
        default-src 'self';
        script-src 'self' 'nonce-${nonce}' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/;
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: https://*.vercel.app;
        connect-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/;
        frame-src 'self' https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/;
        font-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        upgrade-insecure-requests;
      `.replace(/\s+/g, " ").trim(),
    },
  ];
};

// ปรับปรุงฟังก์ชันเพื่อจัดการธีมก่อนที่เพจจะถูกเรนเดอร์ (ป้องกัน flickering)
function ThemeScript() {
  return (
    <script
      id="theme-initializer"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function isSystemDarkMode() {
              return window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            function applyTheme(theme) {
              document.documentElement.classList.remove('light', 'dark');
              document.documentElement.classList.add(theme);
            }
            try {
              const storedTheme = localStorage.getItem('novelmaze-theme');
              if (storedTheme === 'light') {
                applyTheme('light');
                return;
              }
              if (storedTheme === 'dark') {
                applyTheme('dark');
                return;
              }
              const theme = isSystemDarkMode() ? 'dark' : 'light';
              applyTheme(theme);
            } catch (e) {
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
        {/* โหลด reCAPTCHA script ด้วย nonce */}
        <script
          nonce={nonce}
          src="https://www.google.com/recaptcha/api.js?render=explicit&hl=th"
          async
          defer
        ></script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}>
        <GlobalProvider>
          <NavBarWrapper />
          {children}
        </GlobalProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}