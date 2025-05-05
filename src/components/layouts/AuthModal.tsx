"use client";

// นำเข้าโมดูลและคอมโพเนนต์ที่จำเป็น
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
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
  FiCheck
} from 'react-icons/fi';
import { 
  FaFacebook,
  FaTwitter,
  FaApple,
  FaGoogle
} from 'react-icons/fa';
import { SiLine } from 'react-icons/si';

// กำหนดประเภทสำหรับ props ของคอมโพเนนต์
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// กำหนดประเภทสำหรับโหมดการตรวจสอบ
type AuthMode = 'signin' | 'signup';

// คอมโพเนนต์ AuthModal สำหรับจัดการการลงชื่อเข้าใช้และสมัครสมาชิก
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

  // จัดการการคลิกนอกโมดัลเพื่อปิด
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // ป้องกันการเลื่อนหน้า
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = ''; // เปิดใช้งานการเลื่อนหน้า
    };
  }, [isOpen, onClose]);

  // รีเซ็ตฟอร์มเมื่อโมดัลเปิด/ปิดหรือโหมดเปลี่ยน
  useEffect(() => {
    setEmail('');
    setUsername('');
    setPassword('');
    setError(null);
    setIsLoading(false);
    setIsSuccess(false);
  }, [isOpen, mode]);

  // จัดการกดปุ่ม ESC เพื่อปิดโมดัล
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // จัดการการส่งฟอร์ม
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // ตรวจสอบข้อมูลในฟอร์ม
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
        // ใช้ฟังก์ชัน signIn จาก next-auth/react
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
            window.location.reload(); // รีเฟรชเพื่ออัปเดตสถานะการตรวจสอบ
          }, 1000);
        }
      } else {
        // สมัครสมาชิกด้วยฟังก์ชันจาก AuthContext
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

  // จัดการการลงชื่อเข้าใช้ด้วยโซเชียล
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
          window.location.reload(); // รีเฟรชเพื่ออัปเดตสถานะการตรวจสอบ
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="bg-card w-full max-w-md rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300"
        style={{ maxHeight: '90vh' }}
      >
        {/* ส่วนหัวของโมดัล */}
        <div className="relative flex items-center justify-center p-4 border-b border-accent">
          <h2 className="text-xl font-semibold text-center text-card-foreground">
            {mode === 'signin' ? 'ลงชื่อเข้าใช้' : 'สร้างบัญชี'}
          </h2>
          
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="ปิด"
          >
            <FiX size={20} />
          </button>
          
          {mode === 'signup' && (
            <button 
              onClick={() => setMode('signin')}
              className="absolute left-4 top-4 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              aria-label="กลับไปที่ลงชื่อเข้าใช้"
            >
              <FiArrowLeft size={16} />
            </button>
          )}
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {/* ข้อความข้อผิดพลาด */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 text-red-600 dark:text-red-400">
              <FiX size={18} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {/* ข้อความสำเร็จ */}
          {isSuccess && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2 text-green-600 dark:text-green-400">
              <FiCheck size={18} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                {mode === 'signin' ? 'ลงชื่อเข้าใช้สำเร็จ!' : 'สร้างบัญชีสำเร็จ!'}
              </p>
            </div>
          )}

          {/* ฟอร์ม */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ฟิลด์อีเมล */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-card-foreground">
                อีเมล
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <FiMail size={16} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your.email@example.com"
                  className="w-full py-2 pl-10 pr-3 bg-secondary text-secondary-foreground rounded-lg border border-accent focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

            {/* ฟิลด์ชื่อผู้ใช้ (เฉพาะสมัครสมาชิก) */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-card-foreground">
                  ชื่อผู้ใช้
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                    <FiUser size={16} />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="เลือกชื่อผู้ใช้"
                    className="w-full py-2 pl-10 pr-3 bg-secondary text-secondary-foreground rounded-lg border border-accent focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>
            )}

            {/* ฟิลด์รหัสผ่าน */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-card-foreground">
                รหัสผ่าน
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <FiLock size={16} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={mode === 'signup' ? 'สร้างรหัสผ่านที่ปลอดภัย' : 'ใส่รหัสผ่านของคุณ'}
                  className="w-full py-2 pl-10 pr-10 bg-secondary text-secondary-foreground rounded-lg border border-accent focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  minLength={mode === 'signup' ? 8 : 1}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </ div>
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground mt-1">
                  รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร รวมตัวเลขและตัวพิมพ์ใหญ่
                </p>
              )}
            </div>

            {/* ปุ่มส่งฟอร์ม */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground 
                        hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 
                        focus:ring-offset-2 focus:ring-offset-background disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>{mode === 'signin' ? 'กำลังลงชื่อเข้าใช้...' : 'กำลังสร้างบัญชี...'}</span>
                </>
              ) : (
                <>
                  {mode === 'signin' ? (
                    <>
                      <FiLogIn size={18} />
                      <span>ลงชื่อเข้าใช้</span>
                    </>
                  ) : (
                    <>
                      <FiUserPlus size={18} />
                      <span>สร้างบัญชี</span>
                    </>
                  )}
                </>
              )}
            </button>

            {/* เส้นแบ่ง */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-accent"></div>
              <span className="flex-shrink mx-4 text-sm text-muted-foreground">หรือดำเนินการต่อด้วย</span>
              <div className="flex-grow border-t border-accent"></div>
            </div>

            {/* ปุ่มลงชื่อเข้าใช้ด้วยโซเชียล */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleSocialSignIn('google')}
                disabled={isLoading}
                className="flex justify-center items-center p-2.5 bg-white hover:bg-gray-50 text-black rounded-lg border border-gray-300 
                          focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                aria-label="ลงชื่อเข้าใช้ด้วย Google"
              >
                <FaGoogle size={18} />
              </button>
              <button
                type="button"
                onClick={() => handleSocialSignIn('facebook')}
                disabled={isLoading}
                className="flex justify-center items-center p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                aria-label="ลงชื่อเข้าใช้ด้วย Facebook"
              >
                <FaFacebook size={18} />
              </button>
              <button
                type="button"
                onClick={() => handleSocialSignIn('twitter')}
                disabled={isLoading}
                className="flex justify-center items-center p-2.5 bg-blue-400 hover:bg-blue-500 text-white rounded-lg
                          focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                aria-label="ลงชื่อเข้าใช้ด้วย Twitter"
              >
                <FaTwitter size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                type="button"
                onClick={() => handleSocialSignIn('apple')}
                disabled={isLoading}
                className="flex justify-center items-center p-2.5 bg-black hover:bg-gray-800 text-white rounded-lg
                          focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                aria-label="ลงชื่อเข้าใช้ด้วย Apple"
              >
                <FaApple size={18} className="mr-2" />
                <span>Apple</span>
              </button>
              <button
                type="button"
                onClick={() => handleSocialSignIn('line')}
                disabled={isLoading}
                className="flex justify-center items-center p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg
                          focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                aria-label="ลงชื่อเข้าใช้ด้วย Line"
              >
                <SiLine size={18} className="mr-2" />
                <span>Line</span>
              </button>
            </div>
          </form>

          {/* สลับระหว่างลงชื่อเข้าใช้และสมัครสมาชิก */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'signin' ? "ไม่มีบัญชี? " : "มีบัญชีอยู่แล้ว? "}
              <button
                type="button"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-primary hover:underline focus:outline-none"
              >
                {mode === 'signin' ? 'สมัครสมาชิก' : 'ลงชื่อเข้าใช้'}
              </button>
            </p>
          </div>

          {/* ข้อกำหนดและนโยบายความเป็นส่วนตัว */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            โดยการดำเนินการต่อ คุณยอมรับ{' '}
            <a href="/terms" className="underline hover:text-primary">
              ข้อกำหนดการให้บริการ
            </a>{' '}
            และ{' '}
            <a href="/privacy" className="underline hover:text-primary">
              นโยบายความเป็นส่วนตัว
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}