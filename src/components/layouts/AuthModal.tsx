// src/components/layouts/AuthModal.tsx

"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { validateEmail, validatePassword, validateUsername } from '@/backend/utils/validation';
import { signIn } from 'next-auth/react';
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
  FaTwitter,
  FaApple,
  FaGoogle
} from 'react-icons/fa';
import { SiLine } from 'react-icons/si';

// LoadingSpinner Component
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
  error?: boolean;
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
  error = false,
}: InputFieldProps) => {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-card-foreground">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
          {icon}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className={`w-full py-3 pl-11 pr-10 bg-secondary/50 text-secondary-foreground rounded-lg border ${
            error ? 'border-red-500' : 'border-accent'
          } focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-base placeholder:text-muted-foreground/60 placeholder:font-light`}
          aria-invalid={error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {showPasswordToggle && toggleShowPassword && (
          <button
            type="button"
            onClick={toggleShowPassword}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors duration-200"
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          >
            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        )}
      </div>
      {helpText && (
        <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
      )}
    </div>
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
  const baseClasses = "flex items-center justify-center gap-3 p-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm font-medium";
  
  const providerStyles: Record<string, string> = {
    google: "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm",
    facebook: "bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-sm",
    twitter: "bg-[#1DA1F2] hover:bg-[#1A91DA] text-white shadow-sm",
    apple: "bg-black hover:bg-gray-900 text-white shadow-sm",
    line: "bg-[#06C755] hover:bg-[#05B34E] text-white shadow-sm"
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

// Alert Component
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
      icon: <FiAlertCircle size={18} className="mt-0.5 flex-shrink-0" />
    },
    success: {
      bg: "bg-green-50 dark:bg-green-900/30",
      border: "border-green-300 dark:border-green-800",
      text: "text-green-700 dark:text-green-300",
      icon: <FiCheck size={18} className="mt-0.5 flex-shrink-0" />
    }
  };

  return (
    <div className={`p-3 ${styles[type].bg} border ${styles[type].border} rounded-lg flex items-start gap-2 ${styles[type].text} text-sm animate-slideIn mb-5`}>
      {styles[type].icon}
      <p>{message}</p>
    </div>
  );
};

