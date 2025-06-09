// Default funnel stages
export const appFunnelStages = [
  "Awareness",
  "Interest",
  "Consideration",
  "Intent",
  "Evaluation",
  "Conversion",
  "Retention",
  "Advocacy"
];

const defaultEcommerceFunnelStages = [
  "Cold",
  "Engaged",
  "Clicked Ad",
  "Added to Cart",
  "Initiated Checkout",
  "Purchased",
  "Repeat Buyers",
]

// We'll use these variables to store custom stages
let customAppFunnelStages = [...appFunnelStages]
let customEcommerceFunnelStages = [...defaultEcommerceFunnelStages]

// Getter functions
export const ecommerceFunnelStages = customEcommerceFunnelStages

// Function to update funnel stages
export function setFunnelStages(funnelType: "app" | "ecommerce", stages: string[]) {
  if (funnelType === "app") {
    customAppFunnelStages = stages
  } else {
    customEcommerceFunnelStages = stages
  }
}

// Function to reset to default stages
export function resetFunnelStages(funnelType: "app" | "ecommerce") {
  if (funnelType === "app") {
    customAppFunnelStages = [...appFunnelStages]
  } else {
    customEcommerceFunnelStages = [...defaultEcommerceFunnelStages]
  }
}

// Export default stages for reference
export const defaultAppStages = appFunnelStages;
export const defaultEcommerceStages = defaultEcommerceFunnelStages;
