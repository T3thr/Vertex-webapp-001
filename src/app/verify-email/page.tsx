// src/app/verify-email/page.tsx

'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

// สถานะของการยืนยันอีเมล
interface VerificationState {
  status: 'idle' | 'loading' | 'success' | 'error' | 'already-verified';
  message: string;
}

function VerifyEmailContent() {
  const [state, setState] = useState<VerificationState>({ status: 'idle', message: '' });
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const status = searchParams.get('status');
  const message = searchParams.get('message');
  const email = searchParams.get('email');

  // ฟังก์ชันสำหรับยืนยัน token
  const verifyToken = async () => {
    if (!token) {
      setState({ status: 'error', message: 'ไม่พบโทเค็นยืนยันใน URL' });
      return;
    }

    setState({ status: 'loading', message: 'กำลังยืนยันอีเมลของคุณ...' });

    try {
      const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
        method: 'GET',
      });

      if (response.redirected) {
        // API จะ redirect กลับมาพร้อม query params
        const redirectedUrl = new URL(response.url);
        const redirectedStatus = redirectedUrl.searchParams.get('status');
        const redirectedMessage = redirectedUrl.searchParams.get('message');
        const redirectedEmail = redirectedUrl.searchParams.get('email');

        if (redirectedStatus === 'success') {
          setState({
            status: 'success',
            message: `ยืนยันอีเมลสำเร็จสำหรับ ${redirectedEmail || 'บัญชีของคุณ'}! คุณสามารถเข้าสู่ระบบได้แล้ว`,
          });
          setTimeout(() => router.push('/'), 3000);
        } else {
          setState({
            status: 'error',
            message: redirectedMessage || 'เกิดข้อผิดพลาดในการยืนยันอีเมล',
          });
        }
      } else {
        const data = await response.json();
        setState({
          status: data.success ? 'success' : 'error',
          message: data.message || data.error || 'เกิดข้อผิดพลาดในการยืนยันอีเมล',
        });
      }
    } catch (error) {
      console.error('❌ ข้อผิดพลาดในการยืนยันอีเมล:', error);
      setState({ status: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่ภายหลัง' });
    }
  };

  // ตรวจสอบ query params จาก API redirect หรือลิงก์โดยตรง
  useEffect(() => {
    if (status === 'success' && email) {
      setState({
        status: 'success',
        message: `ยืนยันอีเมลสำเร็จสำหรับ ${email}! คุณสามารถเข้าสู่ระบบได้แล้ว`,
      });
      setTimeout(() => router.push('/'), 3000);
    } else if (status === 'already-verified' && email) {
      setState({
        status: 'already-verified',
        message: `อีเมล ${email} ได้รับการยืนยันแล้ว! คุณสามารถใช้งานระบบได้ปกติ`,
      });
      setTimeout(() => router.push('/'), 3000);
    } else if (status === 'error' && message) {
      setState({ status: 'error', message });
    } else {
      verifyToken();
    }
  }, [token, status, message, email]);

  // ฟังก์ชันสำหรับแสดงเนื้อหาตามสถานะ
  const renderContent = () => {
    switch (state.status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-lg font-medium text-foreground">{state.message}</p>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center gap-4 animate-fadeIn">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <p className="text-xl font-semibold text-foreground">{state.message}</p>
            <p className="text-sm text-muted-foreground">
              กำลังนำคุณไปยังหน้าหลักเพื่อเข้าสู่ระบบ...
            </p>
            <Link
              href="/"
              className="text-primary hover:underline transition-colors"
            >
              ไปที่หน้าหลักตอนนี้เลย!
            </Link>
          </div>
        );
      case 'already-verified':
        return (
          <div className="flex flex-col items-center gap-4 animate-fadeIn">
            <CheckCircle className="w-16 h-16 text-blue-500" />
            <p className="text-xl font-semibold text-foreground">{state.message}</p>
            <p className="text-sm text-muted-foreground">
              กำลังนำคุณกลับไปยังหน้าหลัก...
            </p>
            <Link
              href="/"
              className="text-primary hover:underline transition-colors"
            >
              ไปที่หน้าหลักตอนนี้เลย!
            </Link>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center gap-4 animate-fadeIn">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <p className="text-xl font-semibold text-foreground">{state.message}</p>
            <p className="text-sm text-muted-foreground">
              กรุณาตรวจสอบลิงก์ยืนยันหรือขออีเมลยืนยันใหม่
            </p>
            <Link
              href="/resend-verification"
              className="text-primary hover:underline transition-colors"
            >
              ขออีเมลยืนยันใหม่
            </Link>
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="text-center">{renderContent()}</div>;
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container-custom">
        <div className="max-w-md mx-auto bg-card p-8 rounded-lg shadow-lg animate-slideIn">
          <h1 className="text-3xl font-bold text-center text-foreground mb-6">
            ยืนยันอีเมลของคุณ
          </h1>
          <Suspense
            fallback={
              <div className="flex flex-col items-center gap-4 animate-pulse">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-lg font-medium text-foreground">กำลังโหลด...</p>
              </div>
            }
          >
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}