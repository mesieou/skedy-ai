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
