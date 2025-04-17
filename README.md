# Competitor Ad Intelligence Dashboard

A dashboard for monitoring and analyzing competitor ads and organic content on social media platforms.

## Features

- Track multiple competitors' ads and organic content
- View active ads and new ads from the past week
- Analyze creative approaches, KOLs, and engagement metrics
- Chat with an AI assistant for insights about competitor data
- Add, edit, and remove competitors

## Apify Integration Setup

This dashboard integrates with Apify to fetch real competitor ad data. Follow these steps to set it up:

### 1. Create an Apify Account

If you don't already have one, sign up for an account at [Apify](https://apify.com/).

### 2. Set Up an Apify Actor

You'll need an actor that scrapes Facebook ads. You can:
- Use an existing actor from the Apify store like "Facebook Ads Scraper"
- Create your own custom actor

### 3. Run the Actor

Run the actor to collect ad data for your competitors. Make sure the output dataset includes the following fields:
- id
- image
- headline
- description
- platform
- datePosted
- status
- isNew
- engagement
- summary
- insights (with nested fields: kols, kolName, creativePillars, products, targetAudience, placement)
- url (the Facebook URL of the competitor)

### 4. Get Your API Key and Dataset ID

1. Go to your Apify account settings to find your API key
2. Note the Dataset ID from your actor run

### 5. Configure Environment Variables

Create or update the `.env.local` file in the root of your project with:

```
NEXT_PUBLIC_APIFY_API_KEY=your_apify_api_key_here
NEXT_PUBLIC_APIFY_DATASET_ID=your_dataset_id_here
```

### 6. Restart the Application

Restart your development server to apply the changes.

## Development

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   # or
   yarn
   ```
3. Start the development server:
   ```
   npm run dev
   # or
   yarn dev
   ```

## Customization

### Adding More Competitors

Use the "Add Competitor" button in the dashboard to add new competitors. You'll need:
- Competitor name
- Facebook URL (can be full URL or just the username)

### Modifying the Analysis

To customize the analysis prompts, edit the files in the `lib/analysis-prompts.ts` file.

## Troubleshooting

### No Ads Showing

If no ads are displayed:
1. Check that your Apify API key and Dataset ID are correct
2. Verify that your dataset contains ads with the expected format
3. Check the browser console for any error messages
4. Ensure the competitor URLs in the dashboard match those in your Apify dataset

### API Rate Limits

Be aware of Apify's API rate limits. If you're making too many requests, you might need to implement caching or reduce the frequency of updates.

## Screenshots

(Screenshots would be included here in a real README)

---

This dashboard mockup was created as a UI/UX design concept for tracking competitor Facebook ads. In a production environment, it would be connected to real data sources and analytics. # AI-Competitors
# AI-Competitors
# AI-Competitors
