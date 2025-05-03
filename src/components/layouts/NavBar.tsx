// src/components/layouts/NavBar.tsx
"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Menu, 
  Search, 
  BookOpen, 
  BookMarked, 
  Star, 
  Clock, 
  User, 
  LogOut, 
  Settings, 
  Moon, 
  Sun,
  X,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MobileMenu } from '@/components/layouts/MobileMenu';
import { UserMenu } from '@/components/layouts/UserMenu';
import { SearchDialog } from '@/components/ui/SearchDialog';

const NavBar = () => {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Navigation items
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Browse', href: '/browse' },
    { name: 'Popular', href: '/popular' },
    { name: 'New Releases', href: '/new-releases' },
    { name: 'Categories', href: '/categories' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled 
          ? 'bg-background/95 backdrop-blur-sm border-b border-accent/20 shadow-sm' 
          : 'bg-background'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center py-4 md:py-6">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" strokeWidth={2} />
              <span className="text-xl font-bold tracking-tight hidden sm:block">NovelVerse</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === item.href
                    ? 'text-primary'
                    : 'text-foreground/80'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Actions (Search, Sign in/User Menu) */}
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-full hover:bg-accent/50 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <ThemeToggle />

            {status === 'authenticated' && user ? (
              <UserMenu user={user} />
            ) : status === 'unauthenticated' ? (
              <div className="hidden sm:flex gap-3">
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-accent hover:bg-accent/30 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-accent/30 animate-pulse" />
            )}

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-full hover:bg-accent/50 transition-colors md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileMenu isOpen={mobileMenuOpen} navItems={navItems} />

      {/* Search Dialog */}
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
};

export default NavBar;