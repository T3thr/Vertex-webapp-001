// src/components/novels/NovelReviewsTab.tsx
import { Star, MessageSquarePlus } from 'lucide-react';

interface NovelReviewsTabProps {
  novelId: string;
}

export const NovelReviewsTab: React.FC<NovelReviewsTabProps> = ({ novelId }) => {
  // Placeholder for actual review fetching and display logic
  // For now, just a simple message.

  return (
    <div className="py-8 px-4 bg-card rounded-lg shadow-md border border-border">
      <div className="text-center">
        <Star size={48} className="mx-auto text-amber-400 mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">รีวิวจากผู้อ่าน</h3>
        <p className="text-muted-foreground mb-6">
          ยังไม่มีรีวิวสำหรับนิยายเรื่องนี้ หรือฟังก์ชันรีวิวกำลังอยู่ในระหว่างการพัฒนา
        </p>
        <button
          // onClick={() => { /* Logic to open review submission modal */ }}
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
          disabled // Remove disabled when functionality is ready
        >
          <MessageSquarePlus size={18} className="mr-2" />
          เขียนรีวิวของคุณ
        </button>
      </div>

      {/* Example of how reviews might be structured (when data is available) */}
      {/* <div className="mt-8 space-y-6">
        {[1, 2].map(item => ( // Replace with actual review data
          <div key={item} className="p-4 border border-border rounded-md bg-background">
            <div className="flex items-center mb-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className={i < 4 ? "text-amber-400 fill-amber-400" : "text-muted-foreground"} />
                ))}
              </div>
              <p className="ml-2 text-sm font-medium text-foreground">ผู้ใช้ตัวอย่าง</p>
              <p className="ml-auto text-xs text-muted-foreground">2 วันที่แล้ว</p>
            </div>
            <p className="text-sm text-foreground/80">
              เนื้อเรื่องน่าติดตามมากค่ะ ตัวละครมีมิติ อ่านแล้ววางไม่ลงเลย!
            </p>
          </div>
        ))}
      </div>
      */}
    </div>
  );
};