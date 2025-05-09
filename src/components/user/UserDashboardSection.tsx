// src/components/UserDashboardSection.tsx
// คอมโพเนนต์สำหรับแสดงส่วนแดชบอร์ดของผู้ใช้ ทำงานกับ API และรองรับการตอบสนอง

import { useEffect, useState } from "react";
import { BarChart2, BookOpen, Heart, Users, TrendingUp, DollarSign, UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";

// Interface สำหรับข้อมูลผู้ใช้ (สอดคล้องกับ User model)
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

// Interface สำหรับข้อมูลสถิตินักเขียน (สอดคล้องกับ WriterStats model)
interface WriterStatsData {
  totalNovelViews: number;
  totalCoinRevenue: number;
  monthlyNewFollowers: number;
  lastCalculatedAt: string;
}

// Interface สำหรับกิจกรรมผู้อ่าน (สอดคล้องกับ Novel, Like, UserFollow models)
interface ReaderActivityData {
  lastNovelRead?: { title: string; novelSlug: string; _id: string };
  lastNovelLiked?: { title: string; novelSlug: string; _id: string };
  lastWriterFollowed?: { name: string; username: string; _id: string };
}

interface UserDashboardSectionProps {
  user: CombinedUser;
}

// คอมโพเนนต์สำหรับแสดงการ์ดสถิติ
const StatCard = ({ title, value, icon, unit }: { title: string; value: string | number; icon: React.ReactNode; unit?: string }) => {
  return (
    <div className="p-4 bg-secondary rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between h-full">
      <div className="flex items-center mb-2">
        <span className="text-primary mr-2">{icon}</span>
        <h4 className="text-sm font-medium text-secondary-foreground truncate">{title}</h4>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-primary truncate">
        {value} {unit && <span className="text-base font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
};

// คอมโพเนนต์หลักของแดชบอร์ด
const UserDashboardSection = ({ user }: UserDashboardSectionProps) => {
  const [writerStats, setWriterStats] = useState<WriterStatsData | null>(null);
  const [readerActivity, setReaderActivity] = useState<ReaderActivityData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ดึงข้อมูลจาก API เมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/${user.username}/dashboard`);
        if (!response.ok) {
          throw new Error("ไม่สามารถดึงข้อมูลแดชบอร์ดได้");
        }
        const data = await response.json();
        if (user.role === "Writer") {
          setWriterStats(data.writerStats);
        }
        if (user.role === "Reader" || user.role === "Writer") {
          setReaderActivity(data.readerActivity);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // แสดงสถานะการโหลด
  if (loading) {
    return (
      <section className="mb-8 p-4 md:p-6 bg-card rounded-lg shadow-lg flex justify-center items-center min-h-[200px]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </section>
    );
  }

  // แสดงข้อผิดพลาด
  if (error) {
    return (
      <section className="mb-8 p-4 md:p-6 bg-card rounded-lg shadow-lg">
        <p className="text-red-500 text-center">ข้อผิดพลาด: {error}</p>
      </section>
    );
  }

  return (
    <section className="mb-8 p-4 sm:p-6 bg-card rounded-lg shadow-lg">
      <h2 className="text-xl sm:text-2xl font-semibold text-card-foreground mb-4 flex items-center">
        <BarChart2 size={24} className="mr-3 text-primary" /> แดชบอร์ดภาพรวม
      </h2>

      {/* ส่วนสถิตินักเขียน */}
      {user.role === "Writer" && writerStats && (
        <div className="mb-6 pb-6 border-b border-border">
          <h3 className="text-lg font-semibold text-primary mb-3">สถิตินักเขียน</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="ยอดเข้าชมรวม (ทุกเรื่อง)"
              value={writerStats.totalNovelViews.toLocaleString()}
              icon={<TrendingUp size={20} />}
            />
            <StatCard
              title="รายได้จากเหรียญ (รวม)"
              value={writerStats.totalCoinRevenue.toLocaleString()}
              icon={<DollarSign size={20} />}
              unit="Coins"
            />
            <StatCard
              title="ผู้ติดตามใหม่ (เดือนนี้)"
              value={`+${writerStats.monthlyNewFollowers.toLocaleString()}`}
              icon={<UserPlus size={20} />}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            ข้อมูลนี้อัปเดตล่าสุดเมื่อ {new Date(writerStats.lastCalculatedAt).toLocaleDateString("th-TH")}
          </p>
          <Link href={`/dashboard/writer-analytics`} className="mt-3 text-sm text-primary hover:underline inline-block">
            ดูสถิติทั้งหมด →
          </Link>
        </div>
      )}

      {/* ส่วนกิจกรรมผู้อ่าน */}
      {(user.role === "Reader" || user.role === "Writer") && readerActivity && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            {user.role === "Writer" ? "กิจกรรมการอ่านของคุณ" : "ภาพรวมกิจกรรมของคุณ"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">สรุปกิจกรรมล่าสุดของคุณบนแพลตฟอร์ม</p>
          <ul className="space-y-3 text-sm">
            {readerActivity.lastNovelRead && (
              <li className="flex items-start p-3 bg-secondary rounded-md hover:bg-secondary/80 transition-colors">
                <BookOpen size={18} className="mr-3 mt-1 text-primary flex-shrink-0" />
                <div>
                  <span className="font-medium text-secondary-foreground">อ่านล่าสุด:</span>{" "}
                  <Link href={`/novels/${readerActivity.lastNovelRead.novelSlug}`} className="text-primary hover:underline">
                    {readerActivity.lastNovelRead.title}
                  </Link>
                </div>
              </li>
            )}
            {readerActivity.lastNovelLiked && (
              <li className="flex items-start p-3 bg-secondary rounded-md hover:bg-secondary/80 transition-colors">
                <Heart size={18} className="mr-3 mt-1 text-red-500 flex-shrink-0" />
                <div>
                  <span className="font-medium text-secondary-foreground">ถูกใจล่าสุด:</span>{" "}
                  <Link href={`/novels/${readerActivity.lastNovelLiked.novelSlug}`} className="text-primary hover:underline">
                    {readerActivity.lastNovelLiked.title}
                  </Link>
                </div>
              </li>
            )}
            {readerActivity.lastWriterFollowed && (
              <li className="flex items-start p-3 bg-secondary rounded-md hover:bg-secondary/80 transition-colors">
                <Users size={18} className="mr-3 mt-1 text-green-500 flex-shrink-0" />
                <div>
                  <span className="font-medium text-secondary-foreground">ติดตามล่าสุด:</span>{" "}
                  <Link href={`/user/${readerActivity.lastWriterFollowed.username}`} className="text-primary hover:underline">
                    {readerActivity.lastWriterFollowed.name}
                  </Link>
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