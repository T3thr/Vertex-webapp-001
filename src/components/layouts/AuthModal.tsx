// src/components/layouts/AuthModal.tsx

"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { validateEmail, validatePassword, validateUsername, validateConfirmPassword } from '@/backend/utils/validation';
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
          className={`w-full py-3.5 pl-12 pr-12 bg-secondary/50 text-secondary-foreground rounded-xl transition-all duration-200
            text-base placeholder:text-muted-foreground/60 placeholder:font-light shadow-sm focus:ring-3
            ${hasError
              ? 'border border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border border-accent focus:border-primary focus:ring-primary/20'}`}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
        {showPasswordToggle && toggleShowPassword && (
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
      {helpText && !hasError && (
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
  const styles = {
    error: {
      bg: "bg-red-50 dark:bg-red-900/30",
      border: "border-red-300 dark:border-red-800",
      text: "text-red-700 dark:text-red-300",
      icon: <FiAlertCircle size={20} className="mt-0.5 flex-shrink-0" />
    },
    success: {
      bg: "bg-green-50 dark:bg-green-900/30",
      border: "border-green-300 dark:border-green-800",
      text: "text-green-700 dark:text-green-300",
      icon: <FiCheck size={20} className="mt-0.5 flex-shrink-0" />
    }
  };

  return (
    <div className={`p-4 ${styles[type].bg} border ${styles[type].border} rounded-xl flex items-start gap-3 ${styles[type].text} text-sm animate-slideIn mb-6`}>
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

type AuthMode = 'signin' | 'signup';
type ValidationErrors = {
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
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [triggerRecaptcha, setTriggerRecaptcha] = useState(false);
  const [recaptchaAttempts, setRecaptchaAttempts] = useState(0);

  // reCAPTCHA สถานะและ refs
  const isMountedRef = useRef(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const isRenderedRef = useRef(false);
  const scriptLoadedRef = useRef(false);
  const recaptchaTokenRef = useRef<string | null>(null);

  // ใช้ค่า SITE KEY จาก environment variable
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Context
  const { signUp } = useAuth();

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
        handleReCaptchaVerify(null);
      };
    }
  }, []);

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
      handleReCaptchaVerify(null);
      return;
    }

    try {
      const recaptchaCallback = (token: string) => {
        console.log('✅ ได้รับโทเค็น reCAPTCHA v2 Invisible');
        recaptchaTokenRef.current = token;
        handleReCaptchaVerify(token);
      };

      const recaptchaExpired = () => {
        console.log('⚠️ โทเค็น reCAPTCHA หมดอายุ');
        recaptchaTokenRef.current = null;
        handleReCaptchaVerify(null);
        if (widgetIdRef.current !== null) {
          win.grecaptcha?.reset(widgetIdRef.current);
        }
      };

      const recaptchaError = () => {
        console.error('❌ เกิดข้อผิดพลาดใน reCAPTCHA');
        recaptchaTokenRef.current = null;
        handleReCaptchaVerify(null);
      };

      // เรนเดอร์ reCAPTCHA v2 Invisible
      const widgetId = win.grecaptcha.render(recaptchaRef.current, {
        sitekey: siteKey,
        callback: recaptchaCallback,
        'expired-callback': recaptchaExpired,
        'error-callback': recaptchaError,
        size: 'invisible',
        badge: 'bottomright',
      });

      widgetIdRef.current = widgetId;
      isRenderedRef.current = true;
      console.log('✅ reCAPTCHA v2 Invisible เรนเดอร์สำเร็จ');
    } catch (error) {
      console.error('❌ ข้อผิดพลาดในการเรนเดอร์ reCAPTCHA:', error);
      isRenderedRef.current = false;
      handleReCaptchaVerify(null);
    }
  }, [siteKey]);

  // ฟังก์ชันเรียกใช้ reCAPTCHA
  const executeRecaptcha = useCallback(() => {
    const win = window as ReCaptchaWindow;
    if (!win.grecaptcha || widgetIdRef.current === null) {
      console.error('❌ grecaptcha หรือ widget ID ไม่พร้อมใช้งาน');
      handleReCaptchaVerify(null);
      return;
    }

    try {
      win.grecaptcha.execute(widgetIdRef.current);
      console.log('🚀 เรียกใช้ reCAPTCHA v2 Invisible');
    } catch (error) {
      console.error('❌ ข้อผิดพลาดในการเรียกใช้ reCAPTCHA:', error);
      handleReCaptchaVerify(null);
    }
  }, []);

  // เพิ่มฟังก์ชัน debounce สำหรับ validation แบบ realtime
  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // ฟังก์ชันสำหรับตรวจสอบการป้อนข้อมูลแบบ realtime
  const validateField = (field: 'email' | 'username' | 'password' | 'confirmPassword', value: string) => {
    const fieldErrors: ValidationErrors = {};

    if (field === 'email') {
      if (!value.trim()) {
        fieldErrors.email = 'กรุณาระบุอีเมล';
      } else if (!validateEmail(value)) {
        fieldErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
      }
    }

    if (field === 'username' && mode === 'signup') {
      if (!value.trim()) {
        fieldErrors.username = 'กรุณาระบุชื่อผู้ใช้';
      } else {
        const usernameValidation = validateUsername(value);
        if (!usernameValidation.valid) {
          fieldErrors.username = usernameValidation.message || 'ชื่อผู้ใช้ไม่ถูกต้อง';
        }
      }
    }

    if (field === 'password') {
      if (!value.trim()) {
        fieldErrors.password = 'กรุณาระบุรหัสผ่าน';
      } else if (mode === 'signup') {
        const passwordValidation = validatePassword(value);
        if (!passwordValidation.valid) {
          fieldErrors.password = passwordValidation.message || 'รหัสผ่านไม่ถูกต้อง';
        }
      }

      // ตรวจสอบความตรงกันของรหัสผ่านทันทีเมื่อรหัสผ่านเปลี่ยน
      if (mode === 'signup' && touchedFields.confirmPassword && confirmPassword) {
        const confirmResult = validateConfirmPassword(value, confirmPassword);
        if (!confirmResult.valid) {
          fieldErrors.confirmPassword = confirmResult.message;
        } else {
          // อัปเดตเฉพาะ confirmPassword ถ้ารหัสผ่านตรงกัน
          setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }));
        }
      }
    }

    if (field === 'confirmPassword' && mode === 'signup') {
      const confirmResult = validateConfirmPassword(password, value);
      if (!confirmResult.valid) {
        fieldErrors.confirmPassword = confirmResult.message;
      }
    }

    return fieldErrors;
  };

  // ฟังก์ชันสำหรับอัปเดต validation errors แบบ debounced (หน่วงเวลา)
  const debouncedUpdateValidation = useCallback(
    debounce((field: 'email' | 'username' | 'password' | 'confirmPassword', value: string) => {
      if (touchedFields[field]) {
        const fieldErrors = validateField(field, value);
        setValidationErrors(prev => ({ ...prev, ...fieldErrors }));
      }
    }, 100), // หน่วงเวลา 100ms เพื่อการตอบสนองที่เร็วขึ้น
    [touchedFields, mode, password, confirmPassword]
  );

  // ฟังก์ชันสำหรับตรวจสอบความถูกต้องทั้งฟอร์ม
  const validateForm = () => {
    const formErrors: ValidationErrors = {};

    // ตรวจสอบอีเมล
    const emailErrors = validateField('email', email);
    if (emailErrors.email) formErrors.email = emailErrors.email;

    // ตรวจสอบชื่อผู้ใช้ (เฉพาะโหมดสมัครสมาชิก)
    if (mode === 'signup') {
      const usernameErrors = validateField('username', username);
      if (usernameErrors.username) formErrors.username = usernameErrors.username;
    }

    // ตรวจสอบรหัสผ่าน
    const passwordErrors = validateField('password', password);
    if (passwordErrors.password) formErrors.password = passwordErrors.password;

    // ตรวจสอบยืนยันรหัสผ่าน (เฉพาะโหมดสมัครสมาชิก)
    if (mode === 'signup') {
      const confirmPasswordErrors = validateField('confirmPassword', confirmPassword);
      if (confirmPasswordErrors.confirmPassword) formErrors.confirmPassword = confirmPasswordErrors.confirmPassword;
    }

    return formErrors;
  };

  // ฟังก์ชันเมื่อผู้ใช้ออกจากฟิลด์ (blur)
  const handleBlur = (field: 'email' | 'username' | 'password' | 'confirmPassword') => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    const value = field === 'email' ? email :
                  field === 'username' ? username :
                  field === 'password' ? password : confirmPassword;
    const fieldErrors = validateField(field, value);

    setValidationErrors(prev => ({ ...prev, ...fieldErrors }));
  };

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setEmail(newValue);
    debouncedUpdateValidation('email', newValue);
  };

  // Handle username change with validation
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setUsername(newValue);
    debouncedUpdateValidation('username', newValue);
  };

  // Handle password change with validation
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setPassword(newValue);
    debouncedUpdateValidation('password', newValue);

    // ตรวจสอบความตรงกันของรหัสผ่านทันทีเมื่อรหัสผ่านเปลี่ยน
    if (touchedFields.confirmPassword && confirmPassword) {
      debouncedUpdateValidation('confirmPassword', confirmPassword);
    }
  };

  // Handle confirm password change with validation
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setConfirmPassword(newValue);
    debouncedUpdateValidation('confirmPassword', newValue);
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
      document.body.style.overflow = 'hidden';

      // Focus อีเมลเมื่อเปิดหน้าต่าง
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset form and reCAPTCHA when modal opens/closes or mode changes - รีเซ็ตฟอร์มและ reCAPTCHA เมื่อหน้าต่างเปิด/ปิด หรือเมื่อโหมดเปลี่ยน
  useEffect(() => {
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setValidationErrors({});
    setTouchedFields({});
    setIsLoading(false);
    setIsSuccess(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setTriggerRecaptcha(false);
    setRecaptchaAttempts(0);
    recaptchaTokenRef.current = null;
    isRenderedRef.current = false;
    widgetIdRef.current = null;
    isMountedRef.current = false;

    // โหลดสคริปต์ reCAPTCHA เฉพาะในโหมดสมัครสมาชิก
    if (isOpen && mode === 'signup') {
      loadRecaptchaScript();
    }

    // Cleanup reCAPTCHA เมื่อคอมโพเนนต์ unmount หรือเปลี่ยนโหมด
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
  }, [isOpen, mode, loadRecaptchaScript]);

  // Handle ESC key to close modal - จัดการปุ่ม ESC เพื่อปิดหน้าต่าง
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // เรียกใช้ reCAPTCHA เมื่อ trigger เปลี่ยนเป็น true
  useEffect(() => {
    if (triggerRecaptcha && isRenderedRef.current && widgetIdRef.current !== null) {
      executeRecaptcha();
    } else if (triggerRecaptcha && !isRenderedRef.current) {
      const win = window as ReCaptchaWindow;
      if (win.grecaptcha) {
        renderRecaptcha();
        setTimeout(() => {
          if (isRenderedRef.current && widgetIdRef.current !== null) {
            executeRecaptcha();
          } else {
            console.error('❌ ไม่สามารถเรียกใช้ reCAPTCHA หลังพยายามเรนเดอร์');
            handleReCaptchaVerify(null);
          }
        }, 500);
      } else {
        console.error('❌ grecaptcha ยังไม่พร้อมใช้งาน');
        handleReCaptchaVerify(null);
      }
    }
  }, [triggerRecaptcha, executeRecaptcha, renderRecaptcha]);

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
    } else if (recaptchaTokenRef.current === null && isLoading && !triggerRecaptcha) {
      // ถ้าไม่ได้รับ token และไม่ได้กำลังพยายามเรียกใช้ reCAPTCHA
      setError('การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่');
      setIsLoading(false);
    }
  }, [recaptchaTokenRef.current, isLoading, triggerRecaptcha, email, username, password, signUp]);

  // Toggle password visibility - สลับการแสดงรหัสผ่าน
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // Toggle confirm password visibility - สลับการแสดงยืนยันรหัสผ่าน
  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // ฟังก์ชันสำหรับจัดการเมื่อได้รับโทเค็น reCAPTCHA
  const handleReCaptchaVerify = useCallback((token: string | null) => {
    if (!token) {
      setRecaptchaAttempts(prev => prev + 1);
      if (recaptchaAttempts + 1 >= MAX_RECAPTCHA_ATTEMPTS) {
        setError('ถึงจำนวนครั้งสูงสุดของการยืนยัน reCAPTCHA กรุณาลองใหม่ภายหลัง');
        setIsLoading(false);
        setTriggerRecaptcha(false);
      } else {
        setError('การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่');
        setIsLoading(false);
        setTriggerRecaptcha(true);
      }
    }
  }, [recaptchaAttempts]);

  // ฟังก์ชันสำหรับตรวจสอบฟอร์มก่อนเรียก reCAPTCHA
  const handleSignupValidation = () => {
    // ทำให้ทุกฟิลด์เป็น touched เพื่อแสดง validation errors
    setTouchedFields({
      email: true,
      username: true,
      password: true,
      confirmPassword: true
    });

    // ตรวจสอบความถูกต้องของฟอร์ม
    const formErrors = validateForm();
    setValidationErrors(formErrors);

    // ถ้ามี errors ให้หยุดการดำเนินการ
    if (Object.keys(formErrors).length > 0) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
      return false;
    }

    return true;
  };

  // ฟังก์ชันจัดการการส่งฟอร์มสมัครสมาชิก
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleSignupValidation()) return;
    setError(null);
    setIsLoading(true);
    // เรียกใช้ reCAPTCHA
    handleReCaptchaVerify(null); // รีเซ็ต token ก่อน
    setTimeout(() => {
      setTriggerRecaptcha(true);
    }, 100);
  };

  // Form submission handler for signin - ตัวจัดการการส่งฟอร์มสำหรับการลงชื่อเข้าใช้
  const handleSigninSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // ทำให้ทุกฟิลด์เป็น touched เพื่อแสดง validation errors
    setTouchedFields({
      email: true,
      password: true
    });

    // ตรวจสอบความถูกต้องของฟอร์มแบบ realtime ก่อนส่ง
    const formErrors = validateForm();
    setValidationErrors(formErrors);

    // ถ้ามี errors ให้หยุดการ submit
    if (Object.keys(formErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      // ลงชื่อเข้าใช้ด้วยข้อมูลประจำตัว
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดที่ไม่คาดคิด');
      console.error('❌ ข้อผิดพลาดในการตรวจสอบ:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Social sign in handler - ตัวจัดการลงชื่อเข้าใช้ผ่านโซเชียลมีเดีย
  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'twitter' | 'apple' | 'line') => {
    try {
      setIsLoading(true);
      const result = await signIn(provider, {
        redirect: false,
        callbackUrl: window.location.href,
      });

      if (result?.error) {
        setError(`ไม่สามารถลงชื่อเข้าใช้ด้วย ${provider}: ${result.error}`);
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1000);
      }
    } catch (error: any) {
      console.error(`❌ ข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย ${provider}:`, error);
      setError(`ไม่สามารถลงชื่อเข้าใช้ด้วย ${provider}: ${error.message || "ข้อผิดพลาดที่ไม่รู้จัก"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // เช็คว่าควรแสดงหน้าต่างหรือไม่
  if (!isOpen) return null;

  // ตรวจสอบว่า siteKey มีค่าหรือไม่ในโหมดสมัครสมาชิก
  if (mode === 'signup' && !siteKey) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-card w-full sm:w-[90%] md:w-[650px] rounded-3xl shadow-2xl p-6 text-center"
        >
          <p className="text-red-500 text-sm">ข้อผิดพลาด: ไม่พบคีย์ reCAPTCHA ใน environment variables</p>
          <button
            onClick={onClose}
            className="mt-4 text-primary hover:text-primary/80 underline"
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
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: { duration: 0.2, ease: "easeIn" }
    }
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
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={backdropVariants}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-md p-4"
        >
          <motion.div
            ref={modalRef}
            variants={modalVariants}
            className="bg-card w-full sm:w-[90%] md:w-[650px] lg:w-[750px] rounded-3xl shadow-2xl overflow-hidden border border-accent/20 flex flex-col max-h-[90vh]"
          >
            {/* Modal Header - ส่วนหัวของหน้าต่าง */}
            <div className="relative w-full py-7 px-8 border-b border-accent/50 bg-gradient-to-r from-primary/15 to-blue-500/15">
              <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                {mode === 'signin' ? 'ลงชื่อเข้าใช้งาน' : 'สร้างบัญชีใหม่'}
              </h2>

              <button
                onClick={onClose}
                className="absolute right-4 top-2 text-muted-foreground hover:text-foreground transition-colors duration-200 p-2 hover:bg-secondary/50 rounded-full"
                aria-label="ปิดหน้าต่าง"
              >
                <FiX size={24} />
              </button>

              {mode === 'signup' && (
                <button
                  onClick={() => setMode('signin')}
                  className="absolute left-5 top-2 text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-secondary/50"
                  aria-label="กลับไปที่ลงชื่อเข้าใช้"
                >
                  <FiArrowLeft size={20} />
                  <span className="text-sm">กลับ</span>
                </button>
              )}
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 md:p-10 overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-secondary">
                {/* Error/Success Alerts - การแจ้งเตือนข้อผิดพลาด/สำเร็จ */}
                <AnimatePresence>
                  {error && <Alert type="error" message={error} />}
                  {isSuccess && (
                    <Alert
                      type="success"
                      message={mode === 'signin' ? 'ลงชื่อเข้าใช้สำเร็จ! กำลังนำคุณไปยังหน้าหลัก...' : 'สร้างบัญชีสำเร็จ! คุณสามารถลงชื่อเข้าใช้งานได้ทันที'}
                    />
                  )}
                </AnimatePresence>

                <div className="flex flex-col md:flex-row md:items-start items-center gap-10">
                  {/* Left Column - Form - คอลัมน์ซ้าย - ฟอร์ม */}
                  <div className="flex flex-col space-y-7 flex-1">
                    <div className="mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {mode === 'signin' ? 'เข้าสู่บัญชีของคุณ' : 'ข้อมูลบัญชีใหม่'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        {mode === 'signin'
                          ? 'ลงชื่อเข้าใช้เพื่อเข้าถึงบัญชีของคุณ'
                          : 'กรอกข้อมูลด้านล่างเพื่อสร้างบัญชีใหม่'}
                      </p>
                    </div>

                    {/* Auth Form - ฟอร์มยืนยันตัวตน */}
                    <form onSubmit={mode === 'signin' ? handleSigninSubmit : undefined} className="space-y-6 mb-6">
                      {/* Email Input - ช่องกรอกอีเมล */}
                      <InputField
                        id="email"
                        label="อีเมล"
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={() => handleBlur('email')}
                        placeholder="กรอกอีเมล เช่น your.email@example.com"
                        icon={<FiMail size={18} />}
                        required
                        error={touchedFields.email ? validationErrors.email : null}
                        touched={touchedFields.email}
                      />

                      {/* Username Input (Signup only) - ช่องกรอกชื่อผู้ใช้ (เฉพาะการสมัคร) */}
                      {mode === 'signup' && (
                        <InputField
                          id="username"
                          label="ชื่อผู้ใช้"
                          type="text"
                          value={username}
                          onChange={handleUsernameChange}
                          onBlur={() => handleBlur('username')}
                          placeholder="กรอกชื่อผู้ใช้ เช่น username_123"
                          icon={<FiUser size={18} />}
                          required
                          helpText="ชื่อผู้ใช้ต้องมีความยาว 3-20 ตัวอักษร ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _"
                          error={touchedFields.username ? validationErrors.username : null}
                          touched={touchedFields.username}
                        />
                      )}

                      {/* Password Input - ช่องกรอกรหัสผ่าน */}
                      <InputField
                        id="password"
                        label="รหัสผ่าน"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={handlePasswordChange}
                        onBlur={() => handleBlur('password')}
                        placeholder={mode === 'signup' ? 'กรอกรหัสผ่าน' : 'กรอกรหัสผ่าน'}
                        icon={<FiLock size={18} />}
                        required
                        minLength={mode === 'signup' ? 8 : 1}
                        helpText={mode === 'signup' ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร รวมตัวเลขและตัวพิมพ์ใหญ่' : undefined}
                        showPasswordToggle
                        showPassword={showPassword}
                        toggleShowPassword={toggleShowPassword}
                        error={touchedFields.password ? validationErrors.password : null}
                        touched={touchedFields.password}
                      />

                      {/* Confirm Password Input (Signup only) - ช่องกรอกยืนยันรหัสผ่าน (เฉพาะการสมัคร) */}
                      {mode === 'signup' && (
                        <InputField
                          id="confirmPassword"
                          label="ยืนยันรหัสผ่าน"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={handleConfirmPasswordChange}
                          onBlur={() => handleBlur('confirmPassword')}
                          placeholder="ยืนยันรหัสผ่าน"
                          icon={<FiLock size={18} />}
                          required
                          showPasswordToggle
                          showPassword={showConfirmPassword}
                          toggleShowPassword={toggleShowConfirmPassword}
                          error={touchedFields.confirmPassword ? validationErrors.confirmPassword : null}
                          touched={touchedFields.confirmPassword}
                        />
                      )}

                      {/* reCAPTCHA และปุ่มสมัครสมาชิก (Signup only) - การยืนยัน reCAPTCHA และปุ่มสมัครสมาชิก (เฉพาะการสมัคร) */}
                      {mode === 'signup' && (
                        <div className="space-y-4">
                          <div ref={recaptchaRef} className="g-recaptcha" data-size="invisible" />
                          <motion.button
                            type="button"
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
                      )}

                      {/* Submit Button for Signin - ปุ่มส่งข้อมูลสำหรับการลงชื่อเข้าใช้ */}
                      {mode === 'signin' && (
                        <motion.button
                          type="submit"
                          disabled={isLoading}
                          className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-lg flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-3 hover:scale-[1.01]"
                          aria-label="ลงชื่อเข้าใช้"
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
                              <FiLogIn size={20} />
                              <span className="text-lg">ลงชื่อเข้าใช้</span>
                            </>
                          )}
                        </motion.button>
                      )}

                      {/* Forgot Password (Sign in only) - ลืมรหัสผ่าน (เฉพาะการเข้าสู่ระบบ) */}
                      {mode === 'signin' && (
                        <div className="text-center pt-2">
                          <a href="/forgot-password" className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors duration-200">
                            ลืมรหัสผ่าน?
                          </a>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Right Column - Social Login (Sign in only) - คอลัมน์ขวา - การเข้าสู่ระบบด้วยโซเชียลมีเดีย (เฉพาะการลงชื่อเข้าใช้) */}
                  {mode === 'signin' && (
                    <div className="flex flex-col w-fit mx-auto space-y-5">
                      <div className="hidden md:block mb-6">
                        <h3 className="text-lg font-semibold text-foreground">
                          ทางเลือกอื่น
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          ลงชื่อเข้าใช้ด้วยบัญชีโซเชียลมีเดีย
                        </p>
                      </div>

                      {/* Divider for mobile only - ตัวคั่นสำหรับโทรศัพท์มือถือเท่านั้น */}
                      <div className="md:hidden flex items-center my-8">
                        <div className="flex-1 border-t border-accent/50"></div>
                        <span className="mx-4 text-sm text-muted-foreground font-medium">หรือ</span>
                        <div className="flex-1 border-t border-accent/50"></div>
                      </div>

                      {/* Social Login - การเข้าสู่ระบบด้วยโซเชียลมีเดีย */}
                      <div className="space-y-4">
                        <SocialButton
                          provider="google"
                          icon={<FaGoogle size={20} />}
                          label="เข้าสู่ระบบด้วย Google"
                          onClick={() => handleSocialSignIn('google')}
                          disabled={isLoading}
                          className="w-full"
                        />
                        <SocialButton
                          provider="facebook"
                          icon={<FaFacebook size={20} />}
                          label="เข้าสู่ระบบด้วย Facebook"
                          onClick={() => handleSocialSignIn('facebook')}
                          disabled={isLoading}
                          className="w-full"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <SocialButton
                            provider="twitter"
                            icon={<FaTwitter size={20} />}
                            label="Twitter"
                            onClick={() => handleSocialSignIn('twitter')}
                            disabled={isLoading}
                          />
                          <SocialButton
                            provider="apple"
                            icon={<FaApple size={20} />}
                            label="Apple"
                            onClick={() => handleSocialSignIn('apple')}
                            disabled={isLoading}
                          />
                        </div>
                        <SocialButton
                          provider="line"
                          icon={<SiLine size={20} />}
                          label="เข้าสู่ระบบด้วย Line"
                          onClick={() => handleSocialSignIn('line')}
                          disabled={isLoading}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer - ส่วนท้าย */}
              <div className="border-t border-accent/50 p-6 bg-secondary/30">
                {/* Toggle Sign In/Sign Up - สลับระหว่างเข้าสู่ระบบ/สมัครสมาชิก */}
                <div className="text-center text-sm">
                  {mode === 'signin' ? (
                    <>
                      ยังไม่มีบัญชี?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className="text-primary hover:text-primary/80 cursor-pointer font-medium transition-colors duration-200"
                      >
                        สร้างบัญชีใหม่
                      </button>
                    </>
                  ) : (
                    <>
                      มีบัญชีอยู่แล้ว?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('signin')}
                        className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors duration-200"
                      >
                        ลงชื่อเข้าใช้
                      </button>
                    </>
                  )}
                </div>

                {/* Terms and Privacy Policy (Signup only) - เงื่อนไขและนโยบายความเป็นส่วนตัว (เฉพาะการสมัคร) */}
                {mode === 'signup' && (
                  <div className="mt-3 text-xs text-center text-muted-foreground">
                    การสร้างบัญชีถือว่าคุณยอมรับ{' '}
                    <a href="/terms" className="text-primary hover:underline transition-colors duration-200">
                      เงื่อนไขการใช้งาน
                    </a>{' '}
                    และ{' '}
                    <a href="/privacy" className="text-primary hover:underline transition-colors duration-200">
                      นโยบายความเป็นส่วนตัว
                    </a>
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