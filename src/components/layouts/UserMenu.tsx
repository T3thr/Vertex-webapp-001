// src/components/layouts/UserMenu.tsx
"use client"
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  User, 
  BookMarked, 
  History, 
  Star, 
  Settings, 
  LogOut, 
  BookOpen,
  PenTool
} from 'lucide-react';
import { SessionUser } from '@/app/api/auth/[...nextauth]/options';
import { Avatar } from '@/components/ui/Avatar';

interface UserMenuProps {
  user: SessionUser;
}

export const UserMenu = ({ user }: UserMenuProps) => {
  const { signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close menu when escape key is pressed
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  // Get initials for avatar fallback
  const getInitials = (): string => {
    if (user.profile.displayName) {
      return user.profile.displayName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 focus:outline-none"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Avatar 
          src={user.profile.avatar} 
          alt={user.profile.displayName || user.username}
          fallback={getInitials()}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg bg-card shadow-lg border border-accent ring-1 ring-black ring-opacity-5 focus:outline-none py-1 z-50">
          <div className="px-4 pt-3 pb-2 border-b border-accent">
            <div className="flex items-center gap-3">
              <Avatar 
                src={user.profile.avatar} 
                alt={user.profile.displayName || user.username}
                fallback={getInitials()}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">
                  {user.profile.displayName || user.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="py-1">
            <Link
              href="/my-library"
              className="flex items-center px-4 py-2 text-sm text-card-foreground hover:bg-accent/50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <BookMarked className="mr-3 h-4 w-4 text-muted-foreground" />
              My Library
            </Link>
            <Link
              href="/reading-history"
              className="flex items-center px-4 py-2 text-sm text-card-foreground hover:bg-accent/50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <History className="mr-3 h-4 w-4 text-muted-foreground" />
              Reading History
            </Link>
            <Link
              href="/favorites"
              className="flex items-center px-4 py-2 text-sm text-card-foreground hover:bg-accent/50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Star className="mr-3 h-4 w-4 text-muted-foreground" />
              Favorites
            </Link>

            {(user.role === "Writer" || user.role === "Admin") && (
              <Link
                href="/my-works"
                className="flex items-center px-4 py-2 text-sm text-card-foreground hover:bg-accent/50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <PenTool className="mr-3 h-4 w-4 text-muted-foreground" />
                My Works
              </Link>
            )}
          </div>

          <div className="py-1 border-t border-accent">
            <Link
              href="/settings"
              className="flex items-center px-4 py-2 text-sm text-card-foreground hover:bg-accent/50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="mr-3 h-4 w-4 text-muted-foreground" />
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-4 py-2 text-sm text-card-foreground hover:bg-accent/50 transition-colors"
            >
              <LogOut className="mr-3 h-4 w-4 text-muted-foreground" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};