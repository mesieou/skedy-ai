"use server";

import { BookingsRepository } from "@/features/shared/lib/database/repositories/bookings-respository";
import { BookingServiceRepository } from "@/features/shared/lib/database/repositories/booking-service-repository";
import { ServiceRepository } from "@/features/shared/lib/database/repositories/service-repository";
import { UserRepository } from "@/features/shared/lib/database/repositories/user-repository";
import { AddressRepository } from "@/features/shared/lib/database/repositories/address-repository";
import type { Booking, BookingStatus } from "@/features/shared/lib/database/types/bookings";
import type { Service } from "@/features/shared/lib/database/types/service";
import type { CreateAddressData, AddressType, AddressInput, Address } from "@/features/shared/lib/database/types/addresses";
import { UserRole } from "@/features/shared/lib/database/types/user";
import { ChatMessage, ChatSession } from "@/features/shared/lib/database/types";
import { ChatSessionRepository } from "@/features/shared/lib/database/repositories/chat-session-repository";
import { InteractionsRepository } from "@/features/shared/lib/database/repositories/interactions-repository";
import { BusinessRepository } from "@/features/shared/lib/database/repositories/business-repository";
import type { Interaction } from "@/features/shared/lib/database/types/interactions";

export interface BookingWithServices extends Booking {
  services: Service[];
  addresses: Address[];
}

// TypeScript assertion helper
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    console.error(message);
    throw new Error(message);
  }
}

export async function getBusinessTimezoneByUserId(userId: string): Promise<string> {
  try {
    console.log(`📊 [Dashboard] Fetching business timezone for user: ${userId}`);

    // Get user record to extract business_id
    const userRepo = new UserRepository();
    const user = await userRepo.findOne({ id: userId });
    assert(user, `User not found: ${userId}`);

    assert(user.business_id, `User has no business: ${userId}`);

    // Get business record to extract timezone
    const businessRepo = new BusinessRepository();
    const business = await businessRepo.findOne({ id: user.business_id });
    assert(business, `Business not found: ${user.business_id}`);
    assert(business.time_zone, `Business has no timezone: ${user.business_id}`);

    console.log(`📊 [Dashboard] Business timezone for user ${userId}: ${business.time_zone}`);
    return business.time_zone;
  } catch (error) {
    console.error("Failed to fetch business timezone:", error);
    throw error;
  }
}

export async function getBusinessBookingsByUserId(userId: string): Promise<BookingWithServices[]> {
  try {
    console.log(`📊 [Dashboard] Fetching bookings for user: ${userId}`);

    // Get user record to extract verified business_id (security: can't trust client params)
    const userRepo = new UserRepository();
    const user = await userRepo.findOne({ id: userId });
    assert(user, `User not found: ${userId}`);
    assert(user.business_id, `User has no business: ${userId}`);

    console.log(`📊 [Dashboard] User found: ${user.first_name} - Business ID: ${user.business_id}`);

    const bookingsRepo = new BookingsRepository();
    const bookingServiceRepo = new BookingServiceRepository();
    const serviceRepo = new ServiceRepository();
    const addressRepo = new AddressRepository();

    // Get all bookings for the business
    const bookings = await bookingsRepo.findAll(
      { orderBy: 'start_at', ascending: false },
      { business_id: user.business_id }
    );

    console.log(`📊 [Dashboard] Found ${bookings.length} bookings for business ${user.business_id}`);

    // For each booking, get its services and addresses
    const bookingsWithServices = await Promise.all(
      bookings.map(async (booking, index) => {
        console.log(`📊 [Dashboard] Processing booking ${index + 1}/${bookings.length}: ${booking.id} (${booking.status})`);

        // Get booking services (junction table)
        const bookingServices = await bookingServiceRepo.findAll(
          {},
          { booking_id: booking.id }
        );
        console.log(`📊 [Dashboard] Found ${bookingServices.length} services for booking ${booking.id}`);

        // Get the actual service details
        const services = await Promise.all(
          bookingServices.map(async (bs) => {
            return await serviceRepo.findOne({ id: bs.service_id });
          })
        );

        const validServices = services.filter((s): s is Service => s !== null);
        console.log(`📊 [Dashboard] Booking ${booking.id} has ${validServices.length} valid services`);

        // Get addresses for this booking through the services
        // Addresses are linked to services, not directly to bookings
        let addresses: Address[] = [];
        if (validServices.length > 0) {
          // Query addresses for each service individually since base repository doesn't support array values
          const addressPromises = validServices.map(service =>
            addressRepo.findAll({}, { service_id: service.id })
          );
          const addressArrays = await Promise.all(addressPromises);
          addresses = addressArrays.flat();
        }
        console.log(`📊 [Dashboard] Found ${addresses.length} addresses for booking ${booking.id}`);

        return {
          ...booking,
          services: validServices,
          addresses: addresses,
        };
      })
    );

    console.log(`📊 [Dashboard] Returning ${bookingsWithServices.length} bookings with services for business ${user.business_id}`);
    return bookingsWithServices;
  } catch (error) {
    console.error("Failed to fetch business bookings:", error);
    throw error;
  }
}

