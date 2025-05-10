// src/components/layouts/AuthModal.tsx
// คอมโพเนนต์สำหรับหน้าต่างการยืนยันตัวตน (ลงชื่อเข้าใช้และสมัครสมาชิก)
// รองรับการลงชื่อเข้าใช้ด้วย credentials และโซเชียลมีเดีย รวมถึงการสมัครสมาชิกด้วย reCAPTCHA

"use client";

import { useState, useEffect, useRef, useCallback , forwardRef} from 'react';
import { useAuth } from '@/context/AuthContext'; // ตรวจสอบ path
import { validateEmail, validatePassword, validateUsername, validateConfirmPassword } from '@/backend/utils/validation'; // ตรวจสอบ path
// import { signIn } from 'next-auth/react'; // signIn จาก next-auth/react ไม่ได้ถูกใช้โดยตรงใน modal นี้แล้ว จะใช้ผ่าน AuthContext
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
    execute: (widgetId?: number) => void; // สั่งให้ reCAPTCHA ทำงาน (widgetId เป็น optional สำหรับ v2 invisible ถ้ามีแค่ 1 instance)
    reset: (widgetId?: number) => void; // รีเซ็ต reCAPTCHA (widgetId เป็น optional)
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
  autoComplete?: string;
}

// ใช้ forwardRef เพื่อส่ง ref ไปยัง input
const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
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
      autoComplete,
    },
    ref // รับ ref จาก forwardRef
  ) => {
    const hasError = touched && error;

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor={id} className="block text-sm font-medium text-card-foreground pl-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {hasError && (
            <span className="text-xs text-red-500 font-medium flex items-center gap-1">
              <FiAlertCircle size={12} />
              {error}
            </span>
          )}
        </div>
        <div className="relative">
          <div
            className={`absolute inset-y-0 left-0 flex items-center pl-4 ${
              hasError ? 'text-red-500' : 'text-muted-foreground group-focus-within:text-primary'
            }`}
          >
            {icon}
          </div>
          <input
            ref={ref} // ส่ง ref ไปยัง input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            minLength={minLength}
            placeholder={placeholder}
            autoComplete={autoComplete}
            className={`group w-full py-3.5 pl-12 pr-12 bg-secondary/50 text-secondary-foreground rounded-xl transition-all duration-200
              text-base placeholder:text-muted-foreground/60 placeholder:font-light shadow-sm focus:ring-2
              ${
                hasError
                  ? 'border border-red-500 focus:border-red-500 focus:ring-red-500/30'
                  : 'border border-accent focus:border-primary focus:ring-primary/30'
              }`}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={hasError ? `${id}-error` : undefined}
          />
          {showPasswordToggle && toggleShowPassword && (
            <button
              type="button"
              onClick={toggleShowPassword}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground transition-colors duration-200"
              aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          )}
        </div>
        {helpText && !hasError && (
          <p className="text-xs text-muted-foreground mt-1 pl-1">{helpText}</p>
        )}
      </div>
    );
  }
);

