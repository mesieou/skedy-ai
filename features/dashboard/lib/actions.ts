"use server";

import { BookingsRepository } from "@/features/shared/lib/database/repositories/bookings-respository";
import { BookingServiceRepository } from "@/features/shared/lib/database/repositories/booking-service-repository";
import { ServiceRepository } from "@/features/shared/lib/database/repositories/service-repository";
import type { Booking } from "@/features/shared/lib/database/types/bookings";
import type { Service } from "@/features/shared/lib/database/types/service";
import { ChatMessage, ChatSession } from "@/features/shared/lib/database/types";
import { ChatSessionRepository } from "@/features/shared/lib/database/repositories/chat-session-repository";
import { InteractionsRepository } from "@/features/shared/lib/database/repositories/interactions-repository";
import type { Interaction } from "@/features/shared/lib/database/types/interactions";

export interface BookingWithServices extends Booking {
  services: Service[];
}

export async function getUserBookings(userId: string): Promise<BookingWithServices[]> {
  try {
    console.log(`📊 [Dashboard] Fetching bookings for user: ${userId}`);

    const bookingsRepo = new BookingsRepository();
    const bookingServiceRepo = new BookingServiceRepository();
    const serviceRepo = new ServiceRepository();

    // Get all bookings for the user
    const bookings = await bookingsRepo.findAll(
      { orderBy: 'start_at', ascending: false },
      { user_id: userId }
    );

    console.log(`📊 [Dashboard] Found ${bookings.length} bookings for user ${userId}`);

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

    console.log(`📊 [Dashboard] Returning ${bookingsWithServices.length} bookings with services for user ${userId}`);
    return bookingsWithServices;
  } catch (error) {
    console.error("Failed to fetch user bookings:", error);
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

export async function getUserSessions(userId: string): Promise<SessionWithInteractions[]> {
    try {
        const chatSessionRepo = new ChatSessionRepository();
        const interactionsRepo = new InteractionsRepository();

        // Get all sessions for the user, ordered by most recent
        const sessions = await chatSessionRepo.findAll(
            { orderBy: 'created_at', ascending: false },
            { user_id: userId }
        );

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

        return sessionsWithInteractions;
    } catch (error) {
        console.error("Failed to fetch user sessions:", error);
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
