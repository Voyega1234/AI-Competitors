import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Sector,
  ComposedChart,
  Area,
} from "recharts";
import { format, subDays, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import { ArrowLeft, ChevronDown, ChevronUp, PieChart as PieChartIcon, Calendar, Clock, Users } from "lucide-react";

interface Post {
  facebookUrl: string;
  postId: string;
  url: string;
  topLevelUrl: string;
  time: string;
  timestamp: number;
  text: string;
  likes: number;
  comments: number;
  shares: number;
  media?: {
    thumbnail?: string;
    __typename?: string;
    __isMedia?: string;
    large_share_image?: {
      uri: string;
      width: number;
      height: number;
    };
  }[];
  previewTitle?: string;
  previewDescription?: string;
  previewSource?: string;
  user?: {
    id: string;
    name: string;
    profileUrl: string;
    profilePic: string;
  };
  brand?: string;
}

interface Competitor {
  name: string;
  color?: string;
}

interface EngagementDashboardProps {
  clientName: string;
  posts: Post[];
  competitors: Competitor[];
  onBack: () => void;
  showOverallEngagement?: boolean;
}

// Helper for percentage calculation
const calculatePercentage = (value: number, total: number) => {
  if (total === 0) return 0;
  return ((value / total) * 100).toFixed(1);
};

// Custom active shape for pie chart
const renderActiveShape = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value.toLocaleString()}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

