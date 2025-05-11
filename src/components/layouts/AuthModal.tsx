// src/components/layouts/AuthModal.tsx
// คอมโพเนนต์สำหรับหน้าต่างการยืนยันตัวตน (ลงชื่อเข้าใช้และสมัครสมาชิก)
// รองรับการลงชื่อเข้าใช้ด้วย credentials และโซเชียลมีเดีย รวมถึงการสมัครสมาชิกด้วย reCAPTCHA
// ปรับปรุง UX/UI ด้วย Framer Motion, สีจาก global.css, และการเก็บค่าฟอร์มเมื่อสลับโหมด
// รองรับการกรอกทั้ง email และ username ในโหมด signin, แก้ไขการจัดการ Tab key
// อัปเดต: ปรับ handleSigninSubmit ให้ส่ง POST request ไปยัง /api/auth/signin โดยตรง
// อัปเดต: เพิ่ม console log สำหรับ debug และตรวจสอบการส่งข้อมูลไป AuthContext
// แก้ไข: ปัญหา Stale Closure ใน reCAPTCHA callback ทำให้ข้อมูลฟอร์มที่ส่งไปไม่ถูกต้อง
// อัปเดต (แก้ไข reCAPTCHA ทับซ้อน): นำการเรียก /api/verify-recaptcha ออกจาก doActualSignupSubmission
// ให้ /api/auth/signup เป็นผู้ตรวจสอบ reCAPTCHA token เพียงผู้เดียว

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

  const { signUp: authContextSignUp, signInWithSocial, signInWithCredentials } = useAuth(); // Added signInWithCredentials

  // อัปเดต formData
  const updateFormData = (field: keyof FormDataFields, value: string) => {
    console.log(`🔄 [AuthModal] อัปเดต formData[${mode}].${field}: ${value}`);
    setFormDataState(prev => ({
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

    const currentFormSignupData = formData.signup;

    try {
      //  *** ส่วนที่ถูกนำออก: ไม่มีการเรียก /api/verify-recaptcha ที่นี่อีกต่อไป ***
      // console.log("🔄 [AuthModal] [doActualSignupSubmission] ส่งคำขอไปยัง /api/verify-recaptcha...");
      // const verifyResponse = await fetch('/api/verify-recaptcha', { ... });
      // const verifyData = await verifyResponse.json();
      // ... (ส่วนจัดการผลลัพธ์จาก verifyResponse) ...
      // if (!verifyResponse.ok || !verifyData.success) { ... return; }

      console.log("✅ [AuthModal] [doActualSignupSubmission] เตรียมส่งข้อมูลสมัครสมาชิกไปยัง AuthContext...");
      const signupData = {
        email: currentFormSignupData.identifier.trim(),
        username: currentFormSignupData.username?.trim() || '',
        password: currentFormSignupData.password?.trim() || '',
        recaptchaToken: recaptchaClientToken // ส่ง token ที่ได้จาก reCAPTCHA โดยตรง
      };
      console.log(`ℹ️ [AuthModal] [doActualSignupSubmission] ข้อมูลที่จะส่งไป authContextSignUp:`, {
        email: signupData.email,
        username: signupData.username,
        password: signupData.password ? '[มีรหัสผ่าน]' : '[ไม่มีรหัสผ่าน]',
        recaptchaToken: signupData.recaptchaToken ? signupData.recaptchaToken.substring(0, 15) + '...' : 'ไม่มี Token'
      });

      // เรียก authContextSignUp โดยตรง ซึ่งจะไปเรียก /api/auth/signup ที่มีการตรวจสอบ reCAPTCHA เพียงครั้งเดียว
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
        // หาก lỗiมาจาก reCAPTCHA ที่ /api/auth/signup, มันควรจะแสดงที่นี่
        // และอาจจะต้อง reset reCAPTCHA widget
        setRecaptchaAttempts(prev => prev + 1);
        const win = window as ReCaptchaWindow;
        if (widgetIdRef.current !== null && win.grecaptcha) {
          win.grecaptcha.reset(widgetIdRef.current);
          console.log("🔄 [AuthModal] [doActualSignupSubmission] รีเซ็ต reCAPTCHA widget หลังการสมัครล้มเหลว (จาก context)");
        }

      } else {
        console.log(`✅ [AuthModal] [doActualSignupSubmission] สมัครสมาชิกสำเร็จ: ${signupData.email}`);
        setSuccessMessage(signupResult.message || "สร้างบัญชีสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน");
        setFormDataState(prev => ({
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
      // รีเซ็ต reCAPTCHA widget หลังการพยายามสมัคร ไม่ว่าจะสำเร็จหรือล้มเหลว
      // เพื่อให้พร้อมสำหรับการพยายามครั้งถัดไป (ถ้ามี) หรือการใช้งานอื่นๆ
      const win = window as ReCaptchaWindow;
      if (widgetIdRef.current !== null && win.grecaptcha) {
        win.grecaptcha.reset(widgetIdRef.current);
        console.log("🔄 [AuthModal] [doActualSignupSubmission] รีเซ็ต reCAPTCHA widget หลังจบการทำงาน");
      }
      recaptchaTokenRef.current = null; // เคลียร์ token ที่ใช้แล้ว
    }
  }, [
    formData.signup,
    authContextSignUp,
    recaptchaAttempts,
    setError, setIsLoading, setRecaptchaAttempts, setSuccessMessage, setFormDataState, setTouchedFields, setValidationErrors, setMode
  ]);

  // Ref เพื่อเก็บ instance ล่าสุดของ doActualSignupSubmission
  const doActualSignupSubmissionRef = useRef(doActualSignupSubmission);

  useEffect(() => {
    doActualSignupSubmissionRef.current = doActualSignupSubmission;
  }, [doActualSignupSubmission]);


  // เมื่อ reCAPTCHA สำเร็จ (callback จาก Google)
  const onRecaptchaSuccess = useCallback((clientToken: string) => {
    console.log(`✅ [AuthModal] onRecaptchaSuccess: ได้รับ reCAPTCHA token: ${clientToken.substring(0, 15)}...`);
    recaptchaTokenRef.current = clientToken;
    doActualSignupSubmissionRef.current(clientToken);
  }, []);

  // เมื่อ reCAPTCHA หมดอายุ
  const onRecaptchaExpired = useCallback(() => {
    console.warn("⚠️ [AuthModal] onRecaptchaExpired: reCAPTCHA token หมดอายุ");
    recaptchaTokenRef.current = null;
    setError('โทเค็น reCAPTCHA หมดอายุ กรุณาลองใหม่');
    setIsLoading(false); // ปลด loading เพื่อให้ผู้ใช้สามารถลองใหม่ได้
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
    setIsLoading(false); // ปลด loading
    setRecaptchaAttempts(prev => prev + 1);
    const win = window as ReCaptchaWindow;
    if (widgetIdRef.current !== null && win.grecaptcha) {
      win.grecaptcha.reset(widgetIdRef.current);
      console.log("🔄 [AuthModal] onRecaptchaError: รีเซ็ต reCAPTCHA widget หลัง error");
    }
  }, [setError, setIsLoading, setRecaptchaAttempts]);


  // เรนเดอร์ reCAPTCHA
  const renderRecaptcha = useCallback(() => {
    if (isRecaptchaRenderedRef.current || !recaptchaRef.current || !siteKey) {
      console.log(`ℹ️ [AuthModal] ข้ามการเรนเดอร์ reCAPTCHA. Rendered: ${isRecaptchaRenderedRef.current}, Ref: ${!!recaptchaRef.current}, SiteKey: ${!!siteKey}`);
      if (!siteKey) {
        setError('การตั้งค่า reCAPTCHA ไม่ถูกต้อง (Site Key)');
        console.error('❌ [AuthModal] ไม่สามารถเรนเดอร์ reCAPTCHA: Site Key ไม่ได้ตั้งค่า');
      }
      return;
    }

    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha || typeof win.grecaptcha.render !== 'function') {
      console.error('❌ [AuthModal] grecaptcha.render ไม่พร้อมใช้งาน');
      setError('เกิดข้อผิดพลาดในการโหลด reCAPTCHA (render)');
      setIsLoading(false);
      return;
    }

    try {
      console.log("🔄 [AuthModal] เริ่มเรนเดอร์ reCAPTCHA...");
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
      console.log(`✅ [AuthModal] reCAPTCHA เรนเดอร์สำเร็จ, Widget ID: ${widgetId}`);
    } catch (e) {
      console.error('❌ [AuthModal] ข้อผิดพลาดในการเรนเดอร์ reCAPTCHA:', e);
      setError('เกิดข้อผิดพลาดในการตั้งค่า reCAPTCHA');
      setIsLoading(false);
      isRecaptchaRenderedRef.current = false;
    }
  }, [siteKey, onRecaptchaSuccess, onRecaptchaExpired, onRecaptchaError, setError, setIsLoading]);


  // โหลดสคริปต์ reCAPTCHA
  const loadRecaptchaScript = useCallback(() => {
    console.log("🔵 [AuthModal] เริ่มโหลดสคริปต์ reCAPTCHA...");
    const win = window as ReCaptchaWindow;

    if (win.grecaptcha && win.grecaptcha.ready) {
        console.log("✅ [AuthModal] grecaptcha พร้อมใช้งาน (โหลดแล้ว), เรียก renderRecaptcha ผ่าน ready");
        win.grecaptcha.ready(() => {
            console.log("🟢 [AuthModal] grecaptcha.ready callback: เรียก renderRecaptcha");
            renderRecaptcha();
        });
    } else if (!document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]')) {
        console.log("🔄 [AuthModal] สร้างและโหลดสคริปต์ reCAPTCHA ใหม่...");
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=explicit&hl=th`; // hl=th เพื่อภาษาไทย
        script.async = true;
        script.defer = true;
        script.id = "recaptcha-script"; // เพิ่ม id เพื่อตรวจสอบได้ง่าย
        document.head.appendChild(script);

        script.onload = () => {
            console.log("✅ [AuthModal] สคริปต์ reCAPTCHA โหลดสำเร็จ");
            const winOnload = window as ReCaptchaWindow;
            if (winOnload.grecaptcha && winOnload.grecaptcha.ready) {
                winOnload.grecaptcha.ready(() => {
                    console.log("🟢 [AuthModal] grecaptcha.ready callback (หลังโหลดสคริปต์): เรียก renderRecaptcha");
                    renderRecaptcha();
                });
            } else {
                console.warn("⚠️ [AuthModal] grecaptcha ไม่พร้อมใช้งานหลังโหลดสคริปต์");
                setError("ไม่สามารถเริ่มต้น reCAPTCHA ได้ (grecaptcha not ready)");
            }
        };
        script.onerror = () => {
            console.error("❌ [AuthModal] ล้มเหลวในการโหลดสคริปต์ reCAPTCHA");
            setError("ไม่สามารถโหลด reCAPTCHA ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่");
        };
    } else {
        console.log("🟡 [AuthModal] สคริปต์ reCAPTCHA มีอยู่แล้ว, รอ grecaptcha พร้อม...");
        // เพิ่มการรอ grecaptcha.ready ถ้าสคริปต์มีอยู่แต่ grecaptcha object ยังไม่พร้อม
        let attempts = 0;
        const intervalId = setInterval(() => {
            attempts++;
            const winRetry = window as ReCaptchaWindow;
            if (winRetry.grecaptcha && winRetry.grecaptcha.ready) {
                clearInterval(intervalId);
                console.log("✅ [AuthModal] grecaptcha พร้อมใช้งานหลังรอ (สคริปต์มีอยู่แล้ว)");
                winRetry.grecaptcha.ready(() => {
                     console.log("🟢 [AuthModal] grecaptcha.ready callback (หลังรอ, สคริปต์มีอยู่แล้ว): เรียก renderRecaptcha");
                    renderRecaptcha();
                });
            } else if (attempts > 25) { // รอประมาณ 5 วินาที (25 * 200ms)
                clearInterval(intervalId);
                console.error("❌ [AuthModal] Timeout: grecaptcha ไม่พร้อมใช้งาน แม้สคริปต์จะโหลดแล้ว");
                setError("ไม่สามารถเริ่มต้น reCAPTCHA ได้ (timeout)");
            }
        }, 200);
    }
  }, [renderRecaptcha, setError]);


  // เรียก execute reCAPTCHA
  const executeRecaptcha = useCallback(() => {
    console.log("🔄 [AuthModal] เริ่ม execute reCAPTCHA...");
    const win = window as ReCaptchaWindow;

    if (!siteKey) {
        console.error("❌ [AuthModal] [executeRecaptcha] Site Key ไม่ได้ตั้งค่า");
        setError('การตั้งค่า reCAPTCHA ไม่ถูกต้อง (Site Key)');
        setIsLoading(false);
        return;
    }

    if (!win.grecaptcha || typeof win.grecaptcha.execute !== 'function') {
      console.error("❌ [AuthModal] [executeRecaptcha] grecaptcha.execute ไม่พร้อมใช้งาน");
      setError('reCAPTCHA ยังไม่พร้อมใช้งาน (execute)');
      setIsLoading(false);
      // ลองโหลดสคริปต์อีกครั้งหาก grecaptcha object ไม่มี
      if (!win.grecaptcha) {
        console.log("🔄 [AuthModal] [executeRecaptcha] พยายามโหลดสคริปต์ reCAPTCHA เนื่องจากยังไม่มี...");
        loadRecaptchaScript();
      }
      return;
    }

    if (!isRecaptchaRenderedRef.current || widgetIdRef.current === null) {
      console.warn("⚠️ [AuthModal] [executeRecaptcha] reCAPTCHA ยังไม่เรนเดอร์ หรือ widget ID ไม่มี, พยายามเรนเดอร์ใหม่...");
      // การเรียก renderRecaptcha() โดยตรงที่นี่อาจจะไม่ใช่ flow ที่ดีที่สุด
      // ควรให้ loadRecaptchaScript จัดการการ render ผ่าน grecaptcha.ready()
      // หรือถ้ามั่นใจว่าสคริปต์โหลดแล้วแต่ยังไม่ render ก็เรียก renderRecaptcha()
      // แต่ต้องระวังการเรียกซ้ำซ้อน
      // ในกรณีนี้ ถ้ายังไม่ render อาจจะหมายถึงมีปัญหาในการโหลด script หรือ siteKey
      // หรือ renderRecaptcha อาจจะยังไม่ถูกเรียกผ่าน ready()
      // ทางที่ดีคือให้ loadRecaptchaScript จัดการ flow นี้
      loadRecaptchaScript(); // ให้ loadRecaptchaScript ตรวจสอบและ render หากจำเป็น
      // อาจจะยังไม่ execute ทันที รอให้ render เสร็จก่อน
      // setError('reCAPTCHA กำลังเตรียมการ กรุณาลองอีกสักครู่');
      // setIsLoading(false); // ปลด loading ถ้าต้องการให้ user ลองกดใหม่
      // อย่างไรก็ตาม ถ้า preSignupValidation ผ่านแล้ว เราต้องการให้ flow ดำเนินต่อ
      // การ execute อาจจะ fail ถ้า widgetId ยังไม่พร้อมจริงๆ
      // เพิ่มการตรวจสอบ widgetId ก่อน execute อีกครั้ง
      if (win.grecaptcha && widgetIdRef.current !== null) {
          try {
              console.log(`🚀 [AuthModal] [executeRecaptcha] พยายาม execute reCAPTCHA (Widget ID: ${widgetIdRef.current}) หลังเรียก loadRecaptchaScript`);
              win.grecaptcha.execute(widgetIdRef.current);
          } catch (e) {
              console.error('❌ [AuthModal] [executeRecaptcha] ข้อผิดพลาดในการ execute reCAPTCHA (หลังเรียก loadRecaptchaScript):', e);
              setError('เกิดข้อผิดพลาดในการเริ่มต้น reCAPTCHA');
              setIsLoading(false);
          }
      } else {
           console.warn("⚠️ [AuthModal] [executeRecaptcha] ไม่สามารถ execute reCAPTCHA ได้ทันที, อาจกำลังรอ render หรือ widgetId ไม่ถูกต้อง...");
           setError('reCAPTCHA กำลังเตรียมการ กรุณาลองคลิกปุ่มสมัครอีกครั้ง');
           setIsLoading(false);
      }
      return; // ออกจากฟังก์ชันถ้ายังไม่ render หรือ widgetId ไม่มี
    }

    try {
      console.log(`🚀 [AuthModal] [executeRecaptcha] เรียก win.grecaptcha.execute (Widget ID: ${widgetIdRef.current})`);
      win.grecaptcha.execute(widgetIdRef.current);
    } catch (error) {
      console.error('❌ [AuthModal] [executeRecaptcha] ข้อผิดพลาดในการ execute reCAPTCHA:', error);
      setError('เกิดข้อผิดพลาดในการเริ่มต้น reCAPTCHA');
      setIsLoading(false);
    }
  }, [loadRecaptchaScript, siteKey, setError, setIsLoading]);


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
    setIsLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRecaptchaAttempts(0);
    recaptchaTokenRef.current = null;

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
    // isRecaptchaRenderedRef.current ควรเป็น false เมื่อ modal ปิด หรือ mode เปลี่ยนไปที่ไม่ใช่ signup
    // หรือเมื่อเปลี่ยนมาเป็น signup เพื่อให้ loadRecaptchaScript ทำงานใหม่
    isRecaptchaRenderedRef.current = false;
    // widgetIdRef.current = null; // การ reset widgetIdRef อาจทำให้เกิดปัญหาถ้า script ยังไม่ได้โหลดใหม่ทั้งหมด

    if (isOpen && mode === 'signup') {
      console.log("🔵 [AuthModal] โหมด signup และ modal เปิด, เรียก loadRecaptchaScript");
       if (!siteKey) {
        console.error("❌ [AuthModal] ไม่พบ RECAPTCHA_SITE_KEY สำหรับโหมด signup ใน useEffect");
        setError("การตั้งค่า reCAPTCHA ไม่สมบูรณ์ (Site Key)");
      } else {
        loadRecaptchaScript();
      }
    } else if (!isOpen) {
        // ถ้า modal ปิด, อาจจะต้องการลบ script reCAPTCHA ออกจาก DOM เพื่อความสะอาด
        // แต่ต้องระวังถ้ามี instance อื่นของ modal ที่อาจจะใช้ script เดียวกัน
        // const recaptchaScript = document.getElementById('recaptcha-script');
        // if (recaptchaScript) recaptchaScript.remove();
        // isRecaptchaRenderedRef.current = false;
        // widgetIdRef.current = null;
        // console.log("ℹ️ [AuthModal] Modal ปิด, สถานะ reCAPTCHA ถูกรีเซ็ต (เบื้องต้น)");
    }
  }, [isOpen, mode, loadRecaptchaScript, siteKey]); // เพิ่ม siteKey ใน dependency


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
      setIsLoading(false);
      return;
    }
    if (!siteKey) {
        console.error("❌ [AuthModal] [handleSignupSubmit] ไม่พบ RECAPTCHA_SITE_KEY");
        setError("การตั้งค่า reCAPTCHA ไม่สมบูรณ์ (Site Key). ไม่สามารถดำเนินการสมัครได้");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

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
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
        const result = await signInWithCredentials(
            formData.signin.identifier.trim(),
            formData.signin.password.trim()
        );

        console.log("🔵 [AuthModal] การตอบกลับจาก signInWithCredentials (AuthContext):", result);

        if (result.error) {
            console.warn(`⚠️ [AuthModal] การลงชื่อเข้าใช้ล้มเหลว (จาก AuthContext): ${result.error}`);
            setError(result.error);
            if (result.verificationRequired) {
                // สามารถจัดการ UI เพิ่มเติมสำหรับกรณีต้องยืนยันอีเมลได้ที่นี่
                console.log("ℹ️ [AuthModal] ผู้ใช้ต้องยืนยันอีเมล");
            }
        } else if (result.success && result.ok) {
            console.log("✅ [AuthModal] ลงชื่อเข้าใช้สำเร็จ (จาก AuthContext)");
            setSuccessMessage('ลงชื่อเข้าใช้สำเร็จ!');
            setTimeout(() => {
              console.log("ℹ️ [AuthModal] ปิด modal หลังลงชื่อเข้าใช้สำเร็จ");
              onClose();
            }, 1500);
        } else {
            console.warn("⚠️ [AuthModal] การลงชื่อเข้าใช้ล้มเหลวโดยไม่ทราบสาเหตุ (จาก AuthContext)");
            setError(result.error || 'การลงชื่อเข้าใช้ล้มเหลว');
        }
    } catch (err: any) {
      console.error('❌ [AuthModal] ข้อผิดพลาดในการลงชื่อเข้าใช้ (เรียก AuthContext):', err);
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
      await signInWithSocial(provider);
      console.log(`ℹ️ [AuthModal] เรียก signInWithSocial(${provider}) สำเร็จ, รอ redirect...`);
    } catch (error: any) {
      console.error(`❌ [AuthModal] ข้อผิดพลาด social sign-in (${provider}):`, error);
      setError(`ไม่สามารถลงชื่อเข้าใช้ด้วย ${provider}: ${error.message || 'เกิดข้อผิดพลาด'}`);
      setIsLoading(false);
    }
  };


  if (!isOpen) return null;

  // ตรวจสอบ siteKey อีกครั้งก่อน render ส่วนที่ต้องใช้ (ส่วนนี้ไม่เปลี่ยน)
  if (mode === 'signup' && !siteKey) {
    console.error("❌ [AuthModal] ไม่พบ RECAPTCHA_SITE_KEY สำหรับโหมด signup (ก่อน return UI)");
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

  // *** UX/UI return part (ไม่เปลี่ยนแปลงตามข้อกำหนด) ***
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
                  key={mode} 
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

                      {mode === 'signup' && (
                        <div ref={recaptchaRef} id="recaptcha-container-signup" className="g-recaptcha">
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
                          <a href="/forgot-password"
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