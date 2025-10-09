"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Badge } from "@/features/shared/components/ui/badge";
import type { BookingWithServices } from "../lib/actions";
import { BookingStatus } from "@/features/shared/lib/database/types/bookings";
import { useState } from "react";
import { DateUtils } from "@/features/shared/utils/date-utils";

interface WeeklyCalendarProps {
  bookings: BookingWithServices[];
}

const getStatusStyle = (status: BookingStatus) => {
  switch (status) {
    case BookingStatus.CONFIRMED:
    case BookingStatus.COMPLETED:
      return "bg-primary text-primary-foreground";
    case BookingStatus.PENDING:
    case BookingStatus.ACCEPTED:
      return "bg-secondary text-secondary-foreground";
    case BookingStatus.IN_PROGRESS:
      return "bg-accent text-accent-foreground";
    case BookingStatus.CANCELLED:
    case BookingStatus.REFUNDED:
      return "bg-destructive text-destructive-foreground";
    case BookingStatus.NOT_ACCEPTED:
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function WeeklyCalendar({ bookings }: WeeklyCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day; // Get Monday of current week
    return new Date(today.setDate(diff));
  });

  const getWeekDays = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays(currentWeekStart);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  const getBookingsForDay = (date: Date) => {
    return bookings.filter((booking) => {
      try {
        // Convert UTC booking time to Melbourne timezone
        const { date: bookingDateStr } = DateUtils.convertUTCToTimezone(booking.start_at, 'Australia/Melbourne');
        const localDateStr = date.toISOString().split('T')[0];
        return bookingDateStr === localDateStr;
      } catch (error) {
        console.error('Error filtering booking:', error);
        return false;
      }
    });
  };

  const formatTime = (utcIsoString: string) => {
    try {
      const { time } = DateUtils.convertUTCToTimezone(utcIsoString, 'Australia/Melbourne');
      return DateUtils.formatTimeForDisplay(time);
    } catch (error) {
      console.error('Error formatting time:', error);
      return new Date(utcIsoString).toLocaleTimeString();
    }
  };

  const isToday = (date: Date) => {
    try {
      const todayUtc = DateUtils.nowUTC();
      const { date: todayMelbourne } = DateUtils.convertUTCToTimezone(todayUtc, 'Australia/Melbourne');
      const localDateStr = date.toISOString().split('T')[0];
      return todayMelbourne === localDateStr;
    } catch (error) {
      console.error('Error checking if today:', error);
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">
            {formatMonthYear(currentWeekStart)}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dayBookings = getBookingsForDay(day);
          const isTodayDate = isToday(day);

          return (
            <Card
              key={index}
              className={`p-3 min-h-[200px] ${
                isTodayDate ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="space-y-2">
                {/* Day header */}
                <div className="text-center pb-2 border-b">
                  <div className="text-xs text-muted-foreground font-medium">
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      isTodayDate ? "text-primary" : ""
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>

                {/* Bookings for this day */}
                <div className="space-y-2">
                  {dayBookings.length > 0 ? (
                    dayBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Badge
                              className={`${getStatusStyle(booking.status)} text-[10px] px-1 py-0`}
                            >
                              {booking.status}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium line-clamp-2">
                            {booking.services.map((s) => s.name).join(", ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(booking.start_at)}
                          </p>
                          <p className="text-xs font-semibold">
                            ${booking.total_estimate_amount.toFixed(0)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <Calendar className="w-6 h-6 mx-auto text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">Status:</span>
        <div className="flex items-center gap-2">
          <Badge className={getStatusStyle(BookingStatus.CONFIRMED)}>Confirmed</Badge>
          <Badge className={getStatusStyle(BookingStatus.COMPLETED)}>Completed</Badge>
          <Badge className={getStatusStyle(BookingStatus.PENDING)}>Pending</Badge>
          <Badge className={getStatusStyle(BookingStatus.CANCELLED)}>Cancelled</Badge>
        </div>
      </div>
    </div>
  );
}