const EngagementDashboard: React.FC<EngagementDashboardProps> = ({ posts, competitors, onBack, showOverallEngagement = false, clientName }) => {
  // Time period options
  const timeframes = [
    { value: "daily", label: "Daily" },
    { value: "7days", label: "Weekly" },
    // { value: "14days", label: "Bi-Weekly" },
  ];

  const [timeframeGranularity, setTimeframeGranularity] = useState("daily");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState("30days");
  const [chartType, setChartType] = useState("curve");
  const [selectedMetric, setSelectedMetric] = useState("engagement"); // "engagement", "likes", "comments", "shares"
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [expandedStats, setExpandedStats] = useState(true);
  const [showWeekdayAnalysis, setShowWeekdayAnalysis] = useState(true);
  const [showTopPerformers, setShowTopPerformers] = useState(true);
  const [selectedStatBrand, setSelectedStatBrand] = useState<string>("all");
  const [scaleType, setScaleType] = useState<"linear" | "log">("linear");
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(() => {
    // Initialize with all brands selected
    return new Set(competitors.map(c => c.name));
  });

  // Check if posts data is available
  const hasPosts = posts.length > 0;

  // Process raw posts data to generate time-series data
  const generateTimeSeriesData = (days: number) => {
    const data = [];
    const cutoffDate = subDays(new Date(), days);
    
    // Group posts by date and brand
    const groupedPosts: Record<string, any> = {};
    
    // Initialize dates for the selected period
    const frameSize = timeframeGranularity === "daily" ? 1 : 
                     timeframeGranularity === "7days" ? 7 :
                     timeframeGranularity === "14days" ? 14 : 30;
    
    // Calculate number of frames needed
    const frameCount = Math.ceil(days / frameSize);
    
    // Initialize frames
    for (let frame = 0; frame < frameCount; frame++) {
      const endDate = subDays(new Date(), frame * frameSize);
      const startDate = subDays(endDate, frameSize - 1);
      const frameKey = timeframeGranularity === "daily" 
        ? format(endDate, "MMM dd")
        : `${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd")}`;
      
      groupedPosts[frameKey] = { 
        date: frameKey, 
        startDate,
        endDate,
        dayOfWeek: format(endDate, 'EEEE') 
      };
      
      // Initialize metrics for each competitor
      competitors.forEach(competitor => {
        groupedPosts[frameKey][`${competitor.name}_likes`] = 0;
        groupedPosts[frameKey][`${competitor.name}_comments`] = 0;
        groupedPosts[frameKey][`${competitor.name}_shares`] = 0;
        groupedPosts[frameKey][`${competitor.name}_engagement`] = 0;
        groupedPosts[frameKey][`${competitor.name}_posts`] = 0;
      });
    }
    
    // Populate with actual post data
    posts.forEach(post => {
      if (!post.time) return; // Skip posts without time data
      
      const postDate = new Date(post.time);
      if (postDate >= cutoffDate) {
        // Find the appropriate frame for this post
        const frameIndex = Math.floor(
          (new Date().getTime() - postDate.getTime()) / (frameSize * 24 * 60 * 60 * 1000)
        );
        const endDate = subDays(new Date(), frameIndex * frameSize);
        const startDate = subDays(endDate, frameSize - 1);
        const frameKey = timeframeGranularity === "daily"
          ? format(postDate, "MMM dd")
          : `${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd")}`;
        
        const brand = post.brand || competitors[0]?.name || "Unknown";
        
        if (groupedPosts[frameKey]) {
          // Count posts
          groupedPosts[frameKey][`${brand}_posts`] = (groupedPosts[frameKey][`${brand}_posts`] || 0) + 1;
          
          // Add engagement metrics
          groupedPosts[frameKey][`${brand}_likes`] = (groupedPosts[frameKey][`${brand}_likes`] || 0) + (post.likes || 0);
          groupedPosts[frameKey][`${brand}_comments`] = (groupedPosts[frameKey][`${brand}_comments`] || 0) + (post.comments || 0);
          groupedPosts[frameKey][`${brand}_shares`] = (groupedPosts[frameKey][`${brand}_shares`] || 0) + (post.shares || 0);
          
          // Calculate total engagement
          groupedPosts[frameKey][`${brand}_engagement`] = 
            groupedPosts[frameKey][`${brand}_likes`] + 
            groupedPosts[frameKey][`${brand}_comments`] + 
            groupedPosts[frameKey][`${brand}_shares`];
        }
      }
    });
    
    // Convert to array and sort by date
    return Object.values(groupedPosts).sort((a: any, b: any) => a.startDate - b.startDate);
  };

  // Get data based on selected time period
  const getDataForTimePeriod = () => {
    switch (selectedTimePeriod) {
      case "1day":
        return generateTimeSeriesData(1);
      case "7days":
        return generateTimeSeriesData(7);
      case "14days":
        return generateTimeSeriesData(14);
      case "30days":
        return generateTimeSeriesData(30);
      case "90days":
        return generateTimeSeriesData(90);
      default:
        return generateTimeSeriesData(7);
    }
  };

  const timeSeriesData = getDataForTimePeriod();
  
  // Brand configuration - use actual competitors
  const brands = competitors.map((competitor, index) => {
    const colors = [
      "#003cff", // Indigo for client
      "#eb2a2a", // Red
      "#059669", // Emerald
      "#f79307", // Orange->Yellow
      "#7c3aed", // Violet
      "#f0418f", // Pink
      "#00b7db", // Light Blue
    ];

    return {
      name: competitor.name,
      displayName: competitor.name === 'CLIENT' ? clientName : competitor.name,
      color: colors[index % colors.length]
    };
  });

  // Calculate totals for the current time period
  const calculateTotals = () => {
    const brandTotals = brands
      .filter(brand => selectedBrands.has(brand.name))
      .map((brand) => {
        const likes = timeSeriesData.reduce((sum, day) => sum + (day[`${brand.name}_likes`] || 0), 0);
        const comments = timeSeriesData.reduce((sum, day) => sum + (day[`${brand.name}_comments`] || 0), 0);
        const shares = timeSeriesData.reduce((sum, day) => sum + (day[`${brand.name}_shares`] || 0), 0);
        const postCount = timeSeriesData.reduce((sum, day) => sum + (day[`${brand.name}_posts`] || 0), 0);
        
        const totalEngagement = likes + comments + shares;
        const engagementPerPost = postCount > 0 ? totalEngagement / postCount : 0;
        
        return {
          name: brand.name,
          likes,
          comments,
          shares,
          totalEngagement,
          postCount,
          engagementPerPost,
          color: brand.color,
          // Calculate percentages
          likesPct: (likes / (likes + comments + shares) * 100) || 0,
          commentsPct: (comments / (likes + comments + shares) * 100) || 0,
          sharesPct: (shares / (likes + comments + shares) * 100) || 0,
        };
      });

    // Sort by total engagement for ranking
    const sortedBrandTotals = [...brandTotals].sort((a, b) => b.totalEngagement - a.totalEngagement);

    // Add overall metrics when showOverallEngagement is true
    if (showOverallEngagement) {
      const totalLikes = brandTotals.reduce((sum, brand) => sum + brand.likes, 0);
      const totalComments = brandTotals.reduce((sum, brand) => sum + brand.comments, 0);
      const totalShares = brandTotals.reduce((sum, brand) => sum + brand.shares, 0);
      const totalPostCount = brandTotals.reduce((sum, brand) => sum + brand.postCount, 0);
      const totalEngagement = totalLikes + totalComments + totalShares;

      return [
        {
          name: "Overall",
          likes: totalLikes,
          comments: totalComments,
          shares: totalShares,
          totalEngagement,
          postCount: totalPostCount,
          engagementPerPost: totalPostCount > 0 ? totalEngagement / totalPostCount : 0,
          color: "#3700ff", // Use a distinct color for overall metrics
          likesPct: (totalLikes / totalEngagement * 100) || 0,
          commentsPct: (totalComments / totalEngagement * 100) || 0,
          sharesPct: (totalShares / totalEngagement * 100) || 0,
        },
        ...sortedBrandTotals
      ];
    }

    return sortedBrandTotals;
  };

  const totals = calculateTotals();
  
  // Calculate performance metrics for radar chart
  const radarData = useMemo(() => {
    if (totals.length <= 1) return [];
    
    // Create data format for radar chart (exclude "Overall")
    const metricsToCompare = showOverallEngagement ? totals.slice(1) : totals;
    
    // Get the max values for normalization
    const maxLikes = Math.max(...metricsToCompare.map(item => item.likes));
    const maxComments = Math.max(...metricsToCompare.map(item => item.comments));
    const maxShares = Math.max(...metricsToCompare.map(item => item.shares));
    const maxEngagementPerPost = Math.max(...metricsToCompare.map(item => item.engagementPerPost));
    
    // Normalize values to 0-100 scale for radar chart
    return metricsToCompare.map(brand => ({
      name: brand.name,
      "Likes": maxLikes > 0 ? Math.round((brand.likes / maxLikes) * 100) : 0,
      "Comments": maxComments > 0 ? Math.round((brand.comments / maxComments) * 100) : 0,
      "Shares": maxShares > 0 ? Math.round((brand.shares / maxShares) * 100) : 0,
      "Engagement Per Post": maxEngagementPerPost > 0 ? Math.round((brand.engagementPerPost / maxEngagementPerPost) * 100) : 0,
      "Post Volume": metricsToCompare.length > 0 
        ? Math.round((brand.postCount / Math.max(...metricsToCompare.map(b => b.postCount))) * 100) 
        : 0,
      color: brand.color
    }));
  }, [totals, showOverallEngagement]);

  // Get appropriate data key based on selected metric
  const getMetricDataKey = (brandName: string) => {
    switch(selectedMetric) {
      case "likes": return `${brandName}_likes`;
      case "comments": return `${brandName}_comments`;
      case "shares": return `${brandName}_shares`;
      case "engagement":
      default: return `${brandName}_engagement`;
    }
  };

  // Process data for log scale if needed
  const processedTimeSeriesData = useMemo(() => {
    if (scaleType === "log") {
      return timeSeriesData.map(item => {
        const processedItem = { ...item };
        brands.forEach(brand => {
          const key = getMetricDataKey(brand.name);
          // Ensure values are at least 1 for log scale
          processedItem[key] = Math.max(1, item[key] || 0);
        });
        return processedItem;
      });
    }
    return timeSeriesData;
  }, [timeSeriesData, scaleType, brands]);

  // Get appropriate label for selected metric
  const getMetricLabel = () => {
    switch(selectedMetric) {
      case "likes": return "Likes";
      case "comments": return "Comments";
      case "shares": return "Shares";
      case "engagement":
      default: return "Total Engagement";
    }
  };

  // Toggle brand visibility
  const toggleBrand = (brandName: string) => {
    setSelectedBrands(prev => {
      const newSet = new Set(prev);
      if (newSet.has(brandName)) {
        newSet.delete(brandName);
      } else {
        newSet.add(brandName);
      }
      return newSet;
    });
  };

  // Filter brands based on selection
  const filteredBrands = useMemo(() => {
    return brands.filter(brand => selectedBrands.has(brand.name));
  }, [brands, selectedBrands]);

  // Generate weekday analysis data
  const weekdayData = useMemo(() => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayMetrics: Record<string, any> = {};
    
    // Get cutoff date based on selectedTimePeriod
    const cutoffDate = subDays(new Date(), parseInt(selectedTimePeriod));
    
    // Initialize data structure
    days.forEach(day => {
      dayMetrics[day] = {
        day,
        totalPosts: 0,
        totalEngagement: 0,
        avgEngagement: 0
      };
      
      // Initialize per-brand metrics only for selected brands
      brands
        .filter(brand => selectedBrands.has(brand.name))
        .forEach(brand => {
          dayMetrics[day][`${brand.name}_posts`] = 0;
          dayMetrics[day][`${brand.name}_engagement`] = 0;
          dayMetrics[day][`${brand.name}_avgEngagement`] = 0;
        });
    });
    
    // Populate with data from posts within the selected time period
    posts.forEach(post => {
      if (!post.time) return;
      
      const postDate = new Date(post.time);
      // Only process posts within the selected time period
      if (postDate < cutoffDate) return;
      
      const dayOfWeek = format(postDate, 'EEEE');
      const brand = post.brand || "Unknown";
      
      // Only process data for selected brands
      if (!selectedBrands.has(brand)) return;
      
      const engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
      
      dayMetrics[dayOfWeek].totalPosts += 1;
      dayMetrics[dayOfWeek].totalEngagement += engagement;
      
      if (brands.some(b => b.name === brand)) {
        dayMetrics[dayOfWeek][`${brand}_posts`] += 1;
        dayMetrics[dayOfWeek][`${brand}_engagement`] += engagement;
      }
    });
    
    // Calculate averages
    days.forEach(day => {
      dayMetrics[day].avgEngagement = 
        dayMetrics[day].totalPosts > 0 
          ? dayMetrics[day].totalEngagement / dayMetrics[day].totalPosts 
          : 0;
      
      // Calculate per-brand averages
      brands
        .filter(brand => selectedBrands.has(brand.name))
        .forEach(brand => {
          dayMetrics[day][`${brand.name}_avgEngagement`] = 
            dayMetrics[day][`${brand.name}_posts`] > 0 
              ? dayMetrics[day][`${brand.name}_engagement`] / dayMetrics[day][`${brand.name}_posts`] 
              : 0;
        });
    });
    
    return Object.values(dayMetrics);
  }, [posts, brands, selectedBrands, selectedTimePeriod]);

  // Calculate top performing posts
  const topPosts = useMemo(() => {
    // Get cutoff date based on selectedTimePeriod
    const cutoffDate = subDays(new Date(), parseInt(selectedTimePeriod.replace('days', '')));

    // Filter posts by time period and selected brands
    const filteredPosts = posts.filter(post => {
      if (!post.time) return false;
      const postDate = new Date(post.timestamp * 1000); // Convert timestamp to Date
      return postDate >= cutoffDate && selectedBrands.has(post.brand || "Unknown");
    });

    // Add a totalEngagement property to each post
    const postsWithEngagement = filteredPosts.map(post => ({
      ...post,
      totalEngagement: (post.likes || 0) + (post.comments || 0) + (post.shares || 0)
    }));
    
    // Sort by total engagement
    return postsWithEngagement
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 5); // Get top 5
  }, [posts, selectedBrands, selectedTimePeriod]);

  return (
    <div className="container mx-auto p-4 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facebook Engagement Dashboard</h1>
          <p className="text-muted-foreground text-gray-500">
            {showOverallEngagement 
              ? "Overall platform engagement metrics" 
              : "Compare competitor performance over time"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <div className="flex space-x-1 bg-gray-100 rounded-md p-1">
            <button
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                chartType === "curve" 
                  ? "bg-white shadow text-gray-800" 
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setChartType("curve")}
            >
              Line
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                chartType === "block" 
                  ? "bg-white shadow text-gray-800" 
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setChartType("block")}
            >
              Bar
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                chartType === "area" 
                  ? "bg-white shadow text-gray-800" 
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setChartType("area")}
            >
              Area
            </button>
          </div>
          
          <div className="flex space-x-1 bg-gray-100 rounded-md p-1">
            <button
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedMetric === "engagement" 
                  ? "bg-white shadow text-gray-800" 
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setSelectedMetric("engagement")}
            >
              Engagement
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedMetric === "likes" 
                  ? "bg-white shadow text-gray-800" 
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setSelectedMetric("likes")}
            >
              Likes
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedMetric === "comments" 
                  ? "bg-white shadow text-gray-800" 
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setSelectedMetric("comments")}
            >
              Comments
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedMetric === "shares" 
                  ? "bg-white shadow text-gray-800" 
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setSelectedMetric("shares")}
            >
              Shares
            </button>
          </div>

          <div className="flex space-x-1 bg-gray-100 rounded-md p-1">
            {timeframes.map((frame) => (
              <button
                key={frame.value}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  timeframeGranularity === frame.value
                    ? "bg-white shadow text-gray-800"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => setTimeframeGranularity(frame.value)}
              >
                {frame.label}
              </button>
            ))}
          </div>

          <div className="flex space-x-1 bg-gray-100 rounded-md p-1">
            <button
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                scaleType === "linear" 
                  ? "bg-white shadow text-gray-800" 
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setScaleType("linear")}
            >
              Normal Scale
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                scaleType === "log" 
                  ? "bg-white shadow text-gray-800" 
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setScaleType("log")}
            >
              Log Scale
            </button>

          </div>

          <div className="flex space-x-1 bg-gray-100 rounded-md p-1">
              <select
              value={selectedTimePeriod}
              onChange={(e) => setSelectedTimePeriod(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="7days">Last 7 Days</option>
              <option value="14days">Last 14 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
          </div>

          <div className="flex space-x-1 bg-gray-100 rounded-md p-1">
            {brands.map((brand) => (
              <button
                key={brand.name}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center space-x-1 ${
                  selectedBrands.has(brand.name)
                    ? "bg-white shadow text-gray-800"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => toggleBrand(brand.name)}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: brand.color }}
                ></div>
                <span>{brand.displayName}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Time Series Chart */}
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>{`${getMetricLabel()} Over Time`}</CardTitle>
            <CardDescription>
              How {selectedMetric} metrics have changed over the selected time period
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "curve" ? (
                <LineChart
                  data={processedTimeSeriesData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    interval={selectedTimePeriod === "90days" ? 6 : selectedTimePeriod === "30days" ? 2 : 0}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    width={60}
                    scale={scaleType}
                    domain={scaleType === "log" ? [1, "auto"] : undefined}
                    allowDataOverflow={true}
                    tickFormatter={(value) => {
                      if (scaleType === "log") {
                        return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString();
                      }
                      return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString();
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const brandName = String(name).includes("_") ? String(name).split("_")[0] : String(name);
                      return [`${value.toLocaleString()}`, brandName];
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  {filteredBrands.map((brand) => (
                    <Line
                      key={brand.name}
                      type="monotone"
                      dataKey={getMetricDataKey(brand.name)}
                      name={brand.displayName}
                      stroke={brand.color}
                      strokeWidth={brand.name === 'CLIENT' ? 3 : 1.5}
                      dot={{ 
                        r: brand.name === 'CLIENT' ? 2 : 1,
                        strokeWidth: brand.name === 'CLIENT' ? 2 : 1,
                        fill: brand.name === 'CLIENT' ? '#fff' : brand.color
                      }}
                      activeDot={{ 
                        r: brand.name === 'CLIENT' ? 7 : 5,
                        strokeWidth: 2
                      }}
                      strokeOpacity={brand.name === 'CLIENT' ? 1 : 0.85}
                    />
                  ))}
                </LineChart>
              ) : chartType === "area" ? (
                <ComposedChart
                  data={processedTimeSeriesData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    interval={selectedTimePeriod === "90days" ? 6 : selectedTimePeriod === "30days" ? 2 : 0}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    width={60}
                    scale={scaleType}
                    domain={scaleType === "log" ? [1, "auto"] : undefined}
                    allowDataOverflow={true}
                    tickFormatter={(value) => {
                      if (scaleType === "log") {
                        return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString();
                      }
                      return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString();
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const brandName = String(name).includes("_") ? String(name).split("_")[0] : String(name);
                      return [`${value.toLocaleString()}`, brandName];
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  {filteredBrands.map((brand) => (
                    <Area
                      key={brand.name}
                      type="monotone"
                      dataKey={getMetricDataKey(brand.name)}
                      name={brand.displayName}
                      fill={brand.color}
                      stroke={brand.color}
                      fillOpacity={brand.name === 'CLIENT' ? 0.25 : 0.15}
                      strokeWidth={brand.name === 'CLIENT' ? 3 : 1.5}
                      strokeOpacity={brand.name === 'CLIENT' ? 1 : 0.85}
                    />
                  ))}
                </ComposedChart>
              ) : (
                <BarChart
                  data={processedTimeSeriesData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    interval={selectedTimePeriod === "90days" ? 6 : selectedTimePeriod === "30days" ? 2 : 0}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    width={60}
                    scale={scaleType}
                    domain={scaleType === "log" ? [1, "auto"] : undefined}
                    allowDataOverflow={true}
                    tickFormatter={(value) => {
                      if (scaleType === "log") {
                        return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString();
                      }
                      return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString();
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const brandName = String(name).includes("_") ? String(name).split("_")[0] : String(name);
                      return [`${value.toLocaleString()}`, brandName];
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  {filteredBrands.map((brand) => (
                    <Bar 
                      key={brand.name} 
                      dataKey={getMetricDataKey(brand.name)} 
                      name={brand.displayName} 
                      fill={brand.color}
                      fillOpacity={brand.name === 'CLIENT' ? 1 : 0.75}
                      stroke={brand.name === 'CLIENT' ? brand.color : 'none'}
                      strokeWidth={brand.name === 'CLIENT' ? 1 : 0}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Brand Comparison Bar Chart */}
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Brand Comparison</CardTitle>
            <CardDescription>
              Total engagement metrics across brands
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={totals.filter(entry => entry.name !== "Overall")}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" 
                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const brand = brands.find(b => b.name === payload.value);
                    const displayValue = brand ? brand.displayName : payload.value;
                    const isClient = payload.value === 'CLIENT';
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={-10}
                          y={0}
                          dy={4}
                          textAnchor="end"
                          fill={isClient ? "#003cff" : "#666"}
                          fontWeight={isClient ? "bold" : "normal"}
                          fontSize={isClient ? "14px" : "12px"}
                        >
                          {displayValue}
                        </text>
                      </g>
                    );
                  }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    return [`${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)];
                  }}
                />
                <Legend />
                <Bar dataKey="likes" name="Likes" stackId="a" fill="#003cff" fillOpacity={0.7} />
                <Bar dataKey="comments" name="Comments" stackId="a" fill="#059669" fillOpacity={0.7} />
                <Bar dataKey="shares" name="Shares" stackId="a" fill="#f79307" fillOpacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekday Performance Analysis */}
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Engagement by Day of Week</CardTitle>
              <button 
                onClick={() => setShowWeekdayAnalysis(!showWeekdayAnalysis)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                {showWeekdayAnalysis ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
            <CardDescription>Analysis of engagement patterns by day of the week</CardDescription>
          </CardHeader>
          <CardContent>
            {showWeekdayAnalysis && (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weekdayData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" />
                    <YAxis 
                      yAxisId="left"
                      orientation="left"
                      tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "Average Engagement") {
                          return [`${Math.round(value).toLocaleString()} per post`, name];
                        }
                        return [`${value.toLocaleString()}`, name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="totalEngagement" name="Total Engagement" fill="#3700ff" yAxisId="left" />
                    <Bar dataKey="totalPosts" name="Post Count" fill="#60a5fa" yAxisId="right" />
                    <Line 
                      type="monotone" 
                      dataKey="avgEngagement" 
                      name="Average Engagement" 
                      stroke="#f43f5e" 
                      strokeWidth={2}
                      yAxisId="right"
                      dot={{ r: 4 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performing Posts */}
        {topPosts.length > 0 && (
          <Card className="xl:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Top Performing Posts</CardTitle>
                <button 
                  onClick={() => setShowTopPerformers(!showTopPerformers)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  {showTopPerformers ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
              <CardDescription>Posts with the highest engagement during this period</CardDescription>
            </CardHeader>
            {showTopPerformers && (
              <CardContent>
                <div className="space-y-4">
                  {topPosts.map((post, index) => {
                    const brandInfo = brands.find(b => b.name === post.brand);
                    const isClient = post.brand === 'CLIENT';
                    return (
                      <div key={post.postId || index} className={`bg-gray-50 rounded-lg p-4 ${isClient ? 'border-2 border-blue-500' : ''}`}>
                        <div className="flex justify-between">
                          <div className="flex space-x-3">
                            {brandInfo && (
                              <div 
                                className="w-4 h-4 rounded-full mt-1" 
                                style={{ backgroundColor: brandInfo.color }}
                              ></div>
                            )}
                            <div>
                              <div className={`font-medium text-lg ${isClient ? 'text-blue-600 font-bold' : ''}`}>
                                {isClient ? clientName : (post.brand || "Unknown Brand")}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center space-x-2">
                                <Calendar size={14} />
                                <span>{new Date(post.time).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-center bg-gray-100 rounded-lg px-3 py-1">
                            <div className="text-xs text-gray-500">Engagement</div>
                            <div className="font-semibold">{post.totalEngagement.toLocaleString()}</div>
                          </div>
                        </div>
                        
                        <div className="mt-3 line-clamp-2 text-gray-700">
                          {post.text || post.previewTitle || "No text content available"}
                        </div>
                        
                        <div className="flex items-center space-x-6 mt-3">
                          <div className="flex items-center space-x-1 text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905 0 .905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            <span className="text-sm">{post.likes?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <span className="text-sm">{post.comments?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <span className="text-sm">{post.shares?.toLocaleString() || 0}</span>
                          </div>
                          
                          {post.url && (
                            <a 
                              href={post.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm ml-auto"
                            >
                              View Post →
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default EngagementDashboard;