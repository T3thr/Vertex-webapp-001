// src/app/signin/page.tsx
import Image from 'next/image';
import { Metadata } from 'next';
import AuthButton from '@/components/ui/AuthButton';
import BackgroundAnimation from '@/components/ui/BackgroundAnimation';

export const metadata: Metadata = {
  title: 'Sign In | Your Entertainment Platform',
  description: 'Sign in to access your entertainment account',
};

export default function SignInPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full bg-background relative overflow-hidden">
      {/* Background animation */}
      <BackgroundAnimation />
      
      {/* Background gradient effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent z-0" />
      <div className="absolute bottom-0 right-0 w-2/3 h-2/3 bg-gradient-to-tl from-secondary/20 to-transparent z-0" />
      
      {/* Content container */}
      <div className="z-10 flex flex-col items-center max-w-md px-4 py-12 text-center">
        {/* Logo placeholder - replace with your actual logo */}
        <div className="mb-6 relative w-48 h-16 flex items-center justify-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            DivWy
          </h1>
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Welcome to DivWy
        </h2>
        
        <p className="text-muted-foreground mb-8">
          Unlock a world of entertainment with just one click.
          Sign in to access your personalized experience.
        </p>
        
        <AuthButton />
        
        <p className="mt-12 text-sm text-muted-foreground">
          By signing in, you agree to our{' '}
          <a href="/terms" className="underline hover:text-primary transition-colors">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline hover:text-primary transition-colors">
            Privacy Policy
          </a>
        </p>
      </div>
      
      {/* Decorative circles */}
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-primary/5 z-0" />
      <div className="absolute top-1/3 right-10 w-32 h-32 rounded-full bg-primary/10 z-0" />
      <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-secondary/10 z-0" />
    </main>
  );
}