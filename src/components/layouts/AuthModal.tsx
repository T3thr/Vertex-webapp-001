// src/components/layouts/AuthModal.tsx
// คอมโพเนนต์สำหรับหน้าต่างการยืนยันตัวตน (ลงชื่อเข้าใช้และสมัครสมาชิก)
// รองรับการลงชื่อเข้าใช้ด้วย credentials และโซเชียลมีเดีย รวมถึงการสมัครสมาชิกด้วย reCAPTCHA

"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext'; // ตรวจสอบ path
import { validateEmail, validatePassword, validateUsername, validateConfirmPassword } from '@/backend/utils/validation'; // ตรวจสอบ path
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX,
  FiLogIn,
  FiMail,
  FiLock,
  FiUser,
  FiArrowLeft,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiAlertCircle,
  FiUserPlus
} from 'react-icons/fi';
import {
  FaFacebook,
  FaGoogle,
  FaTwitter,
  FaApple
} from 'react-icons/fa';
import { SiLine } from 'react-icons/si';

// ขยาย interface ของ Window เพื่อรวม grecaptcha สำหรับ v2 Invisible (ใช้เฉพาะในโหมดสมัครสมาชิก)
interface ReCaptchaWindow extends Window {
  grecaptcha?: {
    render: (container: HTMLElement | string, parameters: {
      sitekey: string;
      callback?: (token: string) => void; // Callback เมื่อ reCAPTCHA สำเร็จ
      'expired-callback'?: () => void; // Callback เมื่อ token หมดอายุ
      'error-callback'?: () => void; // Callback เมื่อเกิดข้อผิดพลาด
      size: 'invisible'; // reCAPTCHA แบบ Invisible
      badge?: 'bottomright' | 'bottomleft' | 'inline'; // ตำแหน่ง badge
    }) => number; // คืนค่า widget ID
    execute: (widgetId: number) => void; // สั่งให้ reCAPTCHA ทำงาน
    reset: (widgetId: number) => void; // รีเซ็ต reCAPTCHA
    ready: (callback: () => void) => void; // Callback เมื่อ reCAPTCHA พร้อมใช้งาน
  };
}

// ค่าคงที่สำหรับจำกัดจำนวนครั้งที่พยายาม reCAPTCHA
const MAX_RECAPTCHA_ATTEMPTS = 3;

// LoadingSpinner Component - คอมโพเนนต์แสดงการโหลด
export const LoadingSpinner = ({ size = "md", color = "currentColor" }: { size?: "sm" | "md" | "lg", color?: string }) => {
  const sizeClass = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <div className={`${sizeClass[size]} animate-spin`}>
      <div className={`h-full w-full border-2 border-b-transparent rounded-full`}
           style={{ borderColor: `${color} transparent ${color} ${color}` }} />
    </div>
  );
};

// Input Field Component - คอมโพเนนต์ช่องกรอกข้อมูล
interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: React.ReactNode;
  required?: boolean;
  minLength?: number;
  helpText?: string;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  toggleShowPassword?: () => void;
  error?: string | null;
  touched?: boolean;
  onBlur?: () => void;
}

const InputField = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  icon,
  required = false,
  minLength,
  helpText,
  showPasswordToggle = false,
  showPassword,
  toggleShowPassword,
  error = null,
  touched = false,
  onBlur,
}: InputFieldProps) => {
  const hasError = touched && error; // แสดง error เมื่อ touched และมี error

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="block text-sm font-medium text-card-foreground pl-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {hasError && ( // แสดงข้อความ error ถ้ามี
          <span className="text-xs text-red-500 font-medium flex items-center gap-1">
            <FiAlertCircle size={12} />
            {error}
          </span>
        )}
      </div>
      <div className="relative">
        <div className={`absolute inset-y-0 left-0 flex items-center pl-4 ${hasError ? 'text-red-500' : 'text-muted-foreground'}`}>
          {icon}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur} // จัดการเมื่อ focus ออกจาก input
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className={`w-full py-3.5 pl-12 pr-12 bg-secondary/50 text-secondary-foreground rounded-xl transition-all duration-200
            text-base placeholder:text-muted-foreground/60 placeholder:font-light shadow-sm focus:ring-3
            ${hasError
              ? 'border border-red-500 focus:border-red-500 focus:ring-red-500/20' // สไตล์เมื่อมี error
              : 'border border-accent focus:border-primary focus:ring-primary/20'}`} // สไตล์ปกติ
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
        {showPasswordToggle && toggleShowPassword && ( // ปุ่มแสดง/ซ่อนรหัสผ่าน
          <button
            type="button"
            onClick={toggleShowPassword}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground transition-colors duration-200"
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          >
            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        )}
      </div>
      {helpText && !hasError && ( // แสดงข้อความช่วยเหลือถ้ามี และไม่มี error
        <p className="text-xs text-muted-foreground mt-1 pl-1">{helpText}</p>
      )}
    </div>
  );
};

// Social Login Button Component - คอมโพเนนต์ปุ่มลงชื่อเข้าใช้ผ่านโซเชียลมีเดีย
interface SocialButtonProps {
  provider: 'google' | 'facebook' | 'twitter' | 'apple' | 'line';
  icon: React.ReactNode;
  label?: string;
  onClick: () => void;
  disabled: boolean;
  className?: string;
}

