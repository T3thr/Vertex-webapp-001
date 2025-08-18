// src/components/novels/NovelReviewsTab.tsx
// Component สำหรับแสดง Tab รีวิวของนิยาย

import { PopulatedNovelForDetailPage } from '@/app/api/novels/[slug]/route';
import { Edit, MessageSquare, Star, ThumbsDown, ThumbsUp, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface NovelReviewsTabProps {
  novel: PopulatedNovelForDetailPage;
}

// ✅ [เพิ่มใหม่] Component สำหรับแสดง Star Rating แบบ App Store
const StarRating: React.FC<{ rating: number; size?: number; showNumber?: boolean }> = ({ 
  rating, 
  size = 20, 
  showNumber = false 
}) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = rating >= star;
        const isHalfFilled = rating >= star - 0.5 && rating < star;
        
        return (
          <div key={star} className="relative">
            <Star
              size={size}
              className={`${isFilled 
                ? 'text-amber-400 fill-amber-400' 
                : 'text-border'
              } transition-colors duration-200`}
            />
            {isHalfFilled && (
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star
                  size={size}
                  className="text-amber-400 fill-amber-400"
                />
              </div>
            )}
          </div>
        );
      })}
      {showNumber && (
        <span className="ml-1 text-sm text-muted-foreground font-medium">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

// ✅ [เพิ่มใหม่] Component สำหรับแสดงการกระจายของเรตติ้ง
const RatingDistribution: React.FC<{ 
  ratingsData: { [key: number]: number };
  totalRatings: number;
}> = ({ ratingsData, totalRatings }) => {
  if (totalRatings === 0) return null;

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((starLevel) => {
        const count = ratingsData[starLevel] || 0;
        const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
        
        return (
          <div key={starLevel} className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1 w-16">
              <span className="text-muted-foreground font-medium">{starLevel}</span>
              <Star size={14} className="text-amber-400 fill-amber-400" />
            </div>
            
            <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-amber-400 transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            <div className="flex items-center gap-2 w-20 text-right">
              <span className="text-muted-foreground font-medium">{count}</span>
              <span className="text-xs text-muted-foreground/70">
                ({percentage.toFixed(0)}%)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const NovelReviewsTab: React.FC<NovelReviewsTabProps> = ({ novel }) => {
  // ใช้ข้อมูลจากฐานข้อมูลจริง
  const averageRating = novel.stats?.averageRating || 0;
  const ratingsCount = novel.stats?.ratingsCount || 0;
  const [userRating, setUserRating] = useState(0);
  const [userReviewText, setUserReviewText] = useState('');
  const [ratingStats, setRatingStats] = useState<any>(null);
  
  // ใช้ข้อมูลการกระจายของเรตติ้งจากฐานข้อมูลจริง
  const [ratingsDistribution, setRatingsDistribution] = useState<{ [key: number]: number }>(
    novel.stats?.scoreDistribution || {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    }
  );

  // เพิ่ม state สำหรับเก็บข้อมูลรีวิวและจำนวนรีวิวทั้งหมด
  const [reviews, setReviews] = useState<any[]>(novel.ratings || []);
  const [totalReviews, setTotalReviews] = useState<number>(ratingsCount);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(false);

  // ดึงข้อมูลรีวิวและสถิติจาก API เมื่อ component โหลด
  useEffect(() => {
    const fetchReviewsAndStats = async () => {
      try {
        setIsLoadingReviews(true);
        
        // ดึงข้อมูลรีวิว
        const reviewsResponse = await fetch(`/api/ratings?targetId=${novel._id}&targetType=Novel&hasReview=true&sort=newest&limit=10`);
        const reviewsData = await reviewsResponse.json();
        
        if (reviewsData.success) {
          setReviews(reviewsData.ratings || []);
          setTotalReviews(reviewsData.total || ratingsCount);
          
          // ถ้ามีข้อมูลสถิติจาก API ให้ใช้ข้อมูลนั้น
          if (reviewsData.stats) {
            setRatingStats(reviewsData.stats);
            if (reviewsData.stats.distribution) {
              setRatingsDistribution(reviewsData.stats.distribution);
            }
          }
        }
        
        // ดึงข้อมูลสถิติโดยตรงจาก endpoint เฉพาะ
        const statsResponse = await fetch(`/api/ratings/statistics?targetId=${novel._id}&targetType=Novel`);
        const statsData = await statsResponse.json();
        
        if (statsData.success && statsData.stats) {
          setRatingStats(statsData.stats);
          if (statsData.stats.distribution) {
            setRatingsDistribution(statsData.stats.distribution);
          }
        }
      } catch (error) {
        console.error('Error fetching reviews and stats:', error);
      } finally {
        setIsLoadingReviews(false);
      }
    };
    
    // ดึงข้อมูลรีวิวและสถิติเสมอเพื่อให้ข้อมูลเป็นปัจจุบัน
    fetchReviewsAndStats();
  }, [novel._id, ratingsCount]);

  const handleRatingClick = (rating: number) => {
    setUserRating(rating);
  };

  const handleSubmitReview = async () => {
    if (userRating === 0) {
      alert('กรุณาให้คะแนนก่อนส่งรีวิว');
      return;
    }

    try {
      // ส่งข้อมูลรีวิวไปยัง API
      const response = await fetch(`/api/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetId: novel._id,
          targetType: 'Novel',
          overallScore: userRating,
          reviewContent: userReviewText,
          containsSpoilers: false,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('ส่งรีวิวสำเร็จ! ขอบคุณสำหรับความคิดเห็นของคุณ');
        // รีเซ็ตฟอร์ม
        setUserRating(0);
        setUserReviewText('');
        
        // ดึงข้อมูลรีวิวและสถิติใหม่
        const fetchUpdatedData = async () => {
          try {
            setIsLoadingReviews(true);
            
            // ดึงข้อมูลรีวิว
            const reviewsResponse = await fetch(`/api/ratings?targetId=${novel._id}&targetType=Novel&hasReview=true&sort=newest&limit=10`);
            const reviewsData = await reviewsResponse.json();
            
            if (reviewsData.success) {
              setReviews(reviewsData.ratings || []);
              setTotalReviews(reviewsData.total || ratingsCount);
              
              if (reviewsData.stats) {
                setRatingStats(reviewsData.stats);
                if (reviewsData.stats.distribution) {
                  setRatingsDistribution(reviewsData.stats.distribution);
                }
              }
            }
            
            // ดึงข้อมูลสถิติโดยตรง
            const statsResponse = await fetch(`/api/ratings/statistics?targetId=${novel._id}&targetType=Novel`);
            const statsData = await statsResponse.json();
            
            if (statsData.success && statsData.stats) {
              setRatingStats(statsData.stats);
              if (statsData.stats.distribution) {
                setRatingsDistribution(statsData.stats.distribution);
              }
            }
          } catch (error) {
            console.error('Error fetching updated data:', error);
          } finally {
            setIsLoadingReviews(false);
          }
        };
        
        fetchUpdatedData();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error || 'ไม่สามารถส่งรีวิวได้'}`);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('เกิดข้อผิดพลาดในการส่งรีวิว กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="space-y-6">
      {/* ✅ ส่วนภาพรวมเรตติ้ง */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-foreground mb-6">คะแนนและรีวิว</h3>
        
        {ratingsCount > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ส่วนแสดงคะแนนรวม */}
            <div className="flex flex-col items-center text-center">
              <div className="text-6xl font-bold text-foreground mb-2">
                {(ratingStats?.averageScore || averageRating).toFixed(1)}
              </div>
              
              <StarRating rating={ratingStats?.averageScore || averageRating} size={24} />
              
              <p className="text-muted-foreground mt-2 text-sm">
                จาก <span className="font-semibold">{(ratingStats?.count || totalReviews).toLocaleString()}</span> รีวิวจริงจากผู้อ่าน
              </p>
              
              {/* ✅ ตัวบ่งชี้คุณภาพ */}
              <div className="flex items-center gap-2 mt-3">
                {(ratingStats?.averageScore || averageRating) >= 4.5 ? (
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                    🏆 คุณภาพเยี่ยม
                  </div>
                ) : (ratingStats?.averageScore || averageRating) >= 4.0 ? (
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                    ⭐ คุณภาพดี
                  </div>
                ) : (ratingStats?.averageScore || averageRating) >= 3.0 ? (
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">
                    👍 พอใจ
                  </div>
                ) : (
                  <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-semibold">
                    💡 ต้องปรับปรุง
                  </div>
                )}
              </div>
            </div>
            
            {/* ส่วนแสดงการกระจายเรตติ้ง */}
            <div>
              <h4 className="text-lg font-medium text-foreground mb-4">การให้คะแนน</h4>
              <RatingDistribution 
                ratingsData={ratingsDistribution}
                totalRatings={ratingStats?.count || totalReviews}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={32} className="text-muted-foreground" />
            </div>
            <h4 className="text-lg font-semibold text-foreground mb-2">ยังไม่มีรีวิว</h4>
            <p className="text-muted-foreground">ร่วมเป็นคนแรกที่รีวิวนิยายเรื่องนี้!</p>
          </div>
        )}
      </div>

      {/* ✅ ส่วนสำหรับเขียนรีวิว */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Edit size={22} className="text-primary" />
          <h3 className="text-xl font-semibold text-foreground">เขียนรีวิวของคุณ</h3>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6">
          แบ่งปันความคิดเห็นของคุณเกี่ยวกับนิยายเรื่องนี้ให้ผู้อ่านคนอื่นทราบ
        </p>
        
        <div className="space-y-6">
          {/* ส่วนให้คะแนน */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              ให้คะแนนนิยายเรื่องนี้:
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm transition-all duration-200 hover:scale-110"
                >
                  <Star
                    size={32}
                    className={`${
                      userRating >= star
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-border hover:text-amber-200'
                    } transition-colors duration-200`}
                  />
                </button>
              ))}
              {userRating > 0 && (
                <span className="ml-3 text-sm font-medium text-foreground">
                  {userRating} ดาว
                </span>
              )}
            </div>
          </div>
          
          {/* ส่วนเขียนความคิดเห็น */}
          <div>
            <label htmlFor="reviewText" className="block text-sm font-medium text-foreground mb-2">
              ความคิดเห็น (ไม่บังคับ):
            </label>
            <textarea
              id="reviewText"
              rows={4}
              className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 resize-none"
              placeholder="เล่าถึงสิ่งที่คุณชอบหรือไม่ชอบเกี่ยวกับนิยายเรื่องนี้..."
              value={userReviewText}
              onChange={(e) => setUserReviewText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              รีวิวของคุณจะช่วยให้ผู้อ่านคนอื่นตัดสินใจได้ดีขึ้น
            </p>
          </div>
          
          {/* ปุ่มส่งรีวิว */}
          <div className="flex justify-end">
          <button
              type="button"
              onClick={handleSubmitReview}
              disabled={userRating === 0}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                userRating === 0
                  ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
              }`}
          >
            ส่งรีวิว
          </button>
          </div>
        </div>
      </div>

      {/* ✅ ส่วนแสดงรายการรีวิว */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-foreground mb-6">รีวิวจากผู้อ่าน</h3>
        
        {/* แสดงรายการรีวิวจริงจากฐานข้อมูล */}
        <div className="space-y-4">
          {isLoadingReviews ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-t-2 border-primary border-solid rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-muted-foreground">กำลังโหลดรีวิว...</p>
            </div>
          ) : totalReviews > 0 ? (
            // แสดงรีวิวจริงจากฐานข้อมูล (ถ้ามี)
            reviews && reviews.length > 0 ? reviews.map((review: any) => (
              <div key={review._id} className="border-b border-border/50 last:border-b-0 pb-4 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    {review.userId?.avatarUrl ? (
                      <img 
                        src={review.userId.avatarUrl} 
                        alt={review.userId.username || "ผู้ใช้"} 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User size={16} className="text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground text-sm">{review.userId?.username || "ผู้ใช้"}</h4>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <StarRating rating={review.overallScore} size={16} />
                      <span className="text-sm font-medium text-muted-foreground">
                        {review.overallScore.toFixed(1)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-foreground leading-relaxed mb-3">
                      {review.reviewContent || ""}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <ThumbsUp size={12} />
                        <span>มีประโยชน์ ({review.helpfulVotesCount || 0})</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <ThumbsDown size={12} />
                        <span>ไม่มีประโยชน์ ({review.unhelpfulVotesCount || 0})</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">มีผู้ให้คะแนนแล้ว แต่ยังไม่มีรีวิวที่แสดงรายละเอียด</p>
              </div>
            )
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare size={24} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">ยังไม่มีรีวิวที่แสดง</p>
              <p className="text-sm text-muted-foreground/70">เมื่อมีผู้รีวิว เนื้อหาจะแสดงที่นี่</p>
            </div>
          )}
          
          {totalReviews > 2 && (
            <div className="text-center pt-4">
              <button className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                ดูรีวิวทั้งหมด ({totalReviews.toLocaleString()} รีวิว)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NovelReviewsTab;