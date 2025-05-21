// src/components/layouts/NavBarWrapper.tsx

import { Suspense } from "react";
import NavBar from "./NavBar";
import NavBarSkeleton from "./NavBarSkeleton";

// NavBarWrapper - จัดการการแสดงผล NavBar และรองรับ Server Component
export default function NavBarWrapper() {
  return (
    <header className="sticky top-0 z-40 w-full transition-all">
      <Suspense>
        <NavBar />
      </Suspense>
    </header>
  );
}