// src/components/layouts/AuthModal.tsx
// คอมโพเนนต์สำหรับหน้าต่างการยืนยันตัวตน (ลงชื่อเข้าใช้และสมัครสมาชิก)
// อัปเดต: ปรับ Path API ในการเรียก signInWithCredentials ให้ตรงกับ AuthContext
// อัปเดต: **ไม่ใช้ React Portal**, พยายามให้ modal อยู่กึ่งกลางและ backdrop เต็มจอด้วย CSS
// คง Logic เดิมของ reCAPTCHA และการจัดการ UI/UX
// คงการใช้ Tailwind CSS และ UX/UI เดิมทุกประการ

"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
// import { createPortal } from 'react-dom'; // <--- ลบ import นี้ออก
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
import { SessionUser } from "@/app/api/auth/[...nextauth]/options"; // ตรวจสอบ path นี้ให้ถูกต้อง
import Link from 'next/link';


// ขยาย interface สำหรับ Window เพื่อรองรับ grecaptcha (คงเดิม)
interface ReCaptchaWindow extends Window {
  grecaptcha?: {
    render: (container: HTMLElement | string, parameters: {
      sitekey: string;
      callback?: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      size: 'invisible'; // หรือ 'normal' ถ้าต้องการแสดง widget
      badge?: 'bottomright' | 'bottomleft' | 'inline';
    }) => number;
    execute: (widgetId: number) => void;
    reset: (widgetId: number) => void;
    ready: (callback: () => void) => void;
  };
}

const MAX_RECAPTCHA_ATTEMPTS = 3;

interface FormDataFields {
  identifier: string;
  password: string;
  username?: string;
  confirmPassword?: string;
}

// LoadingSpinner Component (คงเดิม)
export const LoadingSpinner = ({ size = "md", color = "currentColor" }: { size?: "sm" | "md" | "lg", color?: string }) => {
  const sizeClass = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
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

// InputField Component (คงเดิม)
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
  id, label, type, value, onChange, placeholder, icon, required = false,
  minLength, helpText, showPasswordToggle = false, showPassword,
  toggleShowPassword, error = null, touched = false, onBlur, autoComplete,
}: InputFieldProps) => {
  const hasError = touched && error;
  return (
    <motion.div className="space-y-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="block text-sm font-medium text-card-foreground pl-1">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {hasError && <span className="text-xs text-red-500 font-medium flex items-center gap-1"><FiAlertCircle size={12} />{error}</span>}
      </div>
      <div className="relative">
        <div className={`absolute inset-y-0 left-0 flex items-center pl-4 ${hasError ? 'text-red-500' : 'text-muted-foreground'}`}>{icon}</div>
        <input
          id={id} type={type} value={value} onChange={onChange} onBlur={onBlur} required={required}
          minLength={minLength} placeholder={placeholder} autoComplete={autoComplete}
          className={`w-full py-3.5 pl-12 pr-12 bg-secondary text-secondary-foreground rounded-md transition-all duration-200 text-base placeholder:text-muted-foreground/60 placeholder:font-light shadow-sm focus:ring-3 ${hasError ? 'border border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border border-border focus:border-primary focus:ring-ring/20'}`}
          aria-invalid={hasError ? "true" : undefined} aria-describedby={hasError ? `${id}-error` : undefined}
        />
        {showPasswordToggle && toggleShowPassword && (
          <motion.button type="button" onClick={toggleShowPassword} tabIndex={-1} className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </motion.button>
        )}
      </div>
      {helpText && !hasError && <p className="text-xs text-muted-foreground mt-1 pl-1">{helpText}</p>}
      {hasError && <p id={`${id}-error`} className="sr-only">{error}</p>}
    </motion.div>
  );
};

// SocialButton Component (คงเดิม)
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
    apple: "bg-gray-700 hover:bg-gray-400 text-primary-foreground",
    line: "bg-[#06C755] hover:bg-[#05B34E] text-primary-foreground"
  };
  return (
    <motion.button type="button" onClick={onClick} disabled={disabled} className={`${baseClasses} ${providerStyles[provider]} ${className || ''}`} aria-label={`ลงชื่อเข้าใช้ด้วย ${provider}`} whileHover={{ scale: disabled ? 1 : 1.02 }} whileTap={{ scale: disabled ? 1 : 0.98 }}>
      <span className="text-lg">{icon}</span>
      <span className="truncate">{label || provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
    </motion.button>
  );
};

