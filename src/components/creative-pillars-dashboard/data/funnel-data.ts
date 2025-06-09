import { appFunnelStages, ecommerceFunnelStages } from "./funnel-stages"
import { fetchCreatives, Creative } from "./creative-data"

// Helper function to find a creative by ID using async Supabase fetch
export async function findCreativeById(id: string): Promise<Creative | null> {
  const creatives = await fetchCreatives();
  return creatives.find((creative) => creative.id === id) || null;
}

// Create funnel data with full creative objects
export const appFunnelData = [
  {
    id: "app-cold",
    name: "Cold",
    coverageRating: "High",
    creatives: [findCreativeById("creative-1"), findCreativeById("creative-2"), findCreativeById("creative-3")],
    advantagePlusCreatives: [findCreativeById("adv-creative-1")],
    topCtr: 3.1,
    lastRefresh: "2 days ago",
  },
  {
    id: "app-engaged",
    name: "Engaged",
    coverageRating: "Medium",
    creatives: [findCreativeById("creative-4"), findCreativeById("creative-5")],
    advantagePlusCreatives: [findCreativeById("adv-creative-1")],
    topCtr: 4.2,
    lastRefresh: "5 days ago",
  },
  {
    id: "app-clicked",
    name: "Clicked Ad",
    coverageRating: "Medium",
    creatives: [findCreativeById("creative-6")],
    advantagePlusCreatives: [findCreativeById("adv-creative-1"), findCreativeById("adv-creative-2")],
    topCtr: 5.1,
    lastRefresh: "1 week ago",
  },
  {
    id: "app-downloaded",
    name: "Downloaded App",
    coverageRating: "Low",
    creatives: [findCreativeById("creative-7")],
    advantagePlusCreatives: [findCreativeById("adv-creative-2")],
    topCtr: 6.3,
    lastRefresh: "2 weeks ago",
  },
  {
    id: "app-registered",
    name: "Registered",
    coverageRating: "Low",
    creatives: [findCreativeById("creative-8")],
    advantagePlusCreatives: [],
    topCtr: 7.2,
    lastRefresh: "3 weeks ago",
  },
  {
    id: "app-kyc",
    name: "Completed KYC",
    coverageRating: "Low",
    creatives: [],
    advantagePlusCreatives: [],
    topCtr: 0,
    lastRefresh: "Never",
  },
  {
    id: "app-transacted",
    name: "Transacted",
    coverageRating: "Medium",
    creatives: [findCreativeById("creative-9")],
    advantagePlusCreatives: [],
    topCtr: 8.5,
    lastRefresh: "1 month ago",
  },
]

export const ecommerceFunnelData = [
  {
    id: "ecom-cold",
    name: "Cold",
    coverageRating: "High",
    creatives: [findCreativeById("creative-10"), findCreativeById("creative-11"), findCreativeById("creative-12")],
    advantagePlusCreatives: [findCreativeById("adv-creative-3")],
    topCtr: 3.2,
    lastRefresh: "3 days ago",
  },
  {
    id: "ecom-engaged",
    name: "Engaged",
    coverageRating: "Medium",
    creatives: [findCreativeById("creative-13"), findCreativeById("creative-14")],
    advantagePlusCreatives: [findCreativeById("adv-creative-3")],
    topCtr: 4.1,
    lastRefresh: "6 days ago",
  },
  {
    id: "ecom-clicked",
    name: "Clicked Ad",
    coverageRating: "Medium",
    creatives: [findCreativeById("creative-15")],
    advantagePlusCreatives: [findCreativeById("adv-creative-3"), findCreativeById("adv-creative-4")],
    topCtr: 4.7,
    lastRefresh: "1 week ago",
  },
  {
    id: "ecom-cart",
    name: "Added to Cart",
    coverageRating: "Low",
    creatives: [findCreativeById("creative-16")],
    advantagePlusCreatives: [findCreativeById("adv-creative-4")],
    topCtr: 5.8,
    lastRefresh: "10 days ago",
  },
  {
    id: "ecom-checkout",
    name: "Initiated Checkout",
    coverageRating: "Low",
    creatives: [],
    advantagePlusCreatives: [findCreativeById("adv-creative-4")],
    topCtr: 0,
    lastRefresh: "Never",
  },
  {
    id: "ecom-purchased",
    name: "Purchased",
    coverageRating: "Medium",
    creatives: [findCreativeById("creative-17")],
    advantagePlusCreatives: [],
    topCtr: 6.2,
    lastRefresh: "2 weeks ago",
  },
  {
    id: "ecom-repeat",
    name: "Repeat Buyers",
    coverageRating: "High",
    creatives: [findCreativeById("creative-18"), findCreativeById("creative-19")],
    advantagePlusCreatives: [],
    topCtr: 8.1,
    lastRefresh: "1 week ago",
  },
]

// Function to update funnel data based on new stages
export function updateFunnelData(funnelType: "app" | "ecommerce", stages: string[]) {
  const originalData = funnelType === "app" ? appFunnelData : ecommerceFunnelData
  const currentStages = funnelType === "app" ? appFunnelStages : ecommerceFunnelStages

  // Create a map of existing segments
  const existingSegments = new Map()
  originalData.forEach((segment) => {
    existingSegments.set(segment.name, segment)
  })

  // Create new funnel data based on stages
  return stages.map((stageName) => {
    // If we have existing data for this stage, use it
    if (existingSegments.has(stageName)) {
      return existingSegments.get(stageName)
    }

    // Otherwise create a new empty segment
    return {
      id: `${funnelType}-${stageName.toLowerCase().replace(/\s+/g, "-")}`,
      name: stageName,
      coverageRating: "Low",
      creatives: [],
      advantagePlusCreatives: [],
      topCtr: 0,
      lastRefresh: "Never",
    }
  })
}
