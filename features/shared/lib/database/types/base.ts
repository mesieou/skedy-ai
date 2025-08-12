// Database entity base types and query options

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

// QueryOptions = "HOW to return it" (SELECT, LIMIT, ORDER BY)
export interface QueryOptions {
  select?: string;    // Which columns to return
  limit?: number;     // Max number of records
  offset?: number;    // Skip N records (pagination)
  orderBy?: string;   // Sort by column
  ascending?: boolean; // Sort direction
}

// QueryConditions = "WHAT to find" (WHERE clause)
export type QueryConditions = Record<string, unknown>;

// Pagination types
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