const SocialButton = ({ provider, icon, label, onClick, disabled, className }: SocialButtonProps) => {
  const baseClasses = "flex items-center justify-center gap-3 p-4 rounded-xl focus:outline-none focus:ring-3 focus:ring-primary/30 transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm font-medium shadow-md";

  // สไตล์เฉพาะของแต่ละ provider
  const providerStyles: Record<string, string> = {
    google: "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200",
    facebook: "bg-[#1877F2] hover:bg-[#166FE5] text-white",
    twitter: "bg-[#1DA1F2] hover:bg-[#1A91DA] text-white",
    apple: "bg-black hover:bg-gray-900 text-white",
    line: "bg-[#06C755] hover:bg-[#05B34E] text-white"
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${providerStyles[provider]} ${className || ''}`}
      aria-label={`ลงชื่อเข้าใช้ด้วย ${provider}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="truncate">{label || provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
    </button>
  );
};

// Alert Component - คอมโพเนนต์แจ้งเตือน
interface AlertProps {
  type: 'error' | 'success';
  message: string;
}

const Alert = ({ type, message }: AlertProps) => {
  // สไตล์สำหรับการแจ้งเตือนแต่ละประเภท
  const styles = {
    error: {
      bg: 'bg-red-100 dark:bg-red-900/30', // ปรับสีพื้นหลังให้เข้ากับ Tailwind 4 และ Dark mode
      border: 'border-red-400 dark:border-red-600',
      text: 'text-red-700 dark:text-red-300',
      icon: <FiAlertCircle size={20} className="mt-0.5 flex-shrink-0" />,
    },
    success: {
      bg: 'bg-green-100 dark:bg-green-900/30', // ปรับสีพื้นหลังให้เข้ากับ Tailwind 4 และ Dark mode
      border: 'border-green-400 dark:border-green-600',
      text: 'text-green-700 dark:text-green-300',
      icon: <FiCheck size={20} className="mt-0.5 flex-shrink-0" />,
    },
  };

  return (
    <div
      className={`p-4 ${styles[type].bg} border ${styles[type].border} rounded-xl flex items-start gap-3 ${styles[type].text} text-sm animate-slideIn shadow-md`}
    >
      {styles[type].icon}
      <p>{message}</p>
    </div>
  );
};


// Main AuthModal Component - คอมโพเนนต์หลักสำหรับหน้าต่างการเข้าสู่ระบบ
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup'; // โหมด: ลงชื่อเข้าใช้ หรือ สมัครสมาชิก
type ValidationErrors = { // ประเภทสำหรับข้อผิดพลาดในการตรวจสอบความถูกต้อง
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  // สถานะของฟอร์ม
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null); // ข้อความ error ทั่วไป
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // ข้อความสำเร็จ
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({}); // ข้อผิดพลาดจากการ validate input
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({}); // field ที่ถูก touch แล้ว
  const [isLoading, setIsLoading] = useState(false); // สถานะกำลังโหลด

  // reCAPTCHA สถานะและ refs (ใช้เฉพาะในโหมดสมัครสมาชิก)
  const recaptchaRef = useRef<HTMLDivElement>(null); // Ref สำหรับ reCAPTCHA container
  const widgetIdRef = useRef<number | null>(null); // Ref สำหรับ reCAPTCHA widget ID
  const isRecaptchaRenderedRef = useRef(false); // Ref เพื่อตรวจสอบว่า reCAPTCHA ถูก render แล้วหรือยัง
  const recaptchaTokenRef = useRef<string | null>(null); // Ref สำหรับ reCAPTCHA token
  const [recaptchaAttempts, setRecaptchaAttempts] = useState(0); // จำนวนครั้งที่พยายาม reCAPTCHA

  // ใช้ค่า SITE KEY จาก environment variable
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  // Refs
  const modalRef = useRef<HTMLDivElement>(null); // Ref สำหรับ modal element
  const emailInputRef = useRef<HTMLInputElement>(null); // Ref สำหรับ email input (สำหรับ focus)

  // Context
  const { signUp: authContextSignUp, signInWithCredentials, signInWithSocial } = useAuth(); // เปลี่ยนชื่อ signUp เพื่อไม่ให้ชนกับตัวแปรภายใน

  // ฟังก์ชันโหลดสคริปต์ reCAPTCHA (เฉพาะโหมดสมัครสมาชิก และเมื่อ modal เปิด)
  const loadRecaptchaScript = useCallback(() => {
    const win = window as ReCaptchaWindow;
    if (win.grecaptcha && win.grecaptcha.ready) {
      win.grecaptcha.ready(() => {
        renderRecaptcha();
      });
    } else {
      // รอสคริปต์โหลด (กรณีที่ script ใน layout.tsx ยังไม่พร้อม)
      const intervalId = setInterval(() => {
        if (win.grecaptcha && win.grecaptcha.ready) {
          clearInterval(intervalId);
          win.grecaptcha.ready(() => {
            renderRecaptcha();
          });
        }
      }, 200);
    }
  }, []); // Dependencies ของ useCallback


  // ฟังก์ชันเรนเดอร์ reCAPTCHA (เฉพาะโหมดสมัครสมาชิก)
  const renderRecaptcha = useCallback(() => {
    if (isRecaptchaRenderedRef.current || !recaptchaRef.current) {
      // console.log('ℹ️ reCAPTCHA ถูกเรนเดอร์แล้ว หรือ ref ไม่พร้อมใช้งาน');
      return;
    }

    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha || !siteKey) {
      console.error('❌ [AuthModal] grecaptcha หรือ siteKey ไม่พร้อมใช้งานสำหรับการเรนเดอร์');
      setError('การตั้งค่า reCAPTCHA ไม่ถูกต้อง โปรดติดต่อผู้ดูแล');
      setIsLoading(false);
      return;
    }

    try {
      // Callback เมื่อ reCAPTCHA สำเร็จ ได้รับ token
      const onRecaptchaSuccess = (token: string) => {
        console.log('✅ [AuthModal] ได้รับโทเค็น reCAPTCHA v2 Invisible:', token.substring(0, 30) + "...");
        recaptchaTokenRef.current = token;
        // Flow เดิมคือ verify token ก่อน แล้วค่อย signup
        // แต่ตาม user request คือ AuthModal เรียก /api/verify-recaptcha ก่อน
        // แล้วถ้าสำเร็จ ค่อยเรียก /api/auth/signup
        // ซึ่ง AuthContext.signUp จะเรียก /api/auth/signup และส่ง token ไปด้วย
        // ดังนั้น /api/auth/signup จะเป็นผู้ verify token กับ Google อีกครั้ง (ซึ่งดี)
        // ที่นี่ เราจะเรียก handleSignupAfterRecaptchaVerified เพื่อดำเนินการต่อ
        handleSignupAfterRecaptchaVerified(token);

      };

      // Callback เมื่อ token หมดอายุ
      const onRecaptchaExpired = () => {
        console.warn('⚠️ [AuthModal] โทเค็น reCAPTCHA หมดอายุ');
        recaptchaTokenRef.current = null;
        setError('โทเค็น reCAPTCHA หมดอายุ กรุณาลองใหม่อีกครั้ง');
        setIsLoading(false);
        setRecaptchaAttempts(prev => prev + 1);
        if (widgetIdRef.current !== null) win.grecaptcha?.reset(widgetIdRef.current);
      };

      // Callback เมื่อเกิดข้อผิดพลาดจาก reCAPTCHA
      const onRecaptchaError = () => {
        console.error('❌ [AuthModal] เกิดข้อผิดพลาดในการทำงานของ reCAPTCHA');
        recaptchaTokenRef.current = null;
        setError('การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่อีกครั้ง');
        setIsLoading(false);
        setRecaptchaAttempts(prev => prev + 1);
        if (widgetIdRef.current !== null) win.grecaptcha?.reset(widgetIdRef.current);
      };

      // เรนเดอร์ reCAPTCHA v2 Invisible
      console.log('🔄 [AuthModal] กำลังเรนเดอร์ reCAPTCHA v2 Invisible...');
      const widgetId = win.grecaptcha.render(recaptchaRef.current, {
        sitekey: siteKey,
        callback: onRecaptchaSuccess,
        'expired-callback': onRecaptchaExpired,
        'error-callback': onRecaptchaError,
        size: 'invisible', // สำคัญมากสำหรับ Invisible reCAPTCHA
        badge: 'bottomright', // หรือ 'bottomleft', 'inline'
      });

      widgetIdRef.current = widgetId;
      isRecaptchaRenderedRef.current = true; // ตั้งค่าว่า render แล้ว
      console.log('✅ [AuthModal] reCAPTCHA v2 Invisible เรนเดอร์สำเร็จ, Widget ID:', widgetId);
    } catch (e) {
      console.error('❌ [AuthModal] ข้อผิดพลาดระหว่างการเรนเดอร์ reCAPTCHA:', e);
      isRecaptchaRenderedRef.current = false;
      setError('เกิดข้อผิดพลาดในการตั้งค่า reCAPTCHA โปรดลองรีเฟรชหน้า');
      setIsLoading(false);
    }
  }, [siteKey]); // Dependencies

  // ฟังก์ชันเรียก execute reCAPTCHA
  const executeRecaptcha = useCallback(() => {
    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha || widgetIdRef.current === null || !isRecaptchaRenderedRef.current) {
      console.error('❌ [AuthModal] grecaptcha, widget ID ไม่พร้อม หรือยังไม่ได้เรนเดอร์ reCAPTCHA');
      setError('ไม่สามารถเรียกใช้ reCAPTCHA ได้ กรุณารีเฟรชหน้าและลองใหม่');
      setIsLoading(false);
      // อาจจะต้องลอง render ใหม่ถ้ายังไม่ render
      if (!isRecaptchaRenderedRef.current) {
        console.log("🔄 [AuthModal] พยายามเรนเดอร์ reCAPTCHA อีกครั้งก่อน execute...");
        renderRecaptcha(); // ลอง render อีกครั้ง
        // หลังจาก render แล้ว อาจจะต้องรอสักครู่ก่อน execute
        // แต่ปกติ execute ควรถูกเรียกหลังจาก render เสร็จสมบูรณ์และ user action
      }
      return;
    }

    try {
      console.log(`🚀 [AuthModal] กำลังเรียกใช้ reCAPTCHA v2 Invisible (Widget ID: ${widgetIdRef.current})...`);
      win.grecaptcha.execute(widgetIdRef.current);
    } catch (error) {
      console.error('❌ [AuthModal] ข้อผิดพลาดในการเรียกใช้ (execute) reCAPTCHA:', error);
      setError('เกิดข้อผิดพลาดในการเริ่มต้นการยืนยัน reCAPTCHA');
      setIsLoading(false);
    }
  }, [renderRecaptcha]); // Dependency

  // ฟังก์ชันจัดการการสมัครสมาชิกหลังจาก client-side reCAPTCHA สำเร็จและได้ token มาแล้ว
  // ซึ่งจะถูกเรียกจาก callback ของ reCAPTCHA
  const handleSignupAfterRecaptchaVerified = useCallback(async (recaptchaClientToken: string) => {
    console.log('🔄 [AuthModal] เริ่มกระบวนการสมัครสมาชิกหลังจาก reCAPTCHA client-side สำเร็จ...');
    setError(null); // ล้าง error เก่า
    setSuccessMessage(null); // ล้าง success message เก่า
    setIsLoading(true); // เริ่ม loading

    if (recaptchaAttempts >= MAX_RECAPTCHA_ATTEMPTS) {
      console.warn('❌ [AuthModal] ถึงจำนวนครั้งสูงสุดที่อนุญาตสำหรับการยืนยัน reCAPTCHA');
      setError('คุณได้พยายามยืนยันตัวตนหลายครั้งเกินไป กรุณาลองใหม่ในภายหลัง');
      setIsLoading(false);
      return;
    }

    try {
      // ขั้นตอนที่ 5 และ 6: AuthModal.tsx เรียก API /api/verify-recaptcha เพื่อให้ server ยืนยัน token กับ Google
      console.log('🔄 [AuthModal] กำลังส่งโทเค็น reCAPTCHA ไปยัง /api/verify-recaptcha เพื่อการยืนยันฝั่งเซิร์ฟเวอร์...');
      const verifyResponse = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: recaptchaClientToken }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.success) {
        console.error(`❌ [AuthModal] การยืนยัน reCAPTCHA ฝั่งเซิร์ฟเวอร์ผ่าน /api/verify-recaptcha ล้มเหลว: ${verifyData.error || 'ข้อผิดพลาดที่ไม่รู้จัก'}`);
        setError(verifyData.error || 'การยืนยันตัวตน reCAPTCHA ล้มเหลว กรุณาลองใหม่อีกครั้ง');
        setIsLoading(false);
        setRecaptchaAttempts(prev => prev + 1);
        // รีเซ็ต reCAPTCHA widget
        const win = window as ReCaptchaWindow;
        if (widgetIdRef.current !== null) win.grecaptcha?.reset(widgetIdRef.current);
        return;
      }

      console.log('✅ [AuthModal] การยืนยัน reCAPTCHA ฝั่งเซิร์ฟเวอร์ผ่าน /api/verify-recaptcha สำเร็จ');
      console.log('✅ การยืนยัน reCAPTCHA สำเร็จ, เริ่มสมัครสมาชิก'); // Log ที่ผู้ใช้ให้มา

      // ขั้นตอนที่ 7: หากการยืนยัน reCAPTCHA สำเร็จ, AuthModal.tsx (ผ่าน AuthContext) จะเรียก /api/auth/signup
      // โดยส่งข้อมูล (email, username, password) และ recaptchaToken (ที่ได้จาก client-side)
      // ซึ่ง /api/auth/signup จะทำการ verify token นี้กับ Google *อีกครั้ง* (เป็นการป้องกันที่ดี)
      const signupResult = await authContextSignUp(email, username, password, recaptchaClientToken);

      if (signupResult.error) {
        console.error(`❌ [AuthModal] ข้อผิดพลาดจากการสมัครสมาชิก: ${signupResult.error}`);
        setError(signupResult.error);
      } else {
        console.log('✅ [AuthModal] การสมัครสมาชิกสำเร็จ!');
        setSuccessMessage(signupResult.message || "สร้างบัญชีสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี");
        // Reset form fields and switch to signin mode or close modal
        setTimeout(() => {
          setMode('signin'); // หรือ onClose();
          // Reset fields
          setEmail('');
          setUsername('');
          setPassword('');
          setConfirmPassword('');
          setValidationErrors({});
          setTouchedFields({});
          setSuccessMessage(null); // Clear success message
        }, 3000); // หน่วงเวลาเพื่อให้ผู้ใช้เห็นข้อความ
      }
    } catch (err: any) {
      console.error('❌ [AuthModal] ข้อผิดพลาดที่ไม่คาดคิดในกระบวนการสมัครสมาชิก:', err);
      setError(err.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false); // สิ้นสุด loading
      // รีเซ็ต reCAPTCHA widget ไม่ว่าจะสำเร็จหรือล้มเหลว เพื่อให้พร้อมสำหรับครั้งถัดไป
      const win = window as ReCaptchaWindow;
      if (widgetIdRef.current !== null) {
        try {
            win.grecaptcha?.reset(widgetIdRef.current);
        } catch(e) {
            console.error("❌ [AuthModal] ไม่สามารถรีเซ็ต reCAPTCHA widget:", e);
        }
      }
      recaptchaTokenRef.current = null; // ล้าง token ที่เก็บไว้
    }
  }, [email, username, password, authContextSignUp, recaptchaAttempts, siteKey]); // Dependencies

  // ฟังก์ชันสำหรับตรวจสอบการป้อนข้อมูลแบบ realtime
  const validateField = useCallback((field: keyof ValidationErrors, value: string): string | undefined => {
    if (field === 'email') {
      if (!value.trim()) return 'กรุณาระบุอีเมล';
      if (!validateEmail(value)) return 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    if (mode === 'signup') { // Validate username, password, confirmPassword only in signup mode
        if (field === 'username') {
            if (!value.trim()) return 'กรุณาระบุชื่อผู้ใช้';
            const usernameVal = validateUsername(value);
            if (!usernameVal.valid) return usernameVal.message || 'ชื่อผู้ใช้ไม่ถูกต้อง';
        }
        if (field === 'password') {
            if (!value.trim()) return 'กรุณาระบุรหัสผ่าน';
            const passwordVal = validatePassword(value);
            if (!passwordVal.valid) return passwordVal.message || 'รหัสผ่านไม่ถูกต้อง';
        }
        if (field === 'confirmPassword') {
            if (!value.trim()) return 'กรุณายืนยันรหัสผ่าน';
            const confirmVal = validateConfirmPassword(password, value); // `password` คือ state ปัจจุบัน
            if (!confirmVal.valid) return confirmVal.message || 'รหัสผ่านไม่ตรงกัน';
        }
    } else if (mode === 'signin' && field === 'password') { // Simple password check for signin
        if (!value.trim()) return 'กรุณาระบุรหัสผ่าน';
    }
    return undefined;
  }, [mode, password]); // `mode` และ `password` เป็น dependencies เพราะ validation rules อาจเปลี่ยนตาม mode และ confirmPassword ขึ้นกับ password


  // ตรวจสอบความถูกต้องของฟอร์มทั้งหมด
  const validateForm = useCallback((): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    const emailError = validateField('email', email);
    if (emailError) newErrors.email = emailError;

    if (mode === 'signup') {
      const usernameError = validateField('username', username);
      if (usernameError) newErrors.username = usernameError;
      const passwordError = validateField('password', password);
      if (passwordError) newErrors.password = passwordError;
      const confirmPasswordError = validateField('confirmPassword', confirmPassword);
      if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
    } else { // Signin mode
      const passwordError = validateField('password', password);
      if (passwordError) newErrors.password = passwordError;
    }
    return newErrors;
  }, [email, username, password, confirmPassword, mode, validateField]);

  // ฟังก์ชันตรวจสอบฟอร์มแบบ realtime เมื่อมีการเปลี่ยนแปลงค่า
  useEffect(() => {
    const updateValidation = () => {
      if (Object.keys(touchedFields).length > 0) { // Validate only if some fields were touched
        const formErrors = validateForm();
        setValidationErrors(formErrors);
      }
    };
    const debouncedValidation = setTimeout(updateValidation, 300); // Debounce validation
    return () => clearTimeout(debouncedValidation);
  }, [email, username, password, confirmPassword, touchedFields, validateForm]);


  // ฟังก์ชันเมื่อผู้ใช้ออกจากฟิลด์ (blur)
  const handleBlur = (field: keyof ValidationErrors) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    // Trigger validation for the specific field that was blurred
    let value = '';
    if (field === 'email') value = email;
    else if (field === 'username') value = username;
    else if (field === 'password') value = password;
    else if (field === 'confirmPassword') value = confirmPassword;

    const fieldError = validateField(field, value);
    setValidationErrors(prev => ({ ...prev, [field]: fieldError }));
  };

  // Handle input changes and perform live validation if field was touched
  const handleInputChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    field: keyof ValidationErrors
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setter(value);
    if (touchedFields[field]) { // Only validate if field has been touched
      const fieldError = validateField(field, value);
      setValidationErrors(prev => ({ ...prev, [field]: fieldError }));
    }
    // If password changes, re-validate confirmPassword if it's touched
    if (field === 'password' && touchedFields.confirmPassword) {
        const confirmError = validateField('confirmPassword', confirmPassword);
        setValidationErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };


  // Handle click outside to close - จัดการคลิกภายนอกเพื่อปิดหน้าต่าง
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // ป้องกันการ scroll ด้านหลัง
      setTimeout(() => emailInputRef.current?.focus(), 100); // Focus ที่ email input
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = ''; // คืนค่าการ scroll
    };
  }, [isOpen, onClose]);

  // Reset form and reCAPTCHA when modal opens/closes or mode changes
  useEffect(() => {
    // รีเซ็ต state ทั้งหมดเมื่อ modal เปิด, ปิด หรือเปลี่ยนโหมด
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
    setValidationErrors({});
    setTouchedFields({});
    setIsLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRecaptchaAttempts(0);
    recaptchaTokenRef.current = null;

    const win = window as ReCaptchaWindow;
    // รีเซ็ต reCAPTCHA widget ที่มีอยู่ถ้ามี
    if (widgetIdRef.current !== null && win.grecaptcha) {
      try {
        win.grecaptcha.reset(widgetIdRef.current);
        console.log('ℹ️ [AuthModal] reCAPTCHA widget ถูกรีเซ็ต (on mode change/close)');
      } catch (e) {
        console.error('❌ [AuthModal] ไม่สามารถรีเซ็ต reCAPTCHA widget:', e);
      }
    }
    isRecaptchaRenderedRef.current = false; // ตั้งค่าว่ายังไม่ได้ render ใหม่
    widgetIdRef.current = null; // ล้าง widget ID

    // โหลดและเรนเดอร์ reCAPTCHA เฉพาะในโหมดสมัครสมาชิกและเมื่อ modal เปิด
    if (isOpen && mode === 'signup') {
        console.log('🔄 [AuthModal] Modal เปิดในโหมด signup, กำลังโหลด/เรนเดอร์ reCAPTCHA...');
        loadRecaptchaScript(); // ซึ่งจะเรียก renderRecaptcha ภายใน
    }

    // Cleanup function: จะถูกเรียกเมื่อ component unmount หรือ dependencies (isOpen, mode) เปลี่ยน
    return () => {
      const win = window as ReCaptchaWindow;
      if (widgetIdRef.current !== null && win.grecaptcha) {
        // ไม่จำเป็นต้อง reset ที่นี่อีก เพราะทำไปแล้วตอน state เปลี่ยน
        // การพยายามลบ reCAPTCHA container อาจทำให้เกิดปัญหาถ้า script จัดการเอง
      }
      // isRecaptchaRenderedRef.current = false; // ไม่ควรตั้งเป็น false ที่นี่ เพราะอาจจะยังใช้อยู่
    };
  }, [isOpen, mode, loadRecaptchaScript]); // Dependencies ของ useEffect


  // Handle ESC key to close modal - จัดการปุ่ม ESC เพื่อปิดหน้าต่าง
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);


  // Toggle password visibility - สลับการแสดงรหัสผ่าน
  const toggleShowPassword = () => setShowPassword(!showPassword);
  // Toggle confirm password visibility - สลับการแสดงยืนยันรหัสผ่าน
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);


  // ฟังก์ชันตรวจสอบฟอร์มก่อนเรียก reCAPTCHA (เฉพาะโหมดสมัครสมาชิก)
  const preSignupValidation = (): boolean => {
    setError(null); // ล้าง error เก่า
    setSuccessMessage(null);
    // Mark all fields as touched to show all errors
    setTouchedFields({ email: true, username: true, password: true, confirmPassword: true });
    const formErrors = validateForm();
    setValidationErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      setError("กรุณากรอกข้อมูลในฟอร์มให้ถูกต้องครบถ้วน");
      console.warn("⚠️ [AuthModal] การตรวจสอบความถูกต้องของฟอร์มสมัครสมาชิกไม่ผ่าน:", formErrors);
      return false;
    }
    return true;
  };

  // ฟังก์ชันจัดการการส่งฟอร์มสมัครสมาชิก
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔵 [AuthModal] ผู้ใช้คลิก "สร้างบัญชี"');
    if (!preSignupValidation()) {
      return; // ถ้า validation ไม่ผ่าน ก็ไม่ต้องทำอะไรต่อ
    }
    // ถ้า pre-validation ผ่าน
    setIsLoading(true); // เริ่ม loading
    setError(null); // ล้าง error เก่า
    setRecaptchaAttempts(0); // รีเซ็ตจำนวนครั้งที่พยายาม reCAPTCHA
    executeRecaptcha(); // เรียก reCAPTCHA (ซึ่ง callback จะเรียก handleSignupAfterRecaptchaVerified)
  };


  // Form submission handler for signin - ตัวจัดการการส่งฟอร์มสำหรับการลงชื่อเข้าใช้
  const handleSigninSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setTouchedFields({ email: true, password: true }); // Mark fields as touched

    const formErrors = validateForm(); // Validate form for signin
    setValidationErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      setError("กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง");
      return;
    }

    setIsLoading(true);
    try {
      // ใช้ signInWithCredentials จาก AuthContext
      const result = await signInWithCredentials(email, password);

      if (result.error) {
        console.error(`❌ [AuthModal] ข้อผิดพลาดจากการลงชื่อเข้าใช้: ${result.error}`);
        setError(result.error);
      } else if (result.success) {
        console.log('✅ [AuthModal] การลงชื่อเข้าใช้สำเร็จ');
        setSuccessMessage('ลงชื่อเข้าใช้สำเร็จ! กำลังนำคุณไปยังหน้าหลัก...');
        setTimeout(() => {
          onClose(); // ปิด Modal
          // อาจจะไม่ต้อง reload ถ้า NextAuth session update ทำให้ UI เปลี่ยนเอง
          // window.location.reload();
        }, 1500);
      } else {
        setError("การลงชื่อเข้าใช้ล้มเหลว กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      console.error('❌ [AuthModal] ข้อผิดพลาดที่ไม่คาดคิดในการลงชื่อเข้าใช้:', err);
      setError(err.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด');
    } finally {
      setIsLoading(false);
    }
  };

  // Social sign in handler - ตัวจัดการลงชื่อเข้าใช้ผ่านโซเชียลมีเดีย
  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'twitter' | 'apple' | 'line') => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      // ใช้ signInWithSocial จาก AuthContext ซึ่งจะเรียก nextAuthSignIn
      await signInWithSocial(provider);
      // NextAuth จะจัดการเรื่อง redirect เอง ถ้าสำเร็จ หน้าจะเปลี่ยนไป
      // ถ้ามี error ใน signInWithSocial มันจะถูก set ใน AuthContext.authError
      // เราอาจจะไม่ต้องทำอะไรที่นี่มากนัก นอกจากแสดง loading
    } catch (error: any) { // ส่วนนี้อาจจะไม่ค่อยถูกเรียกถ้า NextAuth redirect
      console.error(`❌ [AuthModal] ข้อผิดพลาดในการเริ่ม Social Sign-In (${provider}):`, error);
      setError(`ไม่สามารถเริ่มการลงชื่อเข้าใช้ด้วย ${provider}: ${error.message || "ข้อผิดพลาดที่ไม่รู้จัก"}`);
      setIsLoading(false); // Ensure loading is stopped if an error occurs here
    }
    // setLoading(false) อาจจะไม่ถูกเรียกถ้า redirect สำเร็จ
  };


  // เช็คว่าควรแสดงหน้าต่างหรือไม่
  if (!isOpen) return null;

  // ตรวจสอบว่า siteKey มีค่าหรือไม่ในโหมดสมัครสมาชิก (ควรทำก่อน render UI ที่ต้องใช้ reCAPTCHA)
  if (mode === 'signup' && !siteKey) {
    console.error("❌ [AuthModal] NEXT_PUBLIC_RECAPTCHA_SITE_KEY ไม่ได้ถูกตั้งค่า!");
    // แสดง error message กลางจอแทน modal content
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
          className="bg-card w-full max-w-md rounded-xl shadow-2xl p-6 text-center"
        >
          <FiAlertCircle className="text-red-500 text-4xl mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-card-foreground mb-2">เกิดข้อผิดพลาดในการตั้งค่า</h3>
          <p className="text-sm text-muted-foreground mb-6">
            ไม่สามารถใช้งานฟังก์ชันสมัครสมาชิกได้เนื่องจาก reCAPTCHA ไม่ได้ถูกตั้งค่าอย่างถูกต้อง กรุณาติดต่อผู้ดูแลระบบ
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            ปิด
          </button>
        </motion.div>
      </motion.div>
    );
  }

  // การเคลื่อนไหวของหน้าต่าง
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: "easeIn" } }
  };

  // การเคลื่อนไหวของ backdrop
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial="hidden" animate="visible" exit="exit" variants={backdropVariants}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-md p-4"
        >
          <motion.div
            ref={modalRef} variants={modalVariants}
            className="bg-card w-full sm:w-[90%] md:w-[650px] lg:w-[750px] rounded-3xl shadow-2xl overflow-hidden border border-accent/20 flex flex-col max-h-[90vh] md:max-h-[80vh]" // ปรับ max-h
          >
            {/* Modal Header - ส่วนหัวของหน้าต่าง */}
            <div className="relative w-full py-6 px-8 border-b border-accent/50 bg-gradient-to-r from-primary/10 to-blue-500/10"> {/* ปรับ padding และ bg */}
              <h2 className="text-xl md:text-2xl font-bold text-center bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                {mode === 'signin' ? 'ลงชื่อเข้าใช้งาน' : 'สร้างบัญชีใหม่'}
              </h2>
              <button
                onClick={onClose}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200 p-2 hover:bg-secondary/50 rounded-full"
                aria-label="ปิดหน้าต่าง"
              >
                <FiX size={22} /> {/* ปรับขนาด icon */}
              </button>
              {mode === 'signup' && (
                <button
                  onClick={() => setMode('signin')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-1 p-2 rounded-lg hover:bg-secondary/50"
                  aria-label="กลับไปที่ลงชื่อเข้าใช้"
                >
                  <FiArrowLeft size={18} /> {/* ปรับขนาด icon */}
                  <span className="text-xs md:text-sm hidden sm:inline">กลับ</span>
                </button>
              )}
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 md:p-8 lg:p-10 overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-secondary">
                {/* Error/Success Alerts - จะถูกย้ายไปอยู่เหนือปุ่ม submit ในแต่ละ form */}

                <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-10">
                  {/* Left Column - Form - คอลัมน์ซ้าย - ฟอร์ม */}
                  <div className="flex flex-col space-y-6 flex-1 w-full"> {/* ปรับ space และ w-full */}
                    <div className="mb-1"> {/* ปรับ mb */}
                      <h3 className="text-lg font-semibold text-foreground">
                        {mode === 'signin' ? 'เข้าสู่บัญชีของคุณ' : 'ข้อมูลบัญชีใหม่'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {mode === 'signin'
                          ? 'ลงชื่อเข้าใช้เพื่อเข้าถึงบัญชีของคุณ'
                          : 'กรอกข้อมูลด้านล่างเพื่อสร้างบัญชีใหม่'}
                      </p>
                    </div>

                    {/* Auth Form - ฟอร์มยืนยันตัวตน */}
                    <form onSubmit={mode === 'signin' ? handleSigninSubmit : handleSignupSubmit} className="space-y-5">
                      <InputField
                        id="email" label="อีเมล" type="email" value={email}
                        onChange={handleInputChange(setEmail, 'email')}
                        onBlur={() => handleBlur('email')}
                        placeholder="your.email@example.com"
                        icon={<FiMail size={18} />} required
                        error={validationErrors.email}
                        touched={touchedFields.email}
                      />

                      {mode === 'signup' && (
                        <InputField
                          id="username" label="ชื่อผู้ใช้" type="text" value={username}
                          onChange={handleInputChange(setUsername, 'username')}
                          onBlur={() => handleBlur('username')}
                          placeholder="username123"
                          icon={<FiUser size={18} />} required
                          helpText="3-20 ตัวอักษร (a-z, A-Z, 0-9, _, .)"
                          error={validationErrors.username}
                          touched={touchedFields.username}
                        />
                      )}

                      <InputField
                        id="password" label="รหัสผ่าน" type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={handleInputChange(setPassword, 'password')}
                        onBlur={() => handleBlur('password')}
                        placeholder={mode === 'signup' ? "สร้างรหัสผ่าน" : "กรอกรหัสผ่าน"}
                        icon={<FiLock size={18} />} required
                        minLength={mode === 'signup' ? 8 : 1}
                        helpText={mode === 'signup' ? "อย่างน้อย 8 ตัว, มีตัวเลข, ตัวพิมพ์ใหญ่/เล็ก" : undefined}
                        showPasswordToggle showPassword={showPassword} toggleShowPassword={toggleShowPassword}
                        error={validationErrors.password}
                        touched={touchedFields.password}
                      />

                      {mode === 'signup' && (
                        <InputField
                          id="confirmPassword" label="ยืนยันรหัสผ่าน" type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={handleInputChange(setConfirmPassword, 'confirmPassword')}
                          onBlur={() => handleBlur('confirmPassword')}
                          placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                          icon={<FiLock size={18} />} required
                          showPasswordToggle showPassword={showConfirmPassword} toggleShowPassword={toggleShowConfirmPassword}
                          error={validationErrors.confirmPassword}
                          touched={touchedFields.confirmPassword}
                        />
                      )}

                      {/* Alert Messages - แสดงเหนือปุ่ม Submit */}
                      <AnimatePresence>
                          {error && <Alert type="error" message={error} />}
                          {successMessage && <Alert type="success" message={successMessage} />}
                      </AnimatePresence>

                      {/* reCAPTCHA container (Signup only) - ต้องมี element นี้เพื่อให้ reCAPTCHA render */}
                      {mode === 'signup' && (
                        <div ref={recaptchaRef} id="recaptcha-container-signup" className="g-recaptcha">
                          {/* reCAPTCHA Invisible จะถูก render ที่นี่ */}
                        </div>
                      )}

                      {/* Submit Button */}
                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-lg flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-2 hover:scale-[1.01]"
                        aria-label={mode === 'signin' ? "ลงชื่อเข้าใช้" : "สร้างบัญชี"}
                        whileHover={{ scale: isLoading ? 1 : 1.01 }}
                        whileTap={{ scale: isLoading ? 1 : 0.98 }}
                      >
                        {isLoading ? (
                          <><LoadingSpinner size="sm" color="currentColor" /> <span>กำลังดำเนินการ...</span></>
                        ) : (
                          mode === 'signin' ? (
                            <><FiLogIn size={20} /> <span className="text-base">ลงชื่อเข้าใช้</span></>
                          ) : (
                            <><FiUserPlus size={20} /> <span className="text-base">สร้างบัญชี</span></>
                          )
                        )}
                      </motion.button>

                      {mode === 'signup' && (
                        <p className="text-center text-xs text-muted-foreground mt-3">
                          เว็บไซต์นี้ป้องกันด้วย Google reCAPTCHA <br/>
                          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">นโยบายความเป็นส่วนตัว</a> & <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">ข้อกำหนดการให้บริการ</a> ของ Google มีผลบังคับใช้
                        </p>
                      )}


                      {mode === 'signin' && (
                        <div className="text-center pt-1">
                          <a href="/forgot-password" className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors duration-200">
                            ลืมรหัสผ่าน?
                          </a>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Right Column - Social Login (Sign in only) */}
                  {mode === 'signin' && (
                    <div className="flex flex-col w-full md:w-auto md:max-w-xs mx-auto space-y-4"> {/* ปรับ w-full และ space */}
                      <div className="hidden md:block mb-2 text-center md:text-left"> {/* ปรับ mb */}
                        <h3 className="text-base font-semibold text-foreground">
                          หรือเข้าสู่ระบบด้วย
                        </h3>
                      </div>

                      <div className="md:hidden flex items-center my-4"> {/* ปรับ my */}
                        <div className="flex-1 border-t border-accent/50"></div>
                        <span className="mx-3 text-xs text-muted-foreground font-medium">หรือ</span>
                        <div className="flex-1 border-t border-accent/50"></div>
                      </div>

                      <div className="space-y-3"> {/* ปรับ space */}
                        <SocialButton provider="google" icon={<FaGoogle />} label="เข้าสู่ระบบด้วย Google" onClick={() => handleSocialSignIn('google')} disabled={isLoading} className="w-full" />
                        <SocialButton provider="facebook" icon={<FaFacebook />} label="เข้าสู่ระบบด้วย Facebook" onClick={() => handleSocialSignIn('facebook')} disabled={isLoading} className="w-full" />
                        <div className="grid grid-cols-2 gap-3"> {/* ปรับ gap */}
                          <SocialButton provider="twitter" icon={<FaTwitter />} label="Twitter" onClick={() => handleSocialSignIn('twitter')} disabled={isLoading} />
                          <SocialButton provider="apple" icon={<FaApple />} label="Apple" onClick={() => handleSocialSignIn('apple')} disabled={isLoading} />
                        </div>
                        <SocialButton provider="line" icon={<SiLine />} label="เข้าสู่ระบบด้วย Line" onClick={() => handleSocialSignIn('line')} disabled={isLoading} className="w-full" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer - ส่วนท้าย */}
              <div className="border-t border-accent/50 p-6 bg-secondary/30">
                <div className="text-center text-sm">
                  {mode === 'signin' ? (
                    <>
                      ยังไม่มีบัญชี?{' '}
                      <button type="button" onClick={() => setMode('signup')}
                        className="text-primary hover:text-primary/80 cursor-pointer font-medium transition-colors duration-200 hover:underline"
                      >
                        สร้างบัญชีใหม่
                      </button>
                    </>
                  ) : (
                    <>
                      มีบัญชีอยู่แล้ว?{' '}
                      <button type="button" onClick={() => setMode('signin')}
                        className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors duration-200"
                      >
                        ลงชื่อเข้าใช้
                      </button>
                    </>
                  )}
                </div>
                {mode === 'signup' && (
                  <div className="mt-3 text-xs text-center text-muted-foreground">
                    การสร้างบัญชีถือว่าคุณยอมรับ{' '}
                    <a href="/terms" className="text-primary hover:underline">เงื่อนไขการใช้งาน</a> & <a href="/privacy" className="text-primary hover:underline">นโยบายความเป็นส่วนตัว</a>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}