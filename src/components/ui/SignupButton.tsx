'use client';

import { useState, useRef, FormEvent } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

// กำหนดประเภทสำหรับ props ของคอมโพเนนต์
interface SignupButtonProps {
  // ฟังก์ชันสำหรับจัดการการลงทะเบียน ได้รับอีเมล รหัสผ่าน และโทเค็น reCAPTCHA
  onSignup: (email: string, password: string, captchaToken: string) => Promise<void>;
  // คลาส CSS เพิ่มเติม (ถ้ามี)
  className?: string;
  // สถานะกำลังโหลด
  loading?: boolean;
}

/**
 * คอมโพเนนต์ปุ่มลงทะเบียนที่รวม reCAPTCHA v2 Invisible
 */
const SignupButton = ({ onSignup, className = '', loading = false }: SignupButtonProps) => {
  // สถานะสำหรับฟอร์ม
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // อ้างอิงถึง reCAPTCHA
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  /**
   * จัดการการส่งฟอร์ม
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // ตรวจสอบว่ากำลังส่งข้อมูลอยู่แล้วหรือไม่
    if (isSubmitting || loading) return;
    
    // ตรวจสอบความถูกต้องของข้อมูล
    if (password !== confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // ดำเนินการ reCAPTCHA เพื่อรับโทเค็น
      console.log('กำลังดำเนินการ reCAPTCHA...');
      const token = await recaptchaRef.current?.executeAsync();
      
      if (!token) {
        throw new Error('การยืนยัน reCAPTCHA ล้มเหลว');
      }
      
      // ส่งข้อมูลไปยังฟังก์ชันลงทะเบียนพร้อมโทเค็น
      await onSignup(email, password, token);
      
      // รีเซ็ตฟอร์ม
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      
      // รีเซ็ต reCAPTCHA
      recaptchaRef.current?.reset();
      
    } catch (error) {
      // จัดการข้อผิดพลาด
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลงทะเบียน';
      setError(errorMessage);
      console.error('ข้อผิดพลาดในการลงทะเบียน:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            อีเมล
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="กรุณากรอกอีเมล"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            รหัสผ่าน
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="กรุณากรอกรหัสผ่าน"
          />
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            ยืนยันรหัสผ่าน
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="กรุณายืนยันรหัสผ่าน"
          />
        </div>
        
        {/* reCAPTCHA แบบ Invisible - จะไม่แสดงผลบนหน้าเว็บยกเว้นเมื่อมีความเสี่ยงที่ Google ตรวจพบ */}
        <ReCAPTCHA
          ref={recaptchaRef}
          size="invisible"
          sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
          badge="bottomright" // ตำแหน่งของโลโก้ reCAPTCHA (bottomright, bottomleft, inline)
        />
        
        <button
          type="submit"
          disabled={isSubmitting || loading}
          className={`flex justify-center items-center w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${className} ${(isSubmitting || loading) ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isSubmitting || loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              กำลังดำเนินการ...
            </>
          ) : (
            'ลงทะเบียน'
          )}
        </button>
      </form>
    </div>
  );
};

export default SignupButton;