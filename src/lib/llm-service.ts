import { GoogleGenerativeAI } from "@google/generative-ai";

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

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
const githubToken = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';

// Function to fetch content from GitHub
async function fetchGithubContent(owner: string, repo: string, path: string): Promise<string> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3.raw',
    };
    
    if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`Failed to fetch GitHub content: ${response.statusText}`);
    }
    return response.text();
}

// Initialize prompt variables
let getInsightsPrompt: string = '';

// Function to initialize prompts
async function initializePrompts() {
    try {
        getInsightsPrompt = await fetchGithubContent(
            'pieconvertcake',
            'cvc-competitor-listening-tool-prompt',
            'facebook_insight.txt'
        );
    } catch (error) {
        // console.error('Failed to initialize prompts:', error);
        throw new Error('Failed to initialize prompts from GitHub');
    }
}

// Call initializePrompts when the module loads
initializePrompts().catch(console.error);

// Add type guard for API key
if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not defined');
}

interface CompetitorData {
    ads: FacebookAd[];
    posts: FacebookPost[];
}

// Separate caches for ads and posts
interface PreparedAd {
    id: string;
    collationId: string;
    startDate: string;
    text: string;
    mediaCount: number;
    status: string;
    brandName: string;
}

interface PreparedPost {
    id: string;
    date: number;
    text: string;
    likes: number;
    comments: number;
    shares: number;
    brandName: string;
}

let cachedAds: PreparedAd[] | null = null;
let cachedPosts: PreparedPost[] | null = null;

export const llmService = {
    // Store competitor data (backward compatibility)
    async setCompetitorData(data: CompetitorData) {
        await this.setAdsData(data.ads);
        await this.setPostsData(data.posts);
    },

    // Store and filter unique ads (no trimming)
    async setAdsData(ads: FacebookAd[], brandName?: string) {
        const MAX_ADS = 300; // Limit the number of ads

        // Filter unique collationId ads (only one per set)
        const uniqueAdsMap = new Map<string, FacebookAd>();

        ads.forEach(ad => {
            if (ad.collationId) {
                // Store only the first ad for each collationId
                if (!uniqueAdsMap.has(ad.collationId)) {
                    uniqueAdsMap.set(ad.collationId, ad);
                }
            } else {
                // If no collationId, store the ad based on its ID
                uniqueAdsMap.set(ad.id, ad);
            }
        });

        // Convert to array and apply the limit
        cachedAds = Array.from(uniqueAdsMap.values())
            .slice(0, MAX_ADS)
            .map(ad => ({
                id: ad.id,
                collationId: ad.collationId || '',
                startDate: ad.datePosted,
                text: ad.description,
                mediaCount: ad.mediaUrls.length,
                status: ad.status,
                brandName: brandName || 'Unknown Brand'
            }));
    },

    // Store posts data (no trimming)
    async setPostsData(posts: FacebookPost[], brandName?: string) {
        const MAX_POSTS = 300; // Limit the number of posts

        cachedPosts = posts
            .slice(0, MAX_POSTS)
            .map(post => ({
                id: post.postId,
                date: post.timestamp,
                text: post.text,
                likes: post.likes,
                comments: post.comments,
                shares: post.shares,
                brandName: brandName || post.user?.name || 'Unknown Brand'
            }));
    },

    // Get insights using Gemini
    async getInsights(query: string) {
        if (!cachedAds && !cachedPosts) {
            throw new Error("No data initialized. Please call setAdsData and/or setPostsData first.");
        }

        try {
            const systemPrompt = `${getInsightsPrompt}`;
            

            // Build the content based on available data
            let content = `### 📊 Market Analysis\n\n`;
            
            if (cachedAds) {
                content += `#### 🏷️ Market Ads Summary (${cachedAds.length} ads):\n${JSON.stringify(cachedAds, null, 2)}\n\n`;
            }
            
            if (cachedPosts) {
                content += `#### ✍️ Market Posts Summary (${cachedPosts.length} posts):\n${JSON.stringify(cachedPosts, null, 2)}\n\n`;
            }
            
            content += `### ❓ User's Question:\n${query}`;
            
            // Combine prompts for Gemini
            const fullPrompt = `${systemPrompt}\n\n${content}`;
            
            // Generate content with fallback
            let result;
            try {
                // Initialize the model
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                result = await model.generateContent(fullPrompt);
            } catch (error) {
                try {
                    // Try with lite model if full model fails
                    const liteModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
                    result = await liteModel.generateContent(fullPrompt);
                } catch (error) {
                    // console.error("Error generating content with both models:", error);
                    return "Failed to generate insights. Please try again later.";
                }
            }

            const rawResponse = result.response.text();

            // Format the response for clean readability
            const formattedResponse = formatResponse(rawResponse);

            return formattedResponse;
        } catch (error) {
            // console.error("Error getting Gemini insights:", error);
            throw new Error(error instanceof Error ? error.message : "Failed to get insights from Gemini. Please try again later.");
        }
    },
};

// Helper function to format the response for clean, readable output
function formatResponse(raw: string): string {
    // Split the response into lines
    const lines = raw.split('\n');
    
    // Process each line for consistent spacing and indentation
    const formattedLines = lines.map(line => {
        // Add extra spacing around headers
        if (line.startsWith('##')) {
            return `\n${line}\n`; // Space before and after headers
        }
        // Indent bullet points for clarity
        if (line.trim().startsWith('-')) {
            return `  ${line.trim()}`; // 2-space indent for bullets
        }
        // Ensure non-empty lines have a trailing newline
        return line.length > 0 ? `${line}\n` : line;
    });

    // Join lines and trim excess whitespace
    return formattedLines.join('').trim();
}