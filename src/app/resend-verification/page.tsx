// src/app/resend-verification/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

interface ResendResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data: ResendResponse = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Verification email sent successfully!');
        setTimeout(() => router.push('/auth/signin'), 5000); // Auto-redirect after 5s
      } else {
        setStatus('error');
        setMessage(data.error || 'An error occurred. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An unexpected error occurred. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container-custom py-12">
        <div className="max-w-md mx-auto bg-card rounded-xl shadow-lg p-8 animate-slideIn">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">
              Resend Verification Email
            </h1>
            <p className="mt-2 text-muted-foreground">
              Enter your email to receive a new verification link.
            </p>
          </div>

          {status === 'success' ? (
            <div className="mt-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="h-8 w-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="mt-4 text-muted-foreground">{message}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Redirecting to sign-in page...
              </p>
              <Link
                href="/auth/signin"
                className="mt-4 inline-block text-primary hover:underline"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full px-4 py-2 bg-input border border-border rounded-md shadow-sm focus:ring focus:ring-ring focus:ring-opacity-50 transition-colors"
                  placeholder="your.email@example.com"
                />
              </div>

              {status === 'error' && (
                <p className="text-sm text-destructive">{message}</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex justify-center py-2 px-4 bg-primary text-primary-foreground rounded-md shadow-sm hover:bg-primary/90 focus:outline-none focus:ring focus:ring-ring focus:ring-opacity-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Verification Email'
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already verified?{' '}
              <Link href="/auth/signin" className="text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}