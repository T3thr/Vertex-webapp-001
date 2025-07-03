'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Coins, ChevronLeft, Sparkles, Clock, Tag } from 'lucide-react';

interface PaywallDialogProps {
  novel: {
    _id: string;
    title: string;
    slug: string;
    coverImageUrl?: string;
    synopsis?: string;
  };
  episode: {
    _id: string;
    title: string;
    slug?: string;
    episodeOrder: number;
    accessType: string;
    teaserText?: string;
    stats?: {
      estimatedReadingTimeMinutes?: number;
      totalWords?: number;
    };
    promotions?: Array<{
      promotionType: string;
      discountPercentage?: number;
      description?: string;
    }>;
  };
  effectivePrice: number;
  originalPrice: number;
  requiresLogin: boolean;
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
    coinBalance?: number;
  };
}

export default function PaywallDialog({
  novel,
  episode,
  effectivePrice,
  originalPrice,
  requiresLogin,
  currentUser
}: PaywallDialogProps) {
  const router = useRouter();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const hasDiscount = effectivePrice < originalPrice;
  const discountPercentage = hasDiscount 
    ? Math.round((1 - effectivePrice / originalPrice) * 100)
    : 0;
  
  const activePromotion = episode.promotions?.find(p => p.discountPercentage);
  
  const handlePurchase = async () => {
    if (requiresLogin) {
      const episodeSlug = episode.slug || `episode-${episode.episodeOrder}`;
      router.push(`/signin?redirect=/read/${novel.slug}/${episode.episodeOrder}-${episodeSlug}`);
      return;
    }
    
    setIsPurchasing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/novels/${novel.slug}/episodes/${episode._id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'ไม่สามารถซื้อตอนได้');
      }
      
      // Refresh the page to show the content
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      setIsPurchasing(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-5"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-w-2xl w-full"
      >
        {/* Back button */}
        <Link
          href={`/novels/${novel.slug}`}
          className="absolute -top-12 left-0 flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">กลับไปหน้านิยาย</span>
        </Link>
        
        <div className="bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50">
          {/* Header with cover image */}
          <div className="relative h-48 md:h-64 overflow-hidden">
            {novel.coverImageUrl ? (
              <Image
                src={novel.coverImageUrl}
                alt={novel.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
            
            {/* Lock icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="bg-gray-900/80 backdrop-blur-sm rounded-full p-6"
              >
                <Lock className="w-12 h-12 text-gray-300" />
              </motion.div>
            </div>
            
            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                {novel.title}
              </h1>
              <p className="text-gray-300">
                ตอนที่ {episode.episodeOrder}: {episode.title}
              </p>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Episode info */}
            <div className="space-y-4">
              {episode.teaserText && (
                <p className="text-gray-300 leading-relaxed">
                  {episode.teaserText}
                </p>
              )}
              
              {/* Stats */}
              {episode.stats && (
                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                  {episode.stats.estimatedReadingTimeMinutes && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{episode.stats.estimatedReadingTimeMinutes} นาที</span>
                    </div>
                  )}
                  {episode.stats.totalWords && (
                    <div className="flex items-center space-x-1">
                      <span>{episode.stats.totalWords.toLocaleString()} คำ</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Price section */}
            <div className="bg-gray-900/50 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {requiresLogin ? 'กรุณาเข้าสู่ระบบเพื่ออ่านต่อ' : 'ปลดล็อคตอนนี้'}
                  </h3>
                  {!requiresLogin && (
                    <p className="text-sm text-gray-400">
                      {episode.accessType === 'early_access_paid' 
                        ? 'Early Access - อ่านก่อนใคร!'
                        : 'ซื้อครั้งเดียว อ่านได้ตลอดไป'}
                    </p>
                  )}
                </div>
                
                {!requiresLogin && (
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      {hasDiscount && (
                        <span className="text-gray-500 line-through text-sm">
                          {originalPrice}
                        </span>
                      )}
                      <span className="text-2xl font-bold text-yellow-400 flex items-center">
                        <Coins className="w-6 h-6 mr-1" />
                        {effectivePrice}
                      </span>
                    </div>
                    {hasDiscount && (
                      <div className="flex items-center justify-end space-x-1 mt-1">
                        <Tag className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">
                          ลด {discountPercentage}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Promotion badge */}
              {activePromotion && activePromotion.description && (
                <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-3 border border-purple-500/30">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-purple-300">
                      {activePromotion.description}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Error message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isPurchasing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      <span>กำลังดำเนินการ...</span>
                    </>
                  ) : requiresLogin ? (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>เข้าสู่ระบบ</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>ปลดล็อคด้วย {effectivePrice} Coins</span>
                    </>
                  )}
                </button>
                
                <Link
                  href={`/novels/${novel.slug}`}
                  className="flex-1 sm:flex-initial bg-gray-700 text-gray-300 font-semibold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors text-center"
                >
                  กลับไปหน้านิยาย
                </Link>
              </div>
              
              {/* User coin balance (if logged in) */}
              {currentUser && !requiresLogin && (
                <div className="text-center text-sm text-gray-400">
                  <p>ยอดคงเหลือ: {currentUser.coinBalance || 0} Coins</p>
                  {(currentUser.coinBalance || 0) < effectivePrice && (
                    <Link href="/coins/purchase" className="text-blue-400 hover:text-blue-300">
                      เติม Coins
                    </Link>
                  )}
                </div>
              )}
            </div>
            
            {/* Additional info */}
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>การซื้อจะใช้ Coins จากบัญชีของคุณ</p>
              <p>หลังจากซื้อแล้ว คุณสามารถอ่านตอนนี้ได้ตลอดไป</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 