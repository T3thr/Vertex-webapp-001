// src/components/dashboard/AnalyticsTab.tsx
// แท็บรายงานและวิเคราะห์ข้อมูล - แสดงกราฟและสถิติเชิงลึก
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { 
  TrendingUp, 
  DollarSign, 
  Eye, 
  Users, 
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { SerializedUser , SerializedWriterApplication , SerializedDonationApplication , SerializedEarningTransaction , SerializedEarningAnalytic , SerializedNovel } from '@/app/dashboard/page';
import { IEarningAnalytic } from '@/backend/models/EarningAnalytic';
import { IEarningTransaction } from '@/backend/models/EarningTransaction';
import { INovel } from '@/backend/models/Novel';
import { IUser } from '@/backend/models/User';

interface AnalyticsTabProps {
  earningAnalytics: SerializedEarningAnalytic[];
  novels: SerializedNovel[];
  recentTransactions: SerializedEarningTransaction[];
  user: SerializedUser;
}

// Component สำหรับแสดงกราฟรายได้
function EarningsChart({ data }: { data: SerializedEarningAnalytic[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const chartGroup = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // เตรียมข้อมูล
    const chartData = data.map(d => ({
      date: new Date(d.summaryDate),
      earnings: d.netEarnings || 0,
      gross: d.grossRevenue?.total || 0
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

    // สร้าง scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(chartData, d => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.gross) || 0])
      .range([height, 0]);

    // สร้าง line generator
    const line = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.earnings))
      .curve(d3.curveMonotoneX);

    // สร้าง area generator
    const area = d3.area<any>()
      .x(d => xScale(d.date))
      .y0(height)
      .y1(d => yScale(d.earnings))
      .curve(d3.curveMonotoneX);

    // เพิ่ม gradient
    const gradient = chartGroup.append("defs")
      .append("linearGradient")
      .attr("id", "earnings-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", height)
      .attr("x2", 0).attr("y2", 0);

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.1);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.3);

    // เพิ่ม axes
    chartGroup.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%m/%y") as any));

    chartGroup.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d => `${d.toLocaleString()}` as any));

    // เพิ่ม area
    chartGroup.append("path")
      .datum(chartData)
      .attr("fill", "url(#earnings-gradient)")
      .attr("d", area);

    // เพิ่ม line
    chartGroup.append("path")
      .datum(chartData)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("d", line);

    // เพิ่ม dots
    chartGroup.selectAll(".dot")
      .data(chartData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.date))
      .attr("cy", d => yScale(d.earnings))
      .attr("r", 4)
      .attr("fill", "#3b82f6")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);

  }, [data]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} className="min-w-[800px]"></svg>
    </div>
  );
}

// Component สำหรับแสดงกราฟผลงาน
function NovelPerformanceChart({ novels }: { novels: SerializedNovel[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!novels || novels.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 80, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const chartGroup = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // เตรียมข้อมูล - เอาแค่ 10 เรื่องที่มียอดชมสูงสุด
    const chartData = novels
      .sort((a, b) => (b.stats?.viewsCount || 0) - (a.stats?.viewsCount || 0))
      .slice(0, 10)
      .map(novel => ({
        title: novel.title.length > 15 ? novel.title.substring(0, 15) + '...' : novel.title,
        views: novel.stats?.viewsCount || 0,
        likes: novel.stats?.likesCount || 0
      }));

    // สร้าง scales
    const xScale = d3.scaleBand()
      .domain(chartData.map(d => d.title))
      .range([0, width])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.views) || 0])
      .range([height, 0]);

    // เพิ่ม axes
    chartGroup.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    chartGroup.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d => `${d.toLocaleString()}`));

    // เพิ่ม bars
    chartGroup.selectAll(".bar")
      .data(chartData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.title) || 0)
      .attr("width", xScale.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", "#10b981")
      .transition()
      .duration(1000)
      .delay((d, i) => i * 100)
      .attr("y", d => yScale(d.views))
      .attr("height", d => height - yScale(d.views));

  }, [novels]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} className="min-w-[600px]"></svg>
    </div>
  );
}