// Alert Component (คงเดิม)
interface AlertProps { type: 'error' | 'success'; message: string; }
const Alert = ({ type, message }: AlertProps) => {
  const styles = {
    error: { bg: 'bg-alert-error', border: 'border-alert-error-border', text: 'text-alert-error-foreground', icon: <FiAlertCircle size={20} className="mt-0.5 flex-shrink-0" /> },
    success: { bg: 'bg-alert-success', border: 'border-alert-success-border', text: 'text-alert-success-foreground', icon: <FiCheck size={20} className="mt-0.5 flex-shrink-0" /> },
  };
  return (
    <motion.div className={`p-4 ${styles[type].bg} border ${styles[type].border} rounded-md flex items-start gap-3 ${styles[type].text} text-sm animate-slideIn shadow-sm`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
      {styles[type].icon}<p>{message}</p>
    </motion.div>
  );
};

interface AuthModalProps { isOpen: boolean; onClose: () => void; }
type AuthMode = 'signin' | 'signup';
type ValidationErrors = {
  identifier?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
};

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [formData, setFormDataState] = useState<{
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
  const modalContentRef = useRef<HTMLDivElement>(null); // เปลี่ยนชื่อ modalRef เป็น modalContentRef เพื่อไม่ให้สับสน

  const {
    signUp: authContextSignUp,
    signInWithSocial,
    signInWithCredentials,
  } = useAuth();

  const updateFormData = (field: keyof FormDataFields, value: string) => {
    setFormDataState(prev => ({ ...prev, [mode]: { ...prev[mode], [field]: value } }));
  };

  const doActualSignupSubmission = useCallback(async (recaptchaClientToken: string) => {
    console.log("🔄 [AuthModal] [doActualSignupSubmission] เริ่มดำเนินการสมัครสมาชิกด้วย reCAPTCHA token...");
    setError(null);
    setSuccessMessage(null); // เคลียร์ success message ก่อน

    if (recaptchaAttempts >= MAX_RECAPTCHA_ATTEMPTS) {
      console.error("❌ [AuthModal] [doActualSignupSubmission] เกินจำนวนครั้งที่พยายาม reCAPTCHA สูงสุด");
      setError('คุณพยายามยืนยันตัวตนหลายครั้งเกินไป กรุณาลองใหม่ในภายหลัง');
      setIsLoading(false);
      return;
    }

    const currentFormSignupData = formData.signup;
    const signupData = {
      email: currentFormSignupData.identifier.trim(),
      username: currentFormSignupData.username?.trim() || '',
      password: currentFormSignupData.password?.trim() || '',
      recaptchaToken: recaptchaClientToken
    };

    console.log(`ℹ️ [AuthModal] [doActualSignupSubmission] ข้อมูลที่จะส่งไป authContextSignUp:`, {
      email: signupData.email, username: signupData.username,
      password: signupData.password ? '[SECURE]' : '[NONE]',
      recaptchaToken: signupData.recaptchaToken ? `${signupData.recaptchaToken.substring(0,10)}...` : '[NONE]'
    });

    try {
      const signupResult = await authContextSignUp(
        signupData.email, signupData.username, signupData.password, signupData.recaptchaToken
      );
      console.log(`ℹ️ [AuthModal] [doActualSignupSubmission] ผลลัพธ์จาก authContextSignUp:`, signupResult);

      if (signupResult.error) {
        console.warn(`⚠️ [AuthModal] [doActualSignupSubmission] การสมัครสมาชิกล้มเหลว (AuthContext): ${signupResult.error}`);
        setError(signupResult.error);
        setRecaptchaAttempts(prev => prev + 1);
      } else {
        console.log(`✅ [AuthModal] [doActualSignupSubmission] สมัครสมาชิกสำเร็จ (AuthContext): ${signupData.email}`);
        setSuccessMessage(signupResult.message || "สร้างบัญชีสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน");
        setFormDataState(prev => ({ ...prev, signup: { identifier: '', username: '', password: '', confirmPassword: '' } }));
        setTouchedFields({});
        setValidationErrors({});
        // ไม่ควรเปลี่ยนโหมดหรือปิด modal อัตโนมัติทันที ให้ผู้ใช้อ่าน success message ก่อน
        // setTimeout(() => { setMode('signin'); setSuccessMessage(null); }, 3000); // <--- อาจจะเอาออก หรือให้ user ปิดเอง
      }
    } catch (err: any) {
      console.error("❌ [AuthModal] [doActualSignupSubmission] ข้อผิดพลาดระหว่างการเรียก authContextSignUp:", err);
      setError(err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setIsLoading(false); // หยุด loading เสมอ
      const win = window as ReCaptchaWindow;
      if (widgetIdRef.current !== null && win.grecaptcha && typeof win.grecaptcha.reset === 'function') {
        try {
            win.grecaptcha.reset(widgetIdRef.current);
        } catch (e) {
            console.warn("⚠️ [AuthModal] ไม่สามารถรีเซ็ต reCAPTCHA widget (doActualSignupSubmission):", e);
        }
      }
      recaptchaTokenRef.current = null;
    }
  }, [formData.signup, authContextSignUp, recaptchaAttempts]);

  const doActualSignupSubmissionRef = useRef(doActualSignupSubmission);
  useEffect(() => { doActualSignupSubmissionRef.current = doActualSignupSubmission; }, [doActualSignupSubmission]);

  const onRecaptchaSuccess = useCallback((clientToken: string) => {
    console.log(`✅ [AuthModal] onRecaptchaSuccess: ได้รับ reCAPTCHA token`);
    recaptchaTokenRef.current = clientToken;
    if (doActualSignupSubmissionRef.current) {
        doActualSignupSubmissionRef.current(clientToken);
    } else {
        console.error("❌ [AuthModal] onRecaptchaSuccess: doActualSignupSubmissionRef.current is null");
        setError("เกิดข้อผิดพลาดภายใน ไม่สามารถดำเนินการสมัครสมาชิกได้");
        setIsLoading(false);
    }
  }, []);

  const onRecaptchaExpiredOrError = useCallback((type: 'expired' | 'error') => {
    console.warn(`⚠️ [AuthModal] onRecaptcha${type === 'expired' ? 'Expired' : 'Error'}`);
    recaptchaTokenRef.current = null;
    setError(type === 'expired' ? 'โทเค็น reCAPTCHA หมดอายุ กรุณาลองใหม่' : 'การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่');
    setIsLoading(false);
    setRecaptchaAttempts(prev => prev + 1);
    const win = window as ReCaptchaWindow;
    if (widgetIdRef.current !== null && win.grecaptcha && typeof win.grecaptcha.reset === 'function') {
        try { win.grecaptcha.reset(widgetIdRef.current); }
        catch(e) { console.warn("⚠️ [AuthModal] ไม่สามารถรีเซ็ต reCAPTCHA widget (onRecaptchaExpiredOrError):", e); }
    }
  }, []);

  const renderRecaptcha = useCallback(() => {
    if (isRecaptchaRenderedRef.current || !recaptchaRef.current || !siteKey || typeof window === 'undefined') return;
    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha || typeof win.grecaptcha.render !== 'function') {
      console.error('❌ [AuthModal] grecaptcha.render ไม่พร้อมใช้งาน');
      setError('เกิดข้อผิดพลาดในการโหลด reCAPTCHA (render)');
      setIsLoading(false);
      return;
    }
    try {
      console.log("🔄 [AuthModal] เริ่มเรนเดอร์ reCAPTCHA...");
      widgetIdRef.current = win.grecaptcha.render(recaptchaRef.current, {
        sitekey: siteKey,
        callback: onRecaptchaSuccess, // จะถูกเรียกเมื่อ reCAPTCHA สำเร็จ
        'expired-callback': () => onRecaptchaExpiredOrError('expired'),
        'error-callback': () => onRecaptchaExpiredOrError('error'),
        size: 'invisible',
        badge: 'bottomright',
      });
      isRecaptchaRenderedRef.current = true;
      console.log(`✅ [AuthModal] reCAPTCHA เรนเดอร์สำเร็จ (Widget ID: ${widgetIdRef.current})`);
    } catch (e) {
      console.error('❌ [AuthModal] ข้อผิดพลาดในการเรนเดอร์ reCAPTCHA:', e);
      setError('เกิดข้อผิดพลาดในการตั้งค่า reCAPTCHA');
      setIsLoading(false);
      isRecaptchaRenderedRef.current = false;
    }
  }, [siteKey, onRecaptchaSuccess, onRecaptchaExpiredOrError]);

  const loadRecaptchaScript = useCallback(() => {
    if (typeof window === 'undefined') return;
    const win = window as ReCaptchaWindow;
    if (win.grecaptcha && win.grecaptcha.ready) {
      win.grecaptcha.ready(renderRecaptcha);
      return;
    }
    const existingScript = document.getElementById('recaptcha-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaApiLoad&render=explicit&hl=th`;
      script.async = true;
      script.defer = true;
      script.id = "recaptcha-script";
      document.head.appendChild(script);
      (window as any).onRecaptchaApiLoad = () => { // ฟังก์ชัน callback ที่จะถูกเรียกเมื่อ script โหลดเสร็จ
        console.log("✅ [AuthModal] reCAPTCHA API script loaded via onload callback.");
        const winOnload = window as ReCaptchaWindow;
        if (winOnload.grecaptcha && winOnload.grecaptcha.ready) {
          winOnload.grecaptcha.ready(renderRecaptcha);
        } else {
          console.warn("⚠️ [AuthModal] grecaptcha ไม่พร้อมใช้งานหลังโหลดสคริปต์ (onload)");
          setError("ไม่สามารถเริ่มต้น reCAPTCHA ได้ (grecaptcha not ready after onload)");
        }
      };
      script.onerror = () => {
        console.error("❌ [AuthModal] ล้มเหลวในการโหลดสคริปต์ reCAPTCHA");
        setError("ไม่สามารถโหลด reCAPTCHA ได้");
      };
    } else if (!(win.grecaptcha && win.grecaptcha.ready)) {
        // Script exists but grecaptcha not ready, retry with interval
        let attempts = 0;
        const intervalId = setInterval(() => {
            attempts++;
            const winRetry = window as ReCaptchaWindow;
            if (winRetry.grecaptcha && winRetry.grecaptcha.ready) {
            clearInterval(intervalId);
            winRetry.grecaptcha.ready(renderRecaptcha);
            } else if (attempts > 25) { // 5 seconds
            clearInterval(intervalId);
            console.error("❌ [AuthModal] Timeout: grecaptcha ไม่พร้อมใช้งาน (script existed)");
            setError("ไม่สามารถเริ่มต้น reCAPTCHA (timeout, script existed)");
            }
        }, 200);
    } else {
        // Script exists and grecaptcha is ready
        win.grecaptcha.ready(renderRecaptcha);
    }
  }, [renderRecaptcha]);

  const executeRecaptcha = useCallback(() => {
    console.log("🔄 [AuthModal] เริ่ม execute reCAPTCHA...");
    if (typeof window === 'undefined') return;
    const win = window as ReCaptchaWindow;

    if (!siteKey) {
      setError('การตั้งค่า reCAPTCHA ไม่ถูกต้อง (Site Key)');
      setIsLoading(false);
      console.error("❌ [AuthModal] [executeRecaptcha] ไม่มี Site Key");
      return;
    }
    if (!win.grecaptcha || typeof win.grecaptcha.execute !== 'function' || widgetIdRef.current === null) {
      setError('reCAPTCHA ยังไม่พร้อมใช้งาน กรุณาลองอีกครั้ง');
      setIsLoading(false);
      console.warn("⚠️ [AuthModal] [executeRecaptcha] reCAPTCHA ไม่พร้อม execute, พยายามโหลดใหม่...");
      isRecaptchaRenderedRef.current = false; // บังคับให้ render ใหม่
      loadRecaptchaScript(); // ลองโหลด/render ใหม่
      return;
    }
    try {
      console.log(`ℹ️ [AuthModal] [executeRecaptcha] Executing widget ID: ${widgetIdRef.current}`);
      win.grecaptcha.execute(widgetIdRef.current);
    } catch (error) {
      console.error('❌ [AuthModal] [executeRecaptcha] ข้อผิดพลาด:', error);
      setError('เกิดข้อผิดพลาดในการเริ่ม reCAPTCHA');
      setIsLoading(false);
    }
  }, [loadRecaptchaScript, siteKey]);

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
        if (!usernameVal.valid) return usernameVal.message;
      }
      if (field === 'password') {
        if (!value.trim()) return 'กรุณาระบุรหัสผ่าน';
        const passwordVal = validatePassword(value);
        if (!passwordVal.valid) return passwordVal.message;
      }
      if (field === 'confirmPassword') {
        if (!value.trim()) return 'กรุณายืนยันรหัสผ่าน';
        const confirmVal = validateConfirmPassword(currentModeData.password || '', value);
        if (!confirmVal.valid) return confirmVal.message;
      }
    } else if (mode === 'signin' && field === 'password') {
      if (!value.trim()) return 'กรุณาระบุรหัสผ่าน';
    }
    return undefined;
  }, [mode, formData]);

  const validateForm = useCallback((): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    const currentModeData = formData[mode];
    const idError = validateField('identifier', currentModeData.identifier);
    if (idError) newErrors.identifier = idError;
    const pwError = validateField('password', currentModeData.password);
    if (pwError) newErrors.password = pwError;
    if (mode === 'signup') {
      const unError = validateField('username', currentModeData.username || '');
      if (unError) newErrors.username = unError;
      const cpError = validateField('confirmPassword', currentModeData.confirmPassword || '');
      if (cpError) newErrors.confirmPassword = cpError;
    }
    return newErrors;
  }, [formData, mode, validateField]);

  useEffect(() => {
    const updateValidation = () => {
      if (Object.keys(touchedFields).length > 0) setValidationErrors(validateForm());
    };
    const debouncedValidation = setTimeout(updateValidation, 300);
    return () => clearTimeout(debouncedValidation);
  }, [formData, touchedFields, validateForm]);

  const handleBlur = (field: keyof ValidationErrors) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const currentModeData = formData[mode];
    let value = '';
    if (field === 'identifier') value = currentModeData.identifier;
    else if (field === 'username' && mode === 'signup') value = currentModeData.username || '';
    else if (field === 'password') value = currentModeData.password;
    else if (field === 'confirmPassword' && mode === 'signup') value = currentModeData.confirmPassword || '';

    // ไม่ setValidationErrors ที่นี่ทันที ปล่อยให้ useEffect ด้านบนจัดการ debounced validation
    // แต่ถ้าต้องการ validate ทันทีเมื่อ blur ก็ทำได้:
    // setValidationErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
  };


  const handleInputChange = (field: keyof FormDataFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    updateFormData(field, value);
    // การ validate จะถูก trigger โดย useEffect [formData, touchedFields, validateForm]
    // ถ้าต้องการ validate ทันทีที่พิมพ์สำหรับ field ที่ถูก touched แล้ว:
    if (touchedFields[field as string]) {
      setValidationErrors(prev => ({ ...prev, [field as string]: validateField(field as keyof ValidationErrors, value) }));
    }
    // Validate confirmPassword เมื่อ password ในโหมด signup เปลี่ยน
    if (mode === 'signup' && field === 'password' && touchedFields.confirmPassword) {
      setValidationErrors(prev => ({ ...prev, confirmPassword: validateField('confirmPassword', formData.signup.confirmPassword || '') }));
    }
  };

  // --- จัดการ UI และ Effects ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // ตรวจสอบว่าคลิกนอก modal content หรือไม่
      if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // ป้องกัน scroll ของ body เมื่อ modal เปิด
      document.addEventListener('mousedown', handleClickOutside);
      // Focus input แรกเมื่อ modal เปิดและเปลี่ยนโหมด
      setTimeout(() => {
        const firstInput = document.getElementById(mode === 'signin' ? 'identifier' : 'identifier') as HTMLInputElement | null;
        firstInput?.focus();
      }, 150); // หน่วงเวลาเล็กน้อยเพื่อให้ modal render เสร็จ
    } else {
      document.body.style.overflow = ''; // คืนค่า scroll ของ body
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = ''; // คืนค่า scroll ของ body เมื่อ component unmount
    };
  }, [isOpen, onClose, mode]);


  useEffect(() => {
    // Reset states เมื่อ modal ปิด หรือเปลี่ยนโหมด
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRecaptchaAttempts(0);
    recaptchaTokenRef.current = null;
    // ไม่ reset isRecaptchaRenderedRef ที่นี่ เพราะ script อาจจะยังโหลดอยู่
    // แต่ widgetIdRef ควร reset ถ้า re-render
    const win = window as ReCaptchaWindow;
    if (widgetIdRef.current !== null && win.grecaptcha && typeof win.grecaptcha.reset === 'function') {
        try { win.grecaptcha.reset(widgetIdRef.current); }
        catch(e) { console.warn("⚠️ [AuthModal] ไม่สามารถรีเซ็ต reCAPTCHA widget (useEffect [isOpen, mode]):", e); }
    }
    // widgetIdRef.current = null; // รีเซ็ต widget ID เพื่อให้ re-render ใหม่ถ้าจำเป็น

    if (isOpen && mode === 'signup') {
      if (!siteKey) {
        setError("การตั้งค่า reCAPTCHA ไม่สมบูรณ์ (Site Key)");
        console.error("❌ [AuthModal] ไม่มี Site Key สำหรับ reCAPTCHA ในโหมด signup (useEffect)");
      } else if (!isRecaptchaRenderedRef.current) { // โหลด script และ render reCAPTCHA ถ้ายังไม่ได้ทำ
        loadRecaptchaScript();
      }
    }
  }, [isOpen, mode, loadRecaptchaScript, siteKey]); // เอา isRecaptchaRenderedRef ออกจาก dependency array เพื่อไม่ให้ loop

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const preSignupValidation = (): boolean => {
    setError(null);
    setSuccessMessage(null);
    // Mark all signup fields as touched to show all errors
    setTouchedFields({ identifier: true, username: true, password: true, confirmPassword: true });
    const formErrors = validateForm();
    setValidationErrors(formErrors);
    if (Object.keys(formErrors).some(key => formErrors[key as keyof ValidationErrors])) { // Check if any error exists
      setError("กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง");
      return false;
    }
    return true;
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 [AuthModal] ส่งฟอร์มสมัครสมาชิก...");
    if (!preSignupValidation()) {
      setIsLoading(false); // หยุด loading ถ้า validation ไม่ผ่าน
      return;
    }
    if (!siteKey) {
      setError("การตั้งค่า reCAPTCHA ไม่สมบูรณ์ (Site Key)");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null); // เคลียร์ error เก่า
    setSuccessMessage(null); // เคลียร์ success message เก่า
    console.log("🔄 [AuthModal] เรียก executeRecaptcha สำหรับ signup...");
    executeRecaptcha(); // reCAPTCHA callback (onRecaptchaSuccess) จะเรียก doActualSignupSubmission
  };

  const handleSigninSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 [AuthModal] ส่งฟอร์มลงชื่อเข้าใช้...");
    setError(null);
    setSuccessMessage(null);
    setTouchedFields({ identifier: true, password: true }); // Mark fields as touched
    const formErrors = validateForm();
    setValidationErrors(formErrors);

    if (formErrors.identifier || formErrors.password) {
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
        setError(result.error);
      } else if (result.success && result.ok) {
        setSuccessMessage('ลงชื่อเข้าใช้สำเร็จ!');
        console.log("✅ [AuthModal] ลงชื่อเข้าใช้สำเร็จ, User (SessionUser) จาก Context:", result.user);
        // onClose(); // ปิด modal หลังจากหน่วงเวลา หรือทันที
        setTimeout(() => { onClose(); }, 1000); // ปิด modal หลังจาก 1 วินาที
      } else {
        setError(result.error || 'การลงชื่อเข้าใช้ล้มเหลวโดยไม่ทราบสาเหตุ');
      }
    } catch (err: any) {
      console.error('❌ [AuthModal] ข้อผิดพลาดในการลงชื่อเข้าใช้ (เรียก AuthContext):', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการลงชื่อเข้าใช้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'twitter' | 'apple' | 'line') => {
    console.log(`🚀 [AuthModal] เริ่มลงชื่อเข้าใช้ด้วย ${provider}...`);
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true); // AuthContext.signInWithSocial จะ setLoading เอง แต่เราก็ set ที่นี่ได้
    try {
      await signInWithSocial(provider);
      // Social sign in มักจะ redirect, ถ้าไม่ redirect หรือ error จะถูกจัดการใน AuthContext
      // onClose(); // อาจจะไม่ต้องปิด modal ที่นี่ถ้ามีการ redirect
    } catch (error: any) { // Error จาก AuthContext.signInWithSocial
      setError(`ไม่สามารถลงชื่อเข้าใช้ด้วย ${provider}: ${error.message || 'เกิดข้อผิดพลาด'}`);
      setIsLoading(false); // หยุด loading ถ้ามี error ที่นี่
    }
    // ไม่ต้อง setLoading(false) ที่นี่ถ้า redirect สำเร็จ เพราะ component จะ unmount
  };

  if (!isOpen) return null; // ถ้า modal ไม่เปิด ไม่ต้อง render อะไรเลย

  // ตรวจสอบ siteKey สำหรับโหมด signup (ย้ายมาทำหลัง if !isOpen)
  if (mode === 'signup' && !siteKey) {
    // แสดง Error UI แบบง่ายๆ ถ้า reCAPTCHA site key ไม่มี
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
        <div className="bg-card w-full max-w-md rounded-lg shadow-lg p-6 text-center border border-border">
          <FiAlertCircle className="text-red-500 text-4xl mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-card-foreground mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-sm text-muted-foreground mb-6">ไม่สามารถใช้งานฟังก์ชันสมัครสมาชิกได้ในขณะนี้ (การตั้งค่า reCAPTCHA ของเว็บไซต์ไม่สมบูรณ์)</p>
          <motion.button onClick={onClose} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            ปิด
          </motion.button>
        </div>
      </div>
    );
  }


  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: "easeIn" } }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        // Backdrop Element: ทำให้เต็มจอและอยู่หลังสุดของ modal
        <motion.div
          key="auth-modal-backdrop"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={backdropVariants}
          className="fixed inset-0 z-[999] bg-background/50 backdrop-blur-sm" // ใช้ bg-background/50 และ backdrop-blur-sm
          aria-hidden="true" // Backdrop ไม่ควร interactive
        />
      )}
      {isOpen && (
        // Modal Container: fixed, z-index สูงกว่า backdrop, จัดกลางจอ
        <motion.div
            key="auth-modal-container"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4" // p-4 เพื่อให้มี space รอบ modal บนจอมือถือ
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title" // ต้องมี id นี้ที่ h2 title
        >
          {/* Modal Content Box */}
          <div
            ref={modalContentRef} // Ref สำหรับการคลิกนอก modal
            className="bg-card w-full sm:w-[90%] md:w-[650px] lg:w-[750px] rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden"
            // เพิ่ม shadow-2xl และ border เพื่อให้เด่นชัด
          >
            {/* Header */}
            <div className="relative w-full py-5 px-6 md:px-8 border-b border-border bg-gradient-to-r from-primary to-secondary">
              <h2 id="auth-modal-title" className="text-xl md:text-2xl font-bold text-center text-card-foreground">
                {mode === 'signin' ? 'ลงชื่อเข้าใช้งาน' : 'สร้างบัญชีใหม่'}
              </h2>
              <motion.button
                onClick={onClose}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive transition-colors duration-200 cursor-pointer p-2 hover:bg-secondary rounded-full"
                aria-label="ปิดหน้าต่าง"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX size={22} />
              </motion.button>
              {mode === 'signup' && (
               <motion.button
                  onClick={() => {
                    setMode('signin'); setValidationErrors({}); setTouchedFields({}); setError(null); setSuccessMessage(null);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer flex items-center gap-1 p-2 rounded-md hover:bg-secondary"
                  aria-label="กลับไปที่ลงชื่อเข้าใช้"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                >
                  <FiArrowLeft className="text-foreground mt-px" size={18} />
                  <span className="text-xs text-foreground md:text-sm hidden sm:inline">กลับ</span>
                </motion.button>
              )}
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto auth-modal-scrollbar">
              <div className="p-6 md:p-8 lg:p-10">
                <motion.div
                  className="flex flex-col md:flex-row md:items-start gap-8 md:gap-10"
                  key={mode} // ให้ re-animate เมื่อ mode เปลี่ยน
                  initial={{ opacity: 0, x: mode === 'signin' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {/* Form Section */}
                  <div className="flex flex-col space-y-6 flex-1 w-full min-w-0"> {/* Added min-w-0 for flex child */}
                    <div className="mb-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {mode === 'signin' ? 'เข้าสู่บัญชีของคุณ' : 'ข้อมูลบัญชีใหม่'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {mode === 'signin' ? 'ลงชื่อเข้าใช้ด้วยอีเมลหรือชื่อผู้ใช้' : 'กรอกข้อมูลเพื่อสร้างบัญชีใหม่'}
                      </p>
                    </div>
                    <form onSubmit={mode === 'signin' ? handleSigninSubmit : handleSignupSubmit} className="space-y-5">
                      {/* InputFields คงเดิม */}
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
                        <div ref={recaptchaRef} id="recaptcha-container-signup" className="g-recaptcha mt-1"></div>
                      )}

                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-primary hover:bg-primary/90 cursor-pointer text-primary-foreground font-medium rounded-md shadow-lg flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        aria-label={mode === 'signin' ? "ลงชื่อเข้าใช้" : "สร้างบัญชี"}
                        whileHover={{ scale: isLoading ? 1 : 1.03, boxShadow: "var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)" }} // ใช้ตัวแปร CSS สำหรับ shadow ถ้ามี
                        whileTap={{ scale: isLoading ? 1 : 0.97 }}
                        animate={isLoading ? { opacity: [1, 0.7, 1] } : {}}
                        transition={isLoading ? { opacity: { duration: 1, repeat: Infinity } } : { duration: 0.2 }}
                      >
                        {isLoading ? (
                          <> <LoadingSpinner size="sm" color="currentColor" /> <span>กำลังดำเนินการ...</span> </>
                        ) : mode === 'signin' ? (
                          <> <FiLogIn size={20} /> <span className="text-base">ลงชื่อเข้าใช้</span> </>
                        ) : (
                          <> <FiUserPlus size={20} /> <span className="text-base">สร้างบัญชี</span> </>
                        )}
                      </motion.button>

                      {mode === 'signup' && (
                        <p className="text-center text-xs text-muted-foreground mt-3">
                          เว็บไซต์นี้ป้องกันด้วย Google reCAPTCHA <br/>
                          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                            นโยบายความเป็นส่วนตัว
                          </a> &{' '}
                          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                            ข้อกำหนดการให้บริการ
                          </a> ของ Google มีผลบังคับใช้
                        </p>
                      )}
                      {mode === 'signin' && (
                        <div className="text-center pt-1">
                          <a href="/forgot-password" className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors">
                            ลืมรหัสผ่าน?
                          </a>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Social Login Section */}
                  {mode === 'signin' && (
                    <div className="flex flex-col w-full md:w-auto md:max-w-xs mx-auto space-y-4 md:border-l md:border-border md:pl-8 lg:pl-10 pt-6 md:pt-0">
                      <div className="mb-2 text-center md:text-left">
                        <h3 className="text-base font-semibold text-foreground">หรือเข้าสู่ระบบด้วย</h3>
                      </div>
                      <div className="space-y-3">
                        <SocialButton provider="google" icon={<FaGoogle />} label="Google" onClick={() => handleSocialSignIn('google')} disabled={isLoading} className="w-full"/>
                        <SocialButton provider="facebook" icon={<FaFacebook />} label="Facebook" onClick={() => handleSocialSignIn('facebook')} disabled={isLoading} className="w-full"/>
                        <div className="grid grid-cols-2 gap-3">
                          <SocialButton provider="twitter" icon={<FaTwitter />} label="Twitter / X" onClick={() => handleSocialSignIn('twitter')} disabled={isLoading} />
                          <SocialButton provider="apple" icon={<FaApple />} label="Apple" onClick={() => handleSocialSignIn('apple')} disabled={isLoading} />
                        </div>
                        <SocialButton provider="line" icon={<SiLine />} label="Line" onClick={() => handleSocialSignIn('line')} disabled={isLoading} className="w-full"/>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border p-6 bg-secondary/30">
              <div className="text-center text-sm text-muted-foreground">
                {mode === 'signin' ? (
                  <>
                    ยังไม่มีบัญชี?{' '}
                    <motion.button type="button" onClick={() => { setMode('signup'); setValidationErrors({}); setTouchedFields({}); setError(null); setSuccessMessage(null); }}
                      className="text-primary hover:text-primary/80 font-medium hover:underline cursor-pointer"
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      สร้างบัญชีใหม่
                    </motion.button>
                  </>
                ) : (
                  <>
                    มีบัญชีอยู่แล้ว?{' '}
                    <motion.button type="button" onClick={() => { setMode('signin'); setValidationErrors({}); setTouchedFields({}); setError(null); setSuccessMessage(null); }}
                      className="text-primary hover:text-primary/80 font-medium hover:underline cursor-pointer"
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      ลงชื่อเข้าใช้
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    // ไม่มีการใช้ document.body ที่นี่แล้วสำหรับ createPortal
  );
}