export interface SessionWithMessages extends ChatSession {
    messageCount: number;
    lastMessage?: ChatMessage;
}

export interface SessionWithInteractions extends ChatSession {
  interactions: Interaction[];
}

export async function getBusinessSessionsByUserId(userId: string): Promise<SessionWithInteractions[]> {
    try {
        console.log(`📊 [Dashboard] Fetching sessions for user: ${userId}`);

        // Get user record to extract verified business_id (security: can't trust client params)
        const userRepo = new UserRepository();
        const user = await userRepo.findOne({ id: userId });
        assert(user, `User not found: ${userId}`);
        assert(user.business_id, `User has no business: ${userId}`);

        console.log(`📊 [Dashboard] User found: ${user.first_name} - Business ID: ${user.business_id}`);

        const chatSessionRepo = new ChatSessionRepository();
        const interactionsRepo = new InteractionsRepository();

        // Get all sessions for the business, ordered by most recent
        const sessions = await chatSessionRepo.findAll(
            { orderBy: 'created_at', ascending: false },
            { business_id: user.business_id }
        );

        console.log(`📊 [Dashboard] Found ${sessions.length} sessions for business ${user.business_id}`);

        // For each session, get its interactions
        const sessionsWithInteractions = await Promise.all(
            sessions.map(async (session) => {
                const interactions = await interactionsRepo.findAll(
                    { orderBy: 'created_at', ascending: true },
                    { session_id: session.id }
                );

                return {
                    ...session,
                    interactions,
                };
            })
        );

        console.log(`📊 [Dashboard] Returning ${sessionsWithInteractions.length} sessions with interactions for business ${user.business_id}`);
        return sessionsWithInteractions;
    } catch (error) {
        console.error("Failed to fetch business sessions:", error);
        throw error;
    }
}

export async function updateInteractionFeedback(
    interactionId: string,
    isPositive: boolean,
    comment?: string
): Promise<void> {
    try {
        const interactionsRepo = new InteractionsRepository();

        await interactionsRepo.updateOne(
            { id: interactionId },
            {
                human_outcome: isPositive,
                human_critique: comment || null,
            }
        );
    } catch (error) {
        console.error("Failed to update interaction feedback:", error);
        throw new Error("Failed to update feedback");
    }
}

