import type { Session } from '../../../sessions/session';
import { buildToolResponse } from '../../../services/helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';
import { getItemCategory } from '../mwav-catalog';
import type { AddItemsResult } from '../mwav-types';

/**
 * Add confirmed moving items to the session
 *
 * After items are clarified via search_moving_items, this tool stores them
 * with their pickup/dropoff location indices
 */
export async function addMovingItems(
  args: {
    items: Array<{
      item_name: string;
      quantity: number;
      pickup_index: number;
      dropoff_index: number;
      notes?: string;
    }>;
  },
  session: Session
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  try {
    sentry.addBreadcrumb(`Adding moving items`, 'mwav-add-items', {
      sessionId: session.id,
      businessId: session.businessId,
      itemCount: args.items.length
    });

    // Initialize mwavEnquiry if it doesn't exist
    if (!session.mwavEnquiry) {
      session.mwavEnquiry = {
        pickupLocations: [],
        dropoffLocations: [],
        items: []
      };
    }

    // Validate pickup/dropoff indices
    const errors: string[] = [];
    for (const item of args.items) {
      if (item.pickup_index < 0 || item.pickup_index >= session.mwavEnquiry.pickupLocations.length) {
        errors.push(`Invalid pickup_index ${item.pickup_index} for ${item.item_name}`);
      }
      if (item.dropoff_index < 0 || item.dropoff_index >= session.mwavEnquiry.dropoffLocations.length) {
        errors.push(`Invalid dropoff_index ${item.dropoff_index} for ${item.item_name}`);
      }
    }

    if (errors.length > 0) {
      return buildToolResponse(
        { errors },
        `Cannot add items: ${errors.join(', ')}`,
        false
      );
    }

    // Add items with category lookup
    const itemsAdded = args.items.map(item => ({
      item_name: item.item_name,
      quantity: item.quantity,
      category: getItemCategory(item.item_name),
      pickup_index: item.pickup_index,
      dropoff_index: item.dropoff_index,
      notes: item.notes
    }));

    // Append to existing items
    session.mwavEnquiry.items.push(...itemsAdded);

    const duration = Date.now() - startTime;

    sentry.addBreadcrumb(`Items added successfully`, 'mwav-add-items', {
      sessionId: session.id,
      duration,
      itemsAdded: itemsAdded.length,
      totalItems: session.mwavEnquiry.items.length
    });

    const result: AddItemsResult = {
      items_added: itemsAdded,
      total_items: session.mwavEnquiry.items.length,
      message: `Added ${itemsAdded.length} item${itemsAdded.length > 1 ? 's' : ''}. Total: ${session.mwavEnquiry.items.length} items.`
    };

    return buildToolResponse(
      result as unknown as Record<string, unknown>,
      result.message,
      true
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'mwav_add_moving_items',
      metadata: {
        duration,
        itemCount: args.items.length
      }
    });

    throw error;
  }
}
