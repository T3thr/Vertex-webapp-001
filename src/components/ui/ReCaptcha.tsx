// src/components/ui/ReCaptcha.tsx

"use client";

import { useEffect, useRef, useCallback } from 'react';

// ขยาย interface ของ Window เพื่อรวม grecaptcha
interface ReCaptchaWindow extends Window {
  grecaptcha?: {
    render: (container: HTMLElement, options: {
      sitekey: string;
      callback: string | ((token: string) => void);
      theme?: string;
      size?: string;
    }) => number;
    reset: (widgetId?: number) => void;
    getResponse: (widgetId?: number) => string;
  };
  onRecaptchaCallback?: (token: string) => void;
}

// อินเทอร์เฟซสำหรับ props ของคอมโพเนนต์
interface ReCaptchaProps {
  onVerify: (token: string | null) => void;
}

// คอมโพเนนต์ ReCaptcha - จัดการการโหลดและแสดง reCAPTCHA checkbox
export default function ReCaptcha({ onVerify }: ReCaptchaProps) {
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const isMountedRef = useRef(false);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // ฟังก์ชันโหลดสคริปต์ reCAPTCHA
  const loadRecaptchaScript = useCallback(() => {
    if (!document.querySelector('script[src="https://www.google.com/recaptcha/api.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        console.log('✅ สคริปต์ reCAPTCHA โหลดสำเร็จ');
      };

      script.onerror = () => {
        console.error('❌ ไม่สามารถโหลดสคริปต์ reCAPTCHA ได้');
        onVerify(null);
      };
    }
  }, [onVerify]);

  // ฟังก์ชัน callback เมื่อ reCAPTCHA สำเร็จ
  const handleRecaptchaCallback = useCallback((token: string) => {
    onVerify(token);
  }, [onVerify]);

  // ฟังก์ชันรีเซ็ต reCAPTCHA
  const resetRecaptcha = useCallback(() => {
    const win = window as ReCaptchaWindow;
    if (win.grecaptcha && widgetIdRef.current !== null) {
      win.grecaptcha.reset(widgetIdRef.current);
      onVerify(null);
      widgetIdRef.current = null;
    }
  }, [onVerify]);

  // โหลดสคริปต์และตั้งค่า reCAPTCHA
  useEffect(() => {
    if (!siteKey) {
      console.error('❌ ไม่พบ NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
      return;
    }

    if (isMountedRef.current) return; // ป้องกันการรันซ้ำเมื่อ component ยัง mount อยู่
    isMountedRef.current = true;

    loadRecaptchaScript();

    // ตั้งค่า callback ทั่วโลกสำหรับ reCAPTCHA
    const win = window as ReCaptchaWindow;
    win.onRecaptchaCallback = handleRecaptchaCallback;

    // แสดง reCAPTCHA เมื่อสคริปต์โหลดเสร็จ
    const renderRecaptcha = () => {
      if (win.grecaptcha && recaptchaRef.current && widgetIdRef.current === null) {
        try {
          const widgetId = win.grecaptcha.render(recaptchaRef.current, {
            sitekey: siteKey,
            callback: 'onRecaptchaCallback',
            theme: 'light',
            size: 'normal',
          });
          widgetIdRef.current = widgetId;
          console.log('✅ reCAPTCHA widget ถูกเรนเดอร์สำเร็จ');
        } catch (error) {
          console.error('❌ ข้อผิดพลาดในการเรนเดอร์ reCAPTCHA:', error);
        }
      }
    };

    // รอจนกว่าสคริปต์จะโหลดเสร็จ
    if (document.querySelector('script[src="https://www.google.com/recaptcha/api.js"]')) {
      renderRecaptcha();
    } else {
      const checkScript = setInterval(() => {
        if (win.grecaptcha) {
          renderRecaptcha();
          clearInterval(checkScript);
        }
      }, 100);
      return () => clearInterval(checkScript);
    }

    // Cleanup เมื่อคอมโพเนนต์ถูก unmount
    return () => {
      resetRecaptcha();
      delete win.onRecaptchaCallback;
      widgetIdRef.current = null;
      isMountedRef.current = false;
    };
  }, [siteKey, loadRecaptchaScript, handleRecaptchaCallback, resetRecaptcha]);

  if (!siteKey) {
    return <div className="text-red-500 text-sm text-center">ข้อผิดพลาด: ไม่พบคีย์ reCAPTCHA</div>;
  }

  return <div ref={recaptchaRef} className="g-recaptcha" />;
}