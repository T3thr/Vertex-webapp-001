// src/components/layouts/AuthModal.tsx
// คอมโพเนนต์สำหรับหน้าต่างการยืนยันตัวตน (ลงชื่อเข้าใช้และสมัครสมาชิก)
// รองรับการลงชื่อเข้าใช้ด้วย credentials และโซเชียลมีเดีย รวมถึงการสมัครสมาชิกด้วย reCAPTCHA
// ปรับปรุง UX/UI ด้วย Framer Motion, สีจาก global.css, และการเก็บค่าฟอร์มเมื่อสลับโหมด
// รองรับการกรอกทั้ง email และ username ในโหมด signin, แก้ไขการจัดการ Tab key
// อัปเดต: ปรับ handleSigninSubmit ให้ส่ง POST request ไปยัง /api/auth/signin โดยตรง
// อัปเดต: เพิ่ม console log สำหรับ debug และตรวจสอบการส่งข้อมูลไป AuthContext
// แก้ไข: ปัญหา Stale Closure ใน reCAPTCHA callback ทำให้ข้อมูลฟอร์มที่ส่งไปไม่ถูกต้อง

"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { validateEmail, validatePassword, validateUsername, validateConfirmPassword } from '@/backend/utils/validation';
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
interface FormDataFields { // เปลี่ยนชื่อจาก FormData เพื่อไม่ให้ชนกับ FormData ของเบราว์เซอร์
  identifier: string;
  password: string;
  username?: string;
  confirmPassword?: string;
}

// LoadingSpinner Component
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

// Input Field Component
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
  autoComplete,
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
          autoComplete={autoComplete}
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

// Social Login Button Component
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

// Alert Component
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

