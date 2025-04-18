"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import EngagementDashboard from "./EngagementDashboard";
import {
  Eye,
  Clock,
  FileText,
  ArrowDown,
  ArrowUp,
  X,
  MessageCircle,
  Send,
  ArrowLeft,
  User,
} from "lucide-react";
import { Competitor } from "@/types";
import { llmService } from "@/lib/llm-service";
import { googleSheetsService, ClientData } from "@/lib/google-sheets-service";
// import { write } from "fs";
// import {
//   LineChart,
//   Line,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer,
//   Cell,
// } from "recharts";
import { format, subDays } from "date-fns";

// Replace placeholder imports with actual components
import { NewAnalysisForm } from './new-analysis-form';
import { CompetitorTable } from './competitor-table';
import { RecommendationCards } from './recommendation-cards';

// Import the form data type
import type { NewAnalysisFormData } from './new-analysis-form';

// Define the Competitor type expected from the API
// Match the structure returned by the modified jina-search API route
interface CompetitorResult {
  id: string;
  name: string;
  website: string | null; // API guarantees string | null
  facebookUrl: string | null; // API guarantees string | null
  services: string[]; // API guarantees non-null array
  features: string[]; // API guarantees non-null array
  pricing: string; // API guarantees non-null string
  strengths: string[]; // API guarantees non-null array
  weaknesses: string[]; // API guarantees non-null array
  specialty: string; // API guarantees non-null string
  targetAudience: string; // API guarantees non-null string
  brandTone: string; // API guarantees non-null string
  brandPerception: { // API guarantees non-null object with non-null strings
    positive: string;
    negative: string;
  };
  marketShare: string; // API guarantees non-null string
  complaints: string[]; // API guarantees non-null array
  adThemes: string[]; // API guarantees non-null array
  // Add the fields that CompetitorTable expects but Jina doesn't provide directly
  // These were added with default values in the API
  seo: { domainAuthority: number; backlinks: number; organicTraffic: string }; // API guarantees non-null object/values
  websiteQuality: { uxScore: number; loadingSpeed: string; mobileResponsiveness: string }; // API guarantees non-null object/values
  usp: string; // API guarantees non-null string
  socialMetrics: { followers: number; engagement: string }; // API guarantees non-null object/values
}

interface FacebookAd {
  id: string;               // ad_archive_id
  collationId?: string;      // collation_id
  image: string;           // from snapshot.images
  headline: string;        // from snapshot.body.text (first line)
  description: string;     // from snapshot.body.text
  datePosted: string;      // from start_date (formatted)
  status: string;          // from is_active
  mediaUrls: string[];     // all media URLs combined
  platform: string;
}

interface FacebookPost {
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
}

interface AdGroup {
  mainAd: FacebookAd;
  subAds: FacebookAd[];
  totalAds: number;
}

// Add this type at the top with other interfaces
type LoadingState = {
  ads: boolean;
  posts: boolean;
};

// Add new interfaces for caching data
interface CompetitorData {
  ads: FacebookAd[];
  posts: FacebookPost[];
}

interface CompetitorCache {
  [competitorId: number]: CompetitorData;
}

// Add new interface for loading progress
interface LoadingProgress {
  brand: string;
  type: "ads" | "posts";
  status: "pending" | "loading" | "completed" | "error";
}

interface ChatSession {
  id: string;
  brand: string;
  lastMessage: string;
  timestamp: string;
}

interface CompetitorJsonData {
  name: string;
  ads: FacebookAd[];
  posts: FacebookPost[];
  analysis?: {
    ads7Days: string;
    ads30Recent: string;
    organicPosts: string;
  };
}

interface JsonFileData {
  competitors: CompetitorJsonData[];
}

// Add this function before the CompetitorAdDashboard component
const formatMessageWithBold = (text: string) => {
  // First handle paired ** for bold text
  const boldFormatted = text.split(/(\*\*.*?\*\*)/).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Remove ** and wrap in strong tag
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
  
  // Process each non-bold part to replace lone * with -
  return boldFormatted.map((part, index) => {
    if (typeof part === 'string') {
      // Replace single * with - but avoid matching partial ** patterns
      return part.replace(/(?<!\*)\*(?!\*)/g, '-');
    }
    return part;
  });
};