export async function createNewCustomer(data: {
  currentUserId: string;
  firstName: string;
  lastName?: string;
  email: string;
  phoneNumber: string;
}): Promise<{ id: string; name: string }> {
  try {
    console.log(`📊 [Dashboard] Creating new customer for user: ${data.currentUserId}`);

    // Get current user record to extract verified business_id (security: can't trust client params)
    const userRepo = new UserRepository();
    const currentUser = await userRepo.findOne({ id: data.currentUserId });
    assert(currentUser?.business_id, `📊 [Dashboard] User not found or has no business: ${data.currentUserId}`);

    // Create auth user data
    const authUserData = {
      email: data.email,
      password: undefined, // Will use default password
      email_confirm: false,
      is_sso_user: false,
      app_metadata: {
        source: 'dashboard',
        business_id: currentUser.business_id
      },
      user_metadata: {
        created_via: 'dashboard',
        created_by: data.currentUserId
      }
    };

    // Create user data
    const userData = {
      role: UserRole.CUSTOMER,
      first_name: data.firstName.trim(),
      last_name: data.lastName?.trim() || null,
      business_id: currentUser.business_id,
      phone_number: data.phoneNumber.trim(),
      email: data.email.trim()
    };

    const newCustomer = await userRepo.createWithAuth(userData, authUserData);
    console.log(`📊 [Dashboard] Created new customer: ${newCustomer.id}`);

    return {
      id: newCustomer.id,
      name: `${newCustomer.first_name}${newCustomer.last_name ? ' ' + newCustomer.last_name : ''}`
    };
  } catch (error) {
    console.error("Failed to create new customer:", error);
    throw new Error("Failed to create new customer");
  }
}

export async function getBusinessServices(userId: string): Promise<{ id: string; name: string }[]> {
  try {
    console.log(`📊 [Dashboard] Fetching services for user: ${userId}`);

    // Get user record to extract verified business_id (security: can't trust client params)
    const userRepo = new UserRepository();
    const user = await userRepo.findOne({ id: userId });
    assert(user?.business_id, `📊 [Dashboard] User not found or has no business: ${userId}`);

    // Get all services for this business
    const serviceRepo = new ServiceRepository();
    const services = await serviceRepo.findAll(
      { orderBy: 'name', ascending: true },
      { business_id: user.business_id }
    );

    console.log(`📊 [Dashboard] Found ${services.length} services for business ${user.business_id}`);

    return services.map(service => ({
      id: service.id,
      name: service.name
    }));
  } catch (error) {
    console.error("Failed to fetch business services:", error);
    throw new Error("Failed to fetch services");
  }
}

export async function getServiceDetails(userId: string, serviceId: string): Promise<Service> {
  try {
    console.log(`📊 [Dashboard] Fetching service details: ${serviceId} for user: ${userId}`);

    // Get user record to extract verified business_id (security: can't trust client params)
    const userRepo = new UserRepository();
    const user = await userRepo.findOne({ id: userId });
    assert(user?.business_id, `📊 [Dashboard] User not found or has no business: ${userId}`);

    // Get service details
    const serviceRepo = new ServiceRepository();
    const service = await serviceRepo.findOne({ id: serviceId });
    assert(service, `📊 [Dashboard] Service not found: ${serviceId}`);

    // Verify service belongs to user's business (security: prevent cross-business access)
    assert(service.business_id === user.business_id, `📊 [Dashboard] Service ${serviceId} does not belong to business ${user.business_id}`);

    console.log(`📊 [Dashboard] Found service: ${service.name} (location_type: ${service.location_type})`);
    return service;
  } catch (error) {
    console.error("Failed to fetch service details:", error);
    throw new Error("Failed to fetch service details");
  }
}

export async function getBusinessCustomers(userId: string): Promise<{ id: string; name: string; email: string | null; phone: string | null }[]> {
  try {
    console.log(`📊 [Dashboard] Fetching customers for user: ${userId}`);

    // Get user record to extract verified business_id (security: can't trust client params)
    const userRepo = new UserRepository();
    const user = await userRepo.findOne({ id: userId });
    assert(user?.business_id, `📊 [Dashboard] User not found or has no business: ${userId}`);

    // Get all customers for this business
    const customers = await userRepo.findAll(
      { orderBy: 'first_name', ascending: true },
      { business_id: user.business_id, role: 'customer' }
    );

    console.log(`📊 [Dashboard] Found ${customers.length} customers for business ${user.business_id}`);

    return customers.map(customer => ({
      id: customer.id,
      name: `${customer.first_name}${customer.last_name ? ' ' + customer.last_name : ''}`,
      email: customer.email ?? null,
      phone: customer.phone_number ?? null
    }));
  } catch (error) {
    console.error("Failed to fetch business customers:", error);
    throw new Error("Failed to fetch customers");
  }
}

