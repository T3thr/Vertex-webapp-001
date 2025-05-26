// src/components/novels/NovelReviewsTab.tsx
// Component สำหรับแสดง Tab รีวิวของนิยาย

import React, { useState } from 'react';
import { PopulatedNovelForDetailPage } from '@/app/api/novels/[slug]/route';
import { Star, MessageSquare, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
// import { Button } from '@/components/ui/button'; // สมมติว่ามี Button component
// import { Textarea } from '@/components/ui/textarea'; // สมมติว่ามี Textarea component
// import { Rating } from 'react-simple-star-rating'; // ตัวอย่าง library การให้ดาว

interface NovelReviewsTabProps {
  novel: PopulatedNovelForDetailPage;
}

const reviewSectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};


const NovelReviewsTab: React.FC<NovelReviewsTabProps> = ({ novel }) => {
  const averageRating = novel.stats?.averageRating || 0;
  const ratingsCount = novel.stats?.ratingsCount || 0;
  // const [userRating, setUserRating] = useState(0); // สำหรับ input การให้ดาว
  // const [userReviewText, setUserReviewText] = useState(''); // สำหรับ input ข้อความรีวิว

  // const handleRating = (rate: number) => {
  //   setUserRating(rate);
  // };

  // const handleSubmitReview = () => {
  //   // TODO: Implement review submission logic
  //   alert(`ส่งรีวิว: ${userRating} ดาว, ข้อความ: "${userReviewText}" (ยังไม่ได้ทำ)`);
  // };

  return (
    <motion.div 
      className="space-y-8"
      variants={reviewSectionVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="bg-card border border-border p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold text-foreground mb-4">ภาพรวมรีวิว</h3>
        {ratingsCount > 0 ? (
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            <div className="text-center sm:text-left">
              <p className="text-5xl font-bold text-primary">{averageRating.toFixed(1)}</p>
              <p className="text-muted-foreground">จาก {ratingsCount} รีวิว</p>
            </div>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={28}
                  className={`mr-1 ${
                    averageRating >= star
                      ? 'text-yellow-400 fill-yellow-400'
                      : averageRating >= star - 0.5
                      ? 'text-yellow-400 fill-yellow-200' // ครึ่งดาว (ถ้าต้องการ)
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <MessageSquare size={36} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">ยังไม่มีรีวิวสำหรับนิยายเรื่องนี้</p>
            <p className="text-sm text-muted-foreground/80">ร่วมเป็นคนแรกที่รีวิว!</p>
          </div>
        )}
      </motion.div>

      {/* ส่วนสำหรับเขียนรีวิว (Placeholder) */}
      <motion.div variants={itemVariants} className="bg-card border border-border p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
          <Edit size={22} /> เขียนรีวิวของคุณ
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          แบ่งปันความคิดเห็นของคุณเกี่ยวกับนิยายเรื่องนี้ให้ผู้อ่านคนอื่นทราบ
        </p>
        <form className="space-y-4">
          <div>
            <label htmlFor="rating" className="block text-sm font-medium text-foreground mb-1">ให้คะแนน:</label>
            {/* <Rating
              onClick={handleRating}
              initialValue={userRating}
              size={30}
              fillColor="var(--primary)"
              emptyColor="var(--muted-foreground)"
              SVGclassName="inline-block"
            /> */}
            <p className="text-center p-2 bg-secondary rounded-md text-muted-foreground">(ส่วนแสดงดาว Placeholder - ต้องใช้ library หรือ custom component)</p>
          </div>
          <div>
            <label htmlFor="reviewText" className="block text-sm font-medium text-foreground mb-1">ความคิดเห็น:</label>
            <textarea
              id="reviewText"
              rows={4}
              className="w-full p-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring focus:border-ring"
              placeholder="เล่าถึงสิ่งที่คุณชอบหรือไม่ชอบเกี่ยวกับนิยายเรื่องนี้..."
              // value={userReviewText}
              // onChange={(e) => setUserReviewText(e.target.value)}
            />
          </div>
          <button
            type="button" // เปลี่ยนเป็น submit ถ้ามีการจัดการ form จริง
            // onClick={handleSubmitReview}
            onClick={() => alert('ส่งรีวิว (ยังไม่ได้ทำ)')}
            className="px-6 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            ส่งรีวิว
          </button>
        </form>
      </motion.div>

      {/* ส่วนแสดงรายการรีวิว (Placeholder) */}
      <motion.div variants={itemVariants} className="bg-card border border-border p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold text-foreground mb-4">รีวิวจากผู้อ่าน</h3>
        <div className="text-center py-6">
          <MessageSquare size={36} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">(ส่วนแสดงรายการรีวิว Placeholder)</p>
          <p className="text-sm text-muted-foreground/80">เมื่อมีผู้รีวิว เนื้อหาจะแสดงที่นี่</p>
        </div>
        {/* TODO: วนลูปแสดงรายการรีวิวเมื่อมีข้อมูลจริง */}
      </motion.div>
    </motion.div>
  );
};

export default NovelReviewsTab;