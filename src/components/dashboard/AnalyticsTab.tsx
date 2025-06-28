// src/components/dashboard/AnalyticsTab.tsx
// แท็บรายงานและวิเคราะห์ข้อมูล - แสดงกราฟและสถิติเชิงลึก
// อัพเกรดใหม่: ใช้ข้อมูลจาก Novel model อย่างเต็มประสิทธิภาพ
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
  ArrowDownRight,
  BookOpen,
  Heart,
  MessageCircle,
  Star,
  Clock,
  Target,
  Activity,
  Zap,
  LineChart,
  AreaChart,
  Layers,
  Globe,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
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

// Component สำหรับแสดงกราฟรายได้ที่ปรับปรุงแล้ว
function EarningsChart({ data }: { data: SerializedEarningAnalytic[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

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
      .domain([0, d3.max(chartData, d => Math.max(d.gross, d.earnings)) || 0])
      .range([height, 0]);

    // เพิ่ม gradient definitions
    const defs = chartGroup.append("defs");
    
    const earningsGradient = defs.append("linearGradient")
      .attr("id", "earnings-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", height)
      .attr("x2", 0).attr("y2", 0);

    earningsGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.1);

    earningsGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.8);

    const grossGradient = defs.append("linearGradient")
      .attr("id", "gross-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", height)
      .attr("x2", 0).attr("y2", 0);

    grossGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#10b981")
      .attr("stop-opacity", 0.1);

    grossGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#10b981")
      .attr("stop-opacity", 0.8);

    // สร้าง line และ area generators
    const earningsLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.earnings))
      .curve(d3.curveMonotoneX);

    const grossLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.gross))
      .curve(d3.curveMonotoneX);

    const earningsArea = d3.area<any>()
      .x(d => xScale(d.date))
      .y0(height)
      .y1(d => yScale(d.earnings))
      .curve(d3.curveMonotoneX);

    // เพิ่ม axes
    chartGroup.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%m/%y") as any)
        .ticks(6))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#6b7280");

    chartGroup.append("g")
      .call(d3.axisLeft(yScale)
        .tickFormat(d => `${(d as number).toLocaleString()}` as any)
        .ticks(5))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#6b7280");

    // เพิ่ม grid lines
    chartGroup.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-height)
        .tickFormat("" as any)
        .ticks(6))
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);

    chartGroup.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat("" as any)
        .ticks(5))
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);

    // เพิ่ม areas
    chartGroup.append("path")
      .datum(chartData)
      .attr("fill", "url(#earnings-gradient)")
      .attr("d", earningsArea);

    // เพิ่ม lines
    chartGroup.append("path")
      .datum(chartData)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("d", earningsLine);

    chartGroup.append("path")
      .datum(chartData)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("d", grossLine);

    // เพิ่ม dots สำหรับ earnings
    chartGroup.selectAll(".earnings-dot")
      .data(chartData)
      .enter().append("circle")
      .attr("class", "earnings-dot")
      .attr("cx", d => xScale(d.date))
      .attr("cy", d => yScale(d.earnings))
      .attr("r", 4)
      .attr("fill", "#3b82f6")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);

    // เพิ่ม legend
    const legend = chartGroup.append("g")
      .attr("transform", `translate(${width - 150}, 20)`);

    legend.append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3);

    legend.append("text")
      .attr("x", 25)
      .attr("y", 5)
      .text("รายได้สุทธิ")
      .style("font-size", "12px")
      .style("fill", "#374151");

    legend.append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 20)
      .attr("y2", 20)
      .attr("stroke", "#10b981")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    legend.append("text")
      .attr("x", 25)
      .attr("y", 25)
      .text("รายได้รวม")
      .style("font-size", "12px")
      .style("fill", "#374151");

  }, [data]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} className="min-w-[900px]"></svg>
    </div>
  );
}

