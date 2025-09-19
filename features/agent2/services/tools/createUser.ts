import { CustomerManager } from '../../../scheduling/lib/bookings/customer-manager';
import type { Business } from '../../../shared/lib/database/types/business';
import type { Tool } from '../../../shared/lib/database/types/tools';
import { buildToolResponse } from './helpers/response-builder';

/**
 * Create user - uses response builder for consistency
 */
export async function createUser(
  args: {
    first_name: string;
    last_name?: string;
    email?: string;
  },
  business: Business,
  tool: Tool,
  phoneNumber: string
) {
  try {
    // Validate required fields (user input validation)
    if (!args.first_name || args.first_name.trim().length === 0) {
      // User input error - empty name
      return buildToolResponse(tool, null, `First name is required to create your profile.`);
    }

    // Prepare user data for creation
    const userData = {
      name: args.first_name.trim(),
      phone_number: phoneNumber,
      business_id: business.id,
      // Optional fields
      last_name: args.last_name?.trim() || undefined,
      email: args.email?.trim() || undefined
    };

    // Use CustomerManager for core user creation logic
    const customerManager = new CustomerManager();
    const result = await customerManager.createOrFindUser(userData);

    // Map result to match tool template exactly
    const userData_response = {
      user_id: result.user.id
    };

    // Success - use response builder
    return buildToolResponse(tool, userData_response as unknown as Record<string, unknown>);

  } catch (error) {
    // Internal system errors should still throw (database issues, etc.)
    throw error;
  }
}
