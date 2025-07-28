// src/components/layouts/NavBarWrapper.tsx
'use client';

import { usePathname } from 'next/navigation';
import NavBar from "./NavBar";
import { SessionUser } from "@/app/api/auth/[...nextauth]/options";

interface NavBarWrapperProps {
  user: SessionUser | null;
}

// NavBarWrapper - Now a client component to check the path and apply conditional styling.
// It makes the NavBar sticky everywhere except on reading pages.
export default function NavBarWrapper({ user }: NavBarWrapperProps) {
  const pathname = usePathname();

  // Check if the current page is a reading page.
  // The paths are typically /novels/[slug]/read/[episodeId] or /read/[slug]/[episodeId].
  const isReadPage = pathname.includes('/read/');

  // Conditionally apply sticky positioning. On read pages, the wrapper is just a plain div.
  const wrapperClasses = !isReadPage
    ? 'sticky top-0 z-50 w-full transition-all duration-300 ease-in-out'
    : '';

  return (
    <header className={wrapperClasses} suppressHydrationWarning>
      <NavBar initialUser={user} />
    </header>
  );
}