// Component สำหรับแสดงกราฟ Genre Distribution
function GenreDistributionChart({ novels }: { novels: SerializedNovel[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!novels || novels.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;

    const chartGroup = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // นับจำนวนนิยายตามหมวดหมู่ (จำลองข้อมูล)
    const genreData = [
      { genre: 'โรแมนซ์', count: novels.filter(n => n.themeAssignment?.mainTheme).length * 0.4, color: '#f43f5e' },
      { genre: 'แฟนตาซี', count: novels.filter(n => n.themeAssignment?.mainTheme).length * 0.3, color: '#8b5cf6' },
      { genre: 'ดราม่า', count: novels.filter(n => n.themeAssignment?.mainTheme).length * 0.2, color: '#06b6d4' },
      { genre: 'อื่นๆ', count: novels.filter(n => n.themeAssignment?.mainTheme).length * 0.1, color: '#84cc16' }
    ].filter(d => d.count > 0);

    const pie = d3.pie<any>()
      .value(d => d.count)
      .sort(null);

    const arc = d3.arc<any>()
      .innerRadius(radius * 0.4)
      .outerRadius(radius);

    const arcs = chartGroup.selectAll(".arc")
      .data(pie(genreData))
      .enter().append("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", d => d.data.color)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .style("opacity", 0.8)
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 1);
      })
      .on("mouseout", function(event, d) {
        d3.select(this).style("opacity", 0.8);
      });

    // เพิ่ม labels
    arcs.append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "#ffffff")
      .text(d => d.data.count > 0 ? d.data.genre : '');

    // เพิ่ม percentage
    arcs.append("text")
      .attr("transform", d => {
        const centroid = arc.centroid(d);
        return `translate(${centroid[0]}, ${centroid[1] + 15})`;
      })
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#ffffff")
      .text(d => {
        const total = genreData.reduce((sum, item) => sum + item.count, 0);
        const percentage = ((d.data.count / total) * 100).toFixed(1);
        return d.data.count > 0 ? `${percentage}%` : '';
      });

  }, [novels]);

  return (
    <div className="flex justify-center">
      <svg ref={svgRef}></svg>
    </div>
  );
}

// Component สำหรับแสดงกราฟ Reading Engagement Over Time
function EngagementTimelineChart({ novels }: { novels: SerializedNovel[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!novels || novels.length === 0) return;

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

    // เตรียมข้อมูลจาก novels
    const engagementData = novels.map(novel => ({
      date: new Date(novel.lastContentUpdatedAt),
        views: novel.stats?.viewsCount || 0,
      likes: novel.stats?.likesCount || 0,
      comments: novel.stats?.commentsCount || 0,
      engagement: ((novel.stats?.likesCount || 0) + (novel.stats?.commentsCount || 0)) / Math.max(novel.stats?.viewsCount || 1, 1) * 100
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

    if (engagementData.length === 0) return;

    // สร้าง scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(engagementData, d => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(engagementData, d => d.engagement) || 100])
      .range([height, 0]);

    // สร้าง line generator
    const line = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.engagement))
      .curve(d3.curveCardinal);

    // เพิ่ม axes
    chartGroup.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%m/%d") as any));

    chartGroup.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d => `${d}%` as any));

    // เพิ่ม line
    chartGroup.append("path")
      .datum(engagementData)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 3)
      .attr("d", line);

    // เพิ่ม dots
    chartGroup.selectAll(".engagement-dot")
      .data(engagementData)
      .enter().append("circle")
      .attr("class", "engagement-dot")
      .attr("cx", d => xScale(d.date))
      .attr("cy", d => yScale(d.engagement))
      .attr("r", 5)
      .attr("fill", "#f59e0b")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);

  }, [novels]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} className="min-w-[800px]"></svg>
    </div>
  );
}

