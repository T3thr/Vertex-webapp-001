// src/app/verify-email/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

interface VerificationResponse {
  error?: string;
  message?: string;
}

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing.');
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
          method: 'GET',
        });

        if (response.redirected) {
          router.push(response.url); // Redirect to sign-in page on success
          return;
        }

        const data: VerificationResponse = await response.json();

        if (data.error) {
          setStatus('error');
          setMessage(data.error);
        } else {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
          setTimeout(() => router.push('/auth/signin?verified=true'), 3000); // Auto-redirect after 3s
        }
      } catch (error) {
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again later.');
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container-custom py-12">
        <div className="max-w-md mx-auto bg-card rounded-xl shadow-lg p-8 animate-slideIn">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
                <h1 className="mt-4 text-2xl font-bold text-foreground">
                  Verifying Your Email
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Please wait while we verify your email address...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
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
                <h1 className="mt-4 text-2xl font-bold text-foreground">
                  Verification Successful
                </h1>
                <p className="mt-2 text-muted-foreground">{message}</p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Redirecting to sign-in page...
                </p>
                <Link
                  href="/auth/signin"
                  className="mt-6 inline-block text-primary hover:underline"
                >
                  Go to Sign In
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <svg
                    className="h-8 w-8 text-destructive"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h1 className="mt-4 text-2xl font-bold text-foreground">
                  Verification Failed
                </h1>
                <p className="mt-2 text-muted-foreground">{message}</p>
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Need a new verification email?
                  </p>
                  <Link
                    href="/auth/resend-verification"
                    className="inline-block text-primary hover:underline"
                  >
                    Resend Verification Email
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}