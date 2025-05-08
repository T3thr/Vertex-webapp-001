// src/components/ui/ReCaptcha.tsx

"use client";

import { useCallback, useEffect, useRef } from 'react';

// ขยาย interface ของ Window เพื่อรวม grecaptcha สำหรับ v2 Invisible
interface ReCaptchaWindow extends Window {
  grecaptcha?: {
    render: (container: HTMLElement | string, parameters: {
      sitekey: string;
      callback?: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      size: 'invisible';
      badge?: 'bottomright' | 'bottomleft' | 'inline'; // เพิ่มตัวเลือกตำแหน่ง badge
    }) => number;
    execute: (id: number) => void;
    reset: (id: number) => void;
    ready: (callback: () => void) => void; // เพิ่ม method ready
  };
}

// อินเทอร์เฟซสำหรับ props ของคอมโพเนนต์
interface ReCaptchaProps {
  onVerify: (token: string | null) => void;
  trigger: boolean; // ตัวแปรควบคุมการเรียกใช้ reCAPTCHA
  badge?: 'bottomright' | 'bottomleft' | 'inline'; // ตำแหน่งของ badge (optional)
}

// คอมโพเนนต์ ReCaptcha - จัดการ reCAPTCHA v2 Invisible
export default function ReCaptcha({ 
  onVerify, 
  trigger,
  badge = 'bottomright' // ค่าเริ่มต้นคือ bottomright
}: ReCaptchaProps) {
  const isMountedRef = useRef(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const isRenderedRef = useRef(false); // ติดตามสถานะการเรนเดอร์
  const scriptLoadedRef = useRef(false); // ติดตามสถานะการโหลดสคริปต์
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // ฟังก์ชันโหลดสคริปต์ reCAPTCHA v2
  const loadRecaptchaScript = useCallback(() => {
    if (
      !document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]') && 
      !scriptLoadedRef.current
    ) {
      scriptLoadedRef.current = true;
      
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?hl=th'; // เพิ่ม parameter ภาษาไทย
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        console.log('✅ สคริปต์ reCAPTCHA v2 Invisible โหลดสำเร็จ');
        
        // ใช้ grecaptcha.ready เพื่อให้แน่ใจว่า grecaptcha พร้อมใช้งาน
        const win = window as ReCaptchaWindow;
        if (win.grecaptcha && win.grecaptcha.ready) {
          win.grecaptcha.ready(() => {
            renderRecaptcha();
          });
        } else {
          // ถ้าไม่มี ready method ให้พยายามเรนเดอร์ตรงๆ
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
    // ตรวจสอบว่าเรนเดอร์แล้วหรือไม่
    if (isRenderedRef.current) {
      console.log('⚠️ reCAPTCHA ถูกเรนเดอร์แล้ว ข้ามการเรนเดอร์ซ้ำ');
      return;
    }

    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha || !siteKey || !recaptchaRef.current) {
      console.error('❌ grecaptcha, siteKey หรือ container ไม่พร้อมใช้งาน');
      onVerify(null);
      return;
    }

    try {
      // กำหนด callback สำหรับ reCAPTCHA
      const recaptchaCallback = (token: string) => {
        console.log('✅ ได้รับโทเค็น reCAPTCHA v2 Invisible');
        onVerify(token);
      };

      const recaptchaExpired = () => {
        console.log('⚠️ โทเค็น reCAPTCHA หมดอายุ');
        onVerify(null);
        if (widgetIdRef.current !== null) {
          win.grecaptcha?.reset(widgetIdRef.current);
        }
      };

      const recaptchaError = () => {
        console.error('❌ เกิดข้อผิดพลาดใน reCAPTCHA');
        onVerify(null);
      };

      // เรนเดอร์ reCAPTCHA v2 Invisible
      const widgetId = win.grecaptcha.render(recaptchaRef.current, {
        sitekey: siteKey,
        callback: recaptchaCallback,
        'expired-callback': recaptchaExpired,
        'error-callback': recaptchaError,
        size: 'invisible',
        badge: badge, // กำหนดตำแหน่งของ badge
      });

      widgetIdRef.current = widgetId;
      isRenderedRef.current = true; // ทำเครื่องหมายว่าเรนเดอร์แล้ว
      console.log('✅ reCAPTCHA v2 Invisible เรนเดอร์สำเร็จ');
    } catch (error) {
      console.error('❌ ข้อผิดพลาดในการเรนเดอร์ reCAPTCHA:', error);
      isRenderedRef.current = false; // รีเซ็ตสถานะเมื่อเกิดข้อผิดพลาด
      onVerify(null);
    }
  }, [siteKey, onVerify, badge]);

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
      console.error('❌ ไม่พบ NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
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
      isRenderedRef.current = false; // รีเซ็ตสถานะการเรนเดอร์
    };
  }, [siteKey, loadRecaptchaScript, onVerify]);

  // เรียกใช้ reCAPTCHA เมื่อ trigger เปลี่ยนเป็น true
  useEffect(() => {
    if (trigger && isRenderedRef.current && widgetIdRef.current !== null) {
      executeRecaptcha();
    } else if (trigger && !isRenderedRef.current) {
      // ถ้ายังไม่ได้เรนเดอร์ reCAPTCHA ให้พยายามเรนเดอร์ก่อน
      const win = window as ReCaptchaWindow;
      if (win.grecaptcha) {
        renderRecaptcha();
        // ลองเรียกใช้หลังจากเรนเดอร์
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

  if (!siteKey) {
    return <div className="text-red-500 text-sm text-center">ข้อผิดพลาด: ไม่พบคีย์ reCAPTCHA</div>;
  }

  // สร้าง container สำหรับ reCAPTCHA v2 Invisible
  return <div ref={recaptchaRef} className="g-recaptcha invisible" />;
}