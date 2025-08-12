import type { CreateCrawlSessionData } from '../../types/crawl-sessions';

// Test crawl session data for seeding
export const defaultCrawlSessionData: CreateCrawlSessionData = {
  ended_at: null,
  total_pages: 25,
  successful_pages: 23,
  failed_pages: 2,
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  categories: {
    "services": ["removals", "packing", "storage"],
    "locations": ["Melbourne", "Sydney", "Brisbane"]
  },
  missing_information: "Contact phone number and opening hours"
};