/**
 * Dashboard booking address input - combines service/type metadata with address data
 */
export type DashboardBookingAddressInput = {
  service_id: string;
  type: AddressType;
} & AddressInput;

export async function createSimpleBooking(data: {
  userId: string;
  customerId: string; // The customer this booking is for
  serviceId: string; // The service being booked
  serviceName: string; // Service name for breakdown
  startAt: string; // UTC ISO string
  endAt: string; // UTC ISO string
  status: string;
  totalEstimateAmount: number;
  totalEstimateTimeInMinutes: number;
  depositAmount: number;
  depositPaid: boolean;
  addresses?: DashboardBookingAddressInput[]; // Optional addresses for mobile services
}): Promise<Booking> {
  try {
    console.log(`📊 [Dashboard] Creating booking for customer: ${data.customerId}`);

    // Get user record to extract verified business_id (security: can't trust client params)
    const userRepo = new UserRepository();
    const user = await userRepo.findOne({ id: data.userId });
    assert(user?.business_id, `📊 [Dashboard] User not found or has no business: ${data.userId}`);

    // Get business details for availability updates
    const { BusinessRepository } = await import("@/features/shared/lib/database/repositories/business-repository");
    const businessRepo = new BusinessRepository();
    const business = await businessRepo.findOne({ id: user.business_id });

    const bookingsRepo = new BookingsRepository();

    // Map addresses to CreateAddressData (IDs and timestamps will be generated by Supabase)
    const bookingAddresses: CreateAddressData[] | undefined = data.addresses?.map(addr => ({
      service_id: addr.service_id,
      type: addr.type,
      address_line_1: addr.address_line_1,
      address_line_2: addr.address_line_2 || null,
      city: addr.city,
      postcode: addr.postcode,
      state: addr.state || null,
      country: addr.country
    }));

    // Use new createBookingManual method
    // Note: remaining_balance is calculated server-side in createBookingManual
    const booking = await bookingsRepo.createBookingManual({
      user_id: data.customerId,
      business_id: user.business_id,
      start_at: data.startAt,
      end_at: data.endAt,
      status: data.status as BookingStatus,
      total_estimate_amount: data.totalEstimateAmount,
      total_estimate_time_in_minutes: data.totalEstimateTimeInMinutes,
      deposit_amount: data.depositAmount,
      deposit_paid: data.depositPaid,
      services: [{
        service_id: data.serviceId,
        service_name: data.serviceName
      }],
      addresses: bookingAddresses,
      business: business!
    });

    console.log(`📊 [Dashboard] Created booking: ${booking.id} with service: ${data.serviceId}`);
    return booking;
  } catch (error) {
    console.error("Failed to create booking:", error);
    throw new Error("Failed to create booking");
  }
}

