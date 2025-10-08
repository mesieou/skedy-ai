"use client";

import { Calendar, Clock, DollarSign, MapPin } from "lucide-react";
import { Card } from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import type { BookingWithServices } from "../lib/actions";
import { BookingStatus } from "@/features/shared/lib/database/types/bookings";

interface BookingCardProps {
  booking: BookingWithServices;
}

const statusColors: Record<BookingStatus, string> = {
  [BookingStatus.NOT_ACCEPTED]: "bg-gray-500",
  [BookingStatus.PENDING]: "bg-yellow-500",
  [BookingStatus.ACCEPTED]: "bg-blue-500",
  [BookingStatus.CONFIRMED]: "bg-green-500",
  [BookingStatus.IN_PROGRESS]: "bg-purple-500",
  [BookingStatus.COMPLETED]: "bg-green-700",
  [BookingStatus.CANCELLED]: "bg-red-500",
  [BookingStatus.REFUNDED]: "bg-orange-500",
};

export function BookingCard({ booking }: BookingCardProps) {
  const startDate = new Date(booking.start_at);
  const endDate = new Date(booking.end_at);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        {/* Header with status */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {booking.services.map((s) => s.name).join(", ")}
            </h3>
            <Badge className={`${statusColors[booking.status]} text-white`}>
              {booking.status.replace(/_/g, " ").toUpperCase()}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">
              ${booking.total_estimate_amount.toFixed(2)}
            </p>
            {booking.deposit_paid && (
              <p className="text-sm text-muted-foreground">
                Deposit paid: ${booking.deposit_amount.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Date and Time */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(startDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>
              {formatTime(startDate)} - {formatTime(endDate)}
            </span>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Duration: {booking.total_estimate_time_in_minutes} minutes</span>
        </div>

        {/* Services */}
        {booking.services.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Services:</p>
            <div className="flex flex-wrap gap-2">
              {booking.services.map((service) => (
                <Badge key={service.id} variant="outline">
                  {service.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Remaining Balance */}
        {booking.remaining_balance > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Remaining Balance:</span>
              <span className="font-semibold text-foreground">
                ${booking.remaining_balance.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}