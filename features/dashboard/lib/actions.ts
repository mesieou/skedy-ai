"use server";

import { BookingsRepository } from "@/features/shared/lib/database/repositories/bookings-respository";
import { BookingServiceRepository } from "@/features/shared/lib/database/repositories/booking-service-repository";
import { ServiceRepository } from "@/features/shared/lib/database/repositories/service-repository";
import { UserRepository } from "@/features/shared/lib/database/repositories/user-repository";
import type { Booking } from "@/features/shared/lib/database/types/bookings";
import type { Service } from "@/features/shared/lib/database/types/service";
import { ChatMessage, ChatSession } from "@/features/shared/lib/database/types";
import { ChatSessionRepository } from "@/features/shared/lib/database/repositories/chat-session-repository";
import { InteractionsRepository } from "@/features/shared/lib/database/repositories/interactions-repository";
import type { Interaction } from "@/features/shared/lib/database/types/interactions";

export interface BookingWithServices extends Booking {
  services: Service[];
}

export async function getBusinessBookingsByUserId(userId: string): Promise<BookingWithServices[]> {
  try {
    console.log(`📊 [Dashboard] Fetching bookings for user: ${userId}`);

    // Get user record to find their business_id
    const userRepo = new UserRepository();
    const user = await userRepo.findOne({ id: userId });

    if (!user) {
      console.error(`📊 [Dashboard] User not found: ${userId}`);
      throw new Error("User not found");
    }

    console.log(`📊 [Dashboard] User found: ${user.first_name} - Business ID: ${user.business_id}`);

    const bookingsRepo = new BookingsRepository();
    const bookingServiceRepo = new BookingServiceRepository();
    const serviceRepo = new ServiceRepository();

    // Get all bookings for the business
    const bookings = await bookingsRepo.findAll(
      { orderBy: 'start_at', ascending: false },
      { business_id: user.business_id }
    );

    console.log(`📊 [Dashboard] Found ${bookings.length} bookings for business ${user.business_id}`);

    // For each booking, get its services
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

        return {
          ...booking,
          services: validServices,
        };
      })
    );

    console.log(`📊 [Dashboard] Returning ${bookingsWithServices.length} bookings with services for business ${user.business_id}`);
    return bookingsWithServices;
  } catch (error) {
    console.error("Failed to fetch business bookings:", error);
    throw new Error("Failed to fetch bookings");
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

        // Get user record to find their business_id
        const userRepo = new UserRepository();
        const user = await userRepo.findOne({ id: userId });

        if (!user) {
            console.error(`📊 [Dashboard] User not found: ${userId}`);
            throw new Error("User not found");
        }

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
        throw new Error("Failed to fetch sessions");
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

    // Get current user record to find their business_id
    const userRepo = new UserRepository();
    const currentUser = await userRepo.findOne({ id: data.currentUserId });

    if (!currentUser) {
      console.error(`📊 [Dashboard] User not found: ${data.currentUserId}`);
      throw new Error("User not found");
    }

    if (!currentUser.business_id) {
      console.error(`📊 [Dashboard] User has no business_id: ${data.currentUserId}`);
      throw new Error("User has no associated business");
    }

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
      role: 'customer' as any,
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

export async function getBusinessServices(currentUserId: string): Promise<{ id: string; name: string }[]> {
  try {
    console.log(`📊 [Dashboard] Fetching services for user: ${currentUserId}`);

    // Get current user record to find their business_id
    const userRepo = new UserRepository();
    const currentUser = await userRepo.findOne({ id: currentUserId });

    if (!currentUser) {
      console.error(`📊 [Dashboard] User not found: ${currentUserId}`);
      throw new Error("User not found");
    }

    if (!currentUser.business_id) {
      console.error(`📊 [Dashboard] User has no business_id: ${currentUserId}`);
      throw new Error("User has no associated business");
    }

    // Get all services for this business
    const serviceRepo = new ServiceRepository();
    const services = await serviceRepo.findAll(
      { orderBy: 'name', ascending: true },
      { business_id: currentUser.business_id }
    );

    console.log(`📊 [Dashboard] Found ${services.length} services for business ${currentUser.business_id}`);

    return services.map(service => ({
      id: service.id,
      name: service.name
    }));
  } catch (error) {
    console.error("Failed to fetch business services:", error);
    throw new Error("Failed to fetch services");
  }
}

export async function getBusinessCustomers(currentUserId: string): Promise<{ id: string; name: string; email: string | null; phone: string | null }[]> {
  try {
    console.log(`📊 [Dashboard] Fetching customers for user: ${currentUserId}`);

    // Get current user record to find their business_id
    const userRepo = new UserRepository();
    const currentUser = await userRepo.findOne({ id: currentUserId });

    if (!currentUser) {
      console.error(`📊 [Dashboard] User not found: ${currentUserId}`);
      throw new Error("User not found");
    }

    if (!currentUser.business_id) {
      console.error(`📊 [Dashboard] User has no business_id: ${currentUserId}`);
      throw new Error("User has no associated business");
    }

    // Get all customers for this business
    const customers = await userRepo.findAll(
      { orderBy: 'first_name', ascending: true },
      { business_id: currentUser.business_id, role: 'customer' }
    );

    console.log(`📊 [Dashboard] Found ${customers.length} customers for business ${currentUser.business_id}`);

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
  remainingBalance: number;
  depositPaid: boolean;
  gstAmount: number;
}): Promise<Booking> {
  try {
    console.log(`📊 [Dashboard] Creating booking for customer: ${data.customerId}`);

    // Get user record to find their business_id
    const userRepo = new UserRepository();
    const user = await userRepo.findOne({ id: data.userId });

    if (!user) {
      console.error(`📊 [Dashboard] User not found: ${data.userId}`);
      throw new Error("User not found");
    }

    if (!user.business_id) {
      console.error(`📊 [Dashboard] User has no business_id: ${data.userId}`);
      throw new Error("User has no associated business");
    }

    const bookingsRepo = new BookingsRepository();
    const bookingServiceRepo = new BookingServiceRepository();

    // Create booking with proper price breakdown
    const booking = await bookingsRepo.create({
      user_id: data.customerId, // Use the selected customer ID
      business_id: user.business_id,
      status: data.status as any,
      start_at: data.startAt,
      end_at: data.endAt,
      total_estimate_amount: data.totalEstimateAmount,
      total_estimate_time_in_minutes: data.totalEstimateTimeInMinutes,
      deposit_amount: data.depositAmount,
      remaining_balance: data.remainingBalance,
      deposit_paid: data.depositPaid,
      price_breakdown: {
        service_breakdowns: [
          {
            service_id: data.serviceId,
            service_name: data.serviceName,
            quantity: 1,
            service_cost: data.totalEstimateAmount - data.gstAmount,
            total_cost: data.totalEstimateAmount - data.gstAmount,
            estimated_duration_mins: data.totalEstimateTimeInMinutes,
            component_breakdowns: []
          }
        ],
        travel_breakdown: {
          total_distance_km: 0,
          total_travel_time_mins: 0,
          total_travel_cost: 0,
          route_segments: []
        },
        business_fees: {
          gst_amount: data.gstAmount,
          platform_fee: 0,
          payment_processing_fee: 0,
          other_fees: []
        }
      }
    });

    // Create booking_service relationship
    await bookingServiceRepo.create({
      booking_id: booking.id,
      service_id: data.serviceId
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
  gstAmount?: number;
}): Promise<Booking> {
  try {
    console.log(`📊 [Dashboard] Updating booking: ${data.bookingId}`);

    const bookingsRepo = new BookingsRepository();
    const bookingServiceRepo = new BookingServiceRepository();

    // Get existing booking
    const existingBooking = await bookingsRepo.findOne({ id: data.bookingId });
    if (!existingBooking) {
      throw new Error("Booking not found");
    }

    // Prepare update data
    const updateData: any = {};
    
    if (data.startAt) updateData.start_at = data.startAt;
    if (data.endAt) updateData.end_at = data.endAt;
    if (data.status) updateData.status = data.status;
    if (data.totalEstimateAmount !== undefined) updateData.total_estimate_amount = data.totalEstimateAmount;
    if (data.totalEstimateTimeInMinutes !== undefined) updateData.total_estimate_time_in_minutes = data.totalEstimateTimeInMinutes;
    if (data.depositAmount !== undefined) updateData.deposit_amount = data.depositAmount;
    if (data.depositPaid !== undefined) updateData.deposit_paid = data.depositPaid;

    // Calculate remaining balance if amounts changed
    if (data.totalEstimateAmount !== undefined || data.depositAmount !== undefined) {
      const totalAmount = data.totalEstimateAmount ?? existingBooking.total_estimate_amount;
      const depositAmount = data.depositAmount ?? existingBooking.deposit_amount;
      updateData.remaining_balance = data.depositPaid ? totalAmount - depositAmount : totalAmount;
    }

    // Update price breakdown if service or amounts changed
    if (data.serviceId || data.totalEstimateAmount !== undefined || data.gstAmount !== undefined) {
      const serviceId = data.serviceId ?? existingBooking.price_breakdown.service_breakdowns[0]?.service_id;
      const serviceName = data.serviceName ?? existingBooking.price_breakdown.service_breakdowns[0]?.service_name;
      const totalAmount = data.totalEstimateAmount ?? existingBooking.total_estimate_amount;
      const gstAmount = data.gstAmount ?? existingBooking.price_breakdown.business_fees.gst_amount;
      const duration = data.totalEstimateTimeInMinutes ?? existingBooking.total_estimate_time_in_minutes;

      updateData.price_breakdown = {
        service_breakdowns: [
          {
            service_id: serviceId,
            service_name: serviceName,
            quantity: 1,
            service_cost: totalAmount - gstAmount,
            total_cost: totalAmount - gstAmount,
            estimated_duration_mins: duration,
            component_breakdowns: []
          }
        ],
        travel_breakdown: existingBooking.price_breakdown.travel_breakdown,
        business_fees: {
          ...existingBooking.price_breakdown.business_fees,
          gst_amount: gstAmount
        }
      };

      // Update booking_service if service changed
      if (data.serviceId && data.serviceId !== existingBooking.price_breakdown.service_breakdowns[0]?.service_id) {
        // Delete old booking_service
        await bookingServiceRepo.deleteOne({ booking_id: data.bookingId });
        
        // Create new booking_service
        await bookingServiceRepo.create({
          booking_id: data.bookingId,
          service_id: data.serviceId
        });
      }
    }

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

// Aliases for backward compatibility
export const getUserBookings = getBusinessBookingsByUserId;
export const getUserSessions = getBusinessSessionsByUserId;