export default function AnalyticsTab({ earningAnalytics, novels, recentTransactions, user }: AnalyticsTabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // คำนวณสถิติต่างๆ
  const totalEarnings = earningAnalytics.reduce((sum, item) => sum + (item.netEarnings || 0), 0);
  const totalViews = novels.reduce((sum, novel) => sum + (novel.stats?.viewsCount || 0), 0);
  const totalFollowers = novels.reduce((sum, novel) => sum + (novel.stats?.followersCount || 0), 0);
  const averageRating = novels.length > 0 
    ? novels.reduce((sum, novel) => sum + (novel.stats?.averageRating || 0), 0) / novels.length 
    : 0;

  // คำนวณการเติบโต (จำลอง)
  const growthData = [
    { label: 'รายได้', value: totalEarnings, growth: 12.5, isPositive: true },
    { label: 'ยอดชม', value: totalViews, growth: 8.3, isPositive: true },
    { label: 'ผู้ติดตาม', value: totalFollowers, growth: 15.7, isPositive: true },
    { label: 'คะแนนเฉลี่ย', value: averageRating, growth: 2.1, isPositive: true },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // จำลองการรีเฟรชข้อมูล
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header Controls */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">รายงานเชิงลึก</h3>
          <p className="text-muted-foreground">วิเคราะห์ผลงานและรายได้ของคุณ</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Filter */}
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-secondary text-secondary-foreground border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="week">สัปดาห์นี้</option>
            <option value="month">เดือนนี้</option>
            <option value="quarter">ไตรมาสนี้</option>
            <option value="year">ปีนี้</option>
          </select>

          {/* Refresh Button */}
          <motion.button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </motion.button>

          {/* Export Button */}
          <motion.button
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-4 h-4" />
            ส่งออก
          </motion.button>
        </div>
      </motion.div>

      {/* Key Metrics Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        {growthData.map((metric, index) => (
          <motion.div
            key={metric.label}
            className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-card-foreground">{metric.label}</h4>
              <div className={`flex items-center gap-1 text-sm ${
                metric.isPositive ? 'text-green-500' : 'text-red-500'
              }`}>
                {metric.isPositive ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span>{metric.growth}%</span>
              </div>
            </div>
            
            <div className="text-2xl font-bold text-card-foreground mb-1">
              {metric.label === 'คะแนนเฉลี่ย' 
                ? metric.value.toFixed(1)
                : metric.value.toLocaleString()
              }
            </div>
            
            <p className="text-sm text-muted-foreground">
              เทียบกับ{selectedPeriod === 'week' ? 'สัปดาห์ก่อน' : 
                      selectedPeriod === 'month' ? 'เดือนก่อน' : 
                      selectedPeriod === 'quarter' ? 'ไตรมาสก่อน' : 'ปีก่อน'}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Earnings Chart */}
        <motion.div 
          className="bg-card border border-border rounded-xl p-6"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold text-card-foreground mb-2">แนวโน้มรายได้</h4>
              <p className="text-sm text-muted-foreground">รายได้ในช่วง 12 เดือนที่ผ่านมา</p>
            </div>
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          
          {earningAnalytics.length > 0 ? (
            <EarningsChart data={earningAnalytics} />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>ยังไม่มีข้อมูลรายได้</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Novel Performance Chart */}
        <motion.div 
          className="bg-card border border-border rounded-xl p-6"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold text-card-foreground mb-2">ผลงานที่ได้รับความนิยม</h4>
              <p className="text-sm text-muted-foreground">10 นิยายที่มียอดชมสูงสุด</p>
            </div>
            <Eye className="w-6 h-6 text-primary" />
          </div>
          
          {novels.length > 0 ? (
            <NovelPerformanceChart novels={novels} />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>ยังไม่มีข้อมูลผลงาน</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Transactions Table */}
      <motion.div 
        className="bg-card border border-border rounded-xl p-6"
        variants={itemVariants}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-semibold text-card-foreground mb-2">ธุรกรรมล่าสุด</h4>
            <p className="text-sm text-muted-foreground">รายการรายรับและรายจ่าย 10 รายการล่าสุด</p>
          </div>
          <DollarSign className="w-6 h-6 text-primary" />
        </div>

        <div className="overflow-x-auto">
          {recentTransactions.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">วันที่</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">รายการ</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ประเภท</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">จำนวน</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.slice(0, 10).map((transaction, index) => (
                  <motion.tr
                    key={transaction._id.toString()}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="py-3 px-4 text-sm">
                      {new Date(transaction.transactionDate).toLocaleDateString('th-TH')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium text-card-foreground truncate">
                          {transaction.description}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.transactionType.includes('earn') 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                        {transaction.transactionType.includes('earn') ? 'รายได้' : 'รายจ่าย'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-semibold ${
                        transaction.transactionType.includes('earn') 
                          ? 'text-green-600' 
                          : 'text-blue-600'
                      }`}>
                        {transaction.transactionType.includes('earn') ? '+' : ''}{transaction.amount.toLocaleString()} {transaction.currency}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {transaction.status === 'completed' && 'สำเร็จ'}
                        {transaction.status === 'pending' && 'รอดำเนินการ'}
                        {transaction.status === 'failed' && 'ล้มเหลว'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>ยังไม่มีธุรกรรม</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}