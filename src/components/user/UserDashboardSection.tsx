// src/components/UserDashboardSection.tsx
// คอมโพเนนต์สำหรับแสดงแดชบอร์ดของผู้ใช้ โดยเน้น UI ที่สวยงามสำหรับนักเขียน
'use client';

import { useEffect, useState } from "react";
import { BarChart2, BookOpen, Heart, Users, TrendingUp, DollarSign, UserPlus, Loader2, Gift } from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Interface สำหรับข้อมูลผู้ใช้
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

// Interface สำหรับข้อมูลวิเคราะห์นักเขียน
interface WriterAnalyticsData {
  overview: {
    totalNovelViews: number;
    totalCoinRevenue: number;
    totalDonations: number;
    totalFollowers: number;
    averageRating: number;
    lastCalculatedAt: string;
  };
  novelPerformance: Array<{
    novelId: string;
    title: string;
    totalViews: number;
    totalReads: number;
    totalLikes: number;
    totalCoinRevenue: number;
    totalDonations: number;
  }>;
  monthlyEarnings: Array<{
    date: string;
    coinValue: number;
    donationValue: number;
  }>;
}

// Interface สำหรับกิจกรรมผู้อ่าน
interface ReaderActivityData {
  lastNovelRead?: { title: string; novelSlug: string; _id: string };
  lastNovelLiked?: { title: string; novelSlug: string; _id: string };
  lastWriterFollowed?: { name: string; username: string; _id: string };
}

interface UserDashboardSectionProps {
  user: CombinedUser;
}