// Main AuthModal Component
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup';
type ValidationErrors = {
  identifier?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
};

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [formData, setFormDataState] = useState<{ // Renamed to setFormDataState to avoid conflict
    signin: FormDataFields;
    signup: FormDataFields;
  }>({
    signin: { identifier: '', password: '' },
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
  console.log(`ℹ️ [AuthModal] reCAPTCHA Site Key: ${siteKey ? 'มี' : 'ไม่มี'}`);

  const modalRef = useRef<HTMLDivElement>(null);
  // const identifierInputRef = useRef<HTMLInputElement>(null); // ไม่ได้ถูกใช้งาน อาจลบออกได้

  const { signUp: authContextSignUp, signInWithSocial } = useAuth();

  // อัปเดต formData
  const updateFormData = (field: keyof FormDataFields, value: string) => {
    console.log(`🔄 [AuthModal] อัปเดต formData[${mode}].${field}: ${value}`);
    setFormDataState(prev => ({ // Use renamed setter
      ...prev,
      [mode]: { ...prev[mode], [field]: value }
    }));
  };

  // ฟังก์ชันที่ทำหน้าที่ส่งข้อมูลการสมัครสมาชิกจริงๆ
  // ห่อด้วย useCallback เพื่อให้มั่นใจว่า instance ล่าสุดถูกใช้ผ่าน ref
  const doActualSignupSubmission = useCallback(async (recaptchaClientToken: string) => {
    console.log("🔄 [AuthModal] [doActualSignupSubmission] เริ่มดำเนินการสมัครสมาชิกด้วย reCAPTCHA token...");
    setError(null);

    if (recaptchaAttempts >= MAX_RECAPTCHA_ATTEMPTS) {
      console.error("❌ [AuthModal] [doActualSignupSubmission] เกินจำนวนครั้งที่พยายาม reCAPTCHA สูงสุด");
      setError('คุณพยายามยืนยันตัวตนหลายครั้งเกินไป');
      setIsLoading(false);
      return;
    }

    // เข้าถึง formData.signup ล่าสุดโดยตรงจาก state ภายใน useCallback นี้
    // เนื่องจาก formData.signup อยู่ใน dependency array ของ useCallback นี้
    // instance ของฟังก์ชันนี้จะถูกสร้างใหม่เสมอเมื่อ formData.signup เปลี่ยนแปลง
    // ทำให้ currentFormSignupData ที่นี่เป็นข้อมูลล่าสุดเสมอ ณ เวลาที่ฟังก์ชันถูกเรียก
    const currentFormSignupData = formData.signup;

    try {
      console.log("🔄 [AuthModal] [doActualSignupSubmission] ส่งคำขอไปยัง /api/verify-recaptcha...");
      const verifyResponse = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: recaptchaClientToken }),
      });

      const verifyData = await verifyResponse.json();
      console.log(`ℹ️ [AuthModal] [doActualSignupSubmission] การตอบกลับจาก /api/verify-recaptcha:`, verifyData);

      if (!verifyResponse.ok || !verifyData.success) {
        console.warn(`⚠️ [AuthModal] [doActualSignupSubmission] การยืนยัน reCAPTCHA ล้มเหลว: ${verifyData.error || 'ไม่ทราบสาเหตุ'}`);
        setError(verifyData.error || 'การยืนยัน reCAPTCHA ล้มเหลว');
        setIsLoading(false);
        setRecaptchaAttempts(prev => prev + 1);
        const win = window as ReCaptchaWindow;
        if (widgetIdRef.current !== null && win.grecaptcha) {
          win.grecaptcha.reset(widgetIdRef.current);
          console.log("🔄 [AuthModal] [doActualSignupSubmission] รีเซ็ต reCAPTCHA widget หลังการยืนยันล้มเหลว");
        }
        return;
      }

      console.log("✅ [AuthModal] [doActualSignupSubmission] reCAPTCHA ผ่านการยืนยัน, เตรียมส่งข้อมูลสมัครสมาชิก...");
      const signupData = {
        email: currentFormSignupData.identifier.trim(),
        username: currentFormSignupData.username?.trim() || '',
        password: currentFormSignupData.password?.trim() || '',
        recaptchaToken: recaptchaClientToken
      };
      console.log(`ℹ️ [AuthModal] [doActualSignupSubmission] ข้อมูลที่จะส่งไป authContextSignUp:`, {
        email: signupData.email,
        username: signupData.username,
        password: signupData.password ? '[มีรหัสผ่าน]' : '[ไม่มีรหัสผ่าน]',
        recaptchaToken: signupData.recaptchaToken ? signupData.recaptchaToken.substring(0, 15) + '...' : 'ไม่มี Token'
      });

      const signupResult = await authContextSignUp(
        signupData.email,
        signupData.username,
        signupData.password,
        signupData.recaptchaToken
      );

      console.log(`ℹ️ [AuthModal] [doActualSignupSubmission] ผลลัพธ์จาก authContextSignUp:`, signupResult);

      if (signupResult.error) {
        console.warn(`⚠️ [AuthModal] [doActualSignupSubmission] การสมัครสมาชิกล้มเหลว: ${signupResult.error}`);
        setError(signupResult.error);
      } else {
        console.log(`✅ [AuthModal] [doActualSignupSubmission] สมัครสมาชิกสำเร็จ: ${signupData.email}`);
        setSuccessMessage(signupResult.message || "สร้างบัญชีสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน");
        setFormDataState(prev => ({ // Use renamed setter
          ...prev,
          signup: { identifier: '', username: '', password: '', confirmPassword: '' }
        }));
        setTouchedFields({});
        setValidationErrors({});
        setTimeout(() => {
          setMode('signin');
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (err: any) {
      console.error("❌ [AuthModal] [doActualSignupSubmission] ข้อผิดพลาดระหว่างการสมัครสมาชิก:", err);
      setError(err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setIsLoading(false);
      const win = window as ReCaptchaWindow;
      if (widgetIdRef.current !== null && win.grecaptcha) {
        win.grecaptcha.reset(widgetIdRef.current);
        console.log("🔄 [AuthModal] [doActualSignupSubmission] รีเซ็ต reCAPTCHA widget หลังสมัคร");
      }
      recaptchaTokenRef.current = null; // เคลียร์ token ที่ใช้แล้ว
    }
  }, [
    formData.signup, // สำคัญ: ทำให้ useCallback สร้าง instance ใหม่เมื่อ formData.signup เปลี่ยน
    authContextSignUp,
    recaptchaAttempts,
    // state setters (setError, setIsLoading, etc.) จาก useState มีความเสถียร ไม่ต้องใส่ใน deps ก็ได้
    // แต่ใส่ไว้เพื่อความชัดเจน หรือถ้ามาจาก props/context อื่นที่อาจไม่เสถียร
    setError, setIsLoading, setRecaptchaAttempts, setSuccessMessage, setFormDataState, setTouchedFields, setValidationErrors, setMode
  ]);

  // Ref เพื่อเก็บ instance ล่าสุดของ doActualSignupSubmission
  const doActualSignupSubmissionRef = useRef(doActualSignupSubmission);

  useEffect(() => {
    doActualSignupSubmissionRef.current = doActualSignupSubmission;
  }, [doActualSignupSubmission]);


  // เมื่อ reCAPTCHA สำเร็จ (callback จาก Google)
  // ใช้ useCallback เพื่อให้ instance เสถียรสำหรับส่งให้ reCAPTCHA render
  const onRecaptchaSuccess = useCallback((clientToken: string) => {
    console.log(`✅ [AuthModal] onRecaptchaSuccess: ได้รับ reCAPTCHA token: ${clientToken.substring(0, 15)}...`);
    recaptchaTokenRef.current = clientToken;
    // เรียก instance ล่าสุดของฟังก์ชัน handler ผ่าน ref
    doActualSignupSubmissionRef.current(clientToken);
  }, []); // Dependencies Array ว่าง เพราะเราใช้ ref ชี้ไปยัง instance ล่าสุดของ handler

  // เมื่อ reCAPTCHA หมดอายุ
  const onRecaptchaExpired = useCallback(() => {
    console.warn("⚠️ [AuthModal] onRecaptchaExpired: reCAPTCHA token หมดอายุ");
    recaptchaTokenRef.current = null;
    setError('โทเค็น reCAPTCHA หมดอายุ กรุณาลองใหม่');
    setIsLoading(false);
    setRecaptchaAttempts(prev => prev + 1);
    const win = window as ReCaptchaWindow;
    if (widgetIdRef.current !== null && win.grecaptcha) {
      win.grecaptcha.reset(widgetIdRef.current);
      console.log("🔄 [AuthModal] onRecaptchaExpired: รีเซ็ต reCAPTCHA widget");
    }
  }, [setError, setIsLoading, setRecaptchaAttempts]);

  // เมื่อเกิดข้อผิดพลาด reCAPTCHA
  const onRecaptchaError = useCallback(() => {
    console.error("❌ [AuthModal] onRecaptchaError: เกิดข้อผิดพลาดจาก reCAPTCHA");
    recaptchaTokenRef.current = null;
    setError('การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่');
    setIsLoading(false);
    setRecaptchaAttempts(prev => prev + 1);
    const win = window as ReCaptchaWindow;
    if (widgetIdRef.current !== null && win.grecaptcha) {
      win.grecaptcha.reset(widgetIdRef.current);
      console.log("🔄 [AuthModal] onRecaptchaError: รีเซ็ต reCAPTCHA widget หลัง error");
    }
  }, [setError, setIsLoading, setRecaptchaAttempts]);


  // เรนเดอร์ reCAPTCHA
  const renderRecaptcha = useCallback(() => {
    if (isRecaptchaRenderedRef.current || !recaptchaRef.current) {
      console.log(`ℹ️ [AuthModal] ข้ามการเรนเดอร์ reCAPTCHA. Rendered: ${isRecaptchaRenderedRef.current}, Ref: ${!!recaptchaRef.current}`);
      return;
    }

    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha || !siteKey) {
      console.error('❌ [AuthModal] grecaptcha หรือ siteKey ไม่พร้อมใช้งาน');
      if (!siteKey) setError('การตั้งค่า reCAPTCHA ไม่ถูกต้อง (Site Key)');
      setIsLoading(false);
      return;
    }

    try {
      console.log("🔄 [AuthModal] เริ่มเรนเดอร์ reCAPTCHA...");
      const widgetId = win.grecaptcha.render(recaptchaRef.current, {
        sitekey: siteKey,
        callback: onRecaptchaSuccess, // ส่ง onRecaptchaSuccess ที่เป็น useCallback แล้ว
        'expired-callback': onRecaptchaExpired, // ส่ง onRecaptchaExpired ที่เป็น useCallback แล้ว
        'error-callback': onRecaptchaError, // ส่ง onRecaptchaError ที่เป็น useCallback แล้ว
        size: 'invisible',
        badge: 'bottomright',
      });

      widgetIdRef.current = widgetId;
      isRecaptchaRenderedRef.current = true;
      console.log(`✅ [AuthModal] reCAPTCHA เรนเดอร์สำเร็จ, Widget ID: ${widgetId}`);
    } catch (e) {
      console.error('❌ [AuthModal] ข้อผิดพลาดในการเรนเดอร์ reCAPTCHA:', e);
      setError('เกิดข้อผิดพลาดในการตั้งค่า reCAPTCHA');
      setIsLoading(false);
      isRecaptchaRenderedRef.current = false;
    }
  }, [siteKey, onRecaptchaSuccess, onRecaptchaExpired, onRecaptchaError]); // เพิ่ม dependencies ที่เป็น useCallback


  // โหลดสคริปต์ reCAPTCHA
  const loadRecaptchaScript = useCallback(() => {
    console.log("🔵 [AuthModal] เริ่มโหลดสคริปต์ reCAPTCHA...");
    const win = window as ReCaptchaWindow;
    if (win.grecaptcha && win.grecaptcha.ready) {
      console.log("✅ [AuthModal] grecaptcha พร้อมใช้งาน, เรียก renderRecaptcha");
      win.grecaptcha.ready(() => renderRecaptcha()); // renderRecaptcha ถูกเรียกจากที่นี่
    } else if (!document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]')) {
      console.log("🔄 [AuthModal] สร้างและโหลดสคริปต์ reCAPTCHA ใหม่...");
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=explicit&hl=th`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      script.onload = () => {
        console.log("✅ [AuthModal] สคริปต์ reCAPTCHA โหลดสำเร็จ");
        const winOnload = window as ReCaptchaWindow;
        if (winOnload.grecaptcha && winOnload.grecaptcha.ready) {
          winOnload.grecaptcha.ready(() => renderRecaptcha()); // renderRecaptcha ถูกเรียกจากที่นี่
        } else {
          console.warn("⚠️ [AuthModal] grecaptcha ไม่พร้อมใช้งานหลังโหลดสคริปต์");
        }
      };
      script.onerror = () => {
        console.error("❌ [AuthModal] ล้มเหลวในการโหลดสคริปต์ reCAPTCHA");
        setError("ไม่สามารถโหลด reCAPTCHA ได้ กรุณาลองใหม่");
      };
    } else {
      console.log("🟡 [AuthModal] สคริปต์ reCAPTCHA มีอยู่แล้ว, รอ grecaptcha พร้อม...");
      const intervalId = setInterval(() => {
        const winRetry = window as ReCaptchaWindow;
        if (winRetry.grecaptcha && winRetry.grecaptcha.ready) {
          console.log("✅ [AuthModal] grecaptcha พร้อมใช้งานหลังรอ");
          clearInterval(intervalId);
          winRetry.grecaptcha.ready(() => renderRecaptcha()); // renderRecaptcha ถูกเรียกจากที่นี่
        }
      }, 200);
    }
  }, [renderRecaptcha]); // renderRecaptcha เป็น dependency ของ loadRecaptchaScript


  // เรียก execute reCAPTCHA
  const executeRecaptcha = useCallback(() => {
    console.log("🔄 [AuthModal] เริ่ม execute reCAPTCHA...");
    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha) {
      console.error("❌ [AuthModal] grecaptcha ไม่พร้อมใช้งาน");
      setError('reCAPTCHA ยังไม่พร้อมใช้งาน');
      setIsLoading(false);
      loadRecaptchaScript(); // พยายามโหลดใหม่ถ้ายังไม่มี
      return;
    }
    if (!isRecaptchaRenderedRef.current || widgetIdRef.current === null) {
      console.warn("⚠️ [AuthModal] reCAPTCHA ยังไม่เรนเดอร์, พยายามเรนเดอร์ใหม่...");
      // ไม่ควรเรียก renderRecaptcha() โดยตรงที่นี่อีก ถ้า loadRecaptchaScript จัดการการเรียก renderRecaptcha() ผ่าน grecaptcha.ready() แล้ว
      // การเรียก renderRecaptcha() โดยตรงอาจทำให้เกิดการ render ซ้ำซ้อนหรือ race condition
      // ให้ loadRecaptchaScript จัดการ flow การ render ให้สมบูรณ์
      loadRecaptchaScript(); // ให้ loadRecaptchaScript ตรวจสอบและ render หากจำเป็น
      // อาจจะต้องมี logic รอสักครู่เพื่อให้ renderRecaptcha ทำงานเสร็จก่อน execute
      // แต่ reCAPTCHA v2 invisible ควรจะ execute ได้หลังจาก render สำเร็จแล้ว
      // การเรียก execute ทันทีหลัง loadRecaptchaScript อาจยังเร็วไป
      // ปกติจะ execute เมื่อผู้ใช้กด submit form จริงๆ
      // ในที่นี้ execute ถูกเรียกหลังจาก preSignupValidation ผ่านแล้ว
      // ตรวจสอบให้แน่ใจว่า widgetIdRef.current ถูกตั้งค่าจริงๆ ก่อน execute
      // อาจเพิ่มการตรวจสอบ widgetIdRef.current อีกครั้งก่อน win.grecaptcha.execute
      if (win.grecaptcha && widgetIdRef.current !== null) {
        try {
          win.grecaptcha.execute(widgetIdRef.current);
          console.log("🚀 [AuthModal] reCAPTCHA execute เรียกสำเร็จ (หลังตรวจสอบ widgetId)");
        } catch (e) {
          console.error('❌ [AuthModal] ข้อผิดพลาดในการ execute reCAPTCHA (หลังตรวจสอบ widgetId):', e);
          setError('เกิดข้อผิดพลาดในการเริ่มต้น reCAPTCHA');
          setIsLoading(false);
        }
      } else {
          console.warn("⚠️ [AuthModal] ไม่สามารถ execute reCAPTCHA ได้ทันที, อาจกำลังรอ render...");
          // อาจจะ retry execute หลังจาก delay สั้นๆ หรือให้ user ลองอีกครั้ง
          // setError('reCAPTCHA กำลังเตรียมการ, กรุณาลองอีกสักครู่'); // Optional: user feedback
          // setIsLoading(false); // ปลดล็อคปุ่มให้ผู้ใช้ลองอีกครั้ง
      }
      return; // ออกจากฟังก์ชันถ้ายังไม่ render หรือ widgetId ไม่มี
    }

    try {
      win.grecaptcha.execute(widgetIdRef.current);
      console.log("🚀 [AuthModal] reCAPTCHA execute เรียกสำเร็จ");
    } catch (error) {
      console.error('❌ [AuthModal] ข้อผิดพลาดในการ execute reCAPTCHA:', error);
      setError('เกิดข้อผิดพลาดในการเริ่มต้น reCAPTCHA');
      setIsLoading(false);
    }
  }, [loadRecaptchaScript]); // loadRecaptchaScript เป็น dependency


  // ตรวจสอบความถูกต้องของฟิลด์
  const validateField = useCallback((field: keyof ValidationErrors, value: string): string | undefined => {
    const currentModeData = formData[mode];
    console.log(`🔍 [AuthModal] ตรวจสอบฟิลด์ ${field} ค่า: ${value}`);
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

  // ตรวจสอบฟอร์มทั้งหมด
  const validateForm = useCallback((): ValidationErrors => {
    console.log(`🔍 [AuthModal] ตรวจสอบฟอร์มทั้งหมดในโหมด: ${mode}`);
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
    console.log(`ℹ️ [AuthModal] ผลการตรวจสอบฟอร์ม:`, newErrors);
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

  // จัดการเมื่อออกจากฟิลด์
  const handleBlur = (field: keyof ValidationErrors) => {
    console.log(`ℹ️ [AuthModal] ออกจากฟิลด์: ${field}`);
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const currentModeData = formData[mode];
    let value = '';
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
    console.log(`✍️ [AuthModal] อัปเดต input ${field}: ${value}`);
    updateFormData(field, value);
    if (touchedFields[field as string]) {
      const fieldError = validateField(field as keyof ValidationErrors, value);
      setValidationErrors(prev => ({ ...prev, [field as string]: fieldError }));
    }
    if (mode === 'signup' && field === 'password' && touchedFields.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.signup.confirmPassword || '');
      setValidationErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  // จัดการคลิกภายนอก
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        console.log("ℹ️ [AuthModal] คลิกนอก modal, ปิด modal");
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        console.log(`ℹ️ [AuthModal] Modal เปิด, โฟกัส input แรกในโหมด: ${mode}`);
        const firstInput = document.getElementById('identifier') as HTMLInputElement | null;
        firstInput?.focus();
      }, 150);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, mode]);

  // รีเซ็ตเมื่อ modal เปลี่ยนสถานะ หรือ mode เปลี่ยน
  useEffect(() => {
    console.log(`ℹ️ [AuthModal] รีเซ็ตสถานะเนื่องจาก isOpen: ${isOpen}, mode: ${mode}`);
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false); // รีเซ็ต isLoading เสมอ
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRecaptchaAttempts(0); // รีเซ็ตจำนวนครั้งที่พยายาม
    recaptchaTokenRef.current = null; // เคลียร์ token ที่อาจค้างอยู่

    // รีเซ็ต reCAPTCHA widget ถ้ามี
    const win = window as ReCaptchaWindow;
    if (widgetIdRef.current !== null && win.grecaptcha && typeof win.grecaptcha.reset === 'function') {
      try {
        win.grecaptcha.reset(widgetIdRef.current);
        console.log("✅ [AuthModal] รีเซ็ต reCAPTCHA widget สำเร็จ (useEffect [isOpen, mode])");
      } catch (e) {
        console.warn("⚠️ [AuthModal] ไม่สามารถรีเซ็ต reCAPTCHA widget (useEffect [isOpen, mode]):", e);
      }
    }
    // isRecaptchaRenderedRef.current ควรถูกจัดการโดย renderRecaptcha และ loadRecaptchaScript
    // ไม่ควร reset widgetIdRef.current ที่นี่ เพราะ renderRecaptcha อาจยังใช้ ID เดิมถ้า script โหลดแล้ว
    // แต่ถ้า modal ปิดและเปิดใหม่ หรือ mode เปลี่ยนเป็น signup, loadRecaptchaScript จะถูกเรียกและจัดการ render ใหม่

    if (isOpen && mode === 'signup') {
      console.log("🔵 [AuthModal] โหมด signup และ modal เปิด, เรียก loadRecaptchaScript");
      isRecaptchaRenderedRef.current = false; // อนุญาตให้ renderRecaptcha ทำงานใหม่
      loadRecaptchaScript();
    }
  }, [isOpen, mode, loadRecaptchaScript]); // loadRecaptchaScript เป็น dependency

  // จัดการปุ่ม ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log("ℹ️ [AuthModal] กด ESC, ปิด modal");
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // สลับการแสดงรหัสผ่าน
  const toggleShowPassword = () => {
    console.log(`ℹ️ [AuthModal] สลับการแสดงรหัสผ่าน: ${!showPassword}`);
    setShowPassword(!showPassword);
  };
  const toggleShowConfirmPassword = () => {
    console.log(`ℹ️ [AuthModal] สลับการแสดงยืนยันรหัสผ่าน: ${!showConfirmPassword}`);
    setShowConfirmPassword(!showConfirmPassword);
  };

  // ตรวจสอบฟอร์มก่อนสมัคร
  const preSignupValidation = (): boolean => {
    console.log("🔍 [AuthModal] เริ่มตรวจสอบฟอร์มก่อนสมัคร...");
    setError(null);
    setSuccessMessage(null);
    // มาร์คทุกฟิลด์ว่าถูก touched เพื่อแสดง error ถ้ามี
    setTouchedFields({
      identifier: true,
      username: true,
      password: true,
      confirmPassword: true
    });

    const formErrors = validateForm();
    setValidationErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      console.warn("⚠️ [AuthModal] ฟอร์มมีข้อผิดพลาด:", formErrors);
      setError("กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง");
      return false;
    }
    console.log("✅ [AuthModal] ฟอร์มผ่านการตรวจสอบ");
    return true;
  };

  // จัดการส่งฟอร์มสมัคร
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 [AuthModal] ส่งฟอร์มสมัครสมาชิก...");
    if (!preSignupValidation()) {
      console.warn("⚠️ [AuthModal] ฟอร์มไม่ผ่านการตรวจสอบ, ยกเลิกการส่ง");
      setIsLoading(false); // หยุด loading ถ้า validation ไม่ผ่าน
      return;
    }
    setIsLoading(true);
    setError(null); // เคลียร์ error เก่า
    setSuccessMessage(null); // เคลียร์ success message เก่า
    // setRecaptchaAttempts(0); // ย้ายไป reset ใน useEffect [isOpen, mode] หรือเมื่อเริ่ม flow ใหม่

    console.log("🔄 [AuthModal] เรียก executeRecaptcha สำหรับ signup...");
    executeRecaptcha();
  };

  // จัดการส่งฟอร์มลงชื่อเข้าใช้
  const handleSigninSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 [AuthModal] ส่งฟอร์มลงชื่อเข้าใช้...");
    setError(null);
    setSuccessMessage(null);
    setTouchedFields({ identifier: true, password: true });

    const formErrors = validateForm();
    setValidationErrors(formErrors);

    if (formErrors.identifier || formErrors.password) {
      console.warn("⚠️ [AuthModal] ฟอร์มลงชื่อเข้าใช้มีข้อผิดพลาด:", formErrors);
      setError("กรุณากรอกอีเมล/ชื่อผู้ใช้ และรหัสผ่านให้ถูกต้อง");
      setIsLoading(false); // หยุด loading ถ้า validation ไม่ผ่าน
      return;
    }

    setIsLoading(true);
    try {
      const requestBody = {
        identifier: formData.signin.identifier.trim(),
        password: formData.signin.password.trim(),
      };
      console.log("🔵 [AuthModal] ส่ง request ไปยัง /api/auth/signin:", {
        identifier: requestBody.identifier,
        password: requestBody.password ? '[มีรหัสผ่าน]' : '[ไม่มีรหัสผ่าน]'
      });

      // ไม่ควรเรียก signInWithCredentials ของ AuthContext ที่นี่โดยตรงถ้าต้องการ flow ผ่าน API ก่อน
      // ควรเรียก API endpoint ของเราเอง แล้ว API นั้นค่อยจัดการ logic การยืนยันตัวตน
      const response = await fetch('/api/auth/signin', { // Endpoint ที่ backend จัดการ
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log("🔵 [AuthModal] การตอบกลับจาก /api/auth/signin:", result);

      if (!response.ok || result.error) { // ตรวจสอบ result.error ด้วย
        console.warn(`⚠️ [AuthModal] การลงชื่อเข้าใช้ล้มเหลว: ${result.error || 'ไม่ทราบสาเหตุ'}`);
        setError(result.error || 'การลงชื่อเข้าใช้ล้มเหลว');
      } else if (result.success) { // สมมติว่า API คืน { success: true, user: ... }
        console.log("✅ [AuthModal] ลงชื่อเข้าใช้สำเร็จ (API ตรวจสอบผ่าน)");
        // หลังจาก API ยืนยันสำเร็จ, เรียก NextAuth signIn เพื่อสร้าง session จริงๆ
        // ส่งข้อมูลที่จำเป็น (เช่น username หรือ email ที่ยืนยันแล้ว) ไปให้ NextAuth provider "credentials"
        // ที่ "authorize" method ใน NextAuth options จะถูกเรียกอีกครั้ง
        // ต้องมั่นใจว่า authorize ไม่ได้ทำ logic ซ้ำซ้อน หรือสามารถรับ pre-validated user ได้
        const nextAuthSignInResult = await nextAuthSignIn("credentials", {
          redirect: false, // จัดการ redirect เอง หรือรอให้ onClose ทำงาน
          identifier: result.user.username, // หรือ email ตามที่ NextAuth provider คาดหวัง
          // ไม่ส่ง password ไปอีกถ้า NextAuth provider ไม่ได้ใช้ password ในขั้นตอนนี้
          // หรือถ้า authorize method ของ NextAuth provider ต้องการแค่ identifier ที่ pre-validated
          // อาจต้องส่ง token หรือ flag บางอย่างแทน password
          // ถ้า authorize ของ NextAuth ยังคงต้อง validate password อีกครั้ง, ก็ส่ง password ไป
          password: requestBody.password, // ส่ง password ถ้า NextAuth provider's authorize ต้องการ
        });

        if (nextAuthSignInResult?.error) {
            console.warn(`⚠️ [AuthModal] NextAuth signIn ล้มเหลวหลัง API success: ${nextAuthSignInResult.error}`);
            setError(nextAuthSignInResult.error === "CredentialsSignin" ? "ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง (NextAuth)" : "เกิดข้อผิดพลาดในการสร้างเซสชัน");
        } else if (nextAuthSignInResult?.ok) {
            console.log("✅ [AuthModal] NextAuth session สร้างสำเร็จ");
            setSuccessMessage('ลงชื่อเข้าใช้สำเร็จ!');
            setTimeout(() => {
              console.log("ℹ️ [AuthModal] ปิด modal หลังลงชื่อเข้าใช้สำเร็จ");
              onClose();
            }, 1500);
        } else {
            console.warn(`⚠️ [AuthModal] NextAuth signIn ไม่สำเร็จ (ไม่มี error แต่ไม่ ok)`);
            setError("การสร้างเซสชันล้มเหลว กรุณาลองใหม่");
        }
      } else {
        console.warn("⚠️ [AuthModal] การลงชื่อเข้าใช้ล้มเหลวโดยไม่ทราบสาเหตุ (API)");
        setError(result.error || 'การลงชื่อเข้าใช้ล้มเหลว');
      }
    } catch (err: any) {
      console.error('❌ [AuthModal] ข้อผิดพลาดในการลงชื่อเข้าใช้:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการลงชื่อเข้าใช้');
    } finally {
      setIsLoading(false);
    }
  };


  // จัดการลงชื่อเข้าใช้ผ่านโซเชียล
  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'twitter' | 'apple' | 'line') => {
    console.log(`🚀 [AuthModal] เริ่มลงชื่อเข้าใช้ด้วย ${provider}...`);
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      await signInWithSocial(provider); // signInWithSocial จาก useAuth()
      // signInWithSocial ควรจัดการ redirect เอง
      console.log(`ℹ️ [AuthModal] เรียก signInWithSocial(${provider}) สำเร็จ, รอ redirect...`);
      // ไม่จำเป็นต้อง setLoading(false) ที่นี่ถ้า redirect สำเร็จ
    } catch (error: any) {
      console.error(`❌ [AuthModal] ข้อผิดพลาด social sign-in (${provider}):`, error);
      setError(`ไม่สามารถลงชื่อเข้าใช้ด้วย ${provider}: ${error.message || 'เกิดข้อผิดพลาด'}`);
      setIsLoading(false); // setLoading(false) ถ้ามี error และไม่ redirect
    }
  };


  if (!isOpen) return null;

  // ตรวจสอบ siteKey อีกครั้งก่อน render ส่วนที่ต้องใช้
  if (mode === 'signup' && !siteKey) {
    console.error("❌ [AuthModal] ไม่พบ RECAPTCHA_SITE_KEY สำหรับโหมด signup");
    // แสดงข้อความผิดพลาดหรือ UI ทางเลือกถ้า siteKey ไม่มี
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
          className="bg-card w-full max-w-md rounded-lg shadow-lg p-6 text-center"
        >
          <FiAlertCircle className="text-red-500 text-4xl mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-card-foreground mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-sm text-muted-foreground mb-6">
            ไม่สามารถใช้งานฟังก์ชันสมัครสมาชิกได้ในขณะนี้ (การตั้งค่า reCAPTCHA ไม่สมบูรณ์) กรุณาติดต่อผู้ดูแลระบบ
          </p>
          <motion.button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ปิด
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 20 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  // UX/UI ส่วน return (ไม่เปลี่ยนแปลงตามข้อกำหนด)
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial="hidden" animate="visible" exit="exit" variants={backdropVariants}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-md p-4"
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            ref={modalRef} variants={modalVariants}
            className="bg-card w-full sm:w-[90%] md:w-[650px] lg:w-[750px] rounded-2xl shadow-xl overflow-hidden border border-border flex flex-col max-h-[90vh] md:max-h-[80vh]"
          >
            <div className="relative w-full py-6 px-8 border-b border-border bg-gradient-to-r from-modal-gradient-start to-modal-gradient-end">
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
                    console.log("ℹ️ [AuthModal] เปลี่ยนโหมดเป็น signin");
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
                  <FiArrowLeft className="text-foreground mt-1" size={18} />
                  <span className="text-xs text-foreground md:text-sm hidden sm:inline">กลับ</span>
                </motion.button>
              )}
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 md:p-8 lg:p-10 overflow-y-auto auth-modal-scrollbar">
                <motion.div
                  className="flex flex-col md:flex-row md:items-start gap-8 md:gap-10"
                  key={mode} // Key ช่วยให้ Framer Motion ทำงานเมื่อ mode เปลี่ยน
                  initial={{ opacity: 0, x: mode === 'signin' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
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

                    <form onSubmit={mode === 'signin' ? handleSigninSubmit : handleSignupSubmit} className="space-y-5">
                      <InputField
                        id="identifier"
                        label={mode === 'signin' ? "อีเมลหรือชื่อผู้ใช้" : "อีเมล"}
                        type="text"
                        value={formData[mode].identifier}
                        onChange={handleInputChange('identifier')}
                        onBlur={() => handleBlur('identifier')}
                        placeholder={mode === 'signin' ? "email@example.com หรือ username" : "your.email@example.com"}
                        icon={<FiMail size={18} />}
                        required
                        autoComplete={mode === 'signin' ? "username" : "email"}
                        error={validationErrors.identifier}
                        touched={touchedFields.identifier}
                      />

                      {mode === 'signup' && (
                        <InputField
                          id="username"
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
                      )}

                      <InputField
                        id="password"
                        label="รหัสผ่าน"
                        type={showPassword ? "text" : "password"}
                        value={formData[mode].password}
                        onChange={handleInputChange('password')}
                        onBlur={() => handleBlur('password')}
                        placeholder={mode === 'signup' ? "สร้างรหัสผ่าน" : "กรอกรหัสผ่าน"}
                        icon={<FiLock size={18} />}
                        required
                        minLength={mode === 'signup' ? 8 : undefined}
                        autoComplete={mode === 'signin' ? "current-password" : "new-password"}
                        helpText={mode === 'signup' ? "อย่างน้อย 8 ตัว, มีตัวเลข, ตัวพิมพ์ใหญ่/เล็ก" : undefined}
                        showPasswordToggle
                        showPassword={showPassword}
                        toggleShowPassword={toggleShowPassword}
                        error={validationErrors.password}
                        touched={touchedFields.password}
                      />

                      {mode === 'signup' && (
                        <InputField
                          id="confirmPassword"
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
                      )}

                      <AnimatePresence>
                        {error && <Alert type="error" message={error} />}
                        {successMessage && <Alert type="success" message={successMessage} />}
                      </AnimatePresence>

                      {/* reCAPTCHA container: ควรจะมองไม่เห็น (invisible) และ badge จะแสดงผล */}
                      {mode === 'signup' && (
                        <div ref={recaptchaRef} id="recaptcha-container-signup" className="g-recaptcha">
                          {/* Google reCAPTCHA v2 Invisible จะ render badge ที่นี่ หรือตาม config */}
                        </div>
                      )}

                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md shadow-lg flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
                        aria-label={mode === 'signin' ? "ลงชื่อเข้าใช้" : "สร้างบัญชี"}
                        whileHover={{ scale: isLoading ? 1 : 1.05, boxShadow: "var(--shadow-xl)" }}
                        whileTap={{ scale: isLoading ? 1 : 0.95 }}
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
                          <a href="/forgot-password" // ควรเป็น Link จาก next/link เพื่อ client-side navigation
                             className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors duration-200 cursor-pointer">
                            ลืมรหัสผ่าน?
                          </a>
                        </div>
                      )}
                    </form>
                  </div>

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
                        <SocialButton provider="google" icon={<FaGoogle />} label="Google" onClick={() => handleSocialSignIn('google')} disabled={isLoading} className="w-full" />
                        <SocialButton provider="facebook" icon={<FaFacebook />} label="Facebook" onClick={() => handleSocialSignIn('facebook')} disabled={isLoading} className="w-full" />
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

              <div className="border-t border-border p-6 bg-secondary/30">
                <div className="text-center text-sm">
                  {mode === 'signin' ? (
                    <>
                      ยังไม่มีบัญชี?{' '}
                      <motion.button
                        type="button"
                        onClick={() => {
                          console.log("ℹ️ [AuthModal] เปลี่ยนโหมดเป็น signup");
                          setMode('signup');
                          setValidationErrors({});
                          setTouchedFields({});
                          setError(null);
                          setSuccessMessage(null);
                          // ไม่จำเป็นต้อง reset formData ที่นี่ เพราะเมื่อ mode เปลี่ยน useEffect จะจัดการโหลด reCAPTCHA และผู้ใช้จะกรอกข้อมูลใหม่
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
                          console.log("ℹ️ [AuthModal] เปลี่ยนโหมดเป็น signin");
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