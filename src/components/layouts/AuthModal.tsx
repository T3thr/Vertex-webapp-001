// src/components/layouts/AuthModal.tsx
// คอมโพเนนต์สำหรับหน้าต่างการยืนยันตัวตน (ลงชื่อเข้าใช้และสมัครสมาชิก)
// รองรับการลงชื่อเข้าใช้ด้วย credentials และโซเชียลมีเดีย รวมถึงการสมัครสมาชิกด้วย reCAPTCHA
// ปรับปรุง UX/UI ด้วย Framer Motion, สีจาก global.css, และการเก็บค่าฟอร์มเมื่อสลับโหมด
// รองรับการกรอกทั้ง email และ username ในโหมด signin, แก้ไขการจัดการ Tab key

"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext'; // ตรวจสอบ path ให้ถูกต้อง
import { validateEmail, validatePassword, validateUsername, validateConfirmPassword } from '@/backend/utils/validation'; // ตรวจสอบ path ให้ถูกต้อง
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

// ขยาย interface สำหรับ Window เพื่อรองรับ grecaptcha
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
    execute: (widgetId: number) => void;
    reset: (widgetId: number) => void;
    ready: (callback: () => void) => void;
  };
}

// ค่าคงที่สำหรับจำกัดจำนวนครั้งที่พยายาม reCAPTCHA
const MAX_RECAPTCHA_ATTEMPTS = 3;

// อินเตอร์เฟซสำหรับเก็บข้อมูลฟอร์ม
interface FormDataFields {
  identifier: string; // สำหรับ signin: email หรือ username; สำหรับ signup: email
  password: string;
  username?: string; // สำหรับ signup mode เท่านั้น
  confirmPassword?: string; // สำหรับ signup mode เท่านั้น
}

