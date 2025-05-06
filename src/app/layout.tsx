import { Metadata } from "next";
import dbConnect from "@/backend/lib/mongodb";
import { NavBarClient } from "@/components/layouts/NavBarClient";
import { GlobalProvider } from "@/context/GlobalContext";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
        url: "/opengraph-image.jpg", // Ensure this image exists in your public directory
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
    images: ["/twitter-image.jpg"], // Ensure this image exists in your public directory
  },
  icons: {
    icon: "/favicon.ico", // Ensure this icon exists in your public directory
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await dbConnect();
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GlobalProvider>
          <NavBarClient />
          {children}
        </GlobalProvider>
      </body>
    </html>
  );
}
