// src/components/ui/ReCaptcha.tsx

"use client";

import { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiUserPlus } from 'react-icons/fi';
import { LoadingSpinner } from '@/components/layouts/AuthModal';

// ขยาย interface ของ Window เพื่อรวม grecaptcha สำหรับ v2 Invisible
interface ReCaptchaWindow extends Window {
  grecaptcha?: {
    render: (container: HTMLElement | string, parameters: {
      sitekey: string;
      callback?: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      size: 'invisible';
      badge?: 'bottomright' | 'bottomleft' | 'inline';
    }) => number;
    execute: (id: number) => void;
    reset: (id: number) => void;
    ready: (callback: () => void) => void;
  };
}

// อินเทอร์เฟซสำหรับ props ของคอมโพเนนต์
interface ReCaptchaProps {
  onVerify: (token: string | null) => void;
  trigger: boolean;
  badge?: 'bottomright' | 'bottomleft' | 'inline';
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsSuccess: (success: boolean) => void;
  setMode: (mode: 'signin' | 'signup') => void;
  signUp: (email: string, username: string, password: string, recaptchaToken: string) => Promise<{ error?: string }>;
  email: string;
  username: string;
  password: string;
}

// คอมโพเนนต์ ReCaptcha - จัดการ reCAPTCHA v2 Invisible และปุ่มส่งฟอร์มสมัครสมาชิก
export default function ReCaptcha({
  onVerify,
  trigger,
  badge = 'bottomright',
  isLoading,
  setIsLoading,
  setError,
  setIsSuccess,
  setMode,
  signUp,
  email,
  username,
  password,
}: ReCaptchaProps) {
  const isMountedRef = useRef(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const isRenderedRef = useRef(false);
  const scriptLoadedRef = useRef(false);
  const recaptchaTokenRef = useRef<string | null>(null);
  
  // ใช้ค่า SITE KEY จาก environment variable แทนการฮาร์ดโค้ด
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  // ฟังก์ชันโหลดสคริปต์ reCAPTCHA v2
  const loadRecaptchaScript = useCallback(() => {
    if (
      !document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]') &&
      !scriptLoadedRef.current
    ) {
      scriptLoadedRef.current = true;

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?hl=th&render=explicit`;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        console.log('✅ สคริปต์ reCAPTCHA v2 Invisible โหลดสำเร็จ');
        const win = window as ReCaptchaWindow;
        if (win.grecaptcha && win.grecaptcha.ready) {
          win.grecaptcha.ready(() => {
            renderRecaptcha();
          });
        } else {
          setTimeout(renderRecaptcha, 500);
        }
      };

      script.onerror = () => {
        console.error('❌ ไม่สามารถโหลดสคริปต์ reCAPTCHA v2 Invisible ได้');
        scriptLoadedRef.current = false;
        onVerify(null);
      };
    }
  }, [onVerify]);

  // ฟังก์ชันเรนเดอร์และจัดการ reCAPTCHA
  const renderRecaptcha = useCallback(() => {
    if (isRenderedRef.current) {
      console.log('⚠️ reCAPTCHA ถูกเรนเดอร์แล้ว ข้ามการเรนเดอร์ซ้ำ');
      return;
    }

    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha || !siteKey || !recaptchaRef.current) {
      console.error('❌ grecaptcha, siteKey หรือ container ไม่พร้อมใช้งาน');
      if (!siteKey) {
        console.error('❌ กรุณาตั้งค่า NEXT_PUBLIC_RECAPTCHA_SITE_KEY ใน .env ของคุณ');
        setError('การตั้งค่า reCAPTCHA ไม่ถูกต้อง');
      }
      onVerify(null);
      return;
    }

    try {
      const recaptchaCallback = (token: string) => {
        console.log('✅ ได้รับโทเค็น reCAPTCHA v2 Invisible');
        recaptchaTokenRef.current = token;
        onVerify(token);
      };

      const recaptchaExpired = () => {
        console.log('⚠️ โทเค็น reCAPTCHA หมดอายุ');
        recaptchaTokenRef.current = null;
        onVerify(null);
        if (widgetIdRef.current !== null) {
          win.grecaptcha?.reset(widgetIdRef.current);
        }
      };

      const recaptchaError = () => {
        console.error('❌ เกิดข้อผิดพลาดใน reCAPTCHA');
        recaptchaTokenRef.current = null;
        onVerify(null);
      };

      // เรนเดอร์ reCAPTCHA v2 Invisible
      const widgetId = win.grecaptcha.render(recaptchaRef.current, {
        sitekey: siteKey,
        callback: recaptchaCallback,
        'expired-callback': recaptchaExpired,
        'error-callback': recaptchaError,
        size: 'invisible',
        badge: badge,
      });

      widgetIdRef.current = widgetId;
      isRenderedRef.current = true;
      console.log('✅ reCAPTCHA v2 Invisible เรนเดอร์สำเร็จ');
    } catch (error) {
      console.error('❌ ข้อผิดพลาดในการเรนเดอร์ reCAPTCHA:', error);
      isRenderedRef.current = false;
      onVerify(null);
    }
  }, [siteKey, onVerify, badge, setError]);

  // ฟังก์ชันเรียกใช้ reCAPTCHA
  const executeRecaptcha = useCallback(() => {
    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha || widgetIdRef.current === null) {
      console.error('❌ grecaptcha หรือ widget ID ไม่พร้อมใช้งาน');
      onVerify(null);
      return;
    }

    try {
      win.grecaptcha.execute(widgetIdRef.current);
      console.log('🚀 เรียกใช้ reCAPTCHA v2 Invisible');
    } catch (error) {
      console.error('❌ ข้อผิดพลาดในการเรียกใช้ reCAPTCHA:', error);
      onVerify(null);
    }
  }, [onVerify]);

  // โหลดสคริปต์และตั้งค่า reCAPTCHA เมื่อคอมโพเนนต์ mount
  useEffect(() => {
    if (!siteKey) {
      console.error('❌ ไม่พบ NEXT_PUBLIC_RECAPTCHA_SITE_KEY ใน environment variables');
      setError('การตั้งค่า reCAPTCHA ไม่ถูกต้อง กรุณาตรวจสอบการตั้งค่า');
      onVerify(null);
      return;
    }

    if (isMountedRef.current) return;
    isMountedRef.current = true;

    loadRecaptchaScript();

    // Cleanup เมื่อคอมโพเนนต์ unmount
    return () => {
      if (widgetIdRef.current !== null) {
        const win = window as ReCaptchaWindow;
        try {
          win.grecaptcha?.reset(widgetIdRef.current);
        } catch (error) {
          console.error('❌ ไม่สามารถรีเซ็ต reCAPTCHA ได้:', error);
        }
        widgetIdRef.current = null;
      }
      isMountedRef.current = false;
      isRenderedRef.current = false;
    };
  }, [siteKey, loadRecaptchaScript, onVerify, setError]);

  // เรียกใช้ reCAPTCHA เมื่อ trigger เปลี่ยนเป็น true
  useEffect(() => {
    if (trigger && isRenderedRef.current && widgetIdRef.current !== null) {
      executeRecaptcha();
    } else if (trigger && !isRenderedRef.current) {
      const win = window as ReCaptchaWindow;
      if (win.grecaptcha) {
        renderRecaptcha();
        setTimeout(() => {
          if (isRenderedRef.current && widgetIdRef.current !== null) {
            executeRecaptcha();
          } else {
            console.error('❌ ไม่สามารถเรียกใช้ reCAPTCHA หลังพยายามเรนเดอร์');
            onVerify(null);
          }
        }, 500);
      } else {
        console.error('❌ grecaptcha ยังไม่พร้อมใช้งาน');
        onVerify(null);
      }
    }
  }, [trigger, executeRecaptcha, renderRecaptcha, onVerify]);

  // จัดการการยืนยัน reCAPTCHA และสมัครสมาชิก
  useEffect(() => {
    if (recaptchaTokenRef.current && isLoading) {
      const verifyAndSignUp = async () => {
        try {
          // ตรวจสอบ reCAPTCHA token
          const recaptchaResponse = await fetch('/api/auth/verify-recaptcha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: recaptchaTokenRef.current }),
          });

          const recaptchaData = await recaptchaResponse.json();

          if (!recaptchaResponse.ok || !recaptchaData.success) {
            const errorMsg = recaptchaData.error || 'การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่';
            setError(errorMsg);
            setIsLoading(false);
            return;
          }

          // สมัครสมาชิกด้วยข้อมูลประจำตัว
          const result = await signUp(email, username, password, recaptchaTokenRef.current!);
          if (result.error) {
            setError(result.error);
          } else {
            setIsSuccess(true);
            setTimeout(() => {
              setMode('signin');
            }, 1500);
          }
        } catch (err: any) {
          setError('เกิดข้อผิดพลาดที่ไม่คาดคิด');
          console.error('❌ ข้อผิดพลาดในการตรวจสอบ:', err);
        } finally {
          setIsLoading(false);
          // รีเซ็ต token เพื่อหลีกเลี่ยงการใช้ซ้ำ
          if (widgetIdRef.current !== null) {
            try {
              const win = window as ReCaptchaWindow;
              win.grecaptcha?.reset(widgetIdRef.current);
            } catch (error) {
              console.error('❌ ไม่สามารถรีเซ็ต reCAPTCHA หลังใช้งาน:', error);
            }
          }
          recaptchaTokenRef.current = null;
        }
      };

      verifyAndSignUp();
    } else if (recaptchaTokenRef.current === null && isLoading && !trigger) {
      // ถ้าไม่ได้รับ token และไม่ได้กำลังพยายามเรียกใช้ reCAPTCHA
      setError('การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่');
      setIsLoading(false);
    }
  }, [recaptchaTokenRef.current, isLoading, trigger, email, username, password, signUp, setError, setIsSuccess, setMode]);

  // ฟังก์ชันจัดการการส่งฟอร์มสมัครสมาชิก
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    // เรียกใช้ reCAPTCHA
    onVerify(null); // รีเซ็ต token ก่อน
    setTimeout(() => {
      executeRecaptcha();
    }, 100);
  };

  if (!siteKey) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-red-500 text-sm text-center"
      >
        ข้อผิดพลาด: ไม่พบคีย์ reCAPTCHA ใน environment variables
      </motion.div>
    );
  }

  // สร้าง container สำหรับ reCAPTCHA v2 Invisible และปุ่มสมัครสมาชิก
  return (
    <div className="space-y-4">
      <div ref={recaptchaRef} className="g-recaptcha" data-size="invisible" />
      {/* ปุ่มส่งฟอร์มสมัครสมาชิก */}
      <motion.button
        type="submit"
        onClick={handleSignupSubmit}
        disabled={isLoading}
        className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-lg flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-3 hover:scale-[1.01]"
        aria-label="สร้างบัญชี"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <>
            <LoadingSpinner size="sm" color="currentColor" />
            <span>กำลังดำเนินการ...</span>
          </>
        ) : (
          <>
            <FiUserPlus size={20} />
            <span className="text-lg">สร้างบัญชี</span>
          </>
        )}
      </motion.button>
      <div className="text-center text-xs text-muted-foreground">
        หน้านี้ได้รับการป้องกันโดย Google reCAPTCHA เพื่อยืนยันว่าคุณไม่ใช่บอท
        <br />
        <a 
          href="https://policies.google.com/privacy" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="underline hover:text-primary"
        >
          นโยบายความเป็นส่วนตัว
        </a>{' '}
        และ{' '}
        <a 
          href="https://policies.google.com/terms" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="underline hover:text-primary"
        >
          ข้อกำหนดการใช้งาน
        </a>{' '}
        ของ Google มีผลบังคับใช้
      </div>
    </div>
  );
}