// src/components/WriterAnalyticsDashboard.tsx
// คอมโพเนนต์แดชบอร์ดวิเคราะห์สำหรับนักเขียนโดยเฉพาะ

import { useEffect, useState } from "react";
import { BarChart2, BookOpen, Heart, Users, DollarSign, TrendingUp, Gift } from "lucide-react";
import Link from "next/link";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// ลงทะเบียน Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Interface สำหรับข้อมูลจาก API
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
  socialStats: {
    followersCount: number;
    followingCount: number;
    commentsMadeCount: number;
    likesGivenCount: number;
  };
}

interface WriterAnalyticsDashboardProps {
  username: string;
}

// คอมโพเนนต์สำหรับการ์ดสถิติ
const StatCard = ({
  title,
  value,
  icon,
  unit,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  unit?: string;
  trend?: { value: number; isPositive: boolean };
}) => (
  <div className="p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between h-full border border-gray-100">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center">
        <span className="text-indigo-600 mr-2">{icon}</span>
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      </div>
      {trend && (
        <span className={`text-xs ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
          {trend.isPositive ? "+" : "-"}{trend.value}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-indigo-700">
      {value} {unit && <span className="text-base font-normal text-gray-500">{unit}</span>}
    </p>
  </div>
);

// คอมโพเนนต์หลัก
const WriterAnalyticsDashboard = ({ username }: WriterAnalyticsDashboardProps) => {
  const [analytics, setAnalytics] = useState<WriterAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ดึงข้อมูลจาก API
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/${username}/writer-analytics`, { next: { revalidate: 3600 } });
        if (!response.ok) {
          throw new Error("ไม่สามารถดึงข้อมูลวิเคราะห์ได้");
        }
        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [username]);

  // ข้อมูลสำหรับกราฟรายได้
  const chartData = {
    labels: analytics?.monthlyEarnings.map((e) => new Date(e.date).toLocaleDateString("th-TH", { month: "short", year: "numeric" })) || [],
    datasets: [
      {
        label: "รายได้จากเหรียญ",
        data: analytics?.monthlyEarnings.map((e) => e.coinValue) || [],
        borderColor: "rgb(79, 70, 229)",
        backgroundColor: "rgba(79, 70, 229, 0.2)",
        tension: 0.4,
      },
      {
        label: "รายได้จากการบริจาค",
        data: analytics?.monthlyEarnings.map((e) => e.donationValue) || [],
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.2)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "รายได้รายเดือน" },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "จำนวน (เหรียญ)" } },
    },
  };

  // แสดงสถานะการโหลด
  if (loading) {
    return (
      <section className="py-8 px-4 sm:px-6 bg-gray-50 rounded-xl shadow-lg min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
      </section>
    );
  }

  // แสดงข้อผิดพลาด
  if (error) {
    return (
      <section className="py-8 px-4 sm:px-6 bg-gray-50 rounded-xl shadow-lg">
        <p className="text-red-600 text-center font-medium">ข้อผิดพลาด: {error}</p>
      </section>
    );
  }

  return (
    <section className="py-8 px-4 sm:px-6 bg-gray-50 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <BarChart2 className="w-6 h-6 text-indigo-600 mr-3" /> แดชบอร์ดวิเคราะห์นักเขียน
      </h2>

      {/* ภาพรวมสถิติ */}
      {analytics && (
        <>
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">ภาพรวม</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="ยอดเข้าชมรวม"
                value={analytics.overview.totalNovelViews.toLocaleString()}
                icon={<TrendingUp className="w-5 h-5" />}
                trend={{ value: 5, isPositive: true }}
              />
              <StatCard
                title="รายได้จากเหรียญ"
                value={analytics.overview.totalCoinRevenue.toLocaleString()}
                icon={<DollarSign className="w-5 h-5" />}
                unit="เหรียญ"
              />
              <StatCard
                title="รายได้จากการบริจาค"
                value={analytics.overview.totalDonations.toLocaleString()}
                icon={<Gift className="w-5 h-5" />}
                unit="บาท"
              />
              <StatCard
                title="ผู้ติดตาม"
                value={analytics.overview.totalFollowers.toLocaleString()}
                icon={<Users className="w-5 h-5" />}
                trend={{ value: 3, isPositive: true }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-4">
              อัปเดตล่าสุด: {new Date(analytics.overview.lastCalculatedAt).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* กราฟรายได้ */}
          <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">แนวโน้มรายได้</h3>
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* ประสิทธิภาพนิยาย */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">ประสิทธิภาพนิยาย</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="text-xs text-gray-500 uppercase bg-gray-100">
                  <tr>
                    <th className="px-6 py-3">ชื่อนิยาย</th>
                    <th className="px-6 py-3">ยอดวิว</th>
                    <th className="px-6 py-3">ยอดอ่าน</th>
                    <th className="px-6 py-3">ยอดไลค์</th>
                    <th className="px-6 py-3">รายได้เหรียญ</th>
                    <th className="px-6 py-3">รายได้บริจาค</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.novelPerformance.map((novel) => (
                    <tr key={novel.novelId} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">
                        <Link href={`/novels/${novel.novelId}`} className="text-indigo-600 hover:underline">
                          {novel.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">{novel.totalViews.toLocaleString()}</td>
                      <td className="px-6 py-4">{novel.totalReads.toLocaleString()}</td>
                      <td className="px-6 py-4">{novel.totalLikes.toLocaleString()}</td>
                      <td className="px-6 py-4">{novel.totalCoinRevenue.toLocaleString()} เหรียญ</td>
                      <td className="px-6 py-4">{novel.totalDonations.toLocaleString()} บาท</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* สถิติโซเชียล */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">การมีส่วนร่วมทางโซเชียล</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="ผู้ติดตาม"
                value={analytics.socialStats.followersCount.toLocaleString()}
                icon={<Users className="w-5 h-5" />}
              />
              <StatCard
                title="กำลังติดตาม"
                value={analytics.socialStats.followingCount.toLocaleString()}
                icon={<Users className="w-5 h-5" />}
              />
              <StatCard
                title="ความคิดเห็น"
                value={analytics.socialStats.commentsMadeCount.toLocaleString()}
                icon={<BookOpen className="w-5 h-5" />}
              />
              <StatCard
                title="ไลค์ที่ให้"
                value={analytics.socialStats.likesGivenCount.toLocaleString()}
                icon={<Heart className="w-5 h-5" />}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default WriterAnalyticsDashboard;