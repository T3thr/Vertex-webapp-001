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

// Component สำหรับแสดงกราฟรายได้ที่ปรับปรุงแล้ว - Mobile Responsive
function EarningsChart({ data }: { data: SerializedEarningAnalytic[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const isMobile = containerWidth < 640;
        const isTablet = containerWidth < 1024;
        
        setDimensions({
          width: containerWidth,
          height: isMobile ? 180 : isTablet ? 220 : 280
        });
      }
    };

    // Initial size
    handleResize();
    
    // Add resize listener
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!data || data.length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Responsive dimensions based on container width
    const containerWidth = dimensions.width;
    const isMobile = containerWidth < 640;
    const isTablet = containerWidth < 1024;

    const margin = isMobile 
      ? { top: 10, right: 10, bottom: 25, left: 35 }
      : isTablet 
      ? { top: 15, right: 20, bottom: 30, left: 50 }
      : { top: 20, right: 30, bottom: 40, left: 70 };

    const width = Math.max(containerWidth - margin.left - margin.right, 200);
    const height = dimensions.height;
    const chartHeight = height - margin.top - margin.bottom;

    const chartGroup = svg
      .attr("width", containerWidth)
      .attr("height", height)
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
      .range([chartHeight, 0]);

    // เพิ่ม gradient definitions
    const defs = chartGroup.append("defs");
    
    const earningsGradient = defs.append("linearGradient")
      .attr("id", "earnings-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", chartHeight)
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
      .attr("x1", 0).attr("y1", chartHeight)
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
      .y0(chartHeight)
      .y1(d => yScale(d.earnings))
      .curve(d3.curveMonotoneX);

    // Responsive tick counts
    const xTicks = isMobile ? 2 : isTablet ? 3 : 5;
    const yTicks = isMobile ? 3 : 4;

    // เพิ่ม axes with responsive styling
    const fontSize = isMobile ? "8px" : isTablet ? "9px" : "11px";

    chartGroup.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%m/%y") as any)
        .ticks(xTicks))
      .selectAll("text")
      .style("font-size", fontSize)
      .style("fill", "#6b7280")
      .attr("transform", isMobile ? "rotate(-45)" : "rotate(0)")
      .style("text-anchor", isMobile ? "end" : "middle");

    chartGroup.append("g")
      .call(d3.axisLeft(yScale)
        .tickFormat((d: d3.NumberValue) => {
          const num = Number(d);
          return isMobile && num >= 1000 
            ? `${(num / 1000).toFixed(0)}k` 
            : `${num.toLocaleString()}`;
        })
        .ticks(yTicks))
      .selectAll("text")
      .style("font-size", fontSize)
      .style("fill", "#6b7280");

    // เพิ่ม grid lines (ลดความหนาแน่นบน mobile)
    if (!isMobile) {
      chartGroup.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale)
          .tickSize(-chartHeight)
          .tickFormat("" as any)
          .ticks(xTicks))
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.15);

      chartGroup.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
          .tickSize(-width)
          .tickFormat("" as any)
          .ticks(yTicks))
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.15);
    }

    // เพิ่ม areas
    chartGroup.append("path")
      .datum(chartData)
      .attr("fill", "url(#earnings-gradient)")
      .attr("d", earningsArea);

    // เพิ่ม lines with responsive stroke width
    const strokeWidth = isMobile ? 1.5 : 2.5;

    chartGroup.append("path")
      .datum(chartData)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", strokeWidth)
      .attr("d", earningsLine);

    chartGroup.append("path")
      .datum(chartData)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", strokeWidth - 0.5)
      .attr("stroke-dasharray", "4,4")
      .attr("d", grossLine);

    // เพิ่ม dots สำหรับ earnings (ขนาดเล็กลงบน mobile)
    const dotRadius = isMobile ? 2 : 3;

    chartGroup.selectAll(".earnings-dot")
      .data(chartData)
      .enter().append("circle")
      .attr("class", "earnings-dot")
      .attr("cx", d => xScale(d.date))
      .attr("cy", d => yScale(d.earnings))
      .attr("r", dotRadius)
      .attr("fill", "#3b82f6")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1);

    // เพิ่ม legend (ซ่อนบน mobile หรือย้ายไปด้านล่าง)
    if (!isMobile && width > 300) {
      const legend = chartGroup.append("g")
        .attr("transform", `translate(${Math.max(width - 120, 10)}, 10)`);

      legend.append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", strokeWidth);

      legend.append("text")
        .attr("x", 18)
        .attr("y", 4)
        .text("รายได้สุทธิ")
        .style("font-size", fontSize)
        .style("fill", "#374151");

      legend.append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("y1", 12)
        .attr("y2", 12)
        .attr("stroke", "#10b981")
        .attr("stroke-width", strokeWidth - 0.5)
        .attr("stroke-dasharray", "4,4");

      legend.append("text")
        .attr("x", 18)
        .attr("y", 16)
        .text("รายได้รวม")
        .style("font-size", fontSize)
        .style("fill", "#374151");
    }

  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full h-auto" />
      {/* Mobile Legend */}
      <div className="flex justify-center gap-4 mt-2 sm:hidden">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500"></div>
          <span className="text-xs text-muted-foreground">รายได้สุทธิ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-500 border-dashed border border-green-500"></div>
          <span className="text-xs text-muted-foreground">รายได้รวม</span>
        </div>
      </div>
    </div>
  );
}