export default function CompetitorAdDashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeCompetitor, setActiveCompetitor] = useState<number | null>(null);
  const [availableClients, setAvailableClients] = useState<ClientData[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [showOverallEngagement, setShowOverallEngagement] = useState(false);
  const [allPostsForEngagement, setAllPostsForEngagement] = useState<FacebookPost[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("active");
  const [posts, setPosts] = useState<FacebookPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "status">("date");
  const [organicSortBy, setOrganicSortBy] = useState<
    "date" | "likes" | "comments" | "shares" | "engagement"
  >("date");
  const [organicSortDirection, setOrganicSortDirection] = useState<
    "desc" | "asc"
  >("desc");
  const [newAdsSortDirection, setNewAdsSortDirection] = useState<
    "desc" | "asc"
  >("desc");
  const [activeAdsSortDirection, setActiveAdsSortDirection] = useState<
    "desc" | "asc"
  >("desc");
  const [inactiveAdsSortDirection, setInactiveAdsSortDirection] = useState<
    "desc" | "asc"
  >("desc");
  const [dateRange, setDateRange] = useState<number>(0);
  const [showDateRangeDropdown, setShowDateRangeDropdown] = useState(false);
  const [editCompetitorId, setEditCompetitorId] = useState<number>(0);
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
  const [editCompetitorName, setEditCompetitorName] = useState("");
  const [editCompetitorUrl, setEditCompetitorUrl] = useState("");
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<
    {
      type: "user" | "assistant";
      message: string;
      context?: string;
      timestamp?: string;
      chatId?: string;
    }[]
  >([
    {
      type: "assistant",
      message:
        'สวัสดี! ฉันคือ AdInsight ผู้ช่วยวิเคราะห์ข้อมูลคู่แข่งของคุณ 🎯 ถามฉันได้ทุกอย่างเกี่ยวกับข้อมูลคู่แข่งของคุณ เช่น "เทรนด์โฆษณาแบบไหนกำลังมาแรงในสัปดาห์นี้?"',
      timestamp: new Date().toISOString(),
      chatId: `chat_${Date.now()}`,
    },
  ]);

  // Remove the currentChatId useState and replace with a function
  const generateChatId = (competitor: Competitor | null) => {
    return `chat_${Date.now()}`;
  };

  // Add currentChatId as a regular state
  const [currentChatId, setCurrentChatId] = useState<string>("");

  const [isLoadingAds, setIsLoadingAds] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [activeAds, setActiveAds] = useState<FacebookAd[]>([]);
  const [newAds, setNewAds] = useState<FacebookAd[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  // Add cache for API responses
  const [adsCache, setAdsCache] = useState<
    Record<
      string,
      {
        ads: FacebookAd[];
        timestamp: number;
      }
    >
  >({});

  // Cache expiration time (30 minutes)
  const CACHE_EXPIRATION = 30 * 60 * 1000;

  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [currentMediaIndex, setCurrentMediaIndex] = useState<
    Record<string, number>
  >({});
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set()
  );

  // Add state for detailed view
  const [detailedViewId, setDetailedViewId] = useState<string | null>(null);
  const [detailedViewType, setDetailedViewType] = useState<"ad" | "post" | null>(null);

  const [isLoading, setIsLoading] = useState<LoadingState>({
    ads: false,
    posts: false,
  });

  const [isFetchingAllData, setIsFetchingAllData] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [competitorDataCache, setCompetitorDataCache] =
    useState<CompetitorCache>({});
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatSession, setActiveChatSession] = useState<string | null>(
    null
  );
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [analysisData, setAnalysisData] = useState<{
    ads7Days: string;
    ads30Recent: string;
    organicPosts: string;
  } | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isNotDataFromTheCurrentWeekSoNewFetchingIsNeeded, setIsNotDataFromTheCurrentWeekSoNewFetchingIsNeeded] = useState(false);
  const [expandedOrganicPosts, setExpandedOrganicPosts] = useState(false);
  // Add state to track which section is active
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // --- New State for Analysis ---
  const [analysisCompetitors, setAnalysisCompetitors] = useState<CompetitorResult[]>([]);
  // State for API analysis loading and error
  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // --- End New State ---

  const truncateText = (text: string, maxLength: number = 300) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  // Add function to fetch analysis data
  const fetchAnalysisData = async () => {
    if (!selectedClient?.databaseSheetId || activeCompetitor === null) return;

    try {
      setIsLoadingAnalysis(true);
      const data = await googleSheetsService.getSheetData(
        selectedClient.databaseSheetId,
        "Facebook Analysis"
      );

      // Find the row for current competitor
      const competitorName = competitors[activeCompetitor].name;
      const competitorData = data.find(
        (row) => row["Brand"] === competitorName
      );

      if (competitorData) {
        setAnalysisData({
          ads7Days: competitorData["Active Ads Analysis 7 days"] || "",
          ads30Recent: competitorData["Active Ads Analysis 30 Recent"] || "",
          organicPosts: competitorData["Organic Posts"] || "",
        });
      }
    } catch (error) {
      // console.error("Error fetching analysis data:", error);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // Add effect to fetch analysis when competitor changes
  useEffect(() => {
    if (activeCompetitor !== null && hasLoadedInitialData) {
      fetchAnalysisData();
    }
  }, [activeCompetitor, hasLoadedInitialData]);

  // Add this near the top of your component, after the state declarations
  useEffect(() => {
    // console.log('Current state:', {
    //   hasSelectedClient: !!selectedClient,
    //   selectedClientName: selectedClient?.client,
    //   hasLoadedInitialData,
    //   isFetchingAllData
    // });
  }, [selectedClient, hasLoadedInitialData, isFetchingAllData]);

  // Function to check if URL is a video
  const isVideoUrl = (url: string) => {
    return url.includes(".mp4") || url.includes("video");
  };

  // Function to handle media navigation
  const handleMediaNav = (
    adId: string,
    direction: "prev" | "next",
    totalMedia: number
  ) => {
    setCurrentMediaIndex((prev) => {
      const currentIndex = prev[adId] || 0;
      let newIndex;
      if (direction === "next") {
        newIndex = (currentIndex + 1) % totalMedia;
      } else {
        newIndex = (currentIndex - 1 + totalMedia) % totalMedia;
      }
      return { ...prev, [adId]: newIndex };
    });
  };

  // Toggle ad set expansion
  const toggleAdSet = (collationId: string) => {
    setExpandedAdSets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(collationId)) {
        newSet.delete(collationId);
      } else {
        newSet.add(collationId);
      }
      return newSet;
    });
  };

  // Toggle description expansion
  const toggleDescription = (adId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(adId)) {
        newSet.delete(adId);
      } else {
        newSet.add(adId);
      }
      return newSet;
    });
  };

  // Add this helper function near the top of the component
  const isValidAdId = (id: string) => {
    // Check if the id is a valid integer (as string or number)
    return /^\d+$/.test(id.toString());
  };

  // Modify the getFilteredAds function
  const getFilteredAds = (status: "Active" | "Inactive" = "Active") => {
    return activeAds
      .filter((ad) => isValidAdId(ad.id)) // Filter out invalid Ad IDs
      .filter((ad) => ad.status === status)
      .filter((ad) => isWithinDateRange(ad.datePosted));
  };

  // Modify the groupAdsByCollationId function
  const groupAdsByCollationId = (ads: FacebookAd[]): AdGroup[] => {
    const groups = new Map<string, FacebookAd[]>();

    // Only process ads with valid Ad IDs
    ads
      .filter((ad) => isValidAdId(ad.id))
      .forEach((ad) => {
        const collationId = ad.collationId || ad.id;
        if (!groups.has(collationId)) {
          groups.set(collationId, []);
        }
        groups.get(collationId)?.push(ad);
      });

    return Array.from(groups.values()).map((group) => ({
      mainAd: group[0],
      subAds: group.slice(1),
      totalAds: group.length,
    }));
  };

  // Initialize competitors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load clients from Google Sheets
  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoadingClients(true);
        // console.log('Loading clients...');
        const clients = await googleSheetsService.getWeeklyFetchClients();
        // console.log('Clients loaded:', clients);
        setAvailableClients(clients);
        if (clients.length > 0) {
          // console.log('Setting initial client:', clients[0]);
          setSelectedClient(clients[0]);
        }
      } catch (error) {
        // console.error("Error loading clients:", error);
        if (error instanceof Error) {
          setClientError(error.message);
        } else {
          setClientError("Failed to load clients");
        }
      } finally {
        setIsLoadingClients(false);
      }
    };

    loadClients();
  }, []);

  // Load brands when client changes
  useEffect(() => {
    const loadBrands = async () => {
      if (!selectedClient?.databaseSheetId) {
        return;
      }

      try {
        // Reset states when client changes
        setActiveCompetitor(null);
        setActiveAds([]);
        setPosts([]);
        setCompetitorDataCache({});
        setHasLoadedInitialData(false);
        setIsLoading((prev) => ({ ...prev, ads: true }));

        const brands = await googleSheetsService.getBrandsListFromSheet(
          selectedClient.databaseSheetId
        );

        // Transform brands into competitors format
        const newCompetitors = brands.map((brand, index) => ({
          id: index + 1,
          name: brand.brand,
          logo: "",
          color: "#" + Math.floor(Math.random() * 16777215).toString(16),
          url: brand.pageUrl,
        }));

        setCompetitors(newCompetitors);
      } catch (error) {
        if (error instanceof Error) {
          setAdError(error.message);
        } else {
          setAdError("Failed to load brands");
        }
      } finally {
        setIsLoading((prev) => ({ ...prev, ads: false }));
      }
    };

    if (selectedClient) {
      loadBrands();
    }
  }, [selectedClient]);

  // Add a debug log for availableClients changes
  useEffect(() => {
    // console.log('📋 Available clients updated:', availableClients);
  }, [availableClients]);

  // Add a debug log for selectedClient changes
  useEffect(() => {
    // console.log('🎯 Selected client updated:', selectedClient);
  }, [selectedClient]);

  // Function to save chat message to Google Sheets
  const saveChatMessage = async (
    role: "user" | "assistant",
    context: string = ""
  ) => {
    if (!selectedClient?.databaseSheetId) return;

    try {
      const data = [
        {
          "Chat ID": currentChatId,
          Timestamp: new Date().toISOString(),
          Role: role,
          Context: context,
        },
      ];

      await googleSheetsService.appendToSheet(
        selectedClient.databaseSheetId,
        "LLM Chat",
        data
      );
    } catch (error) {
      // // console.error("Error saving chat message:", error);
    }
  };

  // Update the loadChatHistory function
  const loadChatHistory = async (chatId: string) => {
    if (!selectedClient?.databaseSheetId) return;

    try {
      // Get chat history from Google Sheets
      const response = await googleSheetsService.getSheetData(
        selectedClient.databaseSheetId,
        "LLM Chat"
      );

      if (response && response.length > 0) {
        // Filter and transform the sheet data for this chat ID
        const history = response
          .filter((row) => row["Chat ID"] === chatId)
          .sort(
            (a, b) =>
              new Date(a["Timestamp"]).getTime() -
              new Date(b["Timestamp"]).getTime()
          )
          .map((row) => ({
            type: row["Role"] as "user" | "assistant",
            message: row["Context"], // Use Context as message
            context: row["Context"],
            timestamp: row["Timestamp"],
            chatId: row["Chat ID"],
          }));

        setChatHistory(history);
        setActiveChatSession(chatId);
        setCurrentChatId(chatId);
      }
    } catch (error) {
      // console.error("Error loading chat history:", error);
    }
  };

  // Update the handleSendMessage function
  const handleSendMessage = async () => {
    if (chatMessage.trim() === "") return;

    const timestamp = new Date().toISOString();
    const chatIdToUse = activeChatSession || generateChatId(null);

    // Add user message to chat history
    setChatHistory((prev) => [
      ...prev,
      {
        type: "user",
        message: chatMessage,
        timestamp,
        chatId: chatIdToUse,
      },
    ]);

    // Save user message to Google Sheets with the actual question as context
    await saveChatMessage("user", chatMessage);

    try {
      // Show loading state
      setChatHistory((prev) => [
        ...prev,
        {
          type: "assistant",
          message: "🤔 Analyzing the data...",
          timestamp: new Date().toISOString(),
          chatId: chatIdToUse,
        },
      ]);

      // Combine data from all competitors with their brand names
      const allAds: FacebookAd[] = [];
      const allPosts: FacebookPost[] = [];

      // Iterate through all competitors and combine their data with brand names
      for (let i = 0; i < competitors.length; i++) {
        const competitor = competitors[i];
        const data = competitorDataCache[i];
        if (data?.ads) {
          await llmService.setAdsData(data.ads, competitor.name);
          allAds.push(...data.ads);
        }
        if (data?.posts) {
          await llmService.setPostsData(data.posts, competitor.name);
          allPosts.push(...data.posts);
        }
      }

      // Set the combined data for LLM analysis
      await llmService.setCompetitorData({
        ads: allAds,
        posts: allPosts
      });

      // Get response from LLM
      const llmResponse = await llmService.getInsights(chatMessage);

      // Save assistant response to Google Sheets first
      await saveChatMessage("assistant", llmResponse || "No response received.");

      // Then update the chat history
      setChatHistory((prev) => {
        const newHistory = prev.slice(0, -1); // Remove loading message
        return [
          ...newHistory,
          {
            type: "assistant" as const,
            message: llmResponse || "No response received.",
            timestamp: new Date().toISOString(),
            chatId: chatIdToUse,
          },
        ];
      });
    } catch (error) {
      // console.error("Error getting LLM response:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Sorry, I encountered an error while analyzing the data. Please try again.";

      // Save error message to Google Sheets first
      await saveChatMessage("assistant", errorMessage);

      // Then update the chat history
      setChatHistory((prev) => {
        const newHistory = prev.slice(0, -1); // Remove loading message
        return [
          ...newHistory,
          {
            type: "assistant" as const,
            message: errorMessage,
            timestamp: new Date().toISOString(),
            chatId: chatIdToUse,
          },
        ];
      });
    }

    setChatMessage("");

    // After successful message handling, refresh chat sessions
    await loadChatSessions();
  };

  // Modify the fetchAllCompetitorData function
  const fetchAllCompetitorData = async () => {
    if (!competitors.length || !selectedClient?.databaseSheetId || !selectedClient?.databaseFolderId) {
      return;
    }

    setIsFetchingAllData(true);
    const newCache: CompetitorCache = {};

    try {
      // Initialize loading progress
      const initialProgress: LoadingProgress[] = competitors.flatMap(
        (competitor) => [
          { brand: competitor.name, type: "ads", status: "pending" },
          { brand: competitor.name, type: "posts", status: "pending" },
        ]
      );
      setLoadingProgress(initialProgress);

      // First, check if we need new data by looking at JSON files
      const files = await googleSheetsService.listFilesInFolder(selectedClient.databaseFolderId);
      const latestFile = files[0]; // Files are sorted by modifiedTime desc

      if (latestFile) {
        try {
          // Get the JSON file content
          const jsonData = await googleSheetsService.readJsonFromDrive(
            selectedClient.databaseFolderId,
            latestFile.name
          );

          // Process the JSON data into our cache format
          const newCache: CompetitorCache = {};
          
          // Handle the data structure where data is in competitors array
          if (jsonData && Array.isArray(jsonData.competitors)) {
            // Process each competitor's data
            (jsonData as JsonFileData).competitors.forEach((competitor: CompetitorJsonData, index: number) => {
              newCache[index] = {
                ads: competitor.ads || [],
                posts: competitor.posts || []
              };

              // Update analysis data if available
              if (competitor.analysis) {
                setAnalysisData({
                  ads7Days: competitor.analysis.ads7Days || '',
                  ads30Recent: competitor.analysis.ads30Recent || '',
                  organicPosts: competitor.analysis.organicPosts || ''
                });
              }
            });

            // Update the cache and set first competitor as active
            setCompetitorDataCache(newCache);
            if (competitors.length > 0) {
              setActiveCompetitor(0);
              if (newCache[0]) {
                setActiveAds(newCache[0].ads);
                setPosts(newCache[0].posts);
              }
            }

            // Mark as loaded and return
            setHasLoadedInitialData(true);
            setIsFetchingAllData(false);
            return;
          } else {
            throw new Error('Invalid JSON data structure');
          }
        } catch (error) {
          // If there's an error loading the JSON, we'll proceed with fetching new data
        }
      }

      setHasLoadedInitialData(true);
      } catch (error) {
        console.error("Error in fetchAllCompetitorData:", error);
      } finally {
        setIsFetchingAllData(false);
      }
  };

  // Update handleCompetitorChange to properly set data
  const handleCompetitorChange = (index: number) => {
    if (index >= 0 && index < competitors.length) {
      setActiveCompetitor(index);
      setShowOverallEngagement(false);
      setActiveSection(null); // Reset active section when competitor is selected
      const cachedData = competitorDataCache[index];
      if (cachedData) {
        setActiveAds(cachedData.ads || []);
        setPosts(cachedData.posts || []);
      } else {
        // Reset data if no cache exists
        setActiveAds([]);
        setPosts([]);
      }
    }
  };

  // Function to check if an ad is within the selected date range
  const isWithinDateRange = (dateStr: string) => {
    if (dateRange === 0) return true; // "All time" selected
    const adDate = new Date(dateStr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);
    return adDate >= cutoffDate;
  };

  // Get counts for display
  const getAdCounts = () => {
    const activeOnlyAds = activeAds.filter((ad) => ad.status === "Active");
    const uniqueCollationIds = new Set(
      activeOnlyAds.map((ad) => ad.collationId || ad.id)
    );
    return {
      sets: uniqueCollationIds.size,
      total: activeOnlyAds.length,
    };
  };

  // Update the competitor header section
  {
    /* Competitor header */
  }
  {
    mounted && activeCompetitor !== null && competitors[activeCompetitor] && (
      <div
        className={`p-4 flex items-center justify-between ${competitors[activeCompetitor].color}`}
      >
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{competitors[activeCompetitor].logo}</span>
          <div>
            <h2 className="text-lg font-bold">
              {competitors[activeCompetitor].name}
            </h2>
            <div className="flex items-center text-sm text-gray-500">
              <a
                href={`https://${competitors[activeCompetitor].url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 hover:underline"
              >
                {competitors[activeCompetitor].url}
              </a>
            </div>
          </div>
        </div>
        <button
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          onClick={() => {
            setShowChatWindow(true);
            // Reset active chat session when starting a new chat
            setActiveChatSession(null);
            const timestamp = new Date().toISOString();
            const newChatId = generateChatId(
              competitors[activeCompetitor] || null
            );
            setCurrentChatId(newChatId);

            // Reset chat history with welcome message for new chat
            setChatHistory([
              {
                type: "assistant",
                message:
                  'สวัสดี! ฉันคือ AdInsight ผู้ช่วยวิเคราะห์ข้อมูลคู่แข่งของคุณ 🎯 ถามฉันได้ทุกอย่างเกี่ยวกับข้อมูลคู่แข่งของคุณ เช่น "เทรนด์โฆษณาแบบไหนกำลังมาแรงในสัปดาห์นี้?"',
                  timestamp,
                  chatId: newChatId,
                },
              ]);
            }}
          >
          <MessageCircle className="h-4 w-4 mr-1" />
          <span>Ask for Insights</span>
        </button>
      </div>
    );
  }

  {
    /* Weekly overview */
  }
  {
    mounted && activeCompetitor !== null && competitors[activeCompetitor] && (
      <div className="bg-white p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium flex items-center">
            <svg
              className="h-4 w-4 mr-2 text-green-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            Brand Activities
          </h3>
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Active Ads</div>
            <div className="text-xl font-bold">
              {isLoadingAds
                ? "Loading..."
                : (() => {
                    const filteredActiveAds = getFilteredAds("Active");
                    const uniqueCollationIds = new Set(
                      filteredActiveAds.map((ad) => ad.collationId || ad.id)
                    );
                    return `${uniqueCollationIds.size} sets (${filteredActiveAds.length} ads)`;
                  })()}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Inactive Ads</div>
            <div className="text-lg font-bold truncate">
              {(() => {
                if (isLoadingAds) return "Loading...";
                const inactiveAds = getFilteredAds("Inactive");
                return `${inactiveAds.length} ads`;
              })()}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Organic Posts</div>
            <div className="text-lg font-bold truncate">
              {(() => {
                if (isLoadingPosts) return "Loading...";
                const filteredPosts = posts.filter((post) => {
                  if (dateRange === 0) return true;
                  const postDate = new Date(post.time);
                  const cutoffDate = new Date();
                  cutoffDate.setDate(cutoffDate.getDate() - dateRange);
                  return postDate >= cutoffDate;
                });
                return `${filteredPosts.length} posts`;
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Add this function after the existing state declarations
  const loadChatSessions = async () => {
    if (!selectedClient?.databaseSheetId) return;

    try {
      // Get all chat data from Google Sheets
      const response = await googleSheetsService.getSheetData(
        selectedClient.databaseSheetId,
        "LLM Chat"
      );

      if (!response || response.length === 0) return;

      // Group messages by chat ID to create sessions
      const sessionMap = new Map<
        string,
        {
          id: string;
          brand: string;
          lastMessage: string;
          timestamp: string;
        }
      >();

      response.forEach((row) => {
        const chatId = row["Chat ID"];
        const timestamp = row["Timestamp"];
        const message = row["Context"]; // Use Context as message

        // Update session if newer message found
        const existingSession = sessionMap.get(chatId);
        if (
          !existingSession ||
          new Date(timestamp) > new Date(existingSession.timestamp)
        ) {
          sessionMap.set(chatId, {
            id: chatId,
            brand: "AdInsight Assistant",
            lastMessage: message,
            timestamp: timestamp,
          });
        }
      });

      // Convert map to array and sort by timestamp
      const sessions = Array.from(sessionMap.values()).sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setChatSessions(sessions);
    } catch (error) {
      // console.error("Error loading chat sessions:", error);
    }
  };

  // Add useEffect to load chat sessions when client changes
  useEffect(() => {
    if (selectedClient) {
      loadChatSessions();
    }
  }, [selectedClient]);

  // Add this helper function for date-time display (for chat messages)
  const formatDateTimeDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

  const DetailedViewContent = () => {
    if (!detailedViewId) return null;

    const selectedAd = detailedViewType === "ad" ? activeAds.find((ad) => ad.id === detailedViewId) : null;
    const selectedPost = detailedViewType === "post" ? posts.find((p) => p.url === detailedViewId) : null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-medium">
              {detailedViewType === "ad" ? "Advertisement Details" : "Post Details"}
            </h3>
            <button
              onClick={() => {
                setDetailedViewId(null);
                setDetailedViewType(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="md:w-1/2 bg-gray-100 flex items-center justify-center p-4 relative">
              {selectedAd && (
                <div className="relative w-full h-full flex items-center justify-center">
                  {isVideoUrl(selectedAd.mediaUrls[currentMediaIndex[selectedAd.id] || 0]) ? (
                    <video
                      src={selectedAd.mediaUrls[currentMediaIndex[selectedAd.id] || 0]}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={selectedAd.mediaUrls[currentMediaIndex[selectedAd.id] || 0]}
                      alt={selectedAd.headline}
                      className="w-full h-full object-contain"
                    />
                  )}
                  {selectedAd.mediaUrls.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMediaNav(selectedAd.id, "prev", selectedAd.mediaUrls.length);
                        }}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-75 transition-opacity"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMediaNav(selectedAd.id, "next", selectedAd.mediaUrls.length);
                        }}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-75 transition-opacity"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-2 rounded-full">
                        {(currentMediaIndex[selectedAd.id] || 0) + 1} / {selectedAd.mediaUrls.length}
                      </div>
                    </>
                  )}
                </div>
              )}
              {selectedPost?.media?.[0]?.thumbnail && (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={selectedPost.media[0].thumbnail}
                    alt={selectedPost.text.substring(0, 50)}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
            <div className="md:w-1/2 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-6">
                {selectedAd && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold text-xl mb-2">{selectedAd.headline}</h4>
                      <p className="text-gray-600 whitespace-pre-wrap">{selectedAd.description}</p>
                    </div>
                  </div>
                )}
                {selectedPost && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold text-xl mb-2">
                        {selectedPost.text.split("\n")[0] || "Untitled Post"}
                      </h4>
                      <p className="text-gray-600 whitespace-pre-wrap">{selectedPost.text}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t p-4 bg-white">
                {selectedAd && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span className={`font-medium ${selectedAd.status === "Active" ? "text-green-600" : "text-red-600"}`}>
                        {selectedAd.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date Posted:</span>
                      <span>{selectedAd.datePosted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Ad ID:</span>
                      <span>{selectedAd.id}</span>
                    </div>
                    {selectedAd.collationId && selectedAd.collationId !== "N/A" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Set ID:</span>
                        <span>{selectedAd.collationId}</span>
                      </div>
                    )}
                  </div>
                )}
                {selectedPost && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date Posted:</span>
                      <span>{selectedPost.time}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                          {selectedPost.likes}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                          {selectedPost.comments}
                        </span>
                        {selectedPost.shares !== null && (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                            </svg>
                            {selectedPost.shares}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="pt-2">
                      <a
                        href={selectedPost.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View on Facebook
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  

  // Add this useEffect to handle the data preparation
  useEffect(() => {
    if (showOverallEngagement && hasLoadedInitialData) {
      const prepareEngagementData = async () => {
        setIsLoadingPosts(true);
        
        try {
          // console.log('Preparing engagement data...');
          // console.log('Competitors:', competitors);
          // console.log('Cache:', competitorDataCache);
          
          const combinedPosts: FacebookPost[] = [];
          
          // Use Object.entries to ensure we get all cached data
          Object.entries(competitorDataCache).forEach(([index, data]) => {
            const competitor = competitors[parseInt(index)];
            if (!competitor) {
              // console.log(`No competitor found for index ${index}`);
              return;
            }
            
            // console.log(`Processing competitor ${index}:`, competitor.name);
            // console.log(`Data for competitor ${index}:`, data);
            
            if (data?.posts && Array.isArray(data.posts)) {
              // console.log(`Found ${data.posts.length} posts for ${competitor.name}`);
              // Add each post with its brand explicitly set
              const brandedPosts = data.posts.map((post: FacebookPost) => ({
                ...post,
                brand: competitor.name  // Ensure each post has the correct brand
              }));
              
              combinedPosts.push(...brandedPosts);
            } else {
              // console.log(`No posts found for ${competitor.name}`);
            }
          });
          
          // console.log('Total combined posts:', combinedPosts.length);
          setAllPostsForEngagement(combinedPosts);
        } catch (error) {
          console.error("Error preparing engagement data:", error);
          // Handle error state if needed
        } finally {
          setIsLoadingPosts(false);
        }
      };
      
      prepareEngagementData();
    }
  }, [showOverallEngagement, competitors, competitorDataCache, hasLoadedInitialData]);
  
  
  // --- New Handler for Analysis Form Submission ---
  const handleStartAnalysis = async (formData: NewAnalysisFormData) => {
    console.log("Starting analysis with data:", formData);
    // Intentionally do nothing here for now
    
    setIsAnalysisLoading(true); // Use correct state setter
    setAnalysisError(null); // Use correct state setter
    setAnalysisCompetitors([]); // Clear previous results
 
    try {
      const response = await fetch('/api/jina-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      console.log("Analysis successful, received competitors:", result.competitors);
      setAnalysisCompetitors(result.competitors || []); // Ensure it's an array

    } catch (error: any) {
      console.error("Analysis failed:", error);
      setAnalysisError(error.message || "Failed to fetch competitor analysis."); // Use correct state setter
    } finally {
      setIsAnalysisLoading(false);
    }
  
  };
  // --- End New Handler ---
  
  
  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold">Competitor Ad Intelligence</h1>
        </div>
        <div className="flex items-center space-x-4">
          {!showOverallEngagement && (
            <div className="relative">
              <button
                onClick={() => setShowDateRangeDropdown(!showDateRangeDropdown)}
              className="flex items-center space-x-1 px-3 py-2 border rounded-md text-sm cursor-pointer hover:bg-gray-50"
            >
              {dateRange === 0 ? "All time" : `Last ${dateRange} days`}
              <svg
                className={`h-4 w-4 ml-1 transform transition-transform ${
                  showDateRangeDropdown ? "rotate-180" : ""
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showDateRangeDropdown && (
              <div className="absolute right-0 mt-1 w-36 bg-white border rounded-md shadow-lg z-50">
                {[7, 14, 30, 60, 90, 0].map((days) => (
                  <button
                    key={days}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      dateRange === days ? "bg-blue-50 text-blue-600" : ""
                    }`}
                    onClick={() => {
                      setDateRange(days);
                      setShowDateRangeDropdown(false);
                    }}
                  >
                    {days === 0 ? "All time" : `Last ${days} days`}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Competitor Selection */}
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-4 space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">
              My Dashboard
            </h2>

            {/* Client Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Select Client:
              </label>
              {isLoadingClients ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-sm text-gray-500">
                    Loading clients...
                  </span>
                </div>
              ) : clientError ? (
                <div className="text-sm text-red-600">{clientError}</div>
              ) : (
                <select
                  value={selectedClient?.client || ""}
                  onChange={(e) => {
                    const client = availableClients.find(
                      (c) => c.client === e.target.value
                    );
                    setSelectedClient(client || null);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a client...</option>
                  {availableClients.map((client) => (
                    <option key={client.client} value={client.client}>
                      {client.client}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Competitors List - Now in a scrollable container */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {/* Client Data Section */}
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Client Data
            </h3>
            <div className="space-y-3">
            {mounted && selectedClient && competitors
              .map((competitor, index) => ({competitor, index}))
              .filter(({competitor}) => competitor.name === 'CLIENT')
              .map(({competitor, index}) => (
                <button
                  key={competitor.id}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                    index === activeCompetitor
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  } ${
                    !hasLoadedInitialData
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  onClick={() =>
                    hasLoadedInitialData && handleCompetitorChange(index)
                  }
                  disabled={!hasLoadedInitialData}
                >
                  <span>{selectedClient.client}</span>
                </button>
              ))}
            </div>
            <br/>
            {/* Competitor Brands Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">
                  Competitor Brands
                </h3>
                {isFetchingAllData && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                )}
              </div>
              <div className="space-y-1">
                {!selectedClient && (
                  <p className="text-sm text-gray-500 px-3 py-2">
                    Please select a client first to view their competitors
                  </p>
                )}
                {mounted &&
                  selectedClient &&
                  competitors
                    .map((competitor, index) => ({competitor, index}))
                    .filter(({competitor}) => competitor.name !== 'CLIENT')
                    .map(({competitor, index}) => (
                    <button
                      key={competitor.id}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                        index === activeCompetitor
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      } ${
                        !hasLoadedInitialData
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      onClick={() =>
                        hasLoadedInitialData && handleCompetitorChange(index)
                      }
                      disabled={!hasLoadedInitialData}
                    >
                      <span>{competitor.name}</span>
                    </button>
                  ))}
                {mounted &&
                  selectedClient &&
                  competitors.filter(competitor => competitor.name !== "CLIENT").length === 0 &&
                  !isFetchingAllData && (
                    <p className="text-sm text-gray-500 px-3 py-2">
                      No competitors found for this client
                    </p>
                  )}
              </div>
            </div>

            {/* New Analysis Section */}
            <div className="space-y-3 mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                New Analysis
              </h3>
              <div className="space-y-1">
                <button
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                    activeSection === "new-analysis"
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setActiveCompetitor(null);
                    setShowOverallEngagement(false);
                    setActiveSection("new-analysis");
                  }}
                >
                  <span>Start New Analysis</span>
                </button>
              </div>
            </div>

            {/* Competitors Section */}
            <div className="space-y-3 mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Competitors
              </h3>
              <div className="space-y-1">
                <button
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                    activeSection === "competitors"
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setActiveCompetitor(null);
                    setShowOverallEngagement(false);
                    setActiveSection("competitors");
                  }}
                >
                  <span>View Competitors</span>
                </button>
              </div>
            </div>

            {/* Recommendations Section */}
            <div className="space-y-3 mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Recommendations
              </h3>
              <div className="space-y-1">
                <button
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                    activeSection === "recommendations"
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setActiveCompetitor(null);
                    setShowOverallEngagement(false);
                    setActiveSection("recommendations");
                  }}
                >
                  <span>View Recommendations</span>
                </button>
              </div>
            </div>
          </div>

          {/* Overall Engagement */}
          <button 
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center space-x-2 transition-colors ${
                !hasLoadedInitialData 
                  ? "bg-gray-100 cursor-not-allowed opacity-60" 
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => {
                if (hasLoadedInitialData) {
                  setActiveCompetitor(null);
                  setShowOverallEngagement(true);
                  setActiveSection(null); // Reset active section
                }
              }}
              disabled={!hasLoadedInitialData}
              
          >
              <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 ${!hasLoadedInitialData ? "text-gray-400" : "text-blue-600"}`} 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
              >
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
              <span>Post Engagement Insights</span>

          </button>
        
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {/* Show fetch button when client is selected but data hasn't been loaded */}
          {selectedClient && !hasLoadedInitialData && !isFetchingAllData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => {
                  fetchAllCompetitorData();
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <span>Fetch All Competitor Data</span>
              </button>
            </div>
          )}

          {/* Loading overlay with progress */}
          {isFetchingAllData && (
            <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-50">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-6 relative">
                    <div className="absolute animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                    Loading Competitor Data
                  </h3>
                  <p className="text-gray-500">
                    Fetching latest information from Facebook
                  </p>
                </div>
            </div>
          )}

          {/* New Analysis Form */}
          {activeSection === "new-analysis" && (
            <div className="flex-1 p-6 overflow-auto">
              <h2 className="text-2xl font-bold mb-6">New Competitor Analysis</h2>
              <NewAnalysisForm onSubmitAnalysis={handleStartAnalysis} isLoading={isAnalysisLoading} />
            </div>
          )}

          {/* Competitors Table */}
          {activeSection === "competitors" && (
            <div className="flex-1 p-6 overflow-auto">
              <h2 className="text-2xl font-bold mb-6">Competitor Analysis</h2>
              <CompetitorTable
                initialCompetitors={analysisCompetitors}
                isLoading={isAnalysisLoading} // Use analysis loading state
                error={analysisError} // Use analysis error state
              />
            </div>
          )}

          {/* Recommendations View */}
          {activeSection === "recommendations" && (
            <div className="flex-1 p-6 overflow-auto">
              <h2 className="text-2xl font-bold mb-6">Recommendations</h2>
              <RecommendationCards />
            </div>
          )}

          {/* Competitor data content */}
          {activeCompetitor !== null && hasLoadedInitialData && !activeSection && (
            <>
              {/* Competitor header */}
              {mounted &&
                activeCompetitor !== null &&
                competitors[activeCompetitor] && (
                  <div
                    className={`p-4 flex items-center justify-between ${competitors[activeCompetitor].color}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">
                        {competitors[activeCompetitor].logo}
                      </span>
                      <div>
                        <h2 className="text-lg font-bold">
                          {competitors[activeCompetitor].name}
                        </h2>
                        <div className="flex items-center text-sm text-gray-500">
                          <a
                            href={`https://${competitors[activeCompetitor].url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 hover:underline"
                          >
                            {competitors[activeCompetitor].url}
                          </a>
                        </div>
                      </div>
                    </div>
                    <button
                      className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                      onClick={() => {
                        setShowChatWindow(true);
                        // Reset active chat session when starting a new chat
                        setActiveChatSession(null);
                        const timestamp = new Date().toISOString();
                        const newChatId = generateChatId(
                          competitors[activeCompetitor] || null
                        );
                        setCurrentChatId(newChatId);

                        // Reset chat history with welcome message for new chat
                        setChatHistory([
                          {
                            type: "assistant",
                            message:
                              'สวัสดี! ฉันคือ AdInsight ผู้ช่วยวิเคราะห์ข้อมูลคู่แข่งของคุณ 🎯 ถามฉันได้ทุกอย่างเกี่ยวกับข้อมูลคู่แข่งของคุณ เช่น "เทรนด์โฆษณาแบบไหนกำลังมาแรงในสัปดาห์นี้?"',
                              timestamp,
                              chatId: newChatId,
                            },
                          ]);
                        }}
                      >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      <span>Ask for Insights</span>
                    </button>
                  </div>
                )}

              {/* Weekly overview */}
              {mounted &&
                activeCompetitor !== null &&
                competitors[activeCompetitor] && (
                  <div className="bg-white p-4 border-b">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium flex items-center">
                        <svg
                          className="h-4 w-4 mr-2 text-green-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                        Brand Activities
                      </h3>
                      <span className="text-sm text-gray-500">
                        {new Date().toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">Active Ads</div>
                        <div className="text-xl font-bold">
                          {isLoadingAds
                            ? "Loading..."
                            : (() => {
                                const filteredActiveAds =
                                  getFilteredAds("Active");
                                const uniqueCollationIds = new Set(
                                  filteredActiveAds.map(
                                    (ad) => ad.collationId || ad.id
                                  )
                                );
                                return `${uniqueCollationIds.size} sets (${filteredActiveAds.length} ads)`;
                              })()}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">
                          Inactive Ads
                        </div>
                        <div className="text-lg font-bold truncate">
                          {(() => {
                            if (isLoadingAds) return "Loading...";
                            const inactiveAds = getFilteredAds("Inactive");
                            return `${inactiveAds.length} ads`;
                          })()}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">
                          Organic Posts
                        </div>
                        <div className="text-lg font-bold truncate">
                          {(() => {
                            if (isLoadingPosts) return "Loading...";
                            const filteredPosts = posts.filter((post) => {
                              if (dateRange === 0) return true;
                              const postDate = new Date(post.time);
                              const cutoffDate = new Date();
                              cutoffDate.setDate(cutoffDate.getDate() - dateRange);
                              return postDate >= cutoffDate;
                            });
                            return `Latest ${filteredPosts.length} posts`;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Tabs content */}
              {!showOverallEngagement ? (
                <Tabs
                  defaultValue="active"
                  className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="bg-white px-4 border-b">
                  <TabsList className="flex">
                    <TabsTrigger value="active" className="flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      Active Ads
                    </TabsTrigger>
                    <TabsTrigger value="new" className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      New This Week
                    </TabsTrigger>
                    <TabsTrigger value="inactive" className="flex items-center">
                      <X className="h-4 w-4 mr-2" />
                      Inactive Ads
                    </TabsTrigger>
                    <TabsTrigger value="organic" className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Organic Posts
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Active Ads Tab */}
                <TabsContent
                  value="active"
                  className="flex-1 p-4 overflow-auto mt-0"
                >
                  {mounted && (
                    <>
                      {/* Sorting Section */}
                      <div className="mb-4 flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          Sort by Date:
                        </span>
                        <button
                          onClick={() =>
                            setActiveAdsSortDirection((prev) =>
                              prev === "desc" ? "asc" : "desc"
                            )
                          }
                          className="p-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center space-x-1"
                          title={
                            activeAdsSortDirection === "desc"
                              ? "Newest First"
                              : "Oldest First"
                          }
                        >
                          {activeAdsSortDirection === "desc" ? (
                            <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUp className="h-4 w-4" />
                          )}
                          <span className="ml-1">
                            {activeAdsSortDirection === "desc"
                              ? "Newest First"
                              : "Oldest First"}
                          </span>
                        </button>
                      </div>

                      {/* Loading State */}
                      {isLoadingAds && (
                        <div className="flex justify-center items-center h-64">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                        </div>
                      )}

                      {/* Error State */}
                      {adError && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-red-700 mb-4">
                          {adError}
                        </div>
                      )}

                      {/* No Ads State */}
                      {!isLoadingAds &&
                        !adError &&
                        getFilteredAds().length === 0 && (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-700 mb-4">
                            No active ads found for this competitor.
                          </div>
                        )}

                      {/* Analysis section */}
                      {analysisData?.ads30Recent && activeCompetitor !== null && (
                        <div
                          className={`mb-4 ${competitors[activeCompetitor].color} p-4 rounded-lg border border-blue-100`}
                        >
                          <h3 className="font-medium mb-2 text-blue-800">
                            AI Analysis - Last 30 Days
                          </h3>
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {formatMessageWithBold(analysisData.ads30Recent)}
                          </p>
                        </div>
                      )}

                      {/* Sort and display ads */}
                      {!isLoadingAds && !adError && activeAds.length > 0 && (
                        <div className="grid grid-cols-3 gap-4">
                          {groupAdsByCollationId(getFilteredAds())
                            .sort((a, b) => {
                              const dateA = new Date(
                                a.mainAd.datePosted
                              ).getTime();
                              const dateB = new Date(
                                b.mainAd.datePosted
                              ).getTime();
                              return activeAdsSortDirection === "desc"
                                ? dateB - dateA
                                : dateA - dateB;
                            })
                            .map(({ mainAd, subAds, totalAds }) => (
                              <div
                                key={mainAd.collationId || mainAd.id}
                                className="flex flex-col"
                              >
                                <Card className="overflow-hidden flex flex-col">
                                  <div className="relative w-full bg-gray-200 flex items-center justify-center text-gray-400">
                                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                      {mainAd.mediaUrls.length > 0 ? (
                                        <>
                                          {isVideoUrl(
                                            mainAd.mediaUrls[
                                              currentMediaIndex[mainAd.id] || 0
                                            ]
                                          ) ? (
                                            <video
                                              src={
                                                mainAd.mediaUrls[
                                                  currentMediaIndex[mainAd.id] ||
                                                    0
                                                ]
                                              }
                                              controls
                                              className="absolute inset-0 w-full h-full object-contain"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDetailedViewId(mainAd.id);
                                                setDetailedViewType("ad");
                                              }}
                                            />
                                          ) : (
                                            <img
                                              src={
                                                mainAd.mediaUrls[
                                                  currentMediaIndex[mainAd.id] ||
                                                    0
                                                ]
                                              }
                                              alt={mainAd.headline}
                                              className="absolute inset-0 w-full h-full object-contain cursor-pointer"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDetailedViewId(mainAd.id);
                                                setDetailedViewType("ad");
                                              }}
                                            />
                                          )}
                                          {mainAd.mediaUrls.length > 1 && (
                                            <>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMediaNav(
                                                    mainAd.id,
                                                    "prev",
                                                    mainAd.mediaUrls.length
                                                  );
                                                }}
                                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-opacity z-10"
                                                aria-label="Previous media"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  className="h-6 w-6"
                                                  fill="none"
                                                  viewBox="0 0 24 24"
                                                  stroke="currentColor"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 19l-7-7 7-7"
                                                  />
                                                </svg>
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMediaNav(
                                                    mainAd.id,
                                                    "next",
                                                    mainAd.mediaUrls.length
                                                  );
                                                }}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-opacity z-10"
                                                aria-label="Next media"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  className="h-6 w-6"
                                                  fill="none"
                                                  viewBox="0 0 24 24"
                                                  stroke="currentColor"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 5l7 7-7 7"
                                                  />
                                                </svg>
                                              </button>
                                              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs z-10">
                                                {(currentMediaIndex[mainAd.id] || 0) + 1} /{" "}
                                                {mainAd.mediaUrls.length}
                                              </div>
                                            </>
                                          )}
                                        </>
                                      ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          {mainAd.headline} - No Image
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <CardContent className="p-4 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                      <h3 className="font-bold line-clamp-2">
                                        {mainAd.headline}
                                      </h3>
                                      <div className="flex items-center space-x-2">
                                        {totalAds > 1 && (
                                          <button
                                            onClick={() =>
                                              toggleAdSet(
                                                mainAd.collationId || mainAd.id
                                              )
                                            }
                                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
                                          >
                                            {totalAds} variants{" "}
                                            {expandedAdSets.has(
                                              mainAd.collationId || mainAd.id
                                            )
                                              ? "▼"
                                              : "▶"}
                                          </button>
                                        )}
                                        <span
                                          className={`px-2 py-1 text-xs rounded-full ${(() => {
                                            const adDate = new Date(
                                              mainAd.datePosted
                                            );
                                            const sevenDaysAgo = new Date();
                                            sevenDaysAgo.setDate(
                                              sevenDaysAgo.getDate() - 7
                                            );
                                            const isNew =
                                              adDate >= sevenDaysAgo;
                                            const isWithinRange =
                                              isWithinDateRange(
                                                mainAd.datePosted
                                              );
                                            if (isNew)
                                              return "bg-green-100 text-green-800";
                                            return isWithinRange
                                              ? "bg-gray-100 text-gray-800"
                                              : "bg-gray-200 text-gray-600";
                                          })()}`}
                                        >
                                          {(() => {
                                            const adDate = new Date(
                                              mainAd.datePosted
                                            );
                                            const sevenDaysAgo = new Date();
                                            sevenDaysAgo.setDate(
                                              sevenDaysAgo.getDate() - 7
                                            );
                                            return adDate >= sevenDaysAgo
                                              ? "New"
                                              : mainAd.status;
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="relative">
                                      <p
                                        className={`text-sm text-gray-600 mb-3 ${
                                          expandedDescriptions.has(mainAd.id)
                                            ? ""
                                            : "line-clamp-3"
                                        }`}
                                      >
                                        {mainAd.description}
                                      </p>
                                      {mainAd.description.split("\n").length >
                                        3 && (
                                        <button
                                          onClick={() =>
                                            toggleDescription(mainAd.id)
                                          }
                                          className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                                        >
                                          {expandedDescriptions.has(mainAd.id)
                                            ? "Show Less"
                                            : "Read More"}
                                        </button>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 flex flex-col gap-1 mb-3 mt-auto">
                                      <div className="flex justify-between">
                                        <span>Ad ID: {mainAd.id}</span>
                                        <span>{mainAd.datePosted}</span>
                                      </div>
                                      {mainAd.collationId &&
                                        mainAd.collationId !== "N/A" && (
                                          <div>
                                            <span>
                                              Set ID: {mainAd.collationId}
                                            </span>
                                          </div>
                                        )}
                                    </div>
                                    {mainAd.mediaUrls.length > 1 && (
                                      <div className="mt-2 pt-2 border-t">
                                        <div className="text-xs text-gray-500">
                                          Additional Media:{" "}
                                          {mainAd.mediaUrls.length - 1} items
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>

                                {/* Sub-ads dropdown */}
                                {expandedAdSets.has(
                                  mainAd.collationId || mainAd.id
                                ) &&
                                  subAds.length > 0 && (
                                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-blue-200">
                                      {subAds.map((subAd) => (
                                        <Card
                                          key={subAd.id}
                                          className="overflow-hidden"
                                        >
                                          <CardContent className="p-3">
                                            <div className="flex items-start space-x-3">
                                              {subAd.mediaUrls.length > 0 && (
                                                <img
                                                  src={subAd.mediaUrls[0]}
                                                  alt={subAd.headline}
                                                  className="w-16 h-16 object-cover rounded"
                                                />
                                              )}
                                              <div className="flex-1">
                                                <h4 className="font-medium text-sm line-clamp-1">
                                                  {subAd.headline}
                                                </h4>
                                                <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                                                  {subAd.description}
                                                </p>
                                                <div className="text-xs text-gray-500 mt-1">
                                                  {subAd.datePosted}
                                                </div>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* New Ads Tab */}
                <TabsContent
                  value="new"
                  className="flex-1 p-4 overflow-auto mt-0"
                >
                  {mounted &&
                    activeCompetitor !== null &&
                    competitors[activeCompetitor] && (
                      <>
                        {/* Add sorting controls */}
                        <div className="mb-4 flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            Sort by Date:
                          </span>
                          <button
                            onClick={() =>
                              setNewAdsSortDirection((prev) =>
                                prev === "desc" ? "asc" : "desc"
                              )
                            }
                            className="p-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center space-x-1"
                            title={
                              newAdsSortDirection === "desc"
                                ? "Newest First"
                                : "Oldest First"
                            }
                          >
                            {newAdsSortDirection === "desc" ? (
                              <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowUp className="h-4 w-4" />
                            )}
                            <span className="ml-1">
                              {newAdsSortDirection === "desc"
                                ? "Newest First"
                                : "Oldest First"}
                            </span>
                          </button>
                        </div>

                        {/* Loading State */}
                        {isLoadingAds && (
                          <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                          </div>
                        )}

                        {/* Error State */}
                        {adError && (
                          <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-red-700 mb-4">
                            {adError}
                          </div>
                        )}

                        {/* No New Ads State */}
                        {!isLoadingAds &&
                          !adError &&
                          (() => {
                            const sevenDaysAgo = new Date();
                            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                            const newAds = getFilteredAds("Active").filter(
                              (ad) => {
                                const adDate = new Date(ad.datePosted);
                                return adDate >= sevenDaysAgo;
                              }
                            );
                            return newAds.length === 0;
                          })() && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-700 mb-4">
                              No new ads found for this competitor in the last 7
                              days.
                            </div>
                          )}

                        {/* New Ads Content */}
                        {!isLoadingAds && !adError && (
                          <>
                            {(() => {
                              const sevenDaysAgo = new Date();
                              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                              const newAds = getFilteredAds("Active").filter(
                                (ad) => {
                                  const adDate = new Date(ad.datePosted);
                                  return adDate >= sevenDaysAgo;
                                }
                              );

                              if (newAds.length === 0) return null;

                              const groupedAds = groupAdsByCollationId(
                                newAds
                              ).sort((a, b) => {
                                const dateA = new Date(
                                  a.mainAd.datePosted
                                ).getTime();
                                const dateB = new Date(
                                  b.mainAd.datePosted
                                ).getTime();
                                return newAdsSortDirection === "desc"
                                  ? dateB - dateA
                                  : dateA - dateB;
                              });
                              return (
                                <>
                                  {/* Analysis section */}
                                  {analysisData?.ads7Days && (
                                    <div
                                      className={`mb-4 ${competitors[activeCompetitor].color} p-4 rounded-lg border border-blue-100`}
                                    >
                                      <h3 className="font-medium mb-2 text-blue-800">
                                        AI Analysis - Last 7 Days
                                      </h3>
                                      <p className="text-gray-700 whitespace-pre-wrap">
                                        {formatMessageWithBold(analysisData.ads7Days)}
                                      </p>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-3 gap-4">
                                    {groupedAds.map(
                                      ({ mainAd, subAds, totalAds }) => (
                                        <div
                                          key={mainAd.collationId || mainAd.id}
                                          className="flex flex-col"
                                        >
                                          <Card className="overflow-hidden flex flex-col">
                                            <div className="relative w-full bg-gray-200 flex items-center justify-center text-gray-400">
                                              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                                {mainAd.mediaUrls.length > 0 ? (
                                                  <>
                                                    {isVideoUrl(
                                                      mainAd.mediaUrls[
                                                        currentMediaIndex[
                                                          mainAd.id
                                                        ] || 0
                                                      ]
                                                    ) ? (
                                                      <video
                                                        src={
                                                          mainAd.mediaUrls[
                                                            currentMediaIndex[
                                                              mainAd.id
                                                            ] || 0
                                                          ]
                                                        }
                                                        controls
                                                        className="absolute inset-0 w-full h-full object-contain"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setDetailedViewId(mainAd.id);
                                                          setDetailedViewType("ad");
                                                        }}
                                                      />
                                                    ) : (
                                                      <img
                                                        src={
                                                          mainAd.mediaUrls[
                                                            currentMediaIndex[
                                                              mainAd.id
                                                            ] || 0
                                                          ]
                                                        }
                                                        alt={mainAd.headline}
                                                        className="absolute inset-0 w-full h-full object-contain cursor-pointer"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setDetailedViewId(mainAd.id);
                                                          setDetailedViewType("ad");
                                                        }}
                                                      />
                                                    )}
                                                    {mainAd.mediaUrls.length > 1 && (
                                                      <>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMediaNav(
                                                              mainAd.id,
                                                              "prev",
                                                              mainAd.mediaUrls
                                                                .length
                                                            );
                                                          }}
                                                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-opacity z-10"
                                                          aria-label="Previous media"
                                                        >
                                                          <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-6 w-6"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                          >
                                                            <path
                                                              strokeLinecap="round"
                                                              strokeLinejoin="round"
                                                              strokeWidth={2}
                                                              d="M15 19l-7-7 7-7"
                                                            />
                                                          </svg>
                                                        </button>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMediaNav(
                                                              mainAd.id,
                                                              "next",
                                                              mainAd.mediaUrls
                                                                .length
                                                            );
                                                          }}
                                                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-opacity z-10"
                                                          aria-label="Next media"
                                                        >
                                                          <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-6 w-6"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                          >
                                                            <path
                                                              strokeLinecap="round"
                                                              strokeLinejoin="round"
                                                              strokeWidth={2}
                                                              d="M9 5l7 7-7 7"
                                                            />
                                                          </svg>
                                                        </button>
                                                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs z-10">
                                                          {(currentMediaIndex[
                                                            mainAd.id
                                                          ] || 0) + 1}{" "}
                                                          /{" "}
                                                          {
                                                            mainAd.mediaUrls
                                                              .length
                                                          }
                                                        </div>
                                                      </>
                                                    )}
                                                  </>
                                                ) : (
                                                  <div className="absolute inset-0 flex items-center justify-center">
                                                    {mainAd.headline} - No Image
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <CardContent className="p-4 flex-1 flex flex-col">
                                              <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold line-clamp-2">
                                                  {mainAd.headline}
                                                </h3>
                                                <div className="flex items-center space-x-2">
                                                  {totalAds > 1 && (
                                                    <button
                                                      onClick={() =>
                                                        toggleAdSet(
                                                          mainAd.collationId ||
                                                            mainAd.id
                                                        )
                                                      }
                                                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
                                                    >
                                                      {totalAds} variants{" "}
                                                      {expandedAdSets.has(
                                                        mainAd.collationId ||
                                                          mainAd.id
                                                      )
                                                        ? "▼"
                                                        : "▶"}
                                                    </button>
                                                  )}
                                                  <span
                                                    className={`px-2 py-1 text-xs rounded-full ${(() => {
                                                      const adDate = new Date(
                                                        mainAd.datePosted
                                                      );
                                                      const sevenDaysAgo =
                                                        new Date();
                                                      sevenDaysAgo.setDate(
                                                        sevenDaysAgo.getDate() -
                                                          7
                                                      );
                                                      const isNew =
                                                        adDate >= sevenDaysAgo;
                                                      const isWithinRange =
                                                        isWithinDateRange(
                                                          mainAd.datePosted
                                                        );
                                                      if (isNew)
                                                        return "bg-green-100 text-green-800";
                                                      return isWithinRange
                                                        ? "bg-gray-100 text-gray-800"
                                                        : "bg-gray-200 text-gray-600";
                                                    })()}`}
                                                  >
                                                    {(() => {
                                                      const adDate = new Date(
                                                        mainAd.datePosted
                                                      );
                                                      const sevenDaysAgo =
                                                        new Date();
                                                      sevenDaysAgo.setDate(
                                                        sevenDaysAgo.getDate() -
                                                          7
                                                      );
                                                      return adDate >=
                                                        sevenDaysAgo
                                                        ? "New"
                                                        : mainAd.status;
                                                    })()}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="relative">
                                                <p
                                                  className={`text-sm text-gray-600 mb-3 ${
                                                    expandedDescriptions.has(
                                                      mainAd.id
                                                    )
                                                      ? ""
                                                      : "line-clamp-3"
                                                  }`}
                                                >
                                                  {mainAd.description}
                                                </p>
                                                {mainAd.description.split("\n")
                                                  .length > 3 && (
                                                  <button
                                                    onClick={() =>
                                                      toggleDescription(
                                                        mainAd.id
                                                      )
                                                    }
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                                                  >
                                                    {expandedDescriptions.has(
                                                      mainAd.id
                                                    )
                                                      ? "Show Less"
                                                      : "Read More"}
                                                  </button>
                                                )}
                                              </div>
                                              <div className="text-xs text-gray-500 flex flex-col gap-1 mb-3 mt-auto">
                                                <div className="flex justify-between">
                                                  <span>
                                                    Ad ID: {mainAd.id}
                                                  </span>
                                                  <span>
                                                    {mainAd.datePosted}
                                                  </span>
                                                </div>
                                                {mainAd.collationId &&
                                                  mainAd.collationId !==
                                                    "N/A" && (
                                                    <div>
                                                      <span>
                                                        Set ID:{" "}
                                                        {mainAd.collationId}
                                                      </span>
                                                    </div>
                                                  )}
                                              </div>
                                              {mainAd.mediaUrls.length > 1 && (
                                                <div className="mt-2 pt-2 border-t">
                                                  <div className="text-xs text-gray-500">
                                                    Additional Media:{" "}
                                                    {mainAd.mediaUrls.length -
                                                      1}{" "}
                                                    items
                                                  </div>
                                                </div>
                                              )}
                                            </CardContent>
                                          </Card>

                                          {/* Add Sub-ads dropdown */}
                                          {expandedAdSets.has(
                                            mainAd.collationId || mainAd.id
                                          ) &&
                                            subAds.length > 0 && (
                                              <div className="mt-2 space-y-2 pl-4 border-l-2 border-blue-200">
                                                {subAds.map((subAd) => (
                                                  <Card
                                                    key={subAd.id}
                                                    className="overflow-hidden"
                                                  >
                                                    <CardContent className="p-3">
                                                      <div className="flex items-start space-x-3">
                                                        {subAd.mediaUrls
                                                          .length > 0 && (
                                                          <img
                                                            src={
                                                              subAd.mediaUrls[0]
                                                            }
                                                            alt={subAd.headline}
                                                            className="w-16 h-16 object-cover rounded"
                                                          />
                                                        )}
                                                        <div className="flex-1">
                                                          <h4 className="font-medium text-sm line-clamp-1">
                                                            {subAd.headline}
                                                          </h4>
                                                          <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                                                            {subAd.description}
                                                          </p>
                                                          <div className="text-xs text-gray-500 mt-1">
                                                            {subAd.datePosted}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </CardContent>
                                                  </Card>
                                                ))}
                                              </div>
                                            )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </>
                        )}
                      </>
                    )}
                </TabsContent>

                {/* Inactive Ads Tab */}
                <TabsContent
                  value="inactive"
                  className="flex-1 p-4 overflow-auto mt-0"
                >
                  {mounted && (
                    <>
                      {/* Sorting Section */}
                      <div className="mb-4 flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          Sort by Date:
                        </span>
                        <button
                          onClick={() =>
                            setInactiveAdsSortDirection((prev) =>
                              prev === "desc" ? "asc" : "desc"
                            )
                          }
                          className="p-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center space-x-1"
                          title={
                            inactiveAdsSortDirection === "desc"
                              ? "Newest First"
                              : "Oldest First"
                          }
                        >
                          {inactiveAdsSortDirection === "desc" ? (
                            <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUp className="h-4 w-4" />
                          )}
                          <span className="ml-1">
                            {inactiveAdsSortDirection === "desc"
                              ? "Newest First"
                              : "Oldest First"}
                          </span>
                        </button>
                      </div>

                      {/* Loading State */}
                      {isLoadingAds && (
                        <div className="flex justify-center items-center h-64">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                        </div>
                      )}

                      {/* Error State */}
                      {adError && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-red-700 mb-4">
                          {adError}
                        </div>
                      )}

                      {/* No Inactive Ads State */}
                      {!isLoadingAds &&
                        !adError &&
                        getFilteredAds("Inactive").length === 0 && (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-700 mb-4">
                            No inactive ads found for this competitor.
                          </div>
                        )}

                      {/* Sort and display inactive ads */}
                      {!isLoadingAds && !adError && activeAds.length > 0 && (
                        <div className="grid grid-cols-3 gap-4">
                          {groupAdsByCollationId(getFilteredAds("Inactive"))
                            .sort((a, b) => {
                              const dateA = new Date(
                                a.mainAd.datePosted
                              ).getTime();
                              const dateB = new Date(
                                b.mainAd.datePosted
                              ).getTime();
                              return inactiveAdsSortDirection === "desc"
                                ? dateB - dateA
                                : dateA - dateB;
                            })
                            .map(({ mainAd, subAds, totalAds }) => (
                              <div
                                key={mainAd.collationId || mainAd.id}
                                className="flex flex-col"
                              >
                                <Card className="overflow-hidden flex flex-col bg-gray-50">
                                  <div className="w-full h-64 bg-gray-200 flex items-center justify-center text-gray-400 opacity-75">
                                    {mainAd.mediaUrls.length > 0 ? (
                                      <img
                                        src={mainAd.mediaUrls[0]}
                                        alt={mainAd.headline}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      `${mainAd.headline} - No Image`
                                    )}
                                  </div>
                                  <CardContent className="p-4 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                      <h3 className="font-bold line-clamp-2 text-gray-700">
                                        {mainAd.headline}
                                      </h3>
                                      <div className="flex items-center space-x-2">
                                        {totalAds > 1 && (
                                          <button
                                            onClick={() =>
                                              toggleAdSet(
                                                mainAd.collationId || mainAd.id
                                              )
                                            }
                                            className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full hover:bg-gray-300 transition-colors"
                                          >
                                            {totalAds} variants{" "}
                                            {expandedAdSets.has(
                                              mainAd.collationId || mainAd.id
                                            )
                                              ? "▼"
                                              : "▶"}
                                          </button>
                                        )}
                                        <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">
                                          Inactive
                                        </span>
                                      </div>
                                    </div>
                                    <div className="relative">
                                      <p
                                        className={`text-sm text-gray-600 mb-3 ${
                                          expandedDescriptions.has(mainAd.id)
                                            ? ""
                                            : "line-clamp-3"
                                        }`}
                                      >
                                        {mainAd.description}
                                      </p>
                                      {mainAd.description.split("\n").length >
                                        3 && (
                                        <button
                                          onClick={() =>
                                            toggleDescription(mainAd.id)
                                          }
                                          className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                                        >
                                          {expandedDescriptions.has(mainAd.id)
                                            ? "Show Less"
                                            : "Read More"}
                                        </button>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 flex flex-col gap-1 mb-3 mt-auto">
                                      <div className="flex justify-between">
                                        <span>Ad ID: {mainAd.id}</span>
                                        <span>{mainAd.datePosted}</span>
                                      </div>
                                      {mainAd.collationId &&
                                        mainAd.collationId !== "N/A" && (
                                          <div>
                                            <span>
                                              Set ID: {mainAd.collationId}
                                            </span>
                                          </div>
                                        )}
                                    </div>
                                    {mainAd.mediaUrls.length > 1 && (
                                      <div className="mt-2 pt-2 border-t border-gray-200">
                                        <div className="text-xs text-gray-500">
                                          Additional Media:{" "}
                                          {mainAd.mediaUrls.length - 1} items
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>

                                {/* Sub-ads dropdown for inactive ads */}
                                {expandedAdSets.has(
                                  mainAd.collationId || mainAd.id
                                ) &&
                                  subAds.length > 0 && (
                                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                                      {subAds.map((subAd) => (
                                        <Card
                                          key={subAd.id}
                                          className="overflow-hidden bg-gray-50"
                                        >
                                          <CardContent className="p-3">
                                            <div className="flex items-start space-x-3">
                                              {subAd.mediaUrls.length > 0 && (
                                                <img
                                                  src={subAd.mediaUrls[0]}
                                                  alt={subAd.headline}
                                                  className="w-16 h-16 object-cover rounded opacity-75"
                                                />
                                              )}
                                              <div className="flex-1">
                                                <h4 className="font-medium text-sm line-clamp-1 text-gray-700">
                                                  {subAd.headline}
                                                </h4>
                                                <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                                                  {subAd.description}
                                                </p>
                                                <div className="text-xs text-gray-500 mt-1">
                                                  {subAd.datePosted}
                                                </div>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* Organic Posts Tab */}
                <TabsContent
                  value="organic"
                  className="flex-1 p-4 overflow-auto mt-0"
                >
                  {mounted && (
                    <>
                      {/* Analysis section */}
                      {analysisData?.organicPosts &&
                        activeCompetitor !== null && (
                          <div
                            className={`mb-4 ${competitors[activeCompetitor].color} p-4 rounded-lg border border-blue-100`}
                          >
                            <h3 className="font-medium mb-2 text-blue-800">
                              AI Analysis - Organic Posts
                            </h3>
                            <div>
                              <p className="text-gray-700 whitespace-pre-wrap">
                                {formatMessageWithBold(
                                  expandedOrganicPosts 
                                    ? analysisData.organicPosts 
                                    : truncateText(analysisData.organicPosts)
                                )}
                              </p>
                              {analysisData.organicPosts.length > 300 && (
                                <button
                                  onClick={() => setExpandedOrganicPosts(prev => !prev)}
                                  className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  {expandedOrganicPosts ? "Show Less" : "Read More"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                      <div className="mb-4 flex items-center space-x-2">
                        <select
                          value={organicSortBy}
                          onChange={(e) =>
                            setOrganicSortBy(
                              e.target.value as
                                | "date"
                                | "likes"
                                | "comments"
                                | "shares"
                                | "engagement"
                            )
                          }
                          className="p-2 border rounded-lg text-sm"
                        >
                          <option value="date">Sort by Date</option>
                          <option value="engagement">
                            Sort by Total Engagement
                          </option>
                          <option value="likes">Sort by Likes</option>
                          <option value="comments">Sort by Comments</option>
                          <option value="shares">Sort by Shares</option>
                        </select>
                        <button
                          onClick={() =>
                            setOrganicSortDirection((prev) =>
                              prev === "desc" ? "asc" : "desc"
                            )
                          }
                          className="p-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center space-x-1"
                          title={
                            organicSortDirection === "desc"
                              ? "Sort Descending"
                              : "Sort Ascending"
                          }
                        >
                          {organicSortDirection === "desc" ? (
                            <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUp className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {isLoadingPosts && (
                        <div className="flex justify-center items-center h-64">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                        </div>
                      )}

                      {!isLoadingPosts && posts.length === 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-700 mb-4">
                          No organic posts found for this competitor.
                        </div>
                      )}

                      {!isLoadingPosts && posts.length > 0 && (
                        <div className="grid grid-cols-3 gap-4">
                          {posts
                            .filter((post) => {
                              if (dateRange === 0) return true;
                              const postDate = new Date(post.time);
                              const cutoffDate = new Date();
                              cutoffDate.setDate(
                                cutoffDate.getDate() - dateRange
                              );
                              return postDate >= cutoffDate;
                            })
                            .sort((a, b) => {
                              let comparison = 0;
                              switch (organicSortBy) {
                                case "engagement":
                                  const engagementA =
                                    (a.likes || 0) +
                                    (a.comments || 0) +
                                    (a.shares || 0);
                                  const engagementB =
                                    (b.likes || 0) +
                                    (b.comments || 0) +
                                    (b.shares || 0);
                                  comparison = engagementB - engagementA;
                                  break;
                                case "likes":
                                  comparison = (b.likes || 0) - (a.likes || 0);
                                  break;
                                case "comments":
                                  comparison =
                                    (b.comments || 0) - (a.comments || 0);
                                  break;
                                case "shares":
                                  comparison =
                                    (b.shares || 0) - (a.shares || 0);
                                  break;
                                case "date":
                                default:
                                  comparison =
                                    new Date(b.time).getTime() -
                                    new Date(a.time).getTime();
                              }
                              return organicSortDirection === "desc"
                                ? comparison
                                : -comparison;
                            })
                            .map((post) => (
                              <Card key={post.url} className="overflow-hidden flex flex-col">
                                <div className="relative w-full bg-gray-200 flex items-center justify-center text-gray-400">
                                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                    {post.media?.[0]?.thumbnail ? (
                                      <img
                                        src={post.media[0].thumbnail}
                                        alt={post.text.substring(0, 50)}
                                        className="absolute inset-0 w-full h-full object-contain cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDetailedViewId(post.url);
                                          setDetailedViewType("post");
                                        }}
                                      />
                                    ) : (
                                      <div className="absolute inset-0 flex items-center justify-center p-4">
                                        {post.text.substring(0, 100)}...
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <CardContent className="p-4 flex-1 flex flex-col">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold line-clamp-2">
                                      {post.text.split("\n")[0] ||
                                        "Untitled Post"}
                                    </div>
                                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                      Organic
                                    </span>
                                  </div>
                                  <div className="relative">
                                    <p
                                      className={`text-sm text-gray-600 mb-3 ${
                                        expandedDescriptions.has(post.url)
                                          ? ""
                                          : "line-clamp-3"
                                      }`}
                                    >
                                      {post.text}
                                    </p>
                                    {post.text.split("\n").length > 3 && (
                                      <button
                                        onClick={() =>
                                          toggleDescription(post.url)
                                        }
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                                      >
                                        {expandedDescriptions.has(post.url)
                                          ? "Show Less"
                                          : "Read More"}
                                      </button>
                                    )}
                                  </div>
                                  <div className="mt-auto">
                                    <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                                      <div className="flex items-center space-x-4">
                                        <span className="flex items-center">
                                          <svg
                                            className="w-4 h-4 mr-1"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                          </svg>
                                          {post.likes}
                                        </span>
                                        <span className="flex items-center">
                                          <svg
                                            className="w-4 h-4 mr-1"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                          {post.comments}
                                        </span>
                                        {post.shares !== null && (
                                          <span className="flex items-center">
                                            <svg
                                              className="w-4 h-4 mr-1"
                                              fill="currentColor"
                                              viewBox="0 0 20 20"
                                            >
                                              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                                            </svg>
                                            {post.shares}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 flex flex-col gap-1">
                                    <div className="flex justify-between">
                                      <span>Post ID: {post.postId}</span>
                                      <span>{post.time}</span>
                                    </div>
                                    <a
                                      href={post.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline mt-1"
                                    >
                                      View on Facebook
                                    </a>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
                ) : (
                  <EngagementDashboard 
                    clientName={selectedClient?.client || ''}
                    posts={allPostsForEngagement}
                    competitors={competitors} 
                    onBack={() => setShowOverallEngagement(false)} 
                    showOverallEngagement={true}
                  />
                )}
            </>
          )}
        </div>
      </div>

      {/* Chat Window */}
      {showChatWindow && (
        <div className="fixed inset-0 bg-white z-50 flex">
          {/* Chat Sidebar - Always visible */}
          <div className="w-64 border-r bg-gray-50 flex flex-col">
            <div className="p-4 border-b bg-white">
              <h3 className="font-medium">Chat History</h3>
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  setActiveChatSession(null);
                  const timestamp = new Date().toISOString();
                  const newChatId = generateChatId(
                    activeCompetitor !== null
                      ? competitors[activeCompetitor]
                      : null
                  );
                  setCurrentChatId(newChatId);
                  setChatHistory([
                    {
                      type: "assistant",
                      message:
                        'สวัสดี! ฉันคือ AdInsight ผู้ช่วยวิเคราะห์ข้อมูลคู่แข่งของคุณ 🎯 ถามฉันได้ทุกอย่างเกี่ยวกับข้อมูลคู่แข่งของคุณ เช่น "เทรนด์โฆษณาแบบไหนกำลังมาแรงในสัปดาห์นี้?"',
                      timestamp,
                      chatId: newChatId,
                    },
                  ]);
                }}
                className="w-full p-3 text-left rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mb-2 flex items-center space-x-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span>New Chat</span>
              </button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {chatSessions
                  .sort(
                    (a, b) =>
                      new Date(b.timestamp).getTime() -
                      new Date(a.timestamp).getTime()
                  )
                  .map((session) => (
                    <button
                      key={session.id}
                      onClick={() => loadChatHistory(session.id)}
                      className={`w-full p-3 text-left rounded-lg hover:bg-gray-100 transition-colors ${
                        activeChatSession === session.id
                          ? "bg-blue-50 border border-blue-200"
                          : ""
                      }`}
                    >
                      <div className="font-medium text-sm truncate">
                        {session.lastMessage}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDateTimeDisplay(session.timestamp)}
                      </div>
                    </button>
                  ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setShowChatWindow(false);
                    // Don't reset chat history or active session when closing
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center">
                  <h3 className="font-medium">AdInsight Assistant</h3>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {activeChatSession
                  ? "Viewing chat history"
                  : "Ask me anything about market insights"}
              </div>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-3xl mx-auto space-y-6">
                {chatHistory.map(
                  (
                    chat: {
                      type: "user" | "assistant";
                      message: string;
                      context?: string;
                      timestamp?: string;
                      chatId?: string;
                    },
                    index: number
                  ) => (
                    <div
                      key={index}
                      className={`flex items-start space-x-4 ${
                        chat.type === "user" ? "justify-end" : ""
                      }`}
                    >
                      {chat.type === "assistant" && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-600">
                          <MessageCircle className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div
                        className={`flex-1 max-w-[80%] ${
                          chat.type === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-50"
                        } p-4 rounded-lg shadow-sm`}
                      >
                        <div className="font-medium mb-1 flex justify-between items-center">
                          <span>
                            {chat.type === "user" ? "You" : "AdInsight"}
                          </span>
                          {chat.timestamp && (
                            <span
                              className={`text-xs ${
                                chat.type === "user"
                                  ? "text-blue-100"
                                  : "text-gray-500"
                              }`}
                            >
                              {formatDateTimeDisplay(chat.timestamp)}
                            </span>
                          )}
                        </div>
                        <div
                          className={`prose prose-sm max-w-none ${
                            chat.type === "user" ? "prose-invert" : ""
                          }`}
                        >
                          <p className="whitespace-pre-wrap">
                            {formatMessageWithBold(chat.message)}
                          </p>
                          {chat.context && chat.context !== chat.message && (
                            <p
                              className={`mt-2 text-sm ${
                                chat.type === "user"
                                  ? "text-blue-100"
                                  : "text-gray-500"
                              }`}
                            >
                              {formatMessageWithBold(chat.context)}
                            </p>
                          )}
                        </div>
                      </div>
                      {chat.type === "user" && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="border-t p-4 bg-white">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Ask about competitor insights..."
                    className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send className="h-5 w-5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>


        </div>
      )}

      {/* Detailed View Modal */}
      {detailedViewId && <DetailedViewContent />}
    </div>
  );
}
