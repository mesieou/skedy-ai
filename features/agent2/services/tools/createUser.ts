import { CustomerManager } from '../../../scheduling/lib/bookings/customer-manager';
import type { Session } from '../../sessions/session';
import type { Tool } from '../../../shared/lib/database/types/tools';
import { buildToolResponse } from '../helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Create user - uses session injection for minimal dependencies
 */
export async function createUser(
  args: {
    first_name: string;
    last_name?: string;
    email?: string;
  },
  session: Session,
  tool: Tool
) {
  const startTime = Date.now();

  try {
    // Add breadcrumb for user creation start
    sentry.addBreadcrumb(`Creating user`, 'tool-create-user', {
      sessionId: session.id,
      businessId: session.businessId,
      firstName: args.first_name,
      hasLastName: !!args.last_name,
      hasEmail: !!args.email,
      phoneNumber: session.customerPhoneNumber
    });
    // Validate required fields (user input validation)
    if (!args.first_name || args.first_name.trim().length === 0) {
      // User input error - empty name
      return buildToolResponse(tool, null, `First name is required to create your profile.`);
    }

    // Prepare user data for creation
    const userData = {
      name: args.first_name.trim(),
      phone_number: session.customerPhoneNumber,
      business_id: session.businessEntity.id,
      // Optional fields
      last_name: args.last_name?.trim() || undefined,
      email: args.email?.trim() || undefined
    };

    // Use CustomerManager for core user creation logic
    const customerManager = new CustomerManager();
    const result = await customerManager.createOrFindUser(userData);

    // Update session with created user
    session.customerEntity = result.user;
    session.customerId = result.user.id;
    session.conversationState = 'booking';

    // Map result to match tool template exactly
    const userData_response = {
      user_id: result.user.id
    };

    const duration = Date.now() - startTime;

    // Success breadcrumb
    sentry.addBreadcrumb(`User created successfully`, 'tool-create-user', {
      sessionId: session.id,
      businessId: session.businessId,
      userId: result.user.id,
      duration: duration,
      wasExistingUser: result.isExisting
    });

    // Success - use response builder
    return buildToolResponse(tool, userData_response as unknown as Record<string, unknown>);

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track user creation error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_create_user',
      metadata: {
        duration: duration,
        firstName: args.first_name,
        hasLastName: !!args.last_name,
        hasEmail: !!args.email,
        phoneNumber: session.customerPhoneNumber,
        errorName: (error as Error).name
      }
    });

    // Internal system errors should still throw (database issues, etc.)
    throw error;
  }
}
