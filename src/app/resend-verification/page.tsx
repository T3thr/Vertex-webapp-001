// src/app/resend-verification/page.tsx

'use client';
import React, { useState, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

// สถานะของการส่งอีเมลยืนยันใหม่
interface ResendState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

function ResendVerificationContent() {
  const [state, setState] = useState<ResendState>({ status: 'idle', message: '' });
  const [email, setEmail] = useState<string>('');
  const emailInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ฟังก์ชันจัดการการส่งฟอร์ม
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ตรวจสอบความถูกต้องของอีเมล
    if (!email) {
      setState({ status: 'error', message: 'กรุณาระบุอีเมล' });
      return;
    }
    const lowerCaseEmail = email.toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(lowerCaseEmail)) {
      setState({ status: 'error', message: 'กรุณาระบุอีเมลที่ถูกต้อง' });
      return;
    }

    setState({ status: 'loading', message: 'กำลังส่งอีเมลยืนยันใหม่...' });

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lowerCaseEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setState({
          status: 'success',
          message: data.message || 'ส่งอีเมลยืนยันใหม่สำเร็จ กรุณาตรวจสอบกล่องจดหมายของคุณ',
        });
        setEmail('');
        // รีเซ็ต input
        if (emailInputRef.current) {
          emailInputRef.current.value = '';
        }
        // Redirect ไปยังหน้าหลักหลังจาก 3 วินาที
        setTimeout(() => router.push('/'), 3000);
      } else {
        setState({
          status: 'error',
          message: data.error || 'เกิดข้อผิดพลาดในการส่งอีเมลยืนยันใหม่',
        });
      }
    } catch (error) {
      console.error('❌ ข้อผิดพลาดในการส่งอีเมลยืนยันใหม่:', error);
      setState({
        status: 'error',
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่ภายหลัง',
      });
    }
  };

  // ฟังก์ชันสำหรับแสดงผลตามสถานะ
  const renderStatus = () => {
    switch (state.status) {
      case 'loading':
        return (
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>{state.message}</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center gap-3 text-green-500">
            <CheckCircle className="w-8 h-8" />
            <div className="text-center">
              <p className="font-medium">{state.message}</p>
              <p className="text-sm text-muted-foreground mt-2">
                กำลังนำคุณกลับไปยังหน้าหลัก...
              </p>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="w-6 h-6" />
            <span>{state.message}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-center text-foreground mb-6">
        ส่งอีเมลยืนยันใหม่
      </h1>
      <p className="text-center text-muted-foreground mb-6">
        กรุณาระบุอีเมลที่คุณใช้สมัครเพื่อรับลิงก์ยืนยันใหม่<br/>
        ระบบจะรีเฟรชโทเค็นยืนยันและส่งอีเมลใหม่ให้คุณ
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground"
          >
            อีเมล
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              id="email"
              type="email"
              ref={emailInputRef}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="อีเมลของคุณ"
              className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={state.status === 'loading'}
          className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 รีเฟรชโทเค็นและส่งอีเมลยืนยัน
        </button>
      </form>
      {state.status !== 'idle' && (
        <div className="mt-4 text-center text-sm">{renderStatus()}</div>
      )}
      <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
        <p>
          กลับไปที่{' '}
          <Link href="/" className="text-primary hover:underline">
            หน้าเข้าสู่ระบบ
          </Link>
        </p>
        <p>
          หรือไปที่{' '}
          <Link href="/" className="text-primary hover:underline">
            หน้าหลัก
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResendVerificationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container-custom">
        <div className="max-w-md mx-auto bg-card p-8 rounded-lg shadow-lg animate-slideIn">
          <Suspense
            fallback={
              <div className="flex flex-col items-center gap-4 animate-pulse">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-lg font-medium text-foreground">กำลังโหลด...</p>
              </div>
            }
          >
            <ResendVerificationContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}