// src/types/creative.ts

// Structure for the nested Topic Ideas
export interface TopicIdeas {
    productBenefits?: string[]; // List of product benefit points (Thai)
    painPointsEmotional?: string[]; // List of pain points / emotional angles (Thai)
    promotionPricing?: string[]; // List of promotion / pricing ideas (Thai)
}

// Structure for a single generated Creative Concept / Content Pillar
export interface CreativeConcept {
    focusTarget: string; // e.g., "Competitor Brands", "New Users" (Thai, or keep English? TBD)
    keyMessage: string; // The main message/angle (Thai)
    topicIdeas: TopicIdeas; // Nested topic ideas
}

// Structure for data passed to the creative generation page
// (Assuming CustomerJourneyStructured is imported or defined elsewhere)
import { CustomerJourneyStructured } from '../components/recommendation-cards'; // Corrected relative path

export interface SelectedRecommendationForCreative {
    title: string;
    concept?: string; // Made optional as it might not always be present depending on source
    description: string;
    tempId?: string; // Crucial for linking back
    customerJourney: CustomerJourneyStructured | null; // Include the journey
    // Include other fields from original Recommendation if needed for prompts
    content_pillar?: string;
    product_focus?: string;
    // ... potentially others
} 