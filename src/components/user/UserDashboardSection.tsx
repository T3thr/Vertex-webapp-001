// src/components/UserDashboardSection.tsx
// คอมโพเนนต์สำหรับแสดงส่วนแดชบอร์ดของผู้ใช้

import { BarChart2, BookOpen, Heart, Users, TrendingUp, DollarSign, UserPlus } from "lucide-react";

// Interface สำหรับข้อมูลผู้ใช้ (ควรตรงกับที่ใช้ใน page.tsx)
interface CombinedUser {
  _id: string;
  username: string;
  email?: string;
  role: "Reader" | "Writer" | "Admin";
  profile: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    coverImage?: string;
  };
  createdAt: Date;
}

// Placeholder: Interface for Writer Stats Data
interface WriterStatsData {
  totalNovelViews: number;
  totalCoinRevenue: number;
  monthlyNewFollowers: number;
  // Add more specific stats as needed from WriterStats model
}

// Placeholder: Interface for Reader Activity Data
interface ReaderActivityData {
  lastNovelRead?: { title: string; novelSlug?: string };
  lastNovelLiked?: { title: string; novelSlug?: string };
  lastWriterFollowed?: { name: string; username?: string };
  // Add more specific stats as needed from ActivityHistory, Like, NovelFollow models
}

interface UserDashboardSectionProps {
  user: CombinedUser;
  writerStats?: WriterStatsData; // Optional: only for writers
  readerActivity?: ReaderActivityData; // Optional: only for readers
}

// Placeholder: Simulate fetching writer stats
async function getWriterStats(userId: string): Promise<WriterStatsData> {
  console.log(`Fetching writer stats for user: ${userId}`);
  // Replace with actual API call to fetch data from WriterStats model
  return {
    totalNovelViews: 123456,
    totalCoinRevenue: 5000,
    monthlyNewFollowers: 50,
  };
}

// Placeholder: Simulate fetching reader activity
async function getReaderActivity(userId: string): Promise<ReaderActivityData> {
  console.log(`Fetching reader activity for user: ${userId}`);
  // Replace with actual API call to fetch data from relevant models
  return {
    lastNovelRead: { title: "การผจญภัยสุดขอบฟ้า", novelSlug: "adventure-to-the-horizon" },
    lastNovelLiked: { title: "ความลับใต้เงาจันทร์", novelSlug: "secret-under-moonlight" },
    lastWriterFollowed: { name: "นักเขียนชื่อดัง", username: "famouswriter" },
  };
}

const StatCard = ({ title, value, icon, unit }: { title: string; value: string | number; icon: React.ReactNode; unit?: string }) => {
  return (
    <div className="p-4 bg-secondary rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center mb-1">
        <span className="text-primary mr-2">{icon}</span>
        <h4 className="text-sm font-medium text-secondary-foreground truncate">{title}</h4>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-primary truncate">
        {value} <span className="text-lg font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
};

const UserDashboardSection = async ({ user }: UserDashboardSectionProps) => {
  let writerStats: WriterStatsData | null = null;
  let readerActivity: ReaderActivityData | null = null;

  if (user.role === "Writer") {
    writerStats = await getWriterStats(user._id);
  }
  if (user.role === "Reader" || user.role === "Writer") { // Writers are also readers
    readerActivity = await getReaderActivity(user._id);
  }

  return (
    <section className="mb-8 p-4 md:p-6 bg-card rounded-lg shadow-lg">
      <h2 className="text-xl md:text-2xl font-semibold text-card-foreground mb-4 flex items-center">
        <BarChart2 size={24} className="mr-3 text-primary" /> แดชบอร์ดภาพรวม
      </h2>

      {user.role === "Writer" && writerStats && (
        <div className="mb-6 pb-6 border-b border-border">
          <h3 className="text-lg font-semibold text-primary mb-3">สถิตินักเขียน</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="ยอดเข้าชมรวม (ทุกเรื่อง)" value={writerStats.totalNovelViews.toLocaleString()} icon={<TrendingUp size={20} />} />
            <StatCard title="รายได้จากเหรียญ (รวม)" value={writerStats.totalCoinRevenue.toLocaleString()} icon={<DollarSign size={20} />} unit="Coins" />
            <StatCard title="ผู้ติดตามใหม่ (เดือนนี้)" value={`+${writerStats.monthlyNewFollowers.toLocaleString()}`} icon={<UserPlus size={20} />} />
          </div>
          <p className="text-xs text-muted-foreground mt-4">ข้อมูลนี้อัปเดตล่าสุดเมื่อ [Placeholder: วันที่อัปเดต]</p>
          {/* TODO: Add link to full writer analytics dashboard page */}
          <button className="mt-3 text-sm text-primary hover:underline">ดูสถิติทั้งหมด &rarr;</button>
        </div>
      )}

      {(user.role === "Reader" || user.role === "Writer") && readerActivity && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            {user.role === "Writer" ? "กิจกรรมการอ่านของคุณ" : "ภาพรวมกิจกรรมของคุณ"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            สรุปกิจกรรมล่าสุดของคุณบนแพลตฟอร์ม
          </p>
          <ul className="space-y-3 text-sm">
            {readerActivity.lastNovelRead && (
              <li className="flex items-start p-3 bg-secondary rounded-md hover:bg-secondary/80 transition-colors">
                <BookOpen size={18} className="mr-3 mt-1 text-primary flex-shrink-0" />
                <div>
                  <span className="font-medium text-secondary-foreground">อ่านล่าสุด:</span> 
                  <a href={`/novels/${readerActivity.lastNovelRead.novelSlug || ""}`} className="text-primary hover:underline ml-1">
                    {readerActivity.lastNovelRead.title}
                  </a>
                </div>
              </li>
            )}
            {readerActivity.lastNovelLiked && (
              <li className="flex items-start p-3 bg-secondary rounded-md hover:bg-secondary/80 transition-colors">
                <Heart size={18} className="mr-3 mt-1 text-red-500 flex-shrink-0" />
                <div>
                  <span className="font-medium text-secondary-foreground">ถูกใจล่าสุด:</span> 
                  <a href={`/novels/${readerActivity.lastNovelLiked.novelSlug || ""}`} className="text-primary hover:underline ml-1">
                    {readerActivity.lastNovelLiked.title}
                  </a>
                </div>
              </li>
            )}
            {readerActivity.lastWriterFollowed && (
              <li className="flex items-start p-3 bg-secondary rounded-md hover:bg-secondary/80 transition-colors">
                <Users size={18} className="mr-3 mt-1 text-green-500 flex-shrink-0" />
                <div>
                  <span className="font-medium text-secondary-foreground">ติดตามล่าสุด:</span> 
                  <a href={`/user/${readerActivity.lastWriterFollowed.username || ""}`} className="text-primary hover:underline ml-1">
                    {readerActivity.lastWriterFollowed.name}
                  </a>
                </div>
              </li>
            )}
            {!readerActivity.lastNovelRead && !readerActivity.lastNovelLiked && !readerActivity.lastWriterFollowed && (
                <p className="text-muted-foreground">ยังไม่มีกิจกรรมล่าสุด</p>
            )}
          </ul>
        </div>
      )}
    </section>
  );
};

export default UserDashboardSection;

