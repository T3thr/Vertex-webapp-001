'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SignupButton from '@/components/ui/SignupButton';
import Link from 'next/link';

/**
 * หน้าลงทะเบียนที่ใช้ reCAPTCHA v2 Invisible
 */
export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  /**
   * ฟังก์ชันจัดการการลงทะเบียน
   * @param email อีเมลผู้ใช้
   * @param password รหัสผ่าน
   * @param captchaToken โทเค็น reCAPTCHA
   */
  const handleSignup = async (email: string, password: string, captchaToken: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('กำลังตรวจสอบโทเค็น reCAPTCHA...');
      
      // ตรวจสอบความถูกต้องของโทเค็น reCAPTCHA กับ API ของเรา
      const verifyResponse = await fetch('/api/auth/verify-recaptcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: captchaToken }),
      });
      
      const verifyData = await verifyResponse.json();
      
      if (!verifyResponse.ok || verifyData.error) {
        throw new Error(verifyData.error || 'การตรวจสอบ reCAPTCHA ล้มเหลว');
      }
      
      console.log('การตรวจสอบ reCAPTCHA สำเร็จ กำลังดำเนินการลงทะเบียน...');
      
      // เรียกใช้ API ลงทะเบียนของคุณ
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const signupData = await signupResponse.json();
      
      if (!signupResponse.ok || signupData.error) {
        throw new Error(signupData.error || signupData.message || 'การลงทะเบียนล้มเหลว');
      }
      
      // แสดงข้อความสำเร็จ
      setSuccess(true);
      
      // เปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบหรือแดชบอร์ดหลังจาก 2 วินาที
      setTimeout(() => {
        router.push('/login?signup=success');
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดระหว่างการลงทะเบียน');
      console.error('ข้อผิดพลาดในการลงทะเบียน:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            สร้างบัญชีผู้ใช้
          </h2>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">เกิดข้อผิดพลาด</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {success ? (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">ดำเนินการสำเร็จ</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>บัญชีของคุณถูกสร้างแล้ว กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <SignupButton onSignup={handleSignup} loading={loading} />
        )}
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            มีบัญชีผู้ใช้อยู่แล้ว?{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
        
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>การลงทะเบียนนี้มีการป้องกันโดย Google reCAPTCHA เพื่อตรวจสอบว่าคุณไม่ใช่โปรแกรมอัตโนมัติ</p>
        </div>
      </div>
    </div>
  );
}