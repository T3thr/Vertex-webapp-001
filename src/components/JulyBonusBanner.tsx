"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Coins, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface JulyBonusData {
  eligible: boolean;
  alreadyClaimed: boolean;
  bonusAmount: number;
  message: string;
}

interface JulyBonusBannerProps {
  className?: string;
}

export default function JulyBonusBanner({ className = "" }: JulyBonusBannerProps) {
  const { user, status } = useAuth();
  const [bonusData, setBonusData] = useState<JulyBonusData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ตรวจสอบสิทธิ์เมื่อผู้ใช้ล็อกอิน
  useEffect(() => {
    if (status === 'authenticated' && user) {
      checkBonusEligibility();
    }
  }, [status, user]);

  const checkBonusEligibility = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/july-bonus');
      const data = await response.json();

      if (response.ok) {
        setBonusData(data);
        // แสดง banner เฉพาะเมื่อมีสิทธิ์และยังไม่ได้รับ
        setIsVisible(data.eligible && !data.alreadyClaimed);
      } else {
        console.log('July bonus check:', data.message || 'Not eligible');
      }
    } catch (error) {
      console.error('Error checking July bonus eligibility:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const claimBonus = async () => {
    if (!bonusData || bonusData.alreadyClaimed) return;

    try {
      setIsClaiming(true);
      setError(null);

      const response = await fetch('/api/user/july-bonus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message);
        setBonusData(prev => prev ? { ...prev, alreadyClaimed: true } : null);
        
        // ซ่อน banner หลังจาก 3 วินาที
        setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการรับโบนัส');
      }
    } catch (error) {
      console.error('Error claiming July bonus:', error);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsClaiming(false);
    }
  };

  const closeBanner = () => {
    setIsVisible(false);
  };

  // ไม่แสดงอะไรถ้าไม่มีสิทธิ์หรือกำลังโหลด
  if (!isVisible || isLoading || !bonusData) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 p-6 shadow-lg ${className}`}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4zIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')]" />
          </div>

          {/* Close Button */}
          <button
            onClick={closeBanner}
            className="absolute top-4 right-4 p-1 rounded-full bg-black/20 hover:bg-black/30 transition-colors"
            aria-label="ปิดแบนเนอร์"
          >
            <X size={20} className="text-white" />
          </button>

          <div className="relative flex items-center gap-4">
            {/* Icon Section */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Gift size={32} className="text-white" />
                </div>
                {/* Sparkle Animation */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles size={20} className="text-white" />
                </motion.div>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-white">
                  🎉 โบนัสพิเศษ July 2025!
                </h3>
              </div>
              
              <p className="text-white/90 text-sm mb-3">
                ยินดีต้อนรับสมาชิกใหม่! รับเหรียญฟรี {bonusData.bonusAmount} เหรียญ
                สำหรับการสร้างบัญชีในเดือนนี้
              </p>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-3 p-2 bg-red-500/20 rounded-lg border border-red-300/30"
                >
                  <p className="text-white text-sm">{error}</p>
                </motion.div>
              )}

              {/* Success Message */}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-3 p-2 bg-green-500/20 rounded-lg border border-green-300/30"
                >
                  <p className="text-white text-sm font-medium">{successMessage}</p>
                </motion.div>
              )}

              {/* Action Button */}
              {!bonusData.alreadyClaimed && !successMessage && (
                <motion.button
                  onClick={claimBonus}
                  disabled={isClaiming}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClaiming ? (
                    <>
                      <div className="w-4 h-4 border-2 border-orange-600/30 border-t-orange-600 rounded-full animate-spin" />
                      กำลังรับโบนัส...
                    </>
                  ) : (
                    <>
                      <Coins size={18} />
                      รับเหรียญฟรี {bonusData.bonusAmount} เหรียญ!
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>

          {/* Animated Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/30 rounded-full"
                initial={{ 
                  x: Math.random() * 400,
                  y: Math.random() * 100,
                  opacity: 0 
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