// LoadingSpinner Component - คอมโพเนนต์แสดงการโหลด
export const LoadingSpinner = ({ size = "md", color = "currentColor" }: { size?: "sm" | "md" | "lg", color?: string }) => {
  const sizeClass = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <motion.div
      className={`${sizeClass[size]} animate-spin`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <div className={`h-full w-full border-2 border-b-transparent rounded-full`}
           style={{ borderColor: `${color} transparent ${color} ${color}` }} />
    </motion.div>
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
  autoComplete?: string; // เพิ่ม prop นี้
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
  autoComplete, // รับ prop นี้
}: InputFieldProps) => {
  const hasError = touched && error;

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
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
        <div className={`absolute inset-y-0 left-0 flex items-center pl-4 ${hasError ? 'text-red-500' : 'text-muted-foreground'}`}>
          {icon}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          autoComplete={autoComplete} // กำหนด autoComplete
          className={`w-full py-3.5 pl-12 pr-12 bg-secondary text-secondary-foreground rounded-md transition-all duration-200
            text-base placeholder:text-muted-foreground/60 placeholder:font-light shadow-sm focus:ring-3
            ${hasError
              ? 'border border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border border-border focus:border-primary focus:ring-ring/20'}`}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
        {showPasswordToggle && toggleShowPassword && (
          <motion.button
            type="button"
            onClick={toggleShowPassword}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </motion.button>
        )}
      </div>
      {helpText && !hasError && (
        <p className="text-xs text-muted-foreground mt-1 pl-1">{helpText}</p>
      )}
      {hasError && <p id={`${id}-error`} className="sr-only">{error}</p>}
    </motion.div>
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
  const baseClasses = "flex items-center justify-center gap-3 p-4 rounded-md focus:outline-none focus:ring-3 focus:ring-ring/30 transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm font-medium shadow-md cursor-pointer";

  const providerStyles: Record<string, string> = {
    google: "bg-social-button-google hover:bg-social-button-hover text-social-button-text border border-border",
    facebook: "bg-[#1877F2] hover:bg-[#166FE5] text-primary-foreground",
    twitter: "bg-[#1DA1F2] hover:bg-[#1A91DA] text-primary-foreground",
    apple: "bg-black hover:bg-gray-900 text-primary-foreground",
    line: "bg-[#06C755] hover:bg-[#05B34E] text-primary-foreground"
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${providerStyles[provider]} ${className || ''}`}
      aria-label={`ลงชื่อเข้าใช้ด้วย ${provider}`}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      <span className="text-lg">{icon}</span>
      <span className="truncate">{label || provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
    </motion.button>
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
    <motion.div
      className={`p-4 ${styles[type].bg} border ${styles[type].border} rounded-md flex items-start gap-3 ${styles[type].text} text-sm animate-slideIn shadow-sm`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      {styles[type].icon}
      <p>{message}</p>
    </motion.div>
  );
};

// Main AuthModal Component - คอมโพเนนต์หลักสำหรับหน้าต่างการเข้าสู่ระบบ
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup';
type ValidationErrors = {
  identifier?: string; // สำหรับ signin: email หรือ username, สำหรับ signup: email
  username?: string; // สำหรับ signup mode
  password?: string;
  confirmPassword?: string; // สำหรับ signup mode
};

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [formData, setFormData] = useState<{
    signin: FormDataFields;
    signup: FormDataFields;
  }>({
    signin: { identifier: '', password: '' },
    // identifier ใน signup mode จะเก็บ email
    signup: { identifier: '', username: '', password: '', confirmPassword: '' }
  });
  const [mode, setMode] = useState<AuthMode>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const isRecaptchaRenderedRef = useRef(false);
  const recaptchaTokenRef = useRef<string | null>(null);
  const [recaptchaAttempts, setRecaptchaAttempts] = useState(0);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  const modalRef = useRef<HTMLDivElement>(null);
  const identifierInputRef = useRef<HTMLInputElement>(null); // สำหรับ focus input แรก

  const { signInWithCredentials, signUp: authContextSignUp, signInWithSocial } = useAuth();

  // อัปเดต formData เมื่อมีการเปลี่ยนแปลง input
  const updateFormData = (field: keyof FormDataFields, value: string) => {
    setFormData(prev => ({
      ...prev,
      [mode]: { ...prev[mode], [field]: value }
    }));
  };

  // ฟังก์ชันโหลดสคริปต์ reCAPTCHA
  const loadRecaptchaScript = useCallback(() => {
    const win = window as ReCaptchaWindow;
    if (win.grecaptcha && win.grecaptcha.ready) {
      console.log("🔵 [AuthModal] grecaptcha.ready, calling renderRecaptcha");
      win.grecaptcha.ready(() => renderRecaptcha());
    } else if (!document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]')) {
      console.log("🔵 [AuthModal] Loading reCAPTCHA script...");
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=explicit&hl=th`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      script.onload = () => {
        console.log("✅ [AuthModal] reCAPTCHA script loaded.");
        const winOnload = window as ReCaptchaWindow;
        if (winOnload.grecaptcha && winOnload.grecaptcha.ready) {
          winOnload.grecaptcha.ready(() => renderRecaptcha());
        } else {
          console.warn("⚠️ [AuthModal] grecaptcha not ready after script load.");
        }
      };
      script.onerror = () => {
        console.error("❌ [AuthModal] Failed to load reCAPTCHA script.");
        setError("ไม่สามารถโหลด reCAPTCHA ได้ กรุณาลองใหม่อีกครั้ง");
      }
    } else if (document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]') && (!win.grecaptcha || !win.grecaptcha.ready)) {
      console.log("🟡 [AuthModal] reCAPTCHA script exists but grecaptcha not ready, retrying...");
      const intervalId = setInterval(() => {
        const winRetry = window as ReCaptchaWindow;
        if (winRetry.grecaptcha && winRetry.grecaptcha.ready) {
          clearInterval(intervalId);
          winRetry.grecaptcha.ready(() => renderRecaptcha());
        }
      }, 200);
    } else {
        console.log("ℹ️ [AuthModal] reCAPTCHA script already loaded and grecaptcha is ready.");
        renderRecaptcha(); // ถ้า script โหลดแล้ว และ grecaptcha พร้อม ก็ render เลย
    }
  }, []); // renderRecaptcha จะถูกจัดการใน useEffect เมื่อ mode เป็น signup

  // ฟังก์ชันเรนเดอร์ reCAPTCHA
  const renderRecaptcha = useCallback(() => {
    if (isRecaptchaRenderedRef.current || !recaptchaRef.current) {
      // console.log(`ℹ️ [AuthModal] Skipping reCAPTCHA render. Rendered: ${isRecaptchaRenderedRef.current}, Ref exists: ${!!recaptchaRef.current}`);
      return;
    }

    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha || !siteKey) {
      console.error('❌ [AuthModal] grecaptcha หรือ siteKey ไม่พร้อมใช้งานสำหรับการเรนเดอร์');
      if (!siteKey) setError('การตั้งค่า reCAPTCHA ไม่ถูกต้อง (Site Key)');
      setIsLoading(false);
      return;
    }

    try {
      console.log("🔄 [AuthModal] กำลังเรนเดอร์ reCAPTCHA...");
      const widgetId = win.grecaptcha.render(recaptchaRef.current, {
        sitekey: siteKey,
        callback: onRecaptchaSuccess,
        'expired-callback': onRecaptchaExpired,
        'error-callback': onRecaptchaError,
        size: 'invisible',
        badge: 'bottomright',
      });

      widgetIdRef.current = widgetId;
      isRecaptchaRenderedRef.current = true;
      console.log("✅ [AuthModal] reCAPTCHA เรนเดอร์สำเร็จ Widget ID:", widgetId);
    } catch (e) {
      console.error('❌ [AuthModal] ข้อผิดพลาดในการเรนเดอร์ reCAPTCHA:', e);
      setError('เกิดข้อผิดพลาดในการตั้งค่า reCAPTCHA');
      setIsLoading(false);
      isRecaptchaRenderedRef.current = false;
    }
  }, [siteKey]);

    // Callback เมื่อ reCAPTCHA สำเร็จฝั่ง client
  const onRecaptchaSuccess = (clientToken: string) => {
    console.log("✅ [AuthModal] ได้รับ reCAPTCHA token จาก client:", clientToken.substring(0,15) + "...");
    recaptchaTokenRef.current = clientToken;
    // หลังจากได้ token จาก client-side reCAPTCHA แล้ว ให้เรียก API /api/auth/signup โดยตรง
    // โดย API /api/auth/signup จะเป็นผู้ verify token นี้กับ Google อีกครั้ง
    proceedWithSignupWithClientToken(clientToken);
  };

  // Callback เมื่อ reCAPTCHA token หมดอายุ
  const onRecaptchaExpired = () => {
    console.warn("⚠️ [AuthModal] reCAPTCHA token หมดอายุ");
    recaptchaTokenRef.current = null;
    setError('โทเค็น reCAPTCHA หมดอายุ กรุณาลองใหม่');
    setIsLoading(false);
    setRecaptchaAttempts(prev => prev + 1);
    const win = window as ReCaptchaWindow;
    if (widgetIdRef.current !== null && win.grecaptcha) win.grecaptcha.reset(widgetIdRef.current);
  };

  // Callback เมื่อเกิดข้อผิดพลาดจาก reCAPTCHA
  const onRecaptchaError = () => {
    console.error("❌ [AuthModal] เกิดข้อผิดพลาดจาก reCAPTCHA");
    recaptchaTokenRef.current = null;
    setError('การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่');
    setIsLoading(false);
    setRecaptchaAttempts(prev => prev + 1);
    const win = window as ReCaptchaWindow;
    if (widgetIdRef.current !== null && win.grecaptcha) win.grecaptcha.reset(widgetIdRef.current);
  };

  // ฟังก์ชันเรียก execute reCAPTCHA
  const executeRecaptcha = useCallback(() => {
    console.log("🔄 [AuthModal] พยายาม execute reCAPTCHA...");
    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha) {
      setError('reCAPTCHA ยังไม่พร้อมใช้งาน');
      setIsLoading(false);
      console.error("❌ [AuthModal] grecaptcha object ไม่พร้อมใช้งานขณะ execute");
      loadRecaptchaScript();
      return;
    }
    if (!isRecaptchaRenderedRef.current || widgetIdRef.current === null) {
      console.warn("⚠️ [AuthModal] reCAPTCHA ยังไม่ถูกเรนเดอร์, กำลังพยายามเรนเดอร์ใหม่...");
      renderRecaptcha();
      setTimeout(() => {
        if (isRecaptchaRenderedRef.current && widgetIdRef.current !== null && win.grecaptcha) {
          console.log("🔄 [AuthModal] Execute reCAPTCHA (after re-render attempt)...");
          try {
            win.grecaptcha.execute(widgetIdRef.current);
            console.log("🚀 [AuthModal] reCAPTCHA execute ถูกเรียก (หลังพยายาม render ใหม่)");
          } catch (e) {
            console.error('❌ [AuthModal] ข้อผิดพลาด execute reCAPTCHA (after re-render):', e);
            setError('เกิดข้อผิดพลาดในการเริ่มต้น reCAPTCHA');
            setIsLoading(false);
          }
        } else {
          console.error("❌ [AuthModal] ไม่สามารถ execute reCAPTCHA ได้หลังพยายามเรนเดอร์ใหม่");
          setError('ไม่สามารถเริ่มต้น reCAPTCHA ได้ กรุณารีเฟรชหน้า');
          setIsLoading(false);
        }
      }, 1000);
      return;
    }

    try {
      win.grecaptcha.execute(widgetIdRef.current);
      console.log("🚀 [AuthModal] reCAPTCHA execute ถูกเรียก");
    } catch (error) {
      console.error('❌ [AuthModal] ข้อผิดพลาด execute reCAPTCHA:', error);
      setError('เกิดข้อผิดพลาดในการเริ่มต้น reCAPTCHA');
      setIsLoading(false);
    }
  }, [renderRecaptcha, loadRecaptchaScript]);


  // ฟังก์ชันดำเนินการ signup หลังจากได้ clientToken
  const proceedWithSignupWithClientToken = useCallback(async (clientToken: string) => {
    setError(null);
    // setIsLoading(true); // ถูกตั้งค่าใน handleSignupSubmit

    if (recaptchaAttempts >= MAX_RECAPTCHA_ATTEMPTS) {
      setError('คุณพยายามยืนยันตัวตนหลายครั้งเกินไป');
      setIsLoading(false);
      return;
    }

    console.log("🔄 [AuthModal] กำลังเรียก authContextSignUp พร้อม client reCAPTCHA token...");
    try {
      // ส่งข้อมูลทั้งหมดไปยัง AuthContext -> /api/auth/signup
      const signupResult = await authContextSignUp(
        formData.signup.identifier, // Email
        formData.signup.username || '',
        formData.signup.password || '',
        clientToken // ส่ง client token ที่ได้จาก reCAPTCHA โดยตรง
      );

      if (signupResult.error) {
        setError(signupResult.error);
      } else {
        setSuccessMessage(signupResult.message || "สร้างบัญชีสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน");
        setFormData(prev => ({...prev, signup: { identifier: '', username: '', password: '', confirmPassword: '' }}));
        setTouchedFields({});
        setValidationErrors({});
        setTimeout(() => {
          setMode('signin');
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (err: any) {
      console.error("❌ [AuthModal] ข้อผิดพลาดระหว่าง proceedWithSignupWithClientToken:", err);
      setError(err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setIsLoading(false);
      const win = window as ReCaptchaWindow;
      if (widgetIdRef.current !== null && win.grecaptcha) {
        win.grecaptcha.reset(widgetIdRef.current);
      }
      recaptchaTokenRef.current = null;
    }
  }, [formData.signup, authContextSignUp, recaptchaAttempts, setFormData, setTouchedFields, setValidationErrors, setMode, setIsLoading, setError, setSuccessMessage]);


  // ฟังก์ชันตรวจสอบความถูกต้องของฟิลด์
  const validateField = useCallback((field: keyof ValidationErrors, value: string): string | undefined => {
    const currentModeData = formData[mode];
    if (field === 'identifier') {
      if (!value.trim()) return mode === 'signin' ? 'กรุณาระบุอีเมลหรือชื่อผู้ใช้' : 'กรุณาระบุอีเมล';
      if (mode === 'signup' && !validateEmail(value)) return 'รูปแบบอีเมลไม่ถูกต้อง';
      if (mode === 'signin' && value.includes('@') && !validateEmail(value)) return 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    if (mode === 'signup') {
      if (field === 'username') {
        if (!value.trim()) return 'กรุณาระบุชื่อผู้ใช้';
        const usernameVal = validateUsername(value);
        if (!usernameVal.valid) return usernameVal.message || 'ชื่อผู้ใช้ไม่ถูกต้อง (3-20 ตัวอักษร, a-z, A-Z, 0-9, _, .)';
      }
      if (field === 'password') {
        if (!value.trim()) return 'กรุณาระบุรหัสผ่าน';
        const passwordVal = validatePassword(value);
        if (!passwordVal.valid) return passwordVal.message || 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร, ตัวเลข, ตัวพิมพ์ใหญ่/เล็ก';
      }
      if (field === 'confirmPassword') {
        if (!value.trim()) return 'กรุณายืนยันรหัสผ่าน';
        const confirmVal = validateConfirmPassword(currentModeData.password || '', value);
        if (!confirmVal.valid) return confirmVal.message || 'รหัสผ่านไม่ตรงกัน';
      }
    } else if (mode === 'signin' && field === 'password') {
      if (!value.trim()) return 'กรุณาระบุรหัสผ่าน';
    }
    return undefined;
  }, [mode, formData]);

  // ตรวจสอบความถูกต้องของฟอร์มทั้งหมด
  const validateForm = useCallback((): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    const currentModeData = formData[mode];

    const identifierError = validateField('identifier', currentModeData.identifier);
    if (identifierError) newErrors.identifier = identifierError;

    const passwordError = validateField('password', currentModeData.password);
    if (passwordError) newErrors.password = passwordError;

    if (mode === 'signup') {
      const usernameError = validateField('username', currentModeData.username || '');
      if (usernameError) newErrors.username = usernameError;
      const confirmPasswordError = validateField('confirmPassword', currentModeData.confirmPassword || '');
      if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
    }
    return newErrors;
  }, [formData, mode, validateField]);

  // ตรวจสอบฟอร์มแบบ realtime
  useEffect(() => {
    const updateValidation = () => {
      if (Object.keys(touchedFields).length > 0) {
        const formErrors = validateForm();
        setValidationErrors(formErrors);
      }
    };
    const debouncedValidation = setTimeout(updateValidation, 300);
    return () => clearTimeout(debouncedValidation);
  }, [formData, touchedFields, validateForm]);


  // จัดการเมื่อผู้ใช้ออกจากฟิลด์
  const handleBlur = (field: keyof ValidationErrors) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const currentModeData = formData[mode];
    let value = '';

    // ดึงค่าจาก formData[mode] ให้ถูกต้อง
    if (field === 'identifier') value = currentModeData.identifier;
    else if (field === 'username' && mode === 'signup') value = currentModeData.username || '';
    else if (field === 'password') value = currentModeData.password;
    else if (field === 'confirmPassword' && mode === 'signup') value = currentModeData.confirmPassword || '';


    const fieldError = validateField(field, value);
    setValidationErrors(prev => ({ ...prev, [field]: fieldError }));
  };


  // จัดการการเปลี่ยนแปลง input
  const handleInputChange = (
    field: keyof FormDataFields
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    updateFormData(field, value); // updateFormData จะจัดการอัปเดต state ตาม mode ปัจจุบัน
    if (touchedFields[field as string]) {
      const fieldError = validateField(field as keyof ValidationErrors, value);
      setValidationErrors(prev => ({ ...prev, [field as string]: fieldError }));
    }
    if (mode === 'signup' && field === 'password' && touchedFields.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.signup.confirmPassword || '');
      setValidationErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  // จัดการคลิกภายนอกเพื่อปิด
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
      setTimeout(() => { // โฟกัส input แรกเมื่อ modal เปิด
        if (mode === 'signin' && document.getElementById('signin-identifier')) {
            (document.getElementById('signin-identifier') as HTMLInputElement).focus();
        } else if (mode === 'signup' && document.getElementById('signup-email')) {
            (document.getElementById('signup-email') as HTMLInputElement).focus();
        }
      }, 150);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, mode]);


  // รีเซ็ตเมื่อ modal เปิด/ปิด หรือเปลี่ยนโหมด
  useEffect(() => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRecaptchaAttempts(0);
    recaptchaTokenRef.current = null;

    // รีเซ็ต reCAPTCHA widget
    const win = window as ReCaptchaWindow;
    if (widgetIdRef.current !== null && win.grecaptcha && typeof win.grecaptcha.reset === 'function') {
      try {
        win.grecaptcha.reset(widgetIdRef.current);
        console.log("ℹ️ [AuthModal] reCAPTCHA widget ถูกรีเซ็ต");
      } catch(e) {
        console.warn("⚠️ [AuthModal] ไม่สามารถรีเซ็ต reCAPTCHA widget:", e);
      }
    }
    isRecaptchaRenderedRef.current = false; // สำคัญ: ตั้งค่าให้ re-render ใหม่
    widgetIdRef.current = null;


    if (isOpen && mode === 'signup') {
      console.log("🔵 [AuthModal] Mode changed to signup or modal opened in signup. Loading reCAPTCHA script.");
      loadRecaptchaScript();
    }
  }, [isOpen, mode, loadRecaptchaScript]);


  // จัดการปุ่ม ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);


  // สลับการแสดงรหัสผ่าน
  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  // ตรวจสอบฟอร์มก่อนสมัคร
  const preSignupValidation = (): boolean => {
    setError(null);
    setSuccessMessage(null);
    setTouchedFields({
      identifier: true, // email for signup
      username: true,
      password: true,
      confirmPassword: true
    });

    const formErrors = validateForm();
    setValidationErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง");
      return false;
    }
    return true;
  };

  // จัดการส่งฟอร์มสมัคร
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preSignupValidation()) {
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setRecaptchaAttempts(0);
    console.log("🚀 [AuthModal] เรียก executeRecaptcha() สำหรับ signup...");
    executeRecaptcha();
  };

  // จัดการส่งฟอร์มลงชื่อเข้าใช้
  const handleSigninSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setTouchedFields({ identifier: true, password: true });

    const formErrors = validateForm(); // Validate only identifier and password for signin
    setValidationErrors(formErrors);

    if (formErrors.identifier || formErrors.password) {
        setError("กรุณากรอกอีเมล/ชื่อผู้ใช้ และรหัสผ่านให้ถูกต้อง");
        return;
    }

    setIsLoading(true);
    try {
      const result = await signInWithCredentials(
        formData.signin.identifier.trim(),
        formData.signin.password.trim()
      );

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccessMessage('ลงชื่อเข้าใช้สำเร็จ!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError('การลงชื่อเข้าใช้ล้มเหลว กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      console.error('❌ [AuthModal] ข้อผิดพลาดในการลงชื่อเข้าใช้ credentials:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการลงชื่อเข้าใช้');
    } finally {
      setIsLoading(false);
    }
  };

  // จัดการลงชื่อเข้าใช้ผ่านโซเชียล
  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'twitter' | 'apple' | 'line') => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      await signInWithSocial(provider);
      // onClose(); // อาจปิด modal เร็วไปถ้ามี error จาก next-auth
    } catch (error: any) {
      console.error(`❌ [AuthModal] ข้อผิดพลาด social sign-in (${provider}):`, error);
      setError(`ไม่สามารถลงชื่อเข้าใช้ด้วย ${provider}: ${error.message || 'เกิดข้อผิดพลาด'}`);
      setIsLoading(false);
    }
    // ไม่ต้อง setLoading(false) ที่นี่ถ้า redirect สำเร็จ, next-auth จะจัดการ
  };


  if (!isOpen) return null;
  if (mode === 'signup' && !siteKey) {
    console.error("❌ [AuthModal] Critical: RECAPTCHA_SITE_KEY is missing for signup mode.");
    return (
        <AnimatePresence>
        {isOpen && (
            <motion.div
            initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            aria-modal="true" role="dialog"
            >
            <motion.div
                ref={modalRef}
                className="bg-card w-full sm:w-[90%] md:w-[650px] lg:w-[750px] rounded-2xl shadow-xl p-8"
            >
                <Alert type="error" message="การตั้งค่า reCAPTCHA ของเว็บไซต์ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ" />
                <button onClick={onClose} className="mt-4 text-primary hover:underline">ปิด</button>
            </motion.div>
            </motion.div>
        )}
        </AnimatePresence>
    );
  }

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  // โครงสร้าง UX/UI ส่วน return ไม่เปลี่ยนแปลงตามข้อกำหนด
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial="hidden" animate="visible" exit="exit" variants={backdropVariants}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            ref={modalRef} variants={modalVariants}
            className="bg-card w-full sm:w-[90%] md:w-[650px] lg:w-[750px] rounded-2xl shadow-xl overflow-hidden border border-border flex flex-col max-h-[90vh] md:max-h-[85vh]"
          >
            {/* ส่วนหัวของ modal */}
            <div className="relative w-full py-5 px-6 md:py-6 md:px-8 border-b border-border bg-gradient-to-r from-modal-gradient-start to-modal-gradient-end">
              <h2 className="text-xl md:text-2xl font-bold text-center text-primary-foreground">
                {mode === 'signin' ? 'ลงชื่อเข้าใช้งาน' : 'สร้างบัญชีใหม่'}
              </h2>
              <motion.button
                onClick={onClose}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors duration-200 p-2 hover:bg-secondary/50 rounded-full cursor-pointer"
                aria-label="ปิดหน้าต่าง"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX size={22} />
              </motion.button>
              {mode === 'signup' && (
                <motion.button
                  onClick={() => {
                    setMode('signin');
                    setValidationErrors({});
                    setTouchedFields({});
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors duration-200 flex items-center gap-1 p-2 rounded-md hover:bg-secondary/50 cursor-pointer"
                  aria-label="กลับไปที่ลงชื่อเข้าใช้"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiArrowLeft className="text-foreground mt-0.5" size={18} />
                  <span className="text-xs text-foreground md:text-sm hidden sm:inline">กลับ</span>
                </motion.button>
              )}
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 md:p-8 lg:p-10 overflow-y-auto auth-modal-scrollbar">
                <motion.div
                  className="flex flex-col md:flex-row md:items-start gap-8 md:gap-10"
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'signin' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {/* คอลัมน์ซ้าย - ฟอร์ม */}
                  <div className="flex flex-col space-y-6 flex-1 w-full">
                    <div className="mb-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {mode === 'signin' ? 'เข้าสู่บัญชีของคุณ' : 'ข้อมูลบัญชีใหม่'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {mode === 'signin'
                          ? 'ลงชื่อเข้าใช้ด้วยอีเมลหรือชื่อผู้ใช้'
                          : 'กรอกข้อมูลเพื่อสร้างบัญชีใหม่'}
                      </p>
                    </div>

                    {/* ฟอร์มยืนยันตัวตน */}
                    <form onSubmit={mode === 'signin' ? handleSigninSubmit : handleSignupSubmit} className="space-y-5">
                       {/* === โหมด Sign In === */}
                      {mode === 'signin' && (
                        <>
                          <InputField
                            id="signin-identifier"
                            label="อีเมลหรือชื่อผู้ใช้"
                            type="text"
                            value={formData.signin.identifier}
                            onChange={handleInputChange('identifier')}
                            onBlur={() => handleBlur('identifier')}
                            placeholder="email@example.com หรือ username"
                            icon={<FiMail size={18} />}
                            required
                            autoComplete="username"
                            error={validationErrors.identifier}
                            touched={touchedFields.identifier}
                          />
                          <InputField
                            id="signin-password"
                            label="รหัสผ่าน"
                            type={showPassword ? "text" : "password"}
                            value={formData.signin.password}
                            onChange={handleInputChange('password')}
                            onBlur={() => handleBlur('password')}
                            placeholder="กรอกรหัสผ่าน"
                            icon={<FiLock size={18} />}
                            required
                            autoComplete="current-password"
                            showPasswordToggle
                            showPassword={showPassword}
                            toggleShowPassword={toggleShowPassword}
                            error={validationErrors.password}
                            touched={touchedFields.password}
                          />
                        </>
                      )}

                      {/* === โหมด Sign Up === */}
                      {mode === 'signup' && (
                        <>
                          <InputField
                            id="signup-email"
                            label="อีเมล"
                            type="email"
                            value={formData.signup.identifier} // identifier เก็บ email สำหรับ signup
                            onChange={handleInputChange('identifier')}
                            onBlur={() => handleBlur('identifier')}
                            placeholder="your.email@example.com"
                            icon={<FiMail size={18} />}
                            required
                            autoComplete="email"
                            error={validationErrors.identifier}
                            touched={touchedFields.identifier}
                          />
                          <InputField
                            id="signup-username"
                            label="ชื่อผู้ใช้"
                            type="text"
                            value={formData.signup.username || ''}
                            onChange={handleInputChange('username')}
                            onBlur={() => handleBlur('username')}
                            placeholder="username123"
                            icon={<FiUser size={18} />}
                            required
                            autoComplete="username"
                            helpText="3-20 ตัวอักษร (a-z, A-Z, 0-9, _, .)"
                            error={validationErrors.username}
                            touched={touchedFields.username}
                          />
                          <InputField
                            id="signup-password"
                            label="รหัสผ่าน"
                            type={showPassword ? "text" : "password"}
                            value={formData.signup.password || ''}
                            onChange={handleInputChange('password')}
                            onBlur={() => handleBlur('password')}
                            placeholder="สร้างรหัสผ่าน"
                            icon={<FiLock size={18} />}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            helpText="อย่างน้อย 8 ตัว, มีตัวเลข, ตัวพิมพ์ใหญ่/เล็ก"
                            showPasswordToggle
                            showPassword={showPassword}
                            toggleShowPassword={toggleShowPassword}
                            error={validationErrors.password}
                            touched={touchedFields.password}
                          />
                          <InputField
                            id="signup-confirmPassword"
                            label="ยืนยันรหัสผ่าน"
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.signup.confirmPassword || ''}
                            onChange={handleInputChange('confirmPassword')}
                            onBlur={() => handleBlur('confirmPassword')}
                            placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                            icon={<FiLock size={18} />}
                            required
                            autoComplete="new-password"
                            showPasswordToggle
                            showPassword={showConfirmPassword}
                            toggleShowPassword={toggleShowConfirmPassword}
                            error={validationErrors.confirmPassword}
                            touched={touchedFields.confirmPassword}
                          />
                        </>
                      )}


                      {/* ข้อความแจ้งเตือน */}
                      <AnimatePresence>
                        {error && <Alert type="error" message={error} />}
                        {successMessage && <Alert type="success" message={successMessage} />}
                      </AnimatePresence>

                      {/* reCAPTCHA container (แสดงเฉพาะโหมด signup) */}
                      {mode === 'signup' && (
                        <div ref={recaptchaRef} id="recaptcha-container-signup" className="g-recaptcha" />
                      )}

                      {/* ปุ่มส่งฟอร์ม */}
                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md shadow-lg flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
                        aria-label={mode === 'signin' ? "ลงชื่อเข้าใช้" : "สร้างบัญชี"}
                        whileHover={{ scale: isLoading ? 1 : 1.02, boxShadow: "var(--shadow-xl)" }}
                        whileTap={{ scale: isLoading ? 1 : 0.98 }}
                        animate={isLoading ? { opacity: [1, 0.7, 1] } : {}}
                        transition={isLoading ? { opacity: { duration: 1, repeat: Infinity } } : { duration: 0.2 }}
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
                          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary cursor-pointer">นโยบายความเป็นส่วนตัว</a> & <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary cursor-pointer">ข้อกำหนดการให้บริการ</a> ของ Google มีผลบังคับใช้
                        </p>
                      )}

                      {mode === 'signin' && (
                        <div className="text-center pt-1">
                          <a href="/forgot-password"
                             className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors duration-200 cursor-pointer">
                            ลืมรหัสผ่าน?
                          </a>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* คอลัมน์ขวา - โซเชียลล็อกอิน (แสดงเฉพาะโหมด signin) */}
                  {mode === 'signin' && (
                    <div className="flex flex-col w-full md:w-auto md:max-w-xs mx-auto space-y-4">
                      <div className="hidden md:block mb-2 text-center md:text-left">
                        <h3 className="text-base font-semibold text-foreground">
                          หรือเข้าสู่ระบบด้วย
                        </h3>
                      </div>

                      <div className="md:hidden flex items-center my-4">
                        <div className="flex-1 border-t border-border"></div>
                        <span className="mx-3 text-xs text-muted-foreground font-medium">หรือ</span>
                        <div className="flex-1 border-t border-border"></div>
                      </div>

                      <div className="space-y-3">
                        <SocialButton provider="google" icon={<FaGoogle />} label="ดำเนินการต่อด้วย Google" onClick={() => handleSocialSignIn('google')} disabled={isLoading} className="w-full" />
                        <SocialButton provider="facebook" icon={<FaFacebook />} label="ดำเนินการต่อด้วย Facebook" onClick={() => handleSocialSignIn('facebook')} disabled={isLoading} className="w-full" />
                        <div className="grid grid-cols-2 gap-3">
                          <SocialButton provider="twitter" icon={<FaTwitter />} label="Twitter" onClick={() => handleSocialSignIn('twitter')} disabled={isLoading} />
                          <SocialButton provider="apple" icon={<FaApple />} label="Apple" onClick={() => handleSocialSignIn('apple')} disabled={isLoading} />
                        </div>
                        <SocialButton provider="line" icon={<SiLine />} label="Line" onClick={() => handleSocialSignIn('line')} disabled={isLoading} className="w-full" />
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* ส่วนท้าย */}
              <div className="border-t border-border p-6 bg-secondary/30">
                <div className="text-center text-sm">
                  {mode === 'signin' ? (
                    <>
                      ยังไม่มีบัญชี?{' '}
                      <motion.button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setValidationErrors({});
                          setTouchedFields({});
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-primary hover:text-primary/80 font-medium transition-colors duration-200 hover:underline cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        สร้างบัญชีใหม่
                      </motion.button>
                    </>
                  ) : (
                    <>
                      มีบัญชีอยู่แล้ว?{' '}
                      <motion.button
                        type="button"
                        onClick={() => {
                          setMode('signin');
                          setValidationErrors({});
                          setTouchedFields({});
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors duration-200 cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        ลงชื่อเข้าใช้
                      </motion.button>
                    </>
                  )}
                </div>
                {mode === 'signup' && (
                  <div className="mt-3 text-xs text-center text-muted-foreground">
                    การสร้างบัญชีถือว่าคุณยอมรับ{' '}
                    <a href="/terms" className="text-primary hover:underline cursor-pointer">เงื่อนไขการใช้งาน</a> & <a href="/privacy" className="text-primary hover:underline cursor-pointer">นโยบายความเป็นส่วนตัว</a>
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