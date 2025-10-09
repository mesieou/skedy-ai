"use client";

import { Calendar, Clock, DollarSign, MapPin } from "lucide-react";
import { Card } from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import type { BookingWithServices } from "../lib/actions";
import { BookingStatus } from "@/features/shared/lib/database/types/bookings";
import { DateUtils } from "@/features/shared/utils/date-utils";

interface BookingCardProps {
  booking: BookingWithServices;
}

const getStatusStyle = (status: BookingStatus) => {
  switch (status) {
    case BookingStatus.CONFIRMED:
    case BookingStatus.COMPLETED:
      // Success states - uses primary/success colors
      return "bg-primary text-primary-foreground";
    case BookingStatus.PENDING:
    case BookingStatus.ACCEPTED:
      // In-progress states - uses secondary colors
      return "bg-secondary text-secondary-foreground";
    case BookingStatus.IN_PROGRESS:
      // Active state - uses accent color
      return "bg-accent text-accent-foreground";
    case BookingStatus.CANCELLED:
    case BookingStatus.REFUNDED:
      // Error/cancelled states - uses destructive colors
      return "bg-destructive text-destructive-foreground";
    case BookingStatus.NOT_ACCEPTED:
    default:
      // Neutral/pending states - uses muted colors
      return "bg-muted text-muted-foreground";
  }
};

export function BookingCard({ booking }: BookingCardProps) {
  const formatDateTime = (utcIsoString: string) => {
    try {
      const { date, time } = DateUtils.convertUTCToTimezone(utcIsoString, 'Australia/Melbourne');
      const formattedDate = DateUtils.formatDateForDisplay(date);
      const formattedTime = DateUtils.formatTimeForDisplay(time);
      return { date: formattedDate, time: formattedTime };
    } catch (error) {
      console.error('Error formatting date/time:', error);
      const fallbackDate = new Date(utcIsoString);
      return {
        date: fallbackDate.toLocaleDateString(),
        time: fallbackDate.toLocaleTimeString()
      };
    }
  };

  const { date: startDateFormatted, time: startTimeFormatted } = formatDateTime(booking.start_at);
  const { time: endTimeFormatted } = formatDateTime(booking.end_at);

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        {/* Header with status */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {booking.services.map((s) => s.name).join(", ")}
            </h3>
            <Badge className={getStatusStyle(booking.status)}>
              {booking.status.replace(/_/g, " ").toUpperCase()}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">
              ${booking.total_estimate_amount.toFixed(2)}
            </p>
            {booking.deposit_paid && (
              <p className="text-sm text-muted-foreground">
                deposit paid: ${booking.deposit_amount.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Date and Time */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{startDateFormatted}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>
              {startTimeFormatted} - {endTimeFormatted}
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