// Component สำหรับแสดงกราฟ Top 30 นิยายยอดนิยม
function Top30ViewsChart({ novels }: { novels: SerializedNovel[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!novels || novels.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 100, left: 80 };
    const width = 1200 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const chartGroup = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // เรียงลำดับและเอา Top 30
    const top30Novels = novels
      .sort((a, b) => (b.stats?.viewsCount || 0) - (a.stats?.viewsCount || 0))
      .slice(0, 30)
      .map((novel, index) => ({
        title: novel.title.length > 20 ? novel.title.substring(0, 20) + '...' : novel.title,
        fullTitle: novel.title,
        views: novel.stats?.viewsCount || 0,
        rank: index + 1
      }));

    if (top30Novels.length === 0) return;

    // สร้าง scales
    const xScale = d3.scaleBand()
      .domain(top30Novels.map(d => d.rank.toString()))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(top30Novels, d => d.views) || 0])
      .range([height, 0]);

    // สร้าง color scale
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, top30Novels.length - 1]);

    // เพิ่ม axes
    chartGroup.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#6b7280");

    chartGroup.append("g")
      .call(d3.axisLeft(yScale)
        .tickFormat(d => `${(d as number).toLocaleString()}`)
        .ticks(8))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#6b7280");

    // เพิ่ม grid lines
    chartGroup.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat("" as any)
        .ticks(8))
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);

    // สร้าง tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    // เพิ่ม bars
    chartGroup.selectAll(".bar")
      .data(top30Novels)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.rank.toString()) || 0)
      .attr("width", xScale.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", (d, i) => colorScale(i))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 0.8);
        tooltip.style("visibility", "visible")
          .html(`
            <strong>อันดับ ${d.rank}</strong><br/>
            ${d.fullTitle}<br/>
            <strong>${d.views.toLocaleString()}</strong> ยอดชม
          `);
      })
      .on("mousemove", function(event) {
        tooltip.style("top", (event.pageY - 10) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 1);
        tooltip.style("visibility", "hidden");
      })
      .transition()
      .duration(1000)
      .delay((d, i) => i * 50)
      .attr("y", d => yScale(d.views))
      .attr("height", d => height - yScale(d.views));

    // เพิ่ม labels
    chartGroup.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#374151")
      .text("ยอดชม");

    chartGroup.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#374151")
      .text("อันดับ");

    // Cleanup tooltip on unmount
    return () => {
      d3.select("body").selectAll(".tooltip").remove();
    };

  }, [novels]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} className="min-w-[1200px]"></svg>
    </div>
  );
}

// Component สำหรับแสดงกราฟ Top 30 นิยายที่ทำเงินมากที่สุด
function Top30EarningsChart({ novels, earningAnalytics }: { novels: SerializedNovel[]; earningAnalytics: SerializedEarningAnalytic[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!novels || novels.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 100, left: 100 };
    const width = 1200 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const chartGroup = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // จำลองข้อมูลรายได้ต่อนิยาย (ในอนาคตจะดึงจากข้อมูลจริง)
    const novelsWithEarnings = novels.map(novel => {
      // คำนวณรายได้จำลองจากยอดชมและคะแนน
      const baseEarning = (novel.stats?.viewsCount || 0) * 0.01; // 1 สตางค์ต่อ view
      const ratingBonus = (novel.stats?.averageRating || 0) * 100; // โบนัสจากคะแนน
      const randomFactor = Math.random() * 500; // ปัจจัยสุ่ม
      
      return {
        title: novel.title.length > 20 ? novel.title.substring(0, 20) + '...' : novel.title,
        fullTitle: novel.title,
        earnings: Math.round(baseEarning + ratingBonus + randomFactor),
        views: novel.stats?.viewsCount || 0,
        rating: novel.stats?.averageRating || 0
      };
    });

    // เรียงลำดับและเอา Top 30
    const top30Earnings = novelsWithEarnings
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 30)
      .map((novel, index) => ({
        ...novel,
        rank: index + 1
      }));

    if (top30Earnings.length === 0) return;

    // สร้าง scales
    const xScale = d3.scaleBand()
      .domain(top30Earnings.map(d => d.rank.toString()))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(top30Earnings, d => d.earnings) || 0])
      .range([height, 0]);

    // สร้าง color scale
    const colorScale = d3.scaleSequential(d3.interpolateWarm)
      .domain([0, top30Earnings.length - 1]);

    // เพิ่ม axes
    chartGroup.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#6b7280");

    chartGroup.append("g")
      .call(d3.axisLeft(yScale)
        .tickFormat(d => `฿${(d as number).toLocaleString()}`)
        .ticks(8))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#6b7280");

    // เพิ่ม grid lines
    chartGroup.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat("" as any)
        .ticks(8))
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);

    // สร้าง tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    // เพิ่ม bars
    chartGroup.selectAll(".bar")
      .data(top30Earnings)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.rank.toString()) || 0)
      .attr("width", xScale.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", (d, i) => colorScale(i))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 0.8);
        tooltip.style("visibility", "visible")
          .html(`
            <strong>อันดับ ${d.rank}</strong><br/>
            ${d.fullTitle}<br/>
            <strong>฿${d.earnings.toLocaleString()}</strong> รายได้<br/>
            ${d.views.toLocaleString()} ยอดชม | ⭐ ${d.rating.toFixed(1)}
          `);
      })
      .on("mousemove", function(event) {
        tooltip.style("top", (event.pageY - 10) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 1);
        tooltip.style("visibility", "hidden");
      })
      .transition()
      .duration(1000)
      .delay((d, i) => i * 50)
      .attr("y", d => yScale(d.earnings))
      .attr("height", d => height - yScale(d.earnings));

    // เพิ่ม labels
    chartGroup.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#374151")
      .text("รายได้ (บาท)");

    chartGroup.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#374151")
      .text("อันดับ");

    // Cleanup tooltip on unmount
    return () => {
      d3.select("body").selectAll(".tooltip").remove();
    };

  }, [novels, earningAnalytics]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} className="min-w-[1200px]"></svg>
    </div>
  );
}