// Component สำหรับแสดงกราฟแจกแจงตามหมวดหมู่ - Mobile Responsive
function GenreDistributionChart({ novels }: { novels: SerializedNovel[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!novels || novels.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Responsive dimensions
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const isMobile = containerWidth < 640;
    const isTablet = containerWidth < 1024;

    const margin = isMobile 
      ? { top: 10, right: 10, bottom: 10, left: 10 }
      : { top: 20, right: 20, bottom: 20, left: 20 };

    const width = containerWidth - margin.left - margin.right;
    const height = isMobile ? 200 : isTablet ? 250 : 300;
    const radius = Math.min(width, height - margin.top - margin.bottom) / 2;

    const chartGroup = svg
      .attr("width", containerWidth)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${containerWidth / 2}, ${height / 2})`);

    // เตรียมข้อมูล
    const genreData = novels.reduce((acc, novel) => {
      const genre = novel.themeAssignment?.mainTheme?.categoryId;
      const genreName = typeof genre === 'object' && genre?.name ? genre.name : 'อื่นๆ';
      acc[genreName] = (acc[genreName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(genreData).map(([key, value]) => ({ genre: key, count: value }));

    // สี
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
    const colorScale = d3.scaleOrdinal(colors);

    // สร้าง pie layout
    const pie = d3.pie<any>()
      .value(d => d.count)
      .sort(null);

    const arc = d3.arc<any>()
      .innerRadius(isMobile ? radius * 0.4 : radius * 0.5)
      .outerRadius(radius);

    const arcs = chartGroup.selectAll('.arc')
      .data(pie(data))
      .enter().append('g')
      .attr('class', 'arc');

    // เพิ่ม paths
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => colorScale(i.toString()))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('opacity', 0.9);

    // เพิ่ม labels (ซ่อนบน mobile ถ้าเกินขนาด)
    if (!isMobile || data.length <= 5) {
      arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .style('font-size', isMobile ? '10px' : '12px')
        .style('font-weight', '600')
        .style('fill', '#ffffff')
        .text(d => {
          const percentage = ((d.data.count / novels.length) * 100).toFixed(0);
          return isMobile && d.data.genre.length > 6 
            ? `${percentage}%` 
            : `${d.data.genre} (${percentage}%)`;
        });
    }

  }, [novels]);

  // สร้าง legend สำหรับ mobile
  const genreData = novels.reduce((acc, novel) => {
    const genre = novel.themeAssignment?.mainTheme?.categoryId;
    const genreName = typeof genre === 'object' && genre?.name ? genre.name : 'อื่นๆ';
    acc[genreName] = (acc[genreName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(genreData).map(([key, value]) => ({ genre: key, count: value }));
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full h-auto" />
      {/* Mobile Legend */}
      <div className="grid grid-cols-2 gap-2 mt-3 sm:hidden">
        {data.map((item, index) => (
          <div key={item.genre} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-xs text-muted-foreground truncate">
              {item.genre} ({item.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Component สำหรับแสดงกราฟ Engagement Timeline - Mobile Responsive
function EngagementTimelineChart({ novels }: { novels: SerializedNovel[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!novels || novels.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Responsive dimensions
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const isMobile = containerWidth < 640;
    const isTablet = containerWidth < 1024;

    const margin = isMobile 
      ? { top: 15, right: 15, bottom: 40, left: 40 }
      : isTablet
      ? { top: 20, right: 25, bottom: 50, left: 60 }
      : { top: 20, right: 30, bottom: 60, left: 80 };

    const width = containerWidth - margin.left - margin.right;
    const height = isMobile ? 250 : isTablet ? 300 : 350;
    const chartHeight = height - margin.top - margin.bottom;

    const chartGroup = svg
      .attr("width", containerWidth)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // เตรียมข้อมูล engagement
    const engagementData = novels.map(novel => {
      const views = novel.stats?.viewsCount || 0;
      const likes = novel.stats?.likesCount || 0;
      const comments = novel.stats?.commentsCount || 0;
      const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
      
      return {
        title: novel.title,
        date: new Date(novel.lastContentUpdatedAt),
        engagement: engagement,
        views: views,
        likes: likes,
        comments: comments
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    if (engagementData.length === 0) return;

    // สร้าง scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(engagementData, d => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(engagementData, d => d.engagement) || 10])
      .range([chartHeight, 0]);

    // เพิ่ม axes
    const fontSize = isMobile ? "8px" : isTablet ? "10px" : "12px";
    const xTicks = isMobile ? 3 : isTablet ? 5 : 8;
    const yTicks = isMobile ? 3 : 5;

    // X-axis
    chartGroup.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat(isMobile ? "%m/%y" : "%m/%d") as any)
        .ticks(xTicks))
      .selectAll("text")
      .style("font-size", fontSize)
      .style("fill", "#6b7280")
      .attr("transform", isMobile ? "rotate(-45)" : "rotate(0)")
      .style("text-anchor", isMobile ? "end" : "middle");

    // Y-axis
    chartGroup.append("g")
      .call(d3.axisLeft(yScale)
        .tickFormat((d: d3.NumberValue) => `${Number(d).toFixed(1)}%`)
        .ticks(yTicks))
      .selectAll("text")
      .style("font-size", fontSize)
      .style("fill", "#6b7280");

    // เพิ่ม grid lines (ซ่อนบน mobile)
    if (!isMobile) {
      chartGroup.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
          .tickSize(-width)
          .tickFormat("" as any)
          .ticks(yTicks))
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.2);
    }

    // สร้าง line generator
    const line = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.engagement))
      .curve(d3.curveMonotoneX);

    // สร้าง area generator
    const area = d3.area<any>()
      .x(d => xScale(d.date))
      .y0(chartHeight)
      .y1(d => yScale(d.engagement))
      .curve(d3.curveMonotoneX);

    // เพิ่ม gradient
    const defs = chartGroup.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "engagement-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", chartHeight)
      .attr("x2", 0).attr("y2", 0);

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#8b5cf6")
      .attr("stop-opacity", 0.1);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#8b5cf6")
      .attr("stop-opacity", 0.6);

    // เพิ่ม area
    chartGroup.append("path")
      .datum(engagementData)
      .attr("fill", "url(#engagement-gradient)")
      .attr("d", area);

    // เพิ่ม line
    const strokeWidth = isMobile ? 2 : 3;
    chartGroup.append("path")
      .datum(engagementData)
      .attr("fill", "none")
      .attr("stroke", "#8b5cf6")
      .attr("stroke-width", strokeWidth)
      .attr("d", line);

    // เพิ่ม dots
    const dotRadius = isMobile ? 3 : 4;
    chartGroup.selectAll(".dot")
      .data(engagementData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.date))
      .attr("cy", d => yScale(d.engagement))
      .attr("r", dotRadius)
      .attr("fill", "#8b5cf6")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);

  }, [novels]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full h-auto" />
    </div>
  );
}

// Component สำหรับแสดงกราฟ Top 30 นิยายยอดนิยม
function Top30ViewsChart({ novels }: { novels: SerializedNovel[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!novels || novels.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Responsive dimensions
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const isMobile = containerWidth < 640;
    const isTablet = containerWidth < 1024;

    const margin = isMobile 
      ? { top: 15, right: 15, bottom: 60, left: 40 }
      : isTablet
      ? { top: 20, right: 25, bottom: 80, left: 60 }
      : { top: 20, right: 30, bottom: 100, left: 80 };

    const width = containerWidth - margin.left - margin.right;
    const height = isMobile ? 300 : isTablet ? 400 : 500;
    const chartHeight = height - margin.top - margin.bottom;

    const chartGroup = svg
      .attr("width", containerWidth)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // เตรียมข้อมูล - เอา Top 30 (หรือน้อยกว่าถ้ามีไม่ถึง 30)
    const sortedNovels = novels
      .sort((a, b) => (b.stats?.viewsCount || 0) - (a.stats?.viewsCount || 0))
      .slice(0, isMobile ? 10 : isTablet ? 20 : 30);

    if (sortedNovels.length === 0) return;

    // สร้าง scales
    const xScale = d3.scaleBand()
      .domain(sortedNovels.map((_, i) => i.toString()))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(sortedNovels, d => d.stats?.viewsCount || 0) || 0])
      .range([chartHeight, 0]);

    // สร้าง color scale
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, sortedNovels.length - 1]);

    // เพิ่ม axes
    const fontSize = isMobile ? "8px" : isTablet ? "10px" : "12px";
    const xTicks = isMobile ? 5 : isTablet ? 10 : 15;

    // X-axis
    chartGroup.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickValues(xScale.domain().filter((_, i) => i % Math.ceil(sortedNovels.length / xTicks) === 0))
        .tickFormat((d, i) => {
          const index = parseInt(d.toString());
          const novel = sortedNovels[index];
          return novel ? (isMobile && novel.title.length > 8 
            ? novel.title.substring(0, 8) + '...' 
            : novel.title.length > 15 
            ? novel.title.substring(0, 15) + '...'
            : novel.title) : '';
        }))
      .selectAll("text")
      .style("font-size", fontSize)
      .style("fill", "#6b7280")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    // Y-axis
    chartGroup.append("g")
      .call(d3.axisLeft(yScale)
        .tickFormat((d: d3.NumberValue) => {
          const num = Number(d);
          return isMobile && num >= 1000 
            ? `${(num / 1000).toFixed(0)}k` 
            : num.toLocaleString();
        })
        .ticks(isMobile ? 4 : 6))
      .selectAll("text")
      .style("font-size", fontSize)
      .style("fill", "#6b7280");

    // เพิ่ม grid lines (ซ่อนบน mobile)
    if (!isMobile) {
      chartGroup.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
          .tickSize(-width)
          .tickFormat("" as any)
          .ticks(6))
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.2);
    }

    // เพิ่ม bars
    chartGroup.selectAll(".bar")
      .data(sortedNovels)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", (_, i) => xScale(i.toString()) || 0)
      .attr("width", xScale.bandwidth())
      .attr("y", d => yScale(d.stats?.viewsCount || 0))
      .attr("height", d => chartHeight - yScale(d.stats?.viewsCount || 0))
      .attr("fill", (_, i) => colorScale(i))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .style("opacity", 0.8);

    // เพิ่ม value labels (เฉพาะ desktop)
    if (!isMobile) {
      chartGroup.selectAll(".value-label")
        .data(sortedNovels)
        .enter().append("text")
        .attr("class", "value-label")
        .attr("x", (_, i) => (xScale(i.toString()) || 0) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.stats?.viewsCount || 0) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#374151")
        .text(d => (d.stats?.viewsCount || 0).toLocaleString());
    }

  }, [novels]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full h-auto" />
    </div>
  );
}

// Component สำหรับแสดง Top 30 Earnings Chart - Mobile Responsive
function Top30EarningsChart({ novels, earningAnalytics, user }: { novels: SerializedNovel[]; earningAnalytics: SerializedEarningAnalytic[]; user: SerializedUser }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!novels || novels.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Responsive dimensions
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const isMobile = containerWidth < 640;
    const isTablet = containerWidth < 1024;

    const margin = isMobile 
      ? { top: 15, right: 15, bottom: 60, left: 50 }
      : isTablet
      ? { top: 20, right: 25, bottom: 80, left: 70 }
      : { top: 20, right: 30, bottom: 100, left: 90 };

    const width = containerWidth - margin.left - margin.right;
    const height = isMobile ? 300 : isTablet ? 400 : 500;
    const chartHeight = height - margin.top - margin.bottom;

    const chartGroup = svg
      .attr("width", containerWidth)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // สร้าง earnings map จาก analytics data และ writerStats.novelPerformanceSummaries
    const earningsMap = new Map<string, number>();
    
    // 1. เก็บข้อมูลจาก earningAnalytics
    earningAnalytics.forEach(analytic => {
      if (analytic.novelId) {
        const novelId = typeof analytic.novelId === 'string' ? analytic.novelId : (analytic.novelId as any)?._id || analytic.novelId;
        earningsMap.set(novelId, (earningsMap.get(novelId) || 0) + (analytic.netEarnings || 0));
      }
    });
    
    // 2. เก็บข้อมูลจาก writerStats.novelPerformanceSummaries
    if (user.writerStats?.novelPerformanceSummaries) {
      user.writerStats.novelPerformanceSummaries.forEach((summary: any) => {
        if (summary.novelId && summary.totalEarningsFromNovel) {
          const novelId = typeof summary.novelId === 'string' ? summary.novelId : summary.novelId._id || summary.novelId;
          // ถ้ายังไม่มีข้อมูลใน earningsMap หรือข้อมูลใน writerStats มากกว่า ให้ใช้ข้อมูลจาก writerStats
          const currentEarnings = earningsMap.get(novelId) || 0;
          if (summary.totalEarningsFromNovel > currentEarnings) {
            earningsMap.set(novelId, summary.totalEarningsFromNovel);
          }
        }
      });
    }

    // เตรียมข้อมูล - เอา Top 30 (หรือน้อยกว่าถ้ามีไม่ถึง 30) ตามรายได้
    const novelsWithEarnings = novels.map(novel => ({
      ...novel,
      earnings: earningsMap.get(novel._id) || 0
    }));
    
    // ใช้ข้อมูลรายได้จากทั้ง earningAnalytics และ writerStats.novelPerformanceSummaries

    const sortedNovels = novelsWithEarnings
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, isMobile ? 10 : isTablet ? 20 : 30)
      .filter(novel => novel.earnings > 0);

    if (sortedNovels.length === 0) return;

    // สร้าง scales
    const xScale = d3.scaleBand()
      .domain(sortedNovels.map((_, i) => i.toString()))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(sortedNovels, d => d.earnings) || 0])
      .range([chartHeight, 0]);

    // สร้าง color scale
    const colorScale = d3.scaleSequential(d3.interpolateGreens)
      .domain([0, sortedNovels.length - 1]);

    // เพิ่ม axes
    const fontSize = isMobile ? "8px" : isTablet ? "10px" : "12px";
    const xTicks = isMobile ? 5 : isTablet ? 10 : 15;

    // X-axis
    chartGroup.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickValues(xScale.domain().filter((_, i) => i % Math.ceil(sortedNovels.length / xTicks) === 0))
        .tickFormat((d, i) => {
          const index = parseInt(d.toString());
          const novel = sortedNovels[index];
          return novel ? (isMobile && novel.title.length > 8 
            ? novel.title.substring(0, 8) + '...' 
            : novel.title.length > 15 
            ? novel.title.substring(0, 15) + '...'
            : novel.title) : '';
        }))
      .selectAll("text")
      .style("font-size", fontSize)
      .style("fill", "#6b7280")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    // Y-axis
    chartGroup.append("g")
      .call(d3.axisLeft(yScale)
        .tickFormat((d: d3.NumberValue) => {
          const num = Number(d);
          return isMobile && num >= 1000 
            ? `${(num / 1000).toFixed(0)}k` 
            : `฿${num.toLocaleString()}`;
        })
        .ticks(isMobile ? 4 : 6))
      .selectAll("text")
      .style("font-size", fontSize)
      .style("fill", "#6b7280");

    // เพิ่ม grid lines (ซ่อนบน mobile)
    if (!isMobile) {
      chartGroup.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
          .tickSize(-width)
          .tickFormat("" as any)
          .ticks(6))
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.2);
    }

    // เพิ่ม bars
    chartGroup.selectAll(".bar")
      .data(sortedNovels)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", (_, i) => xScale(i.toString()) || 0)
      .attr("width", xScale.bandwidth())
      .attr("y", d => yScale(d.earnings))
      .attr("height", d => chartHeight - yScale(d.earnings))
      .attr("fill", (_, i) => colorScale(i))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .style("opacity", 0.8);

    // เพิ่ม value labels (เฉพาะ desktop)
    if (!isMobile) {
      chartGroup.selectAll(".value-label")
        .data(sortedNovels)
        .enter().append("text")
        .attr("class", "value-label")
        .attr("x", (_, i) => (xScale(i.toString()) || 0) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.earnings) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#374151")
        .text(d => `฿${d.earnings.toLocaleString()}`);
    }

  }, [novels, earningAnalytics]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full h-auto" />
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
  
  // คำนวณรายได้ทั้งหมดจาก earningAnalytics
  let totalEarnings = earningAnalytics.reduce((sum, item) => sum + (item.netEarnings || 0), 0);
  
  // ถ้าไม่มีข้อมูลรายได้ ให้ใช้ข้อมูลจาก user.writerStats?.totalEarningsToDate
  if (totalEarnings === 0 && user.writerStats?.totalEarningsToDate) {
    totalEarnings = user.writerStats.totalEarningsToDate;
  }

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
      className="py-2 md:py-3 px-2 md:px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none text-xs md:text-sm"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1 md:gap-2">
        {children}
        <div className="flex flex-col">
          <ChevronUp className={`w-2 h-2 md:w-3 md:h-3 ${sortField === field && sortDirection === 'asc' ? 'text-primary' : 'text-gray-300'}`} />
          <ChevronDown className={`w-2 h-2 md:w-3 md:h-3 -mt-1 ${sortField === field && sortDirection === 'desc' ? 'text-primary' : 'text-gray-300'}`} />
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
      className="space-y-3 md:space-y-4 lg:space-y-6 px-1 sm:px-2 md:px-4 lg:px-6 pb-0 max-w-full overflow-hidden"
    >
      {/* Header Controls */}
      <motion.div 
        className="flex flex-col gap-2 md:gap-3 lg:gap-4"
        variants={itemVariants}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3 lg:gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-foreground mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-8 xl:h-8 text-primary flex-shrink-0" />
              <span className="truncate">รายงานเชิงลึก</span>
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground">วิเคราะห์ผลงานและรายได้ของคุณอย่างละเอียด</p>
          </div>
        </div>

        {/* Controls - Mobile First Design */}
        <div className="flex flex-col gap-2 md:gap-3">
          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <div className="flex flex-1 gap-2">
          {/* Period Filter */}
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
                className="flex-1 bg-secondary text-secondary-foreground border border-border rounded-md md:rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                className="flex-1 bg-secondary text-secondary-foreground border border-border rounded-md md:rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="views">ยอดชม</option>
                <option value="engagement">การมีส่วนร่วม</option>
                <option value="earnings">รายได้</option>
                <option value="growth">การเติบโต</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 justify-center sm:justify-start">
          {/* Refresh Button */}
          <motion.button
            onClick={handleRefresh}
            disabled={isRefreshing}
                className="bg-primary text-primary-foreground px-3 md:px-4 lg:px-5 py-1.5 md:py-2 rounded-md md:rounded-lg text-xs md:text-sm font-medium hover:bg-primary-hover transition-colors flex items-center gap-1 md:gap-2 disabled:opacity-50 flex-shrink-0 min-w-[80px] justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
                <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">รีเฟรช</span>
                <span className="sm:hidden">รีเฟรช</span>
          </motion.button>

          {/* Export Button */}
          <motion.button
                className="bg-secondary text-secondary-foreground px-3 md:px-4 lg:px-5 py-1.5 md:py-2 rounded-md md:rounded-lg text-xs md:text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1 md:gap-2 flex-shrink-0 min-w-[80px] justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
                <Download className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">ส่งออก</span>
                <span className="sm:hidden">ส่งออก</span>
          </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics Cards */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3 lg:gap-4 xl:gap-6"
        variants={itemVariants}
      >
        {growthData.map((metric, index) => (
          <motion.div
            key={metric.label}
            className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 lg:p-5 xl:p-6 hover:shadow-lg transition-all duration-300"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <div className="flex items-center justify-between mb-2 md:mb-3 lg:mb-4">
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <div className="w-6 h-6 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 bg-primary/10 rounded-md md:rounded-lg flex items-center justify-center flex-shrink-0">
                  <metric.icon className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary" />
                </div>
                <h4 className="font-semibold text-card-foreground text-xs md:text-sm lg:text-base truncate">{metric.label}</h4>
              </div>
              <div className={`flex items-center gap-1 text-xs md:text-sm flex-shrink-0 ${
                metric.isPositive ? 'text-green-500' : 'text-red-500'
              }`}>
                {metric.isPositive ? (
                  <ArrowUpRight className="w-2 h-2 md:w-3 md:h-3 lg:w-4 lg:h-4" />
                ) : (
                  <ArrowDownRight className="w-2 h-2 md:w-3 md:h-3 lg:w-4 lg:h-4" />
                )}
                <span>{metric.growth}%</span>
              </div>
            </div>
            
            <div className="text-sm md:text-lg lg:text-xl xl:text-2xl font-bold text-card-foreground mb-1">
              {metric.label === 'คะแนนเฉลี่ย' 
                ? metric.value.toFixed(1)
                : metric.label === 'อัตราการมีส่วนร่วม'
                ? `${metric.value.toFixed(1)}%`
                : metric.value.toLocaleString()
              }
            </div>
            
            <p className="text-xs md:text-sm text-muted-foreground">
              เทียบกับ{selectedPeriod === 'week' ? 'สัปดาห์ก่อน' : 
                      selectedPeriod === 'month' ? 'เดือนก่อน' : 
                      selectedPeriod === 'quarter' ? 'ไตรมาสก่อน' : 'ปีก่อน'}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
        {/* Earnings Chart */}
        <motion.div 
          className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6"
          variants={itemVariants}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4 lg:mb-6">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm md:text-base lg:text-lg font-semibold text-card-foreground mb-1 md:mb-2">แนวโน้มรายได้</h4>
              <p className="text-xs md:text-sm text-muted-foreground">รายได้สุทธิและรายได้รวมในช่วงเวลาที่เลือก</p>
            </div>
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-primary flex-shrink-0" />
          </div>
          
          {earningAnalytics.length > 0 || totalEarnings > 0 ? (
            <div className="w-full min-h-[200px] md:min-h-[250px] lg:min-h-[300px]">
              {earningAnalytics.length > 0 ? (
                <EarningsChart data={earningAnalytics} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-sm md:text-base text-muted-foreground">มีรายได้รวมทั้งสิ้น {totalEarnings.toLocaleString()} บาท</p>
                    <p className="text-xs text-muted-foreground mt-2">ไม่มีข้อมูลแนวโน้มรายวัน</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 md:h-48 lg:h-64 text-muted-foreground">
              <div className="text-center">
                <DollarSign className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 lg:mb-4 opacity-50" />
                <p className="text-xs md:text-sm lg:text-base">ยังไม่มีข้อมูลรายได้</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Genre Distribution */}
        <motion.div 
          className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6"
          variants={itemVariants}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4 lg:mb-6">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm md:text-base lg:text-lg font-semibold text-card-foreground mb-1 md:mb-2">การกระจายตามหมวดหมู่</h4>
              <p className="text-xs md:text-sm text-muted-foreground">สัดส่วนนิยายตามหมวดหมู่ต่างๆ</p>
            </div>
            <PieChart className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-primary flex-shrink-0" />
          </div>
          
          {novels.length > 0 ? (
            <div className="w-full min-h-[200px] md:min-h-[250px] lg:min-h-[300px]">
              <GenreDistributionChart novels={novels} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 md:h-48 lg:h-64 text-muted-foreground">
              <div className="text-center">
                <BookOpen className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 lg:mb-4 opacity-50" />
                <p className="text-xs md:text-sm lg:text-base">ยังไม่มีข้อมูลนิยาย</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Top 30 Rankings Section */}
      <div className="grid grid-cols-1 gap-3 md:gap-4 lg:gap-6">
        {/* Top 30 Views Chart */}
      <motion.div 
          className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6"
        variants={itemVariants}
      >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4 lg:mb-6">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm md:text-base lg:text-lg font-semibold text-card-foreground mb-1 md:mb-2">นิยายยอดนิยม</h4>
              <p className="text-xs md:text-sm text-muted-foreground">นิยายที่มียอดชมสูงสุด {novels.length < 30 ? novels.length : '30'} อันดับแรก</p>
          </div>
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-primary flex-shrink-0" />
        </div>

          {novels.length > 0 ? (
            <div className="w-full min-h-[250px] md:min-h-[350px] lg:min-h-[400px]">
              <Top30ViewsChart novels={novels} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 md:h-48 lg:h-64 text-muted-foreground">
              <div className="text-center">
                <BookOpen className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 lg:mb-4 opacity-50" />
                <p className="text-xs md:text-sm lg:text-base">ยังไม่มีข้อมูลนิยาย</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Top 30 Earnings Chart */}
        <motion.div 
          className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6"
          variants={itemVariants}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4 lg:mb-6">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm md:text-base lg:text-lg font-semibold text-card-foreground mb-1 md:mb-2">นิยายทำเงินสูงสุด</h4>
              <p className="text-xs md:text-sm text-muted-foreground">นิยายที่สร้างรายได้สูงสุด {novels.length < 30 ? novels.length : '30'} อันดับแรก</p>
            </div>
            <DollarSign className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-primary flex-shrink-0" />
          </div>
          
          {novels.length > 0 ? (
            <div className="w-full min-h-[250px] md:min-h-[350px] lg:min-h-[400px]">
              <Top30EarningsChart novels={novels} earningAnalytics={earningAnalytics} user={user} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 md:h-48 lg:h-64 text-muted-foreground">
              <div className="text-center">
                <DollarSign className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 lg:mb-4 opacity-50" />
                <p className="text-xs md:text-sm lg:text-base">ยังไม่มีข้อมูลรายได้</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Engagement Timeline */}
      <motion.div 
        className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6"
        variants={itemVariants}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4 lg:mb-6">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm md:text-base lg:text-lg font-semibold text-card-foreground mb-1 md:mb-2">อัตราการมีส่วนร่วมตามเวลา</h4>
            <p className="text-xs md:text-sm text-muted-foreground">แนวโน้มการมีส่วนร่วมของผู้อ่านในแต่ละผลงาน</p>
          </div>
          <Activity className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-primary flex-shrink-0" />
        </div>
        
        {novels.length > 0 ? (
          <div className="w-full min-h-[200px] md:min-h-[250px] lg:min-h-[300px]">
            <EngagementTimelineChart novels={novels} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 md:h-48 lg:h-64 text-muted-foreground">
            <div className="text-center">
              <Activity className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 lg:mb-4 opacity-50" />
              <p className="text-xs md:text-sm lg:text-base">ยังไม่มีข้อมูลการมีส่วนร่วม</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Detailed Novel Performance Table - รองรับ Mobile อย่างสมบูรณ์ */}
      <motion.div 
        className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6 mb-0"
        variants={itemVariants}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4 lg:mb-6">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm md:text-base lg:text-lg font-semibold text-card-foreground mb-1 md:mb-2">ผลงานรายละเอียด</h4>
            <p className="text-xs md:text-sm text-muted-foreground">สถิติของแต่ละนิยายอย่างละเอียด</p>
          </div>
          <BookOpen className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-primary flex-shrink-0" />
        </div>

        {novels.length > 0 ? (
          <>
            {/* Desktop Table View - ซ่อนบน Mobile */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[700px] lg:min-w-[800px]">
              <thead>
                <tr className="border-b border-border">
                      <SortHeader field="title">
                        <span className="text-left">ชื่อเรื่อง</span>
                      </SortHeader>
                    <th className="text-center py-2 md:py-3 px-2 md:px-4 font-medium text-muted-foreground text-xs md:text-sm">สถานะ</th>
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
                      <td className="py-2 md:py-3 px-2 md:px-4">
                        <div className="max-w-[120px] lg:max-w-xs">
                          <p className="text-xs md:text-sm font-medium text-card-foreground truncate">
                              {novel.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              อัปเดต: {new Date(novel.lastContentUpdatedAt).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                    </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 text-center">
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
                        <td className="py-2 md:py-3 px-2 md:px-4 text-right">
                          <span className="font-semibold text-xs md:text-sm">{(novel.stats?.viewsCount || 0).toLocaleString()}</span>
                    </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 text-right">
                          <span className="font-semibold text-red-600 text-xs md:text-sm">{(novel.stats?.likesCount || 0).toLocaleString()}</span>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 text-right">
                          <span className="font-semibold text-blue-600 text-xs md:text-sm">{(novel.stats?.commentsCount || 0).toLocaleString()}</span>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="w-2 h-2 md:w-3 md:h-3 text-yellow-500" />
                            <span className="font-semibold text-xs md:text-sm">{(novel.stats?.averageRating || 0).toFixed(1)}</span>
                          </div>
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-right">
                        <span className={`font-semibold text-xs md:text-sm ${
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
            </div>

            {/* Mobile Card View - แสดงเฉพาะบน Mobile */}
            <div className="md:hidden space-y-3">
              {paginatedNovels.map((novel, index) => {
                const engagement = (novel.stats?.viewsCount || 0) > 0 
                  ? (((novel.stats?.likesCount || 0) + (novel.stats?.commentsCount || 0)) / (novel.stats?.viewsCount || 1)) * 100 
                  : 0;
                
                return (
                  <motion.div
                    key={novel._id.toString()}
                    className="bg-secondary/30 border border-border/50 rounded-lg p-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* Header - ชื่อเรื่องและสถานะ */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-3">
                        <h5 className="text-sm font-medium text-card-foreground truncate mb-1">
                          {novel.title}
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          อัปเดต: {new Date(novel.lastContentUpdatedAt).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
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
                    </div>

                    {/* Stats Grid - สถิติหลัก */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {/* ยอดชมและคะแนน */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">ยอดชม</span>
                          <span className="text-sm font-semibold">{(novel.stats?.viewsCount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">คะแนน</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-sm font-semibold">{(novel.stats?.averageRating || 0).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      {/* ไลค์และคอมเมนต์ */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">ไลค์</span>
                          <span className="text-sm font-semibold text-red-600">{(novel.stats?.likesCount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">คอมเมนต์</span>
                          <span className="text-sm font-semibold text-blue-600">{(novel.stats?.commentsCount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Engagement Bar - แถบการมีส่วนร่วม */}
                    <div className="border-t border-border/50 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">การมีส่วนร่วม</span>
                        <span className={`text-sm font-semibold ${
                          engagement > 5 ? 'text-green-600' : 
                          engagement > 2 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {engagement.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            engagement > 5 ? 'bg-green-500' : 
                            engagement > 2 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(engagement * 10, 100)}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Pagination - รองรับ Mobile */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 md:mt-6 pt-3 md:pt-4 border-t border-border gap-3">
                <div className="text-xs md:text-sm text-muted-foreground order-2 sm:order-1">
                  แสดง {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedNovels.length)} จาก {sortedNovels.length} รายการ
                </div>
                
                <div className="flex items-center gap-1 md:gap-2 order-1 sm:order-2">
                  <motion.button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 md:p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: currentPage === 1 ? 1 : 1.05 }}
                    whileTap={{ scale: currentPage === 1 ? 1 : 0.95 }}
                  >
                    <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                  </motion.button>
                  
                  {/* Mobile Pagination - แสดงแค่หน้าปัจจุบันและทั้งหมด */}
                  <div className="flex items-center gap-1 sm:hidden">
                    <span className="px-2 py-1 text-xs text-muted-foreground">
                      {currentPage} / {totalPages}
                    </span>
                  </div>

                  {/* Desktop Pagination - แสดงหมายเลขหน้าทั้งหมด */}
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      ) {
                        return (
                          <motion.button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-2 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors min-w-[32px] md:min-w-[36px] ${
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
                        page === currentPage - 3 ||
                        page === currentPage + 3
                      ) {
                        return (
                          <span key={page} className="px-1 md:px-2 text-muted-foreground text-xs md:text-sm">
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
                    className="p-1.5 md:p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: currentPage === totalPages ? 1 : 1.05 }}
                    whileTap={{ scale: currentPage === totalPages ? 1 : 0.95 }}
                  >
                    <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                  </motion.button>
                </div>
            </div>
          )}
          </>
        ) : (
          <div className="text-center py-8 md:py-12 text-muted-foreground">
            <BookOpen className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 opacity-50" />
            <p className="text-xs md:text-sm lg:text-base">ยังไม่มีข้อมูลนิยาย</p>
        </div>
        )}
      </motion.div>
    </motion.div>
  );
}