// คอมโพเนนต์สำหรับการ์ดสถิติ
const StatCard = ({
  title,
  value,
  icon,
  unit,
  change,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  unit?: string;
  change?: string;
}) => (
  <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        <span className="text-indigo-500 dark:text-indigo-400 mr-3">{icon}</span>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h4>
      </div>
      {change && (
        <span className="text-xs text-green-500 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
          {change}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">
      {value} {unit && <span className="text-base font-normal text-gray-500 dark:text-gray-400">{unit}</span>}
    </p>
  </div>
);

// คอมโพเนนต์หลักของแดชบอร์ด
const UserDashboardSection = ({ user }: UserDashboardSectionProps) => {
  const [writerAnalytics, setWriterAnalytics] = useState<WriterAnalyticsData | null>(null);
  const [readerActivity, setReaderActivity] = useState<ReaderActivityData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ดึงข้อมูลจาก API เมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const endpoint = user.role === "Writer" ? `/api/${user.username}/writer-analytics` : `/api/${user.username}/dashboard`;
        const response = await fetch(endpoint, { next: { revalidate: 60 } });
        if (!response.ok) {
          throw new Error("ไม่สามารถดึงข้อมูลแดชบอร์ดได้");
        }
        const data = await response.json();
        if (user.role === "Writer") {
          setWriterAnalytics(data);
        }
        if (user.role === "Reader" || user.role === "Writer") {
          setReaderActivity(data.readerActivity || {});
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
      <section className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg flex justify-center items-center min-h-[200px]">
        <Loader2 className="animate-spin text-indigo-500 dark:text-indigo-400 w-8 h-8" />
      </section>
    );
  }

  // แสดงข้อผิดพลาด
  if (error) {
    return (
      <section className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
        <p className="text-red-500 dark:text-red-400 text-center">ข้อผิดพลาด: {error}</p>
      </section>
    );
  }

  // แดชบอร์ดสำหรับนักเขียน
  if (user.role === "Writer" && writerAnalytics) {
    const chartData = writerAnalytics.monthlyEarnings.map((earning) => ({
      date: new Date(earning.date).toLocaleDateString("th-TH", { month: "short", year: "2-digit" }),
      coins: earning.coinValue,
      donations: earning.donationValue,
    }));

    return (
      <section className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <BarChart2 className="mr-3 text-indigo-500 dark:text-indigo-400" /> ภาพรวมนักเขียน
          </h2>
          <Link href={`/dashboard/writer-analytics`} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">
            ดูรายละเอียด →
          </Link>
        </div>

        {/* การ์ดสถิติ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="ยอดเข้าชมทั้งหมด"
            value={writerAnalytics.overview.totalNovelViews.toLocaleString()}
            icon={<TrendingUp size={24} />}
            change="+12%"
          />
          <StatCard
            title="รายได้จากเหรียญ"
            value={writerAnalytics.overview.totalCoinRevenue.toLocaleString()}
            icon={<DollarSign size={24} />}
            unit="เหรียญ"
          />
          <StatCard
            title="ยอดบริจาค"
            value={writerAnalytics.overview.totalDonations.toLocaleString()}
            icon={<Gift size={24} />}
            unit="บาท"
          />
          <StatCard
            title="ผู้ติดตาม"
            value={writerAnalytics.overview.totalFollowers.toLocaleString()}
            icon={<Users size={24} />}
          />
        </div>

        {/* กราฟรายได้ */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">แนวโน้มรายได้รายเดือน</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "none", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
                />
                <Line type="monotone" dataKey="coins" stroke="#4f46e5" strokeWidth={2} name="เหรียญ" />
                <Line type="monotone" dataKey="donations" stroke="#10b981" strokeWidth={2} name="บริจาค" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ประสิทธิภาพนิยาย */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">ประสิทธิภาพนิยาย</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700 dark:text-gray-200">
              <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-4 py-3">ชื่อนิยาย</th>
                  <th className="px-4 py-3">ยอดวิว</th>
                  <th className="px-4 py-3">ยอดอ่าน</th>
                  <th className="px-4 py-3">ยอดถูกใจ</th>
                  <th className="px-4 py-3">เหรียญ</th>
                  <th className="px-4 py-3">บริจาค</th>
                </tr>
              </thead>
              <tbody>
                {writerAnalytics.novelPerformance.map((novel) => (
                  <tr key={novel.novelId} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-4 py-3">
                      <Link href={`/novels/${novel.novelId}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        {novel.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{novel.totalViews.toLocaleString()}</td>
                    <td className="px-4 py-3">{novel.totalReads.toLocaleString()}</td>
                    <td className="px-4 py-3">{novel.totalLikes.toLocaleString()}</td>
                    <td className="px-4 py-3">{novel.totalCoinRevenue.toLocaleString()}</td>
                    <td className="px-4 py-3">{novel.totalDonations.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          ข้อมูลอัปเดตล่าสุดเมื่อ{" "}
          {new Date(writerAnalytics.overview.lastCalculatedAt).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </section>
    );
  }

  // แดชบอร์ดสำหรับผู้อ่านและแอดมิน
  return (
    <section className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
        <BarChart2 className="mr-3 text-indigo-500 dark:text-indigo-400" /> แดชบอร์ดภาพรวม
      </h2>

      {(user.role === "Reader" || user.role === "Writer") && readerActivity && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">
            {user.role === "Writer" ? "กิจกรรมการอ่านของคุณ" : "ภาพรวมกิจกรรมของคุณ"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">สรุปกิจกรรมล่าสุดของคุณบนแพลตฟอร์ม</p>
          <ul className="space-y-3 text-sm">
            {readerActivity.lastNovelRead && (
              <li className="flex items-start p-3 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <BookOpen size={18} className="mr-3 mt-1 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">อ่านล่าสุด:</span>{" "}
                  <Link href={`/novels/${readerActivity.lastNovelRead.novelSlug}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    {readerActivity.lastNovelRead.title}
                  </Link>
                </div>
              </li>
            )}
            {readerActivity.lastNovelLiked && (
              <li className="flex items-start p-3 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Heart size={18} className="mr-3 mt-1 text-red-500 flex-shrink-0" />
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">ถูกใจล่าสุด:</span>{" "}
                  <Link href={`/novels/${readerActivity.lastNovelLiked.novelSlug}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    {readerActivity.lastNovelLiked.title}
                  </Link>
                </div>
              </li>
            )}
            {readerActivity.lastWriterFollowed && (
              <li className="flex items-start p-3 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Users size={18} className="mr-3 mt-1 text-green-500 flex-shrink-0" />
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">ติดตามล่าสุด:</span>{" "}
                  <Link href={`/user/${readerActivity.lastWriterFollowed.username}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    {readerActivity.lastWriterFollowed.name}
                  </Link>
                </div>
              </li>
            )}
            {!readerActivity.lastNovelRead && !readerActivity.lastNovelLiked && !readerActivity.lastWriterFollowed && (
              <p className="text-gray-500 dark:text-gray-400">ยังไม่มีกิจกรรมล่าสุด</p>
            )}
          </ul>
        </div>
      )}
    </section>
  );
};

export default UserDashboardSection;