export default function AnalyticsTab({ earningAnalytics, novels, recentTransactions, user }: AnalyticsTabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('views');
  
  // Pagination และ Sorting สำหรับตาราง
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<'title' | 'views' | 'likes' | 'comments' | 'rating' | 'engagement'>('views');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // คำนวณสถิติจาก novels
  const totalViews = novels.reduce((sum, novel) => sum + (novel.stats?.viewsCount || 0), 0);
  const totalLikes = novels.reduce((sum, novel) => sum + (novel.stats?.likesCount || 0), 0);
  const totalComments = novels.reduce((sum, novel) => sum + (novel.stats?.commentsCount || 0), 0);
  const totalFollowers = novels.reduce((sum, novel) => sum + (novel.stats?.followersCount || 0), 0);
  const averageRating = novels.length > 0 
    ? novels.reduce((sum, novel) => sum + (novel.stats?.averageRating || 0), 0) / novels.length 
    : 0;
  const totalEarnings = earningAnalytics.reduce((sum, item) => sum + (item.netEarnings || 0), 0);

  // คำนวณ engagement rate
  const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;

  // คำนวณการเติบโต (จำลอง)
  const growthData = [
    { label: 'ยอดชม', value: totalViews, growth: 12.5, isPositive: true, icon: Eye },
    { label: 'ไลค์', value: totalLikes, growth: 18.3, isPositive: true, icon: Heart },
    { label: 'คอมเมนต์', value: totalComments, growth: 8.7, isPositive: true, icon: MessageCircle },
    { label: 'คะแนนเฉลี่ย', value: averageRating, growth: 2.1, isPositive: true, icon: Star },
    { label: 'อัตราการมีส่วนร่วม', value: engagementRate, growth: 5.4, isPositive: true, icon: Activity },
    { label: 'รายได้', value: totalEarnings, growth: 22.8, isPositive: true, icon: DollarSign },
  ];

  // ฟังก์ชันสำหรับ sorting
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // รีเซ็ตไปหน้าแรก
  };

  // เรียงลำดับข้อมูล
  const sortedNovels = [...novels].sort((a, b) => {
    let aValue: number | string = 0;
    let bValue: number | string = 0;

    switch (sortField) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'views':
        aValue = a.stats?.viewsCount || 0;
        bValue = b.stats?.viewsCount || 0;
        break;
      case 'likes':
        aValue = a.stats?.likesCount || 0;
        bValue = b.stats?.likesCount || 0;
        break;
      case 'comments':
        aValue = a.stats?.commentsCount || 0;
        bValue = b.stats?.commentsCount || 0;
        break;
      case 'rating':
        aValue = a.stats?.averageRating || 0;
        bValue = b.stats?.averageRating || 0;
        break;
      case 'engagement':
        aValue = (a.stats?.viewsCount || 0) > 0 
          ? (((a.stats?.likesCount || 0) + (a.stats?.commentsCount || 0)) / (a.stats?.viewsCount || 1)) * 100 
          : 0;
        bValue = (b.stats?.viewsCount || 0) > 0 
          ? (((b.stats?.likesCount || 0) + (b.stats?.commentsCount || 0)) / (b.stats?.viewsCount || 1)) * 100 
          : 0;
        break;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
  });

  // Pagination
  const totalPages = Math.ceil(sortedNovels.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNovels = sortedNovels.slice(startIndex, startIndex + itemsPerPage);

  // Component สำหรับ Sort Header
  const SortHeader = ({ field, children }: { field: typeof sortField; children: React.ReactNode }) => (
    <th 
      className="py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        <div className="flex flex-col">
          <ChevronUp className={`w-3 h-3 ${sortField === field && sortDirection === 'asc' ? 'text-primary' : 'text-gray-300'}`} />
          <ChevronDown className={`w-3 h-3 -mt-1 ${sortField === field && sortDirection === 'desc' ? 'text-primary' : 'text-gray-300'}`} />
        </div>
      </div>
    </th>
  );

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
      className="space-y-8 analytics-tab-content"
    >
      {/* Header Controls */}
      <motion.div 
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            รายงานเชิงลึก
          </h3>
          <p className="text-muted-foreground">วิเคราะห์ผลงานและรายได้ของคุณอย่างละเอียด</p>
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

          {/* Metric Filter */}
          <select 
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="bg-secondary text-secondary-foreground border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="views">ยอดชม</option>
            <option value="engagement">การมีส่วนร่วม</option>
            <option value="earnings">รายได้</option>
            <option value="growth">การเติบโต</option>
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
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <metric.icon className="w-5 h-5 text-primary" />
                </div>
              <h4 className="font-semibold text-card-foreground">{metric.label}</h4>
              </div>
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
                : metric.label === 'อัตราการมีส่วนร่วม'
                ? `${metric.value.toFixed(1)}%`
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

      {/* Top 30 Rankings Section */}
      <div className="grid grid-cols-1 gap-8">
        {/* Top 30 Views Chart */}
        <motion.div 
          className="bg-card border border-border rounded-xl p-6"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold text-card-foreground mb-2">Top 30 นิยายยอดนิยม</h4>
              <p className="text-sm text-muted-foreground">นิยายที่มียอดชมสูงสุด 30 อันดับแรก</p>
            </div>
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          
          {novels.length > 0 ? (
            <Top30ViewsChart novels={novels} />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>ยังไม่มีข้อมูลนิยาย</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Top 30 Earnings Chart */}
        <motion.div 
          className="bg-card border border-border rounded-xl p-6"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold text-card-foreground mb-2">Top 30 นิยายทำเงินสูงสุด</h4>
              <p className="text-sm text-muted-foreground">นิยายที่สร้างรายได้สูงสุด 30 อันดับแรก</p>
            </div>
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          
          {novels.length > 0 ? (
            <Top30EarningsChart novels={novels} earningAnalytics={earningAnalytics} />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>ยังไม่มีข้อมูลรายได้</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

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
              <p className="text-sm text-muted-foreground">รายได้สุทธิและรายได้รวมในช่วงเวลาที่เลือก</p>
            </div>
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          
          {earningAnalytics.length > 0 ? (
            <EarningsChart data={earningAnalytics} />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>ยังไม่มีข้อมูลรายได้</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Genre Distribution */}
        <motion.div 
          className="bg-card border border-border rounded-xl p-6"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold text-card-foreground mb-2">การกระจายตามหมวดหมู่</h4>
              <p className="text-sm text-muted-foreground">สัดส่วนนิยายตามหมวดหมู่ต่างๆ</p>
            </div>
            <PieChart className="w-6 h-6 text-primary" />
          </div>
          
          {novels.length > 0 ? (
            <GenreDistributionChart novels={novels} />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>ยังไม่มีข้อมูลนิยาย</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Engagement Timeline */}
      <motion.div 
        className="bg-card border border-border rounded-xl p-6"
        variants={itemVariants}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-semibold text-card-foreground mb-2">อัตราการมีส่วนร่วมตามเวลา</h4>
            <p className="text-sm text-muted-foreground">แนวโน้มการมีส่วนร่วมของผู้อ่านในแต่ละผลงาน</p>
          </div>
          <Activity className="w-6 h-6 text-primary" />
        </div>
        
        {novels.length > 0 ? (
          <EngagementTimelineChart novels={novels} />
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>ยังไม่มีข้อมูลการมีส่วนร่วม</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Detailed Novel Performance Table */}
      <motion.div 
        className="bg-card border border-border rounded-xl p-6"
        variants={itemVariants}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-semibold text-card-foreground mb-2">ผลงานรายละเอียด</h4>
            <p className="text-sm text-muted-foreground">สถิติของแต่ละนิยายอย่างละเอียด</p>
          </div>
          <BookOpen className="w-6 h-6 text-primary" />
        </div>

        <div className="overflow-x-auto">
          {novels.length > 0 ? (
            <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                    <SortHeader field="title">
                      <span className="text-left">ชื่อเรื่อง</span>
                    </SortHeader>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">สถานะ</th>
                    <SortHeader field="views">
                      <span className="text-right">ยอดชม</span>
                    </SortHeader>
                    <SortHeader field="likes">
                      <span className="text-right">ไลค์</span>
                    </SortHeader>
                    <SortHeader field="comments">
                      <span className="text-right">คอมเมนต์</span>
                    </SortHeader>
                    <SortHeader field="rating">
                      <span className="text-right">คะแนน</span>
                    </SortHeader>
                    <SortHeader field="engagement">
                      <span className="text-right">การมีส่วนร่วม</span>
                    </SortHeader>
                </tr>
              </thead>
              <tbody>
                  {paginatedNovels.map((novel, index) => {
                  const engagement = (novel.stats?.viewsCount || 0) > 0 
                    ? (((novel.stats?.likesCount || 0) + (novel.stats?.commentsCount || 0)) / (novel.stats?.viewsCount || 1)) * 100 
                    : 0;
                  
                  return (
                  <motion.tr
                      key={novel._id.toString()}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium text-card-foreground truncate">
                            {novel.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            อัปเดต: {new Date(novel.lastContentUpdatedAt).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                    </td>
                      <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          novel.status === 'published' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : novel.status === 'completed'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                          {novel.status === 'published' && 'เผยแพร่'}
                          {novel.status === 'completed' && 'จบแล้ว'}
                          {novel.status === 'draft' && 'ฉบับร่าง'}
                      </span>
                    </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold">{(novel.stats?.viewsCount || 0).toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-red-600">{(novel.stats?.likesCount || 0).toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-blue-600">{(novel.stats?.commentsCount || 0).toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span className="font-semibold">{(novel.stats?.averageRating || 0).toFixed(1)}</span>
                        </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-semibold ${
                          engagement > 5 ? 'text-green-600' : 
                          engagement > 2 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                          {engagement.toFixed(1)}%
                      </span>
                    </td>
                  </motion.tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  แสดง {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedNovels.length)} จาก {sortedNovels.length} รายการ
                </div>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: currentPage === 1 ? 1 : 1.05 }}
                    whileTap={{ scale: currentPage === 1 ? 1 : 0.95 }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </motion.button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <motion.button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-secondary'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {page}
                          </motion.button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  
                  <motion.button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: currentPage === totalPages ? 1 : 1.05 }}
                    whileTap={{ scale: currentPage === totalPages ? 1 : 0.95 }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            )}
          </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>ยังไม่มีข้อมูลนิยาย</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}