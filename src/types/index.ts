export interface Competitor {
  id: number;
  name: string;
  logo: string;
  color: string;
  url: string;
}

export interface ApifyAd {
  id: string;
  collationId: string;
  image: string;
  headline: string;
  description: string;
  datePosted: string;
  status: string;
  isNew: boolean;
  mediaUrls: string[];
  insights?: {
    kols?: boolean;
    kolName?: string;
    products?: string[];
    creativePillars?: string[];
  };
  summary?: string;
  platform?: string;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
  };
}

// Commented out for future use
/*
export interface OrganicPost {
  id: number;
  date: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  engagementScore: number;
}
*/ 