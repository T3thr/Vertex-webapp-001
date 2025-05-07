// src/components/layouts/AuthModal.tsx

"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { validateEmail, validatePassword, validateUsername } from '@/backend/utils/validation';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, 
  FiLogIn, 
  FiUserPlus, 
  FiMail, 
  FiLock, 
  FiUser, 
  FiArrowLeft,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiAlertCircle
} from 'react-icons/fi';
import { 
  FaFacebook,
  FaGoogle,
  FaTwitter,
  FaApple
} from 'react-icons/fa';
import { SiLine } from 'react-icons/si';

// LoadingSpinner Component - คอมโพเนนต์แสดงการโหลด
const LoadingSpinner = ({ size = "md", color = "currentColor" }: { size?: "sm" | "md" | "lg", color?: string }) => {
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
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  // สถานะของฟอร์ม
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  
  // Context
  const { signUp } = useAuth();

  // ฟังก์ชันสำหรับตรวจสอบการป้อนข้อมูล
  const validateField = (field: 'email' | 'username' | 'password', value: string) => {
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
    }
    
    return fieldErrors;
  };

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
    
    return formErrors;
  };

  // ฟังก์ชันเมื่อผู้ใช้ออกจากฟิลด์ (blur)
  const handleBlur = (field: 'email' | 'username' | 'password') => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    const value = field === 'email' ? email : field === 'username' ? username : password;
    const fieldErrors = validateField(field, value);
    
    setValidationErrors(prev => ({ ...prev, ...fieldErrors }));
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

  // Reset form when modal opens/closes or mode changes - รีเซ็ตฟอร์มเมื่อหน้าต่างเปิด/ปิด หรือเมื่อโหมดเปลี่ยน
  useEffect(() => {
    setEmail('');
    setUsername('');
    setPassword('');
    setError(null);
    setValidationErrors({});
    setTouchedFields({});
    setIsLoading(false);
    setIsSuccess(false);
    setShowPassword(false);
  }, [isOpen, mode]);

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

  // Toggle password visibility - สลับการแสดงรหัสผ่าน
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // Form submission handler - ตัวจัดการการส่งฟอร์ม
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // ทำให้ทุกฟิลด์เป็น touched เพื่อแสดง validation errors
    setTouchedFields({
      email: true,
      username: mode === 'signup',
      password: true
    });
    
    // ตรวจสอบความถูกต้องของฟอร์ม
    const formErrors = validateForm();
    setValidationErrors(formErrors);
    
    // ถ้ามี errors ให้หยุดการ submit
    if (Object.keys(formErrors).length > 0) {
      return;
    }
    
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        // Sign in with credentials - ลงชื่อเข้าใช้ด้วยข้อมูลประจำตัว
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
      } else {
        // Sign up with credentials - สมัครสมาชิกด้วยข้อมูลประจำตัว
        const result = await signUp(email, username, password);
        if (result.error) {
          setError(result.error);
        } else {
          setIsSuccess(true);
          setTimeout(() => {
            setMode('signin');
          }, 1500);
        }
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground bg-opacity-70 backdrop-blur-md p-4"
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
                    <form onSubmit={handleSubmit} className="space-y-6 mb-6">
                      {/* Email Input - ช่องกรอกอีเมล */}
                      <InputField
                        id="email"
                        label="อีเมล"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (touchedFields.email) {
                            const emailErrors = validateField('email', e.target.value);
                            setValidationErrors(prev => ({ ...prev, ...emailErrors }));
                          }
                        }}
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
                          onChange={(e) => {
                            setUsername(e.target.value);
                            if (touchedFields.username) {
                              const usernameErrors = validateField('username', e.target.value);
                              setValidationErrors(prev => ({ ...prev, ...usernameErrors }));
                            }
                          }}
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
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (touchedFields.password) {
                            const passwordErrors = validateField('password', e.target.value);
                            setValidationErrors(prev => ({ ...prev, ...passwordErrors }));
                          }
                        }}
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

                      {/* Submit Button - ปุ่มส่งข้อมูล */}
                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-lg flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-3 hover:scale-[1.01]"
                        aria-label={mode === 'signin' ? 'ลงชื่อเข้าใช้' : 'สร้างบัญชี'}
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
                            {mode === 'signin' ? <FiLogIn size={20} /> : <FiUserPlus size={20} />}
                            <span className="text-lg">{mode === 'signin' ? 'ลงชื่อเข้าใช้' : 'สร้างบัญชี'}</span>
                          </>
                        )}
                      </motion.button>

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

                  {/* Right Column - Social Login - คอลัมน์ขวา - การเข้าสู่ระบบด้วยโซเชียลมีเดีย */}
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
                        className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors duration-200"
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
                      นโยบ.tomayความเป็นส่วนตัว
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