export async function updateBooking(data: {
  bookingId: string;
  serviceId?: string;
  serviceName?: string;
  startAt?: string;
  endAt?: string;
  status?: string;
  totalEstimateAmount?: number;
  totalEstimateTimeInMinutes?: number;
  depositAmount?: number;
  depositPaid?: boolean;
  addresses?: DashboardBookingAddressInput[];
}): Promise<Booking> {
  try {
    console.log(`📊 [Dashboard] Updating booking: ${data.bookingId}`);

    const bookingsRepo = new BookingsRepository();
    const bookingServiceRepo = new BookingServiceRepository();

    // Get existing booking
    const existingBooking = await bookingsRepo.findOne({ id: data.bookingId });
    assert(existingBooking, "Booking not found");

    // Prepare update data
    const updateData: Partial<Booking> = {};

    if (data.startAt) updateData.start_at = data.startAt;
    if (data.endAt) updateData.end_at = data.endAt;
    if (data.status) updateData.status = data.status as BookingStatus;
    if (data.totalEstimateAmount !== undefined) updateData.total_estimate_amount = data.totalEstimateAmount;
    if (data.totalEstimateTimeInMinutes !== undefined) updateData.total_estimate_time_in_minutes = data.totalEstimateTimeInMinutes;
    if (data.depositAmount !== undefined) updateData.deposit_amount = data.depositAmount;
    if (data.depositPaid !== undefined) updateData.deposit_paid = data.depositPaid;

    // Calculate remaining balance if amounts or payment status changed
    if (data.totalEstimateAmount !== undefined || data.depositAmount !== undefined || data.depositPaid !== undefined) {
      const totalAmount = data.totalEstimateAmount ?? existingBooking.total_estimate_amount;
      const depositAmount = data.depositAmount ?? existingBooking.deposit_amount;
      const depositPaidStatus = data.depositPaid ?? existingBooking.deposit_paid;
      updateData.remaining_balance = depositPaidStatus ? totalAmount - depositAmount : totalAmount;
    }

    // Update booking_service if service changed
    if (data.serviceId) {
      // Get existing service relationship from booking_services junction table
      const existingBookingServices = await bookingServiceRepo.findAll(
        {},
        { booking_id: data.bookingId }
      );
      const oldServiceId = existingBookingServices[0]?.service_id;

      if (oldServiceId && data.serviceId !== oldServiceId) {
        // Service changed: delete old and create new
        await bookingServiceRepo.deleteOne({ booking_id: data.bookingId });
        await bookingServiceRepo.create({
          booking_id: data.bookingId,
          service_id: data.serviceId
        });
      } else if (!oldServiceId) {
        // No existing service relationship (should not happen in normal flow, but handle it)
        await bookingServiceRepo.create({
          booking_id: data.bookingId,
          service_id: data.serviceId
        });
      }
      // If oldServiceId === data.serviceId, no change needed
    }

    // Update addresses if provided
    if (data.addresses !== undefined) {
      const addressRepo = new AddressRepository();

      // Get current service ID (either from update or existing)
      let currentServiceId = data.serviceId;
      if (!currentServiceId) {
        const existingBookingServices = await bookingServiceRepo.findAll(
          {},
          { booking_id: data.bookingId }
        );
        currentServiceId = existingBookingServices[0]?.service_id;
      }

      if (currentServiceId) {
        // Delete existing addresses for this service
        const existingAddresses = await addressRepo.findAll(
          {},
          { service_id: currentServiceId }
        );

        for (const address of existingAddresses) {
          await addressRepo.deleteOne({ id: address.id });
        }

        // Create new addresses
        for (const addr of data.addresses) {
          await addressRepo.create({
            service_id: addr.service_id,
            type: addr.type,
            address_line_1: addr.address_line_1,
            address_line_2: addr.address_line_2 || null,
            city: addr.city,
            postcode: addr.postcode,
            state: addr.state || null,
            country: addr.country
          });
        }
      }
    }

    // Note: We don't update price_breakdown for manual bookings
    // Manual bookings have price_breakdown = null (no calculations)

    const updatedBooking = await bookingsRepo.updateOne({ id: data.bookingId }, updateData);
    console.log(`📊 [Dashboard] Updated booking: ${data.bookingId}`);
    return updatedBooking;
  } catch (error) {
    console.error("Failed to update booking:", error);
    throw new Error("Failed to update booking");
  }
}

export async function deleteBooking(bookingId: string): Promise<void> {
  try {
    console.log(`📊 [Dashboard] Deleting booking: ${bookingId}`);

    const bookingsRepo = new BookingsRepository();
    const bookingServiceRepo = new BookingServiceRepository();

    // Delete booking_service relationships first
    await bookingServiceRepo.deleteOne({ booking_id: bookingId });

    // Delete booking
    await bookingsRepo.deleteOne({ id: bookingId });

    console.log(`📊 [Dashboard] Deleted booking: ${bookingId}`);
  } catch (error) {
    console.error("Failed to delete booking:", error);
    throw new Error("Failed to delete booking");
  }
}

export async function getGoogleMapsApiKey(): Promise<string> {
  // Return the API key for client-side use
  // This is safe because Google Maps API keys are meant to be public
  // and should be restricted by HTTP referrer or domain in Google Cloud Console
  return process.env.GOOGLE_MAPS_API_KEY || '';
}
