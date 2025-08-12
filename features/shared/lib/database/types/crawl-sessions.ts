import { BaseEntity } from "./base";

export interface CrawlSession extends BaseEntity {
  ended_at?: string | null;
  total_pages: number;
  successful_pages: number;
  failed_pages: number;
  business_id: string;
  categories?: Record<string, unknown> | null;
  missing_information?: string | null;
}

export type CreateCrawlSessionData = Omit<CrawlSession, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCrawlSessionData = Partial<Omit<CrawlSession, 'id' | 'created_at'>>;
