// src/components/layouts/NavBarWrapper.tsx
import NavBar from "./NavBar";
import { SessionUser } from "@/app/api/auth/[...nextauth]/options";

interface NavBarWrapperProps {
  user: SessionUser | null;
}

// NavBarWrapper - จัดการการแสดงผล NavBar และรองรับ Server Component
// Wrapper นี้ไม่จำเป็นต้องเป็น Client Component อีกต่อไป
export default function NavBarWrapper({ user }: NavBarWrapperProps) {
  return <NavBar initialUser={user} />;
}