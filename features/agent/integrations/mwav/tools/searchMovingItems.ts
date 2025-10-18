import type { Session } from '../../../sessions/session';
import { buildToolResponse } from '../../../services/helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';
import { getFlattenedCatalog } from '../mwav-catalog';
import type { SearchItemsResult } from '../mwav-types';
import Fuse from 'fuse.js';

/**
 * Search MWAV item catalog using fuzzy matching
 *
 * Takes customer's casual description and returns:
 * - Exact matches (high confidence)
 * - Ambiguous matches (needs clarification)
 * - Not found items
 */
export async function searchMovingItems(
  args: {
    items_description: string;
  },
  session: Session
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  try {
    sentry.addBreadcrumb(`Searching moving items`, 'mwav-search', {
      sessionId: session.id,
      businessId: session.businessId,
      description: args.items_description
    });

    // Get flattened catalog for searching
    const catalogItems = getFlattenedCatalog();

    // Configure Fuse.js for fuzzy searching
    const fuse = new Fuse(catalogItems, {
      keys: ['item_name'],
      threshold: 0.4,  // 0 = exact match, 1 = match anything
      includeScore: true,
      minMatchCharLength: 3
    });

    // Parse the description into individual search terms
    // Simple split by common separators: comma, "and", semicolon
    const searchTerms = args.items_description
      .toLowerCase()
      .split(/,|;|\band\b/)
      .map(term => term.trim())
      .filter(term => term.length > 2);

    const exactMatches: Array<{ item_name: string; category: string }> = [];
    const ambiguousItems: Array<{ search_term: string; possible_matches: string[] }> = [];
    const notFound: string[] = [];

    // Search for each term
    for (const term of searchTerms) {
      const results = fuse.search(term);

      if (results.length === 0) {
        notFound.push(term);
      } else if (results.length === 1 || (results[0].score && results[0].score < 0.2)) {
        // High confidence match (single result or very low score = good match)
        exactMatches.push({
          item_name: results[0].item.item_name,
          category: results[0].item.category
        });
      } else {
        // Multiple matches - needs clarification
        ambiguousItems.push({
          search_term: term,
          possible_matches: results.slice(0, 5).map(r => r.item.item_name)
        });
      }
    }

    const duration = Date.now() - startTime;

    sentry.addBreadcrumb(`Item search completed`, 'mwav-search', {
      sessionId: session.id,
      duration,
      searchTerms: searchTerms.length,
      exactMatches: exactMatches.length,
      ambiguous: ambiguousItems.length,
      notFound: notFound.length
    });

    const result: SearchItemsResult = {
      exact_matches: exactMatches,
      ambiguous_items: ambiguousItems,
      not_found: notFound
    };

    // Build informative message
    let message = '';
    if (exactMatches.length > 0) {
      message += `Found ${exactMatches.length} exact match${exactMatches.length > 1 ? 'es' : ''}. `;
    }
    if (ambiguousItems.length > 0) {
      message += `${ambiguousItems.length} item${ambiguousItems.length > 1 ? 's need' : ' needs'} clarification. `;
    }
    if (notFound.length > 0) {
      message += `${notFound.length} item${notFound.length > 1 ? 's' : ''} not found in catalog.`;
    }

    return buildToolResponse(result as unknown as Record<string, unknown>, message.trim(), true);

  } catch (error) {
    const duration = Date.now() - startTime;

    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'mwav_search_moving_items',
      metadata: {
        duration,
        description: args.items_description
      }
    });

    throw error;
  }
}
