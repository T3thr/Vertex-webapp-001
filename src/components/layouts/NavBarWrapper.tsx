// src/components/layouts/NavBarWrapper.tsx
import NavBar from "./NavBar";
import { SessionUser } from "@/app/api/auth/[...nextauth]/options";

interface NavBarWrapperProps {
  user: SessionUser | null;
}

// NavBarWrapper - SSR Component for immediate correct NavBar rendering
// Passes server-side user data directly to NavBar for zero flickering
export default function NavBarWrapper({ user }: NavBarWrapperProps) {
  return (
    <div suppressHydrationWarning>
      <NavBar initialUser={user} />
    </div>
  );
}