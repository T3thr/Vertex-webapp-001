// src/components/layouts/MobileMenu.tsx
"use client"
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogIn, 
  UserPlus,
  BookOpen
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  navItems: NavItem[];
}

export const MobileMenu = ({ isOpen, navItems }: MobileMenuProps) => {
  const { user, status } = useAuth();
  const pathname = usePathname();

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="md:hidden overflow-hidden bg-background border-b border-accent/20"
        >
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center py-3 text-base font-medium transition-colors ${
                  pathname === item.href
                    ? 'text-primary'
                    : 'text-foreground/80 hover:text-primary'
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Mobile auth links */}
            {status === 'unauthenticated' && (
              <div className="py-3 pt-6 mt-2 border-t border-accent/50">
                <Link
                  href="/auth/signin"
                  className="flex items-center mb-3 gap-2 text-base font-medium text-foreground/90 hover:text-primary transition-colors"
                >
                  <LogIn className="h-5 w-5" />
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex items-center gap-2 text-base font-medium text-foreground/90 hover:text-primary transition-colors"
                >
                  <UserPlus className="h-5 w-5" />
                  Sign Up
                </Link>
              </div>
            )}

            {status === 'authenticated' && user && (
              <div className="py-3 pt-6 mt-2 border-t border-accent/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                    {user.profile.displayName
                      ? user.profile.displayName.substring(0, 1).toUpperCase()
                      : user.username.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {user.profile.displayName || user.username}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 mt-4">
                  <Link
                    href="/my-library"
                    className="block py-2 text-base font-medium text-foreground/80 hover:text-primary transition-colors"
                  >
                    My Library
                  </Link>
                  <Link
                    href="/reading-history"
                    className="block py-2 text-base font-medium text-foreground/80 hover:text-primary transition-colors"
                  >
                    Reading History
                  </Link>
                  <Link
                    href="/favorites"
                    className="block py-2 text-base font-medium text-foreground/80 hover:text-primary transition-colors"
                  >
                    Favorites
                  </Link>
                  {(user.role === "Writer" || user.role === "Admin") && (
                    <Link
                      href="/my-works"
                      className="block py-2 text-base font-medium text-foreground/80 hover:text-primary transition-colors"
                    >
                      My Works
                    </Link>
                  )}
                  <Link
                    href="/settings"
                    className="block py-2 text-base font-medium text-foreground/80 hover:text-primary transition-colors"
                  >
                    Settings
                  </Link>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};