// ตั้ง displayName เพื่อ debugging
InputField.displayName = 'InputField';

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
  const baseClasses = "flex items-center justify-center gap-3 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm font-medium shadow"; // ลด padding, shadow

  // สไตล์เฉพาะของแต่ละ provider
  const providerStyles: Record<string, string> = {
    google: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-700",
    facebook: "bg-[#1877F2] hover:bg-[#166FE5] text-white",
    twitter: "bg-[#1DA1F2] hover:bg-[#1A91DA] text-white", // Tailwind ไม่มีสีนี้โดยตรง
    apple: "bg-black hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-black",
    line: "bg-[#06C755] hover:bg-[#05B34E] text-white"  // Tailwind ไม่มีสีนี้โดยตรง
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
  const styles = {
    error: {
      bg: 'bg-alert-error',
      border: 'border-alert-error-border',
      text: 'text-alert-error-foreground',
      icon: <FiAlertCircle size={20} className="mt-0.5 flex-shrink-0" />,
    },
    success: {
      bg: 'bg-alert-success',
      border: 'border-alert-success-border',
      text: 'text-alert-success-foreground',
      icon: <FiCheck size={20} className="mt-0.5 flex-shrink-0" />,
    },
  };

  return (
    <div
      className={`p-3.5 ${styles[type].bg} border ${styles[type].border} rounded-lg flex items-start gap-3 ${styles[type].text} text-sm animate-slideIn shadow-sm`} // ปรับ padding, radius, shadow
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
  const recaptchaContainerRef = useRef<HTMLDivElement>(null); // Ref สำหรับ reCAPTCHA container
  const recaptchaWidgetIdRef = useRef<number | null>(null); // Ref สำหรับ reCAPTCHA widget ID
  const isRecaptchaReadyRef = useRef(false); // Ref เพื่อตรวจสอบว่า reCAPTCHA script โหลดพร้อมใช้งานหรือไม่
  const [recaptchaAttempts, setRecaptchaAttempts] = useState(0); // จำนวนครั้งที่พยายาม reCAPTCHA

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const { signUp: authContextSignUp, signInWithCredentials, signInWithSocial } = useAuth();


  // ฟังก์ชันรีเซ็ต reCAPTCHA widget
  const resetRecaptcha = useCallback(() => {
    const win = window as ReCaptchaWindow;
    if (win.grecaptcha && recaptchaWidgetIdRef.current !== null) {
      try {
        win.grecaptcha.reset(recaptchaWidgetIdRef.current);
        console.log('ℹ️ [AuthModal] reCAPTCHA widget ถูกรีเซ็ต');
      } catch (e) {
        console.error('❌ [AuthModal] ไม่สามารถรีเซ็ต reCAPTCHA widget:', e);
      }
    }
  }, []);


  // ฟังก์ชันเรนเดอร์ reCAPTCHA (เฉพาะโหมดสมัครสมาชิก)
  const renderRecaptcha = useCallback(() => {
    const win = window as ReCaptchaWindow;
    if (!isOpen || mode !== 'signup' || !win.grecaptcha || !recaptchaContainerRef.current || recaptchaWidgetIdRef.current !== null) {
      // console.log('ℹ️ [AuthModal] ข้ามการเรนเดอร์ reCAPTCHA (ไม่เปิด / ไม่ใช่โหมด signup / grecaptcha ไม่พร้อม / container ไม่พร้อม / เรนเดอร์แล้ว)');
      return;
    }

    if (!siteKey) {
      console.error('❌ [AuthModal] NEXT_PUBLIC_RECAPTCHA_SITE_KEY ไม่ได้ตั้งค่า!');
      setError('การตั้งค่า reCAPTCHA ไม่ถูกต้อง โปรดติดต่อผู้ดูแล (Site Key)');
      setIsLoading(false);
      return;
    }

    console.log('🔄 [AuthModal] กำลังพยายามเรนเดอร์ reCAPTCHA v2 Invisible...');
    try {
      const widgetId = win.grecaptcha.render(recaptchaContainerRef.current, {
        sitekey: siteKey,
        size: 'invisible',
        badge: 'bottomright', // หรือ 'bottomleft', 'inline'
        callback: (token: string) => { // onRecaptchaSuccess
          console.log('✅ [AuthModal] ได้รับโทเค็น reCAPTCHA v2 Invisible:', token.substring(0, 30) + "...");
          handleSignupAfterRecaptchaVerified(token); // เรียกฟังก์ชันจัดการหลังจากได้ token
        },
        'expired-callback': () => { // onRecaptchaExpired
          console.warn('⚠️ [AuthModal] โทเค็น reCAPTCHA หมดอายุ');
          setError('โทเค็น reCAPTCHA หมดอายุ กรุณาลองใหม่อีกครั้ง');
          setIsLoading(false);
          setRecaptchaAttempts(prev => prev + 1);
          resetRecaptcha();
        },
        'error-callback': () => { // onRecaptchaError
          console.error('❌ [AuthModal] เกิดข้อผิดพลาดในการทำงานของ reCAPTCHA จาก Google');
          setError('การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่อีกครั้ง (Google Error)');
          setIsLoading(false);
          setRecaptchaAttempts(prev => prev + 1);
          resetRecaptcha();
        },
      });
      recaptchaWidgetIdRef.current = widgetId;
      console.log('✅ [AuthModal] reCAPTCHA v2 Invisible เรนเดอร์สำเร็จ, Widget ID:', widgetId);
    } catch (e) {
      console.error('❌ [AuthModal] ข้อผิดพลาดระหว่างการเรนเดอร์ reCAPTCHA:', e);
      setError('เกิดข้อผิดพลาดในการตั้งค่า reCAPTCHA โปรดลองรีเฟรชหน้า');
      setIsLoading(false);
      recaptchaWidgetIdRef.current = null; // Ensure widget ID is null on failure
    }
  }, [isOpen, mode, siteKey, resetRecaptcha]); // Dependencies เพิ่ม resetRecaptcha

  // Effect สำหรับโหลดและจัดการ reCAPTCHA script
  useEffect(() => {
    const win = window as ReCaptchaWindow;
    const checkRecaptchaReady = () => {
      if (win.grecaptcha && win.grecaptcha.ready) {
        isRecaptchaReadyRef.current = true;
        win.grecaptcha.ready(() => {
          console.log('✅ [AuthModal] Google reCAPTCHA API พร้อมใช้งาน');
          renderRecaptcha();
        });
      } else {
        // console.log('⏳ [AuthModal] รอ Google reCAPTCHA API โหลด...');
        setTimeout(checkRecaptchaReady, 200); // ตรวจสอบอีกครั้งใน 200ms
      }
    };

    if (isOpen && mode === 'signup') {
      if (!isRecaptchaReadyRef.current) {
        checkRecaptchaReady();
      } else {
        renderRecaptcha(); // ถ้า API พร้อมแล้ว ก็ render เลย
      }
    }

    // Cleanup: รีเซ็ต widget ID เมื่อ modal ปิด หรือเปลี่ยนโหมด
    return () => {
      if (recaptchaWidgetIdRef.current !== null) {
        // ไม่จำเป็นต้อง reset ที่นี่โดยตรง เพราะ renderRecaptcha จะไม่ทำงานถ้า widgetId มีค่าแล้ว
        // การ reset ควรทำเมื่อ token หมดอายุ หรือ error หรือเมื่อ form ถูก submit
        // อย่างไรก็ตาม การ clear widgetIdRef เมื่อ modal ปิดเป็นสิ่งที่ดี
        recaptchaWidgetIdRef.current = null;
        console.log('ℹ️ [AuthModal] ล้าง reCAPTCHA widget ID เนื่องจาก modal ปิดหรือเปลี่ยนโหมด');
      }
    };
  }, [isOpen, mode, renderRecaptcha]); // Dependency หลักคือ isOpen และ mode


  // ฟังก์ชันเรียก execute reCAPTCHA
  const executeRecaptchaFlow = useCallback(() => {
    console.log('🔵 [AuthModal] เริ่ม executeRecaptchaFlow...');
    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha || recaptchaWidgetIdRef.current === null) {
      console.error('❌ [AuthModal] grecaptcha หรือ widget ID ไม่พร้อมสำหรับการ execute');
      setError('ไม่สามารถเริ่มการยืนยัน reCAPTCHA ได้ กรุณาลองใหม่ (G)');
      setIsLoading(false);
      // ลอง render ใหม่ถ้ายังไม่ได้ render หรือ widget ID ไม่มี
      if (recaptchaWidgetIdRef.current === null && mode === 'signup') {
          console.log("🔄 [AuthModal] พยายามเรนเดอร์ reCAPTCHA อีกครั้งก่อน execute เนื่องจาก widget ID ไม่มี...");
          renderRecaptcha();
      }
      return;
    }

    if (recaptchaAttempts >= MAX_RECAPTCHA_ATTEMPTS) {
      console.warn('❌ [AuthModal] ถึงจำนวนครั้งสูงสุดที่อนุญาตสำหรับการยืนยัน reCAPTCHA');
      setError('คุณได้พยายามยืนยันตัวตนหลายครั้งเกินไป กรุณาลองใหม่ในภายหลัง');
      setIsLoading(false);
      return;
    }

    try {
      console.log(`🚀 [AuthModal] กำลังเรียกใช้ (execute) reCAPTCHA v2 Invisible (Widget ID: ${recaptchaWidgetIdRef.current})...`);
      setIsLoading(true); // ตั้ง loading ก่อน execute
      setError(null);
      setSuccessMessage(null);
      win.grecaptcha.execute(recaptchaWidgetIdRef.current);
    } catch (error) {
      console.error('❌ [AuthModal] ข้อผิดพลาดในการเรียกใช้ (execute) reCAPTCHA:', error);
      setError('เกิดข้อผิดพลาดในการเริ่มต้นการยืนยัน reCAPTCHA (Execute)');
      setIsLoading(false);
    }
  }, [recaptchaAttempts, mode, renderRecaptcha]);


  // ฟังก์ชันจัดการการสมัครสมาชิกหลังจาก client-side reCAPTCHA สำเร็จและได้ token มาแล้ว
  const handleSignupAfterRecaptchaVerified = useCallback(async (recaptchaClientToken: string) => {
    console.log('🔄 [AuthModal] เริ่มกระบวนการสมัครสมาชิกหลัง reCAPTCHA token (client) ถูกสร้าง...');
    // setIsLoading(true) ควรถูกตั้งค่าใน executeRecaptchaFlow แล้ว

    try {
      console.log('🔄 [AuthModal] ขั้นตอน 4: ส่งโทเค็น reCAPTCHA ไปยัง /api/verify-recaptcha เพื่อการยืนยันฝั่งเซิร์ฟเวอร์...');
      const verifyResponse = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: recaptchaClientToken }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.success) {
        console.error(`❌ [AuthModal] การยืนยัน reCAPTCHA ฝั่งเซิร์ฟเวอร์ผ่าน /api/verify-recaptcha ล้มเหลว: ${verifyData.error || 'ข้อผิดพลาดที่ไม่รู้จัก'}`);
        setError(verifyData.error || 'การยืนยันตัวตน reCAPTCHA ล้มเหลว กรุณาลองใหม่อีกครั้ง (Verify API)');
        setIsLoading(false);
        setRecaptchaAttempts(prev => prev + 1);
        resetRecaptcha();
        return;
      }

      console.log('✅ [AuthModal] ขั้นตอน 4 สำเร็จ: การยืนยัน reCAPTCHA ฝั่งเซิร์ฟเวอร์ผ่าน /api/verify-recaptcha สำเร็จ.');

      // ขั้นตอนที่ 5: หากการยืนยัน reCAPTCHA สำเร็จ, เรียก /api/auth/signup
      console.log('🔄 [AuthModal] ขั้นตอน 5: กำลังเรียก /api/auth/signup พร้อมข้อมูลผู้ใช้และ reCAPTCHA token ที่ผ่านการตรวจสอบเบื้องต้น...');
      const signupResult = await authContextSignUp(email, username, password, recaptchaClientToken); // ส่ง recaptchaClientToken

      if (signupResult.error) {
        console.error(`❌ [AuthModal] ข้อผิดพลาดจากการสมัครสมาชิก (AuthContext): ${signupResult.error}`);
        setError(signupResult.error);
      } else {
        console.log('✅ [AuthModal] การสมัครสมาชิกสำเร็จสมบูรณ์!');
        setSuccessMessage(signupResult.message || "สร้างบัญชีสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี");
        // Reset form fields and switch to signin mode or close modal
        setTimeout(() => {
          setMode('signin');
          setEmail(''); setUsername(''); setPassword(''); setConfirmPassword('');
          setValidationErrors({}); setTouchedFields({});
          setSuccessMessage(null); // ล้างข้อความสำเร็จ
          // onClose(); // หรือปิด modal ทันที
        }, 3000);
      }
    } catch (err: any) {
      console.error('❌ [AuthModal] ข้อผิดพลาดที่ไม่คาดคิดในกระบวนการสมัครสมาชิก (handleSignupAfterRecaptchaVerified):', err);
      setError(err.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
      resetRecaptcha(); // รีเซ็ต reCAPTCHA ไม่ว่าจะสำเร็จหรือล้มเหลว
    }
  }, [email, username, password, authContextSignUp, resetRecaptcha]);


  // ฟังก์ชันสำหรับตรวจสอบการป้อนข้อมูลแบบ realtime
  const validateField = useCallback((field: keyof ValidationErrors, value: string): string | undefined => {
    if (field === 'email') {
      if (!value.trim()) return 'กรุณาระบุอีเมล';
      if (!validateEmail(value)) return 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    // การตรวจสอบสำหรับโหมด signup เท่านั้น
    if (mode === 'signup') {
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
            // `password` state จะถูกใช้จาก closure ของ `validateField` ณ เวลาที่ถูกเรียก
            const confirmVal = validateConfirmPassword(password, value);
            if (!confirmVal.valid) return confirmVal.message || 'รหัสผ่านไม่ตรงกัน';
        }
    } else if (mode === 'signin' && field === 'password') { // Simple password check for signin
        if (!value.trim()) return 'กรุณาระบุรหัสผ่าน';
    }
    return undefined;
  }, [mode, password]); // `password` เป็น dependency สำหรับ `confirmPassword` validation

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


  useEffect(() => {
    const updateValidation = () => {
      if (Object.keys(touchedFields).length > 0) {
        const formErrors = validateForm();
        setValidationErrors(formErrors);
      }
    };
    const debouncedValidation = setTimeout(updateValidation, 300);
    return () => clearTimeout(debouncedValidation);
  }, [email, username, password, confirmPassword, touchedFields, validateForm]);


  const handleBlur = (field: keyof ValidationErrors) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    let value = '';
    if (field === 'email') value = email;
    else if (field === 'username') value = username;
    else if (field === 'password') value = password;
    else if (field === 'confirmPassword') value = confirmPassword;

    const fieldError = validateField(field, value);
    setValidationErrors(prev => ({ ...prev, [field]: fieldError }));
  };


  const handleInputChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    field: keyof ValidationErrors
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setter(value);
    setError(null); // ล้าง General Error เมื่อ User เริ่มพิมพ์
    setSuccessMessage(null); // ล้าง Success Message
    if (touchedFields[field]) {
      const fieldError = validateField(field, value);
      setValidationErrors(prev => ({ ...prev, [field]: fieldError }));
    }
    if (field === 'password' && touchedFields.confirmPassword) {
        const confirmError = validateField('confirmPassword', confirmPassword); // confirmPassword value is from state
        setValidationErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
      setTimeout(() => emailInputRef.current?.focus(), 100);
    } else {
        document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset form and reCAPTCHA when modal opens/closes or mode changes
  useEffect(() => {
    setEmail(''); setUsername(''); setPassword(''); setConfirmPassword('');
    setError(null); setSuccessMessage(null);
    setValidationErrors({}); setTouchedFields({});
    setIsLoading(false); setShowPassword(false); setShowConfirmPassword(false);
    setRecaptchaAttempts(0);

    // ไม่ต้องเรียก resetRecaptcha() หรือ renderRecaptcha() ที่นี่โดยตรง
    // useEffect ที่จัดการ reCAPTCHA ด้านบนจะจัดการเรื่องนี้เมื่อ isOpen หรือ mode เปลี่ยน
    // โดยเฉพาะการล้าง recaptchaWidgetIdRef.current เมื่อ modal ปิด
  }, [isOpen, mode]);


  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);


  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);


  // ฟังก์ชันตรวจสอบฟอร์มก่อนเรียก reCAPTCHA (เฉพาะโหมดสมัครสมาชิก)
  const preSignupFormValidation = (): boolean => {
    setError(null);
    setSuccessMessage(null);
    setTouchedFields({ email: true, username: true, password: true, confirmPassword: true });
    const formErrors = validateForm();
    setValidationErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      const firstErrorKey = Object.keys(formErrors)[0] as keyof ValidationErrors;
      const firstErrorMessage = formErrors[firstErrorKey];
      setError(`กรุณาแก้ไข: ${firstErrorMessage}`); // แสดงข้อผิดพลาดแรกที่พบ
      console.warn("⚠️ [AuthModal] การตรวจสอบความถูกต้องของฟอร์มสมัครสมาชิกไม่ผ่าน:", formErrors);
      return false;
    }
    return true;
  };

  // ฟังก์ชันจัดการการส่งฟอร์มสมัครสมาชิก
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔵 [AuthModal] ขั้นตอนที่ 2: ผู้ใช้คลิก "สร้างบัญชี"');
    if (!preSignupFormValidation()) {
      setIsLoading(false); // ตรวจสอบให้แน่ใจว่า loading ถูกปิดถ้า validation ไม่ผ่าน
      return;
    }
    // ถ้า pre-validation ผ่าน
    console.log('🔵 [AuthModal] ขั้นตอนที่ 3: pre-validation ผ่าน, เริ่มกระบวนการ reCAPTCHA...');
    executeRecaptchaFlow(); // เรียก reCAPTCHA -> onRecaptchaSuccess -> handleSignupAfterRecaptchaVerified
  };


  // Form submission handler for signin
  const handleSigninSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccessMessage(null);
    setTouchedFields({ email: true, password: true });

    const formErrors = validateForm();
    setValidationErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      setError("กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signInWithCredentials(email, password);
      if (result.error) {
        console.error(`❌ [AuthModal] ข้อผิดพลาดจากการลงชื่อเข้าใช้: ${result.error}`);
        setError(result.error);
      } else if (result.success) {
        console.log('✅ [AuthModal] การลงชื่อเข้าใช้สำเร็จ');
        setSuccessMessage('ลงชื่อเข้าใช้สำเร็จ! กำลังนำคุณไปยังหน้าหลัก...');
        setTimeout(() => {
          onClose();
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


  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'twitter' | 'apple' | 'line') => {
    setError(null); setSuccessMessage(null); setIsLoading(true);
    try {
      await signInWithSocial(provider);
    } catch (error: any) {
      console.error(`❌ [AuthModal] ข้อผิดพลาดในการเริ่ม Social Sign-In (${provider}):`, error);
      setError(`ไม่สามารถเริ่มการลงชื่อเข้าใช้ด้วย ${provider}: ${error.message || "ข้อผิดพลาดที่ไม่รู้จัก"}`);
      setIsLoading(false);
    }
  };


  if (!isOpen) return null;

  if (mode === 'signup' && !siteKey) {
    console.error("❌ [AuthModal] NEXT_PUBLIC_RECAPTCHA_SITE_KEY ไม่ได้ถูกตั้งค่า!");
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
          className="bg-card w-full max-w-md rounded-xl shadow-2xl p-6 text-center border border-destructive"
        >
          <FiAlertCircle className="text-destructive text-4xl mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-card-foreground mb-2">เกิดข้อผิดพลาดในการตั้งค่า</h3>
          <p className="text-sm text-muted-foreground mb-6">
            ไม่สามารถใช้งานฟังก์ชันสมัครสมาชิกได้เนื่องจาก reCAPTCHA ไม่ได้ถูกตั้งค่าอย่างถูกต้อง (Site Key) กรุณาติดต่อผู้ดูแลระบบ
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

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: "easeIn" } }
  };

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4" // เพิ่มความโปร่งแสง backdrop
        >
          <motion.div
            ref={modalRef} variants={modalVariants}
            className="bg-card w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-border flex flex-col max-h-[95vh]" // ปรับขนาด, radius, shadow, border, max-h
          >
            {/* Modal Header */}
            <div className="relative w-full py-5 px-6 border-b border-border flex items-center justify-between"> {/* ปรับ padding, alignment */}
              <h2 className="text-xl font-semibold text-card-foreground">
                {mode === 'signin' ? 'ลงชื่อเข้าใช้งาน' : 'สร้างบัญชีใหม่'}
              </h2>
              {mode === 'signup' && (
                <button
                  onClick={() => { setMode('signin'); setError(null); setSuccessMessage(null);}} // ล้าง error/success เมื่อเปลี่ยนโหมด
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-secondary transition-colors duration-150"
                  aria-label="กลับไปที่ลงชื่อเข้าใช้"
                >
                  <FiArrowLeft size={20} />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-secondary transition-colors duration-150" // ปรับสไตล์ปุ่มปิด
                aria-label="ปิดหน้าต่าง"
              >
                <FiX size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-secondary">
              <div className="p-6 md:p-8"> {/* ปรับ padding */}
                <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
                  {/* Left Column - Form */}
                  <div className="flex flex-col space-y-5 flex-1 w-full"> {/* ปรับ space */}
                    <div className="mb-2"> {/* ปรับ mb */}
                      <h3 className="text-lg font-medium text-foreground">
                        {mode === 'signin' ? 'ยินดีต้อนรับกลับ!' : 'เริ่มต้นการผจญภัย'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5"> {/* ปรับ mt */}
                        {mode === 'signin'
                          ? 'เข้าสู่ระบบเพื่อจัดการบัญชีของคุณ'
                          : 'กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ใหม่'}
                      </p>
                    </div>

                    {/* Auth Form */}
                    <form onSubmit={mode === 'signin' ? handleSigninSubmit : handleSignupSubmit} className="space-y-4"> {/* ปรับ space */}
                      <InputField
                        id="email" label="อีเมล" type="email" value={email}
                        onChange={handleInputChange(setEmail, 'email')}
                        onBlur={() => handleBlur('email')}
                        placeholder="your.email@example.com"
                        icon={<FiMail size={17} />} required // ปรับขนาด icon
                        error={validationErrors.email}
                        touched={touchedFields.email}
                        autoComplete="email"
                        ref={emailInputRef} // เพิ่ม ref
                      />

                      {mode === 'signup' && (
                        <InputField
                          id="username" label="ชื่อผู้ใช้" type="text" value={username}
                          onChange={handleInputChange(setUsername, 'username')}
                          onBlur={() => handleBlur('username')}
                          placeholder="username123"
                          icon={<FiUser size={17} />} required // ปรับขนาด icon
                          helpText="3-20 ตัวอักษร (a-z, A-Z, 0-9, _, .)"
                          error={validationErrors.username}
                          touched={touchedFields.username}
                          autoComplete="username"
                        />
                      )}

                      <InputField
                        id="password" label="รหัสผ่าน" type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={handleInputChange(setPassword, 'password')}
                        onBlur={() => handleBlur('password')}
                        placeholder={mode === 'signup' ? "สร้างรหัสผ่านที่คาดเดายาก" : "กรอกรหัสผ่านของคุณ"} // ปรับ placeholder
                        icon={<FiLock size={17} />} required // ปรับขนาด icon
                        minLength={mode === 'signup' ? 8 : 1} // รหัสผ่าน signin อาจไม่มี minLength
                        helpText={mode === 'signup' ? "อย่างน้อย 8 ตัว, มีตัวเลข, ตัวพิมพ์ใหญ่/เล็ก" : undefined}
                        showPasswordToggle showPassword={showPassword} toggleShowPassword={toggleShowPassword}
                        error={validationErrors.password}
                        touched={touchedFields.password}
                        autoComplete={mode === 'signin' ? "current-password" : "new-password"}
                      />

                      {mode === 'signup' && (
                        <InputField
                          id="confirmPassword" label="ยืนยันรหัสผ่าน" type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={handleInputChange(setConfirmPassword, 'confirmPassword')}
                          onBlur={() => handleBlur('confirmPassword')}
                          placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                          icon={<FiLock size={17} />} required // ปรับขนาด icon
                          showPasswordToggle showPassword={showConfirmPassword} toggleShowPassword={toggleShowConfirmPassword}
                          error={validationErrors.confirmPassword}
                          touched={touchedFields.confirmPassword}
                          autoComplete="new-password"
                        />
                      )}

                      {/* Alert Messages - ย้ายมาอยู่เหนือปุ่ม Submit */}
                      <AnimatePresence>
                          {error && <Alert type="error" message={error} />}
                          {successMessage && <Alert type="success" message={successMessage} />}
                      </AnimatePresence>

                      {/* reCAPTCHA container (Signup only) */}
                      {mode === 'signup' && (
                        <div ref={recaptchaContainerRef} id="recaptcha-container-signup" className="g-recaptcha mt-1">
                          {/* reCAPTCHA Invisible จะถูก render ที่นี่ และแสดง badge */}
                        </div>
                      )}

                      {/* Submit Button */}
                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2 hover:shadow-primary/30 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card" // ปรับ radius, shadow, focus
                        aria-label={mode === 'signin' ? "ลงชื่อเข้าใช้" : "สร้างบัญชี"}
                        whileHover={{ scale: isLoading ? 1 : 1.015 }}
                        whileTap={{ scale: isLoading ? 1 : 0.985 }}
                      >
                        {isLoading ? (
                          <><LoadingSpinner size="sm" color="currentColor" /> <span>กำลังดำเนินการ...</span></>
                        ) : (
                          mode === 'signin' ? (
                            <><FiLogIn size={19} /> <span className="text-base">ลงชื่อเข้าใช้</span></>
                          ) : (
                            <><FiUserPlus size={19} /> <span className="text-base">สร้างบัญชี</span></>
                          )
                        )}
                      </motion.button>

                      {mode === 'signup' && !isLoading && ( // ซ่อนเมื่อ loading เพื่อไม่ให้เกะกะ
                        <p className="text-center text-xs text-muted-foreground mt-3 px-2">
                          การคลิก "สร้างบัญชี" หมายความว่าคุณยอมรับ <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">นโยบายความเป็นส่วนตัว</a> และ <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">ข้อกำหนดในการให้บริการ</a> ของ Google reCAPTCHA
                        </p>
                      )}


                      {mode === 'signin' && (
                        <div className="text-center pt-2">
                          <a href="/forgot-password" className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors duration-150">
                            ลืมรหัสผ่าน?
                          </a>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Right Column - Social Login (Sign in only) */}
                  {mode === 'signin' && (
                    <div className="flex flex-col w-full md:w-auto md:max-w-xs mx-auto space-y-3.5"> {/* ปรับ space */}
                      <div className="hidden md:block mb-1 text-center md:text-left"> {/* ปรับ mb */}
                        <h3 className="text-sm font-medium text-muted-foreground">
                          หรือเข้าสู่ระบบด้วยช่องทางอื่น
                        </h3>
                      </div>

                      <div className="md:hidden flex items-center my-3"> {/* ปรับ my */}
                        <div className="flex-1 border-t border-border"></div>
                        <span className="mx-4 text-xs text-muted-foreground font-medium">หรือ</span>
                        <div className="flex-1 border-t border-border"></div>
                      </div>

                      <div className="space-y-2.5"> {/* ปรับ space */}
                        <SocialButton provider="google" icon={<FaGoogle />} label="ดำเนินการต่อด้วย Google" onClick={() => handleSocialSignIn('google')} disabled={isLoading} className="w-full" />
                        <SocialButton provider="facebook" icon={<FaFacebook />} label="ดำเนินการต่อด้วย Facebook" onClick={() => handleSocialSignIn('facebook')} disabled={isLoading} className="w-full" />
                        <div className="grid grid-cols-2 gap-2.5"> {/* ปรับ gap */}
                          <SocialButton provider="twitter" icon={<FaTwitter />} label="Twitter" onClick={() => handleSocialSignIn('twitter')} disabled={isLoading} />
                          <SocialButton provider="apple" icon={<FaApple />} label="Apple" onClick={() => handleSocialSignIn('apple')} disabled={isLoading} />
                        </div>
                        {/* <SocialButton provider="line" icon={<SiLine />} label="ดำเนินการต่อด้วย Line" onClick={() => handleSocialSignIn('line')} disabled={isLoading} className="w-full" /> */}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border p-5 bg-secondary/40"> {/* ปรับ padding และ bg */}
              <div className="text-center text-sm text-muted-foreground">
                {mode === 'signin' ? (
                  <>
                    ยังไม่มีบัญชี?{' '}
                    <button type="button" onClick={() => { setMode('signup'); setError(null); setSuccessMessage(null);}}
                      className="text-primary hover:text-primary/80 font-medium transition-colors duration-150 hover:underline focus:outline-none focus:underline"
                    >
                      สร้างบัญชีใหม่
                    </button>
                  </>
                ) : (
                  <>
                    มีบัญชีอยู่แล้ว?{' '}
                    <button type="button" onClick={() => { setMode('signin'); setError(null); setSuccessMessage(null);}}
                      className="text-primary hover:text-primary/80 font-medium transition-colors duration-150 hover:underline focus:outline-none focus:underline"
                    >
                      ลงชื่อเข้าใช้
                    </button>
                  </>
                )}
              </div>
              {mode === 'signup' && (
                <div className="mt-2.5 text-xs text-center text-muted-foreground/80"> {/* ปรับ mt */}
                  การสร้างบัญชีถือว่าคุณยอมรับ{' '}
                  <a href="/terms" className="text-primary/90 hover:underline">เงื่อนไขการใช้งาน</a> & <a href="/privacy" className="text-primary/90 hover:underline">นโยบายความเป็นส่วนตัว</a> ของเรา
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}