// Main AuthModal Component
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { signUp } = useAuth();

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
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    setEmail('');
    setUsername('');
    setPassword('');
    setError(null);
    setIsLoading(false);
    setIsSuccess(false);
    setShowPassword(false);
  }, [isOpen, mode]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Toggle password visibility
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate form data
    if (!validateEmail(email)) {
      setError('กรุณาใส่อีเมลที่ถูกต้อง');
      return;
    }
    
    if (mode === 'signup') {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        setError(usernameValidation.message || 'ชื่อผู้ใช้ไม่ถูกต้อง');
        return;
      }
      
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setError(passwordValidation.message || 'รหัสผ่านไม่ถูกต้อง');
        return;
      }
    }
    
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        // Sign in with credentials
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
        // Sign up with credentials
        const result = await signUp(email, username, password);
        if (result.error) {
          setError(result.error);
        } else {
          setIsSuccess(true);
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดที่ไม่คาดคิด');
      console.error('❌ ข้อผิดพลาดในการตรวจสอบ:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Social sign in handler
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        ref={modalRef}
        className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 animate-fadeIn flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Modal Header */}
        <div className="relative py-5 px-6 border-b border-accent/50 bg-gradient-to-r from-primary/10 to-blue-500/10">
          <h2 className="text-xl font-bold text-center bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            {mode === 'signin' ? 'ลงชื่อเข้าใช้งาน' : 'สร้างบัญชีใหม่'}
          </h2>
          
          <button 
            onClick={onClose}
            className="absolute right-5 top-5 text-muted-foreground hover:text-foreground transition-colors duration-200 p-1"
            aria-label="ปิดหน้าต่าง"
          >
            <FiX size={22} />
          </button>
          
          {mode === 'signup' && (
            <button 
              onClick={() => setMode('signin')}
              className="absolute left-5 top-5 text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-1.5 p-1"
              aria-label="กลับไปที่ลงชื่อเข้าใช้"
            >
              <FiArrowLeft size={20} />
              <span className="text-sm">กลับ</span>
            </button>
          )}
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 md:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-secondary">
            {/* Error/Success Alerts */}
            {error && <Alert type="error" message={error} />}
            {isSuccess && (
              <Alert 
                type="success" 
                message={mode === 'signin' ? 'ลงชื่อเข้าใช้สำเร็จ! กำลังนำคุณไปยังหน้าหลัก...' : 'สร้างบัญชีสำเร็จ! คุณสามารถลงชื่อเข้าใช้งานได้ทันที'}
              />
            )}

            <div className="grid md:grid-cols-5 gap-8">
              {/* Left Column - Form */}
              <div className="md:col-span-3 space-y-6">
                <div className="mb-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {mode === 'signin' ? 'เข้าสู่บัญชีของคุณ' : 'ข้อมูลบัญชีใหม่'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {mode === 'signin' 
                      ? 'ลงชื่อเข้าใช้เพื่อเข้าถึงบัญชีของคุณ' 
                      : 'กรอกข้อมูลด้านล่างเพื่อสร้างบัญชีใหม่'}
                  </p>
                </div>

                {/* Auth Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Input */}
                  <InputField
                    id="email"
                    label="อีเมล"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    icon={<FiMail size={18} />}
                    required
                    error={!!error && error.includes('อีเมล')}
                  />

                  {/* Username Input (Signup only) */}
                  {mode === 'signup' && (
                    <InputField
                      id="username"
                      label="ชื่อผู้ใช้"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username_123"
                      icon={<FiUser size={18} />}
                      required
                      helpText="ชื่อผู้ใช้ต้องมีความยาว 3-20 ตัวอักษร ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _"
                      error={!!error && error.includes('ชื่อผู้ใช้')}
                    />
                  )}

                  {/* Password Input */}
                  <InputField
                    id="password"
                    label="รหัสผ่าน"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? '••••••••' : '••••••••'}
                    icon={<FiLock size={18} />}
                    required
                    minLength={mode === 'signup' ? 8 : 1}
                    helpText={mode === 'signup' ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร รวมตัวเลขและตัวพิมพ์ใหญ่' : undefined}
                    showPasswordToggle
                    showPassword={showPassword}
                    toggleShowPassword={toggleShowPassword}
                    error={!!error && error.includes('รหัสผ่าน')}
                  />

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-md flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                    aria-label={mode === 'signin' ? 'ลงชื่อเข้าใช้' : 'สร้างบัญชี'}
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" color="currentColor" />
                        <span>กำลังดำเนินการ...</span>
                      </>
                    ) : (
                      <>
                        {mode === 'signin' ? <FiLogIn size={18} /> : <FiUserPlus size={18} />}
                        <span>{mode === 'signin' ? 'ลงชื่อเข้าใช้' : 'สร้างบัญชี'}</span>
                      </>
                    )}
                  </button>

                  {/* Forgot Password (Sign in only) */}
                  {mode === 'signin' && (
                    <div className="text-center pt-1">
                      <a href="/forgot-password" className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors duration-200">
                        ลืมรหัสผ่าน?
                      </a>
                    </div>
                  )}
                </form>
              </div>

              {/* Right Column - Social Login */}
              <div className="md:col-span-2">
                <div className="hidden md:block mb-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    ทางเลือกอื่น
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    ลงชื่อเข้าใช้ด้วยบัญชีโซเชียลมีเดีย
                  </p>
                </div>

                {/* Divider for mobile only */}
                <div className="md:hidden flex items-center my-6">
                  <div className="flex-1 border-t border-accent/50"></div>
                  <span className="mx-4 text-sm text-muted-foreground font-medium">หรือ</span>
                  <div className="flex-1 border-t border-accent/50"></div>
                </div>

                {/* Social Login */}
                <div className="space-y-4">
                  <SocialButton
                    provider="google"
                    icon={<FaGoogle size={18} />}
                    label="เข้าสู่ระบบด้วย Google"
                    onClick={() => handleSocialSignIn('google')}
                    disabled={isLoading}
                    className="w-full"
                  />
                  <SocialButton
                    provider="facebook"
                    icon={<FaFacebook size={18} />}
                    label="เข้าสู่ระบบด้วย Facebook"
                    onClick={() => handleSocialSignIn('facebook')}
                    disabled={isLoading}
                    className="w-full"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <SocialButton
                      provider="twitter"
                      icon={<FaTwitter size={18} />}
                      label="Twitter"
                      onClick={() => handleSocialSignIn('twitter')}
                      disabled={isLoading}
                    />
                    <SocialButton
                      provider="apple"
                      icon={<FaApple size={18} />}
                      label="Apple"
                      onClick={() => handleSocialSignIn('apple')}
                      disabled={isLoading}
                    />
                  </div>
                  <SocialButton
                    provider="line"
                    icon={<SiLine size={18} />}
                    label="เข้าสู่ระบบด้วย Line"
                    onClick={() => handleSocialSignIn('line')}
                    disabled={isLoading}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-accent/50 p-5 bg-secondary/20">
            {/* Toggle Sign In/Sign Up */}
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

            {/* Terms and Privacy Policy (Signup only) */}
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
      </div>
    </div>
  );
}