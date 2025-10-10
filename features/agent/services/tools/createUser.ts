import { CustomerManager } from '../../../scheduling/lib/bookings/customer-manager';
import type { Session } from '../../sessions/session';
import { buildToolResponse } from '../helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Create user - uses session injection for minimal dependencies
 */
export async function createUser(
  args: {
    first_name: string;
    last_name?: string;
    mobile_number: string;
  },
  session: Session
) {
  const startTime = Date.now();

  try {
    // Add breadcrumb for user creation start
    sentry.addBreadcrumb(`Creating user`, 'tool-create-user', {
      sessionId: session.id,
      businessId: session.businessId,
      firstName: args.first_name,
      hasLastName: !!args.last_name,
      phoneNumber: args.mobile_number
    });
    // Validate required fields (user input validation)
    if (!args.first_name || args.first_name.trim().length === 0) {
      // User input error - empty name
      return buildToolResponse(null, `First name is required to create your profile.`, false);
    }

    if (!args.mobile_number || args.mobile_number.trim().length === 0) {
      // User input error - empty phone
      return buildToolResponse(null, `Mobile number is required to create your profile.`, false);
    }

    // Prepare user data for creation
    const userData = {
      name: args.first_name.trim(),
      phone_number: args.mobile_number.trim(),
      business_id: session.businessEntity.id,
      // Optional fields
      last_name: args.last_name?.trim() || undefined
    };

    // Use CustomerManager for core user creation logic
    const customerManager = new CustomerManager();
    const result = await customerManager.createOrFindUser(userData);

    // Update session with created user
    session.customerEntity = result.user;
    session.customerId = result.user.id;

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
    return buildToolResponse(
      userData_response,
      `Profile created for ${args.first_name}.`,
      true
    );

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
        phoneNumber: args.mobile_number,
        errorName: (error as Error).name
      }
    });

    // Internal system errors should still throw (database issues, etc.)
    throw error;
  }
}
