"use client";

import { Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Card } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Badge } from "@/features/shared/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/features/shared/components/ui/dialog";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import type { BookingWithServices } from "../lib/actions";
import { createSimpleBooking, getBusinessCustomers, createNewCustomer, getBusinessServices, getServiceDetails, getGoogleMapsApiKey, updateBooking, deleteBooking, type DashboardBookingAddressInput } from "../lib/actions";
import { BookingStatus } from "@/features/shared/lib/database/types/bookings";
import { LocationType } from "@/features/shared/lib/database/types/service";
import type { Service } from "@/features/shared/lib/database/types/service";
import type { AddressInput, Address } from "@/features/shared/lib/database/types/addresses";
import { AddressType } from "@/features/shared/lib/database/types/addresses";
import { useState, useEffect } from "react";
import { DateUtils } from "@/features/shared/utils/date-utils";
import type { User } from "@/features/auth";
import { BookingAddressInputs } from "./booking-address-inputs";

interface WeeklyCalendarProps {
  bookings: BookingWithServices[];
  user: User;
  businessTimezone: string;
  onBookingCreated?: () => void;
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

const formatAddress = (address: Address) => {
  const parts = [
    address.address_line_1,
    address.address_line_2,
    address.city,
    address.state,
    address.postcode,
    address.country
  ].filter(Boolean);

  return parts.join(', ');
};

const getAddressTypeLabel = (addressType: AddressType, serviceLocationType: LocationType) => {
  switch (addressType) {
    case AddressType.CUSTOMER:
      return serviceLocationType === LocationType.CUSTOMER ? 'Customer Address' : 'Service Address';
    case AddressType.PICKUP:
      return 'Pickup Address';
    case AddressType.DROPOFF:
      return 'Dropoff Address';
    case AddressType.BUSINESS:
      return 'Business Address';
    default:
      return 'Address';
  }
};

const groupAddressesByType = (addresses: Address[], serviceLocationType: LocationType) => {
  const grouped: Record<string, Address[]> = {};

  addresses.forEach(address => {
    const label = getAddressTypeLabel(address.type, serviceLocationType);
    if (!grouped[label]) {
      grouped[label] = [];
    }
    grouped[label].push(address);
  });

  return grouped;
};

export function WeeklyCalendar({ bookings, user, businessTimezone, onBookingCreated }: WeeklyCalendarProps) {
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'today'>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day; // Get Monday of current week
    return new Date(today.setDate(diff));
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [currentDay, setCurrentDay] = useState(() => {
    return new Date();
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDayViewOpen, setIsDayViewOpen] = useState(false);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set());
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithServices | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [customerType, setCustomerType] = useState<'existing' | 'new'>('existing');
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string | null; phone: string | null }[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loadingServiceDetails, setLoadingServiceDetails] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
  const [pickupAddresses, setPickupAddresses] = useState<AddressInput[]>([]);
  const [dropoffAddresses, setDropoffAddresses] = useState<AddressInput[]>([]);
  const [serviceAddress, setServiceAddress] = useState<AddressInput | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    newCustomerFirstName: '',
    newCustomerLastName: '',
    newCustomerEmail: '',
    newCustomerPhone: '',
    serviceId: '',
    startTime: '',
    endTime: '',
    status: BookingStatus.PENDING,
    totalEstimateAmount: 0,
    depositAmount: 0,
    depositPaid: false
  });

  // Load Google Maps API key on component mount
  useEffect(() => {
    getGoogleMapsApiKey().then(setGoogleMapsApiKey).catch(console.error);
  }, []);

  // Load service details when service ID changes
  useEffect(() => {
    if (!formData.serviceId) {
      setSelectedService(null);
      return;
    }

    setLoadingServiceDetails(true);
    getServiceDetails(user.sub, formData.serviceId)
      .then(service => {
        setSelectedService(service);
        // Reset addresses when service changes
        setPickupAddresses([]);
        setDropoffAddresses([]);
        setServiceAddress(null);
      })
      .catch(error => {
        console.error('Failed to load service details:', error);
        setSelectedService(null);
      })
      .finally(() => setLoadingServiceDetails(false));
  }, [formData.serviceId, user.sub]);

  const getWeekDays = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getMonthDays = (monthStart: Date) => {
    const days = [];
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();

    // Get first day of month and its day of week
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();

    // Add days from previous month to fill the first week
    const prevMonthDays = firstDayOfWeek;
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(firstDay);
      date.setDate(date.getDate() - i - 1);
      days.push(date);
    }

    // Add all days of current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Add days from next month to complete the grid (ensure 5-6 weeks)
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push(date);
    }

    return days;
  };

  const weekDays = getWeekDays(currentWeekStart);
  const monthDays = getMonthDays(currentMonth);
  const todayDays = [currentDay];
  const displayDays = viewMode === 'week' ? weekDays : viewMode === 'month' ? monthDays : todayDays;

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


  const goToPreviousDay = () => {
    const newDate = new Date(currentDay);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDay(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDay);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDay(newDate);
  };

  const goToPreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };


  const getBookingsForDay = (date: Date) => {
    return bookings.filter((booking) => {
      try {
        // Convert UTC booking time to business timezone
        const { date: bookingDateStr } = DateUtils.convertUTCToTimezone(booking.start_at, businessTimezone);

        // Convert the calendar date to business timezone for proper comparison
        const calendarDateUTC = date.toISOString();
        const { date: calendarDateStr } = DateUtils.convertUTCToTimezone(calendarDateUTC, businessTimezone);

        return bookingDateStr === calendarDateStr;
      } catch (error) {
        console.error('Error filtering booking:', error);
        return false;
      }
    });
  };

  const formatTime = (utcIsoString: string) => {
    try {
      const { time } = DateUtils.convertUTCToTimezone(utcIsoString, businessTimezone);
      return DateUtils.formatTimeForDisplay(time);
    } catch (error) {
      console.error('Error formatting time:', error);
      return new Date(utcIsoString).toLocaleTimeString();
    }
  };

  const isToday = (date: Date) => {
    try {
      const todayUtc = DateUtils.nowUTC();
      const { date: todayBusiness } = DateUtils.convertUTCToTimezone(todayUtc, businessTimezone);

      // Convert the calendar date to business timezone for proper comparison
      const calendarDateUTC = date.toISOString();
      const { date: calendarDateStr } = DateUtils.convertUTCToTimezone(calendarDateUTC, businessTimezone);

      return todayBusiness === calendarDateStr;
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

  const isCurrentMonth = (date: Date) => {
    const displayDate = viewMode === 'week' ? currentWeekStart : currentMonth;
    return date.getMonth() === displayDate.getMonth();
  };

  const handleDayClick = async (date: Date) => {
    setSelectedDate(date);
    setFormData({
      customerId: '',
      newCustomerFirstName: '',
      newCustomerLastName: '',
      newCustomerEmail: '',
      newCustomerPhone: '',
      serviceId: '',
      startTime: '',
      endTime: '',
      status: BookingStatus.PENDING,
      totalEstimateAmount: 0,
      depositAmount: 0,
      depositPaid: false
    });
    setCustomerType('existing');
    setSelectedService(null);
    setPickupAddresses([]);
    setDropoffAddresses([]);
    setServiceAddress(null);
    setIsModalOpen(true);

    // Load customers and services when modal opens
    setLoadingCustomers(true);
    setLoadingServices(true);
    try {
      const [businessCustomers, businessServices] = await Promise.all([
        getBusinessCustomers(user.sub),
        getBusinessServices(user.sub)
      ]);
      setCustomers(businessCustomers);
      setServices(businessServices);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoadingCustomers(false);
      setLoadingServices(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    setIsSubmitting(true);
    try {
      // Combine date with times to create UTC ISO strings
      const startDateTime = new Date(selectedDate);
      const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(selectedDate);
      const [endHours, endMinutes] = formData.endTime.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      // Calculate duration in minutes
      const durationMinutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));

      // Note: remaining_balance is calculated server-side, no need to send it

      // Validate customer selection/input
      if (customerType === 'existing' && !formData.customerId) {
        alert('Please select a customer');
        setIsSubmitting(false);
        return;
      }

      if (!formData.serviceId) {
        alert('Please select a service');
        setIsSubmitting(false);
        return;
      }

      if (customerType === 'new') {
        if (!formData.newCustomerFirstName.trim()) {
          alert('Please enter customer first name');
          setIsSubmitting(false);
          return;
        }
        if (!formData.newCustomerEmail.trim()) {
          alert('Please enter customer email');
          setIsSubmitting(false);
          return;
        }
        if (!formData.newCustomerPhone.trim()) {
          alert('Please enter customer phone number');
          setIsSubmitting(false);
          return;
        }
      }

      // Determine customer ID
      let customerId = formData.customerId;

      if (customerType === 'new') {
        // Create new customer in database
        try {
          const newCustomer = await createNewCustomer({
            currentUserId: user.sub,
            firstName: formData.newCustomerFirstName,
            lastName: formData.newCustomerLastName || undefined,
            email: formData.newCustomerEmail,
            phoneNumber: formData.newCustomerPhone
          });
          customerId = newCustomer.id;
          console.log('Created new customer:', newCustomer);
        } catch (error) {
          console.error('Failed to create new customer:', error);
          alert('Failed to create new customer. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // Build addresses array based on service location type
      const addresses: DashboardBookingAddressInput[] = [];

      if (selectedService) {
        if (selectedService.location_type === LocationType.CUSTOMER && serviceAddress) {
          addresses.push({
            service_id: formData.serviceId,
            type: AddressType.CUSTOMER,
            ...serviceAddress
          });
        } else if (selectedService.location_type === LocationType.PICKUP_AND_DROPOFF) {
          // Add pickup addresses
          pickupAddresses.forEach(addr => {
            addresses.push({
              service_id: formData.serviceId,
              type: AddressType.PICKUP,
              ...addr
            });
          });
          // Add dropoff addresses
          dropoffAddresses.forEach(addr => {
            addresses.push({
              service_id: formData.serviceId,
              type: AddressType.DROPOFF,
              ...addr
            });
          });
        }
        // BUSINESS location type doesn't need addresses
      }

      // Add loading state for this date
      const dateKey = selectedDate.toISOString().split('T')[0];
      setLoadingDates(prev => new Set(prev).add(dateKey));

      await createSimpleBooking({
        userId: user.sub,
        customerId: customerId,
        serviceId: formData.serviceId,
        serviceName: selectedService?.name || 'Unknown Service',
        startAt: startDateTime.toISOString(),
        endAt: endDateTime.toISOString(),
        status: formData.status,
        totalEstimateAmount: formData.totalEstimateAmount,
        totalEstimateTimeInMinutes: durationMinutes,
        depositAmount: formData.depositAmount,
        depositPaid: formData.depositPaid,
        addresses: addresses.length > 0 ? addresses : undefined
      });

      handleCloseModal();

      // Notify parent component to refresh bookings
      if (onBookingCreated) {
        onBookingCreated();
      }

      // Remove loading state after a short delay to ensure data is refreshed
      setTimeout(() => {
        setLoadingDates(prev => {
          const newSet = new Set(prev);
          newSet.delete(dateKey);
          return newSet;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to create booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (viewMode === 'week') {
      goToPreviousWeek();
    } else {
      goToPreviousMonth();
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      goToNextWeek();
    } else {
      goToNextMonth();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <h2 className="text-lg sm:text-2xl font-semibold">
            {viewMode === 'today'
              ? `${currentDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`
              : formatMonthYear(viewMode === 'week' ? currentWeekStart : currentMonth)
            }
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'today' ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setViewMode('today');
                setCurrentDay(new Date());
              }}
              className="hover:text-foreground text-xs sm:text-sm"
            >
              Day
            </Button>
            <Button
              variant={viewMode === 'week' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('week')}
              className="hover:text-foreground text-xs sm:text-sm"
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('month')}
              className="hover:text-foreground text-xs sm:text-sm"
            >
              Month
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={viewMode === 'today' ? goToPreviousDay : handlePrevious}
            className="hover:text-foreground h-8 w-8 sm:h-10 sm:w-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={viewMode === 'today' ? goToNextDay : handleNext}
            className="hover:text-foreground h-8 w-8 sm:h-10 sm:w-10"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={`grid gap-2 ${
        viewMode === 'today'
          ? 'grid-cols-1 max-w-md mx-auto'
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7'
      }`}>
        {displayDays.map((day, index) => {
          const dayBookings = getBookingsForDay(day);
          const isTodayDate = isToday(day);
          const isInCurrentMonth = isCurrentMonth(day);

          return (
            <Card
              key={index}
              className={`p-2 sm:p-3 ${
                viewMode === 'today'
                  ? 'min-h-[300px] sm:min-h-[400px]'
                  : viewMode === 'week'
                    ? 'min-h-[150px] sm:min-h-[200px]'
                    : 'min-h-[100px] sm:min-h-[120px]'
              } ${
                isTodayDate ? "ring-2 ring-primary" : ""
              } ${
                viewMode === 'month' && !isInCurrentMonth ? "opacity-40" : ""
              } cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => handleDayClick(day)}
            >
              <div className="space-y-2">
                {/* Day header */}
                <div className="text-center pb-2 border-b">
                  <div className="text-xs text-muted-foreground font-medium">
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div
                    className={`text-base sm:text-lg font-semibold ${
                      isTodayDate ? "text-primary" : ""
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>

                {/* Bookings for this day */}
                <div className="space-y-1 sm:space-y-1.5">
                  {loadingDates.has(day.toISOString().split('T')[0]) && (
                    <div className="flex items-center justify-center py-4 sm:py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Adding booking...</span>
                      </div>
                    </div>
                  )}
                  {!loadingDates.has(day.toISOString().split('T')[0]) && dayBookings.length > 0 ? (
                    <>
                      {dayBookings.slice(0, 5).map((booking) => (
                        <div
                          key={booking.id}
                          className="px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md bg-muted/60 hover:bg-muted transition-colors cursor-pointer border border-muted-foreground/10"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                            setIsEditMode(false);
                            setIsBookingDetailsOpen(true);

                            // Load services if not already loaded
                            if (services.length === 0) {
                              setLoadingServices(true);
                              try {
                                const businessServices = await getBusinessServices(user.sub);
                                setServices(businessServices);
                              } catch (error) {
                                console.error('Failed to load services:', error);
                              } finally {
                                setLoadingServices(false);
                              }
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                            <Badge
                              className={`${getStatusStyle(booking.status)} text-xs sm:text-xs px-1.5 sm:px-1.5 py-0.5 h-4 sm:h-4`}
                            >
                              {booking.status}
                            </Badge>
                            <span className="text-xs sm:text-xs font-semibold text-muted-foreground">
                              {formatTime(booking.start_at)}
                            </span>
                          </div>
                          <p className="text-sm sm:text-sm font-medium line-clamp-1 sm:line-clamp-2 text-foreground/90">
                            {booking.services.length > 0
                              ? booking.services.map((s) => s.name).join(", ")
                              : "No service"}
                          </p>
                          <div className="flex items-center justify-between mt-0.5 sm:mt-1">
                            <span className="text-xs sm:text-xs text-muted-foreground">
                              {booking.total_estimate_time_in_minutes}min
                            </span>
                            <span className="text-sm sm:text-sm font-semibold text-foreground">
                              ${booking.total_estimate_amount.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {dayBookings.length > 5 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDayViewDate(day);
                            setIsDayViewOpen(true);
                          }}
                          className="w-full py-1 sm:py-1.5 text-sm sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors rounded-md hover:bg-primary/5"
                        >
                          +{dayBookings.length - 5} more booking{dayBookings.length - 5 > 1 ? 's' : ''}
                        </button>
                      )}
                    </>
                  ) : (
                    !loadingDates.has(day.toISOString().split('T')[0]) && viewMode === 'week' && (
                      <div className="text-center py-2 sm:py-4">
                        <Calendar className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-muted-foreground/30" />
                      </div>
                    )
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Booking Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onClose={handleCloseModal}>
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
            <DialogDescription>
              {selectedDate && (
                <span>
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 pt-2 space-y-3 sm:space-y-4">
            {/* Customer Type Selection */}
            <div className="space-y-2">
              <Label>Customer Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customerType"
                    value="existing"
                    checked={customerType === 'existing'}
                    onChange={(e) => setCustomerType(e.target.value as 'existing' | 'new')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Existing Customer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customerType"
                    value="new"
                    checked={customerType === 'new'}
                    onChange={(e) => setCustomerType(e.target.value as 'existing' | 'new')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">New Customer</span>
                </label>
              </div>
            </div>

            {/* Customer Selection Dropdown (only for existing customers) */}
            {customerType === 'existing' && (
              <div className="space-y-2">
                <Label htmlFor="customerId">Select Customer</Label>
                {loadingCustomers ? (
                  <div className="text-sm text-muted-foreground">Loading customers...</div>
                ) : (
                  <select
                    id="customerId"
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="flex h-11 w-full rounded-lg futuristic-input px-4 py-3 text-sm text-foreground bg-background focus-visible:outline-none"
                    required
                  >
                    <option value="" className="bg-background text-foreground">-- Select a customer --</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id} className="bg-background text-foreground">
                        {customer.name} {customer.email && `(${customer.email})`} {customer.phone && `- ${customer.phone}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* New Customer Fields (only for new customers) */}
            {customerType === 'new' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newCustomerFirstName">First Name *</Label>
                    <Input
                      id="newCustomerFirstName"
                      type="text"
                      placeholder="First name"
                      value={formData.newCustomerFirstName}
                      onChange={(e) => setFormData({ ...formData, newCustomerFirstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCustomerLastName">Last Name</Label>
                    <Input
                      id="newCustomerLastName"
                      type="text"
                      placeholder="Last name (optional)"
                      value={formData.newCustomerLastName}
                      onChange={(e) => setFormData({ ...formData, newCustomerLastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCustomerEmail">Email *</Label>
                  <Input
                    id="newCustomerEmail"
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.newCustomerEmail}
                    onChange={(e) => setFormData({ ...formData, newCustomerEmail: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCustomerPhone">Phone Number *</Label>
                  <Input
                    id="newCustomerPhone"
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.newCustomerPhone}
                    onChange={(e) => setFormData({ ...formData, newCustomerPhone: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {/* Service Selection */}
            <div className="space-y-2">
              <Label htmlFor="serviceId">Service *</Label>
              {loadingServices ? (
                <div className="text-sm text-muted-foreground">Loading services...</div>
              ) : (
                <select
                  id="serviceId"
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="flex h-11 w-full rounded-lg futuristic-input px-4 py-3 text-sm text-foreground bg-background focus-visible:outline-none"
                  required
                >
                  <option value="" className="bg-background text-foreground">-- Select a service --</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id} className="bg-background text-foreground">
                      {service.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Address Fields - Conditional based on service location type */}
            <BookingAddressInputs
              selectedService={selectedService}
              loadingServiceDetails={loadingServiceDetails}
              googleMapsApiKey={googleMapsApiKey}
              pickupAddresses={pickupAddresses}
              setPickupAddresses={setPickupAddresses}
              dropoffAddresses={dropoffAddresses}
              setDropoffAddresses={setDropoffAddresses}
              serviceAddress={serviceAddress}
              setServiceAddress={setServiceAddress}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as BookingStatus })}
                className="flex h-11 w-full rounded-lg futuristic-input px-4 py-3 text-sm text-foreground bg-background focus-visible:outline-none"
              >
                <option value={BookingStatus.PENDING} className="bg-background text-foreground">Pending</option>
                <option value={BookingStatus.ACCEPTED} className="bg-background text-foreground">Accepted</option>
                <option value={BookingStatus.CONFIRMED} className="bg-background text-foreground">Confirmed</option>
                <option value={BookingStatus.IN_PROGRESS} className="bg-background text-foreground">In Progress</option>
                <option value={BookingStatus.COMPLETED} className="bg-background text-foreground">Completed</option>
                <option value={BookingStatus.CANCELLED} className="bg-background text-foreground">Cancelled</option>
                <option value={BookingStatus.NOT_ACCEPTED} className="bg-background text-foreground">Not Accepted</option>
                <option value={BookingStatus.REFUNDED} className="bg-background text-foreground">Refunded</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalEstimateAmount">Total Amount ($)</Label>
              <Input
                id="totalEstimateAmount"
                type="number"
                min="0"
                step="0.01"
                value={formData.totalEstimateAmount}
                onChange={(e) => setFormData({ ...formData, totalEstimateAmount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.depositAmount}
                  onChange={(e) => setFormData({ ...formData, depositAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-end gap-2 h-11">
                  <input
                    id="depositPaid"
                    type="checkbox"
                    checked={formData.depositPaid}
                    onChange={(e) => setFormData({ ...formData, depositPaid: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="depositPaid" className="cursor-pointer">
                    Deposit Paid
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="flex-1 h-9 px-4 py-2 rounded-md border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-9 px-4 py-2 rounded-md bg-primary text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Booking Details Modal */}
      <Dialog open={isBookingDetailsOpen} onOpenChange={setIsBookingDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onClose={() => {
          setIsBookingDetailsOpen(false);
          setIsEditMode(false);
        }}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Booking' : 'Booking Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedBooking && new Date(selectedBooking.start_at).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
              {!isEditMode ? (
                /* View Mode */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-2">
                        <Badge className={getStatusStyle(selectedBooking.status)}>
                          {selectedBooking.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Service</Label>
                      <p className="mt-2 font-medium">
                        {selectedBooking.services.length > 0
                          ? selectedBooking.services.map((s) => s.name).join(", ")
                          : "No service assigned"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <Label className="text-muted-foreground">Start Time</Label>
                      <p className="mt-2 font-medium">{formatTime(selectedBooking.start_at)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">End Time</Label>
                      <p className="mt-2 font-medium">{formatTime(selectedBooking.end_at)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <Label className="text-muted-foreground">Duration</Label>
                      <p className="mt-2 font-medium">{selectedBooking.total_estimate_time_in_minutes} minutes</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Total Amount</Label>
                      <p className="mt-2 text-lg sm:text-xl font-bold">${selectedBooking.total_estimate_amount.toFixed(2)}</p>
                    </div>
                  </div>

                  {selectedBooking.deposit_amount > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Deposit Amount</Label>
                      <p className="mt-2 font-medium">
                        ${selectedBooking.deposit_amount.toFixed(2)}
                        {selectedBooking.deposit_paid && (
                          <span className="ml-2 text-green-600 text-sm">✓ Paid</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Addresses Section */}
                  {selectedBooking.addresses && selectedBooking.addresses.length > 0 && selectedBooking.services.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Addresses</Label>
                      <div className="mt-2 space-y-3">
                        {(() => {
                          const primaryService = selectedBooking.services[0];
                          const groupedAddresses = groupAddressesByType(selectedBooking.addresses, primaryService.location_type);

                          return Object.entries(groupedAddresses).map(([label, addresses]) => (
                            <div key={label} className="p-3 border rounded-lg bg-muted/20">
                              <h4 className="font-medium text-sm mb-2">{label}</h4>
                              <div className="space-y-1">
                                {addresses.map((address, index) => (
                                  <p key={index} className="text-sm text-muted-foreground">
                                    {formatAddress(address)}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => {
                        // Populate form with current booking data
                        const startTime = new Date(selectedBooking.start_at);
                        const endTime = new Date(selectedBooking.end_at);
                        setFormData({
                          ...formData,
                          serviceId: selectedBooking.services[0]?.id || '',
                          startTime: `${String(startTime.getUTCHours()).padStart(2, '0')}:${String(startTime.getUTCMinutes()).padStart(2, '0')}`,
                          endTime: `${String(endTime.getUTCHours()).padStart(2, '0')}:${String(endTime.getUTCMinutes()).padStart(2, '0')}`,
                          status: selectedBooking.status,
                          totalEstimateAmount: selectedBooking.total_estimate_amount,
                          depositAmount: selectedBooking.deposit_amount,
                          depositPaid: selectedBooking.deposit_paid
                        });

                        // Reset address fields - they will be populated by the BookingAddressInputs component
                        setPickupAddresses([]);
                        setDropoffAddresses([]);
                        setServiceAddress(null);

                        setIsEditMode(true);
                      }}
                      className="flex-1 h-10 px-4 py-2 rounded-md border border-input bg-background shadow-sm hover:bg-accent hover:text-foreground"
                    >
                      Edit Booking
                    </button>
                    <button
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="flex-1 h-10 px-4 py-2 rounded-md bg-destructive text-destructive-foreground shadow hover:bg-destructive/90"
                    >
                      Delete Booking
                    </button>
                  </div>
                </>
              ) : (
                /* Edit Mode */
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setIsSubmitting(true);
                    try {
                      // Add loading state for the booking's date
                      const bookingDate = new Date(selectedBooking.start_at);
                      const dateKey = bookingDate.toISOString().split('T')[0];
                      setLoadingDates(prev => new Set(prev).add(dateKey));

                      // Build addresses array based on service location type
                      const addresses: DashboardBookingAddressInput[] = [];

                      if (selectedService) {
                        if (selectedService.location_type === LocationType.CUSTOMER && serviceAddress) {
                          addresses.push({
                            service_id: formData.serviceId,
                            type: AddressType.CUSTOMER,
                            ...serviceAddress
                          });
                        } else if (selectedService.location_type === LocationType.PICKUP_AND_DROPOFF) {
                          // Add pickup addresses
                          pickupAddresses.forEach(addr => {
                            addresses.push({
                              service_id: formData.serviceId,
                              type: AddressType.PICKUP,
                              ...addr
                            });
                          });
                          // Add dropoff addresses
                          dropoffAddresses.forEach(addr => {
                            addresses.push({
                              service_id: formData.serviceId,
                              type: AddressType.DROPOFF,
                              ...addr
                            });
                          });
                        }
                        // BUSINESS location type doesn't need addresses
                      }

                      await updateBooking({
                        bookingId: selectedBooking.id,
                        serviceId: formData.serviceId || undefined,
                        serviceName: services.find(s => s.id === formData.serviceId)?.name,
                        startAt: formData.startTime ? `${new Date(selectedBooking.start_at).toISOString().split('T')[0]}T${formData.startTime}:00Z` : undefined,
                        endAt: formData.endTime ? `${new Date(selectedBooking.end_at).toISOString().split('T')[0]}T${formData.endTime}:00Z` : undefined,
                        status: formData.status,
                        totalEstimateAmount: formData.totalEstimateAmount,
                        depositAmount: formData.depositAmount,
                        depositPaid: formData.depositPaid,
                        addresses: addresses.length > 0 ? addresses : undefined
                      });

                      setIsBookingDetailsOpen(false);
                      setIsEditMode(false);

                      if (onBookingCreated) onBookingCreated();

                      // Remove loading state after refresh
                      setTimeout(() => {
                        setLoadingDates(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(dateKey);
                          return newSet;
                        });
                      }, 1000);
                    } catch (error) {
                      console.error('Failed to update booking:', error);
                      alert('Failed to update booking');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="editServiceId">Service</Label>
                    <select
                      id="editServiceId"
                      value={formData.serviceId}
                      onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                      className="flex h-11 w-full rounded-lg futuristic-input px-4 py-3 text-sm text-foreground bg-background focus-visible:outline-none"
                    >
                      <option value="">-- Select a service --</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id} className="bg-background text-foreground">
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Address Fields for Edit Mode */}
                  <BookingAddressInputs
                    selectedService={selectedService}
                    loadingServiceDetails={loadingServiceDetails}
                    googleMapsApiKey={googleMapsApiKey}
                    pickupAddresses={pickupAddresses}
                    setPickupAddresses={setPickupAddresses}
                    dropoffAddresses={dropoffAddresses}
                    setDropoffAddresses={setDropoffAddresses}
                    serviceAddress={serviceAddress}
                    setServiceAddress={setServiceAddress}
                    existingAddresses={selectedBooking?.addresses}
                    isEditMode={true}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editStartTime">Start Time</Label>
                      <Input
                        id="editStartTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editEndTime">End Time</Label>
                      <Input
                        id="editEndTime"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editStatus">Status</Label>
                    <select
                      id="editStatus"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as BookingStatus })}
                      className="flex h-11 w-full rounded-lg futuristic-input px-4 py-3 text-sm text-foreground bg-background focus-visible:outline-none"
                    >
                      <option value={BookingStatus.PENDING} className="bg-background text-foreground">Pending</option>
                      <option value={BookingStatus.ACCEPTED} className="bg-background text-foreground">Accepted</option>
                      <option value={BookingStatus.CONFIRMED} className="bg-background text-foreground">Confirmed</option>
                      <option value={BookingStatus.IN_PROGRESS} className="bg-background text-foreground">In Progress</option>
                      <option value={BookingStatus.COMPLETED} className="bg-background text-foreground">Completed</option>
                      <option value={BookingStatus.CANCELLED} className="bg-background text-foreground">Cancelled</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editTotalAmount">Total Amount ($)</Label>
                    <Input
                      id="editTotalAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.totalEstimateAmount}
                      onChange={(e) => setFormData({ ...formData, totalEstimateAmount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editDepositAmount">Deposit Amount ($)</Label>
                      <Input
                        id="editDepositAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.depositAmount}
                        onChange={(e) => setFormData({ ...formData, depositAmount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-end gap-2 h-11">
                        <input
                          id="editDepositPaid"
                          type="checkbox"
                          checked={formData.depositPaid}
                          onChange={(e) => setFormData({ ...formData, depositPaid: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="editDepositPaid" className="cursor-pointer">
                          Deposit Paid
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      disabled={isSubmitting}
                      className="flex-1 h-10 px-4 py-2 rounded-md border border-input bg-background shadow-sm hover:bg-accent hover:text-foreground disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Day View Modal - Timeline of all bookings */}
      <Dialog open={isDayViewOpen} onOpenChange={setIsDayViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClose={() => setIsDayViewOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {dayViewDate && dayViewDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </DialogTitle>
            <DialogDescription>
              {dayViewDate && `${getBookingsForDay(dayViewDate).length} booking${getBookingsForDay(dayViewDate).length !== 1 ? 's' : ''} scheduled`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-3">
              {dayViewDate && getBookingsForDay(dayViewDate)
                .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
                .map((booking) => {
                  return (
                    <div
                      key={booking.id}
                      className="pb-3 last:pb-0"
                    >
                      <div className="bg-card border border-border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`${getStatusStyle(booking.status)} text-xs`}>
                                {booking.status}
                              </Badge>
                              <span className="text-xs sm:text-sm font-semibold text-foreground">
                                {formatTime(booking.start_at)} - {formatTime(booking.end_at)}
                              </span>
                            </div>
                            <h4 className="text-sm sm:text-base font-semibold text-foreground mb-1">
                              {booking.services.length > 0
                                ? booking.services.map((s) => s.name).join(", ")
                                : "No service assigned"}
                            </h4>
                          </div>
                          <div className="text-right sm:text-right">
                            <div className="text-base sm:text-lg font-bold text-foreground">
                              ${booking.total_estimate_amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {booking.total_estimate_time_in_minutes} min
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <span className="text-muted-foreground">Deposit:</span>
                            <span className="ml-2 font-medium">
                              ${booking.deposit_amount.toFixed(2)}
                              {booking.deposit_paid && (
                                <span className="ml-1 text-green-600">✓ Paid</span>
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Balance:</span>
                            <span className="ml-2 font-medium">
                              ${booking.remaining_balance.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onClose={() => setIsDeleteConfirmOpen(false)}>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Booking</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to delete this booking?
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
              {/* Booking Summary */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Service:</span>
                  <span className="text-sm font-medium">
                    {selectedBooking.services.length > 0
                      ? selectedBooking.services.map((s) => s.name).join(", ")
                      : "No service"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date:</span>
                  <span className="text-sm font-medium">
                    {new Date(selectedBooking.start_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Time:</span>
                  <span className="text-sm font-medium">
                    {formatTime(selectedBooking.start_at)} - {formatTime(selectedBooking.end_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="text-sm font-semibold">
                    ${selectedBooking.total_estimate_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 h-10 px-4 py-2 rounded-md border border-input bg-background shadow-sm hover:bg-accent hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      // Add loading state for the booking's date
                      const bookingDate = new Date(selectedBooking.start_at);
                      const dateKey = bookingDate.toISOString().split('T')[0];
                      setLoadingDates(prev => new Set(prev).add(dateKey));

                      await deleteBooking(selectedBooking.id);

                      setIsDeleteConfirmOpen(false);
                      setIsBookingDetailsOpen(false);

                      if (onBookingCreated) onBookingCreated();

                      // Remove loading state after refresh
                      setTimeout(() => {
                        setLoadingDates(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(dateKey);
                          return newSet;
                        });
                      }, 1000);
                    } catch (error) {
                      console.error('Failed to delete booking:', error);
                      alert('Failed to delete booking. Please try again.');
                      // Remove loading state on error
                      const bookingDate = new Date(selectedBooking.start_at);
                      const dateKey = bookingDate.toISOString().split('T')[0];
                      setLoadingDates(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(dateKey);
                        return newSet;
                      });
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                  className="flex-1 h-10 px-2 sm:px-4 py-2 rounded-md bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 disabled:opacity-50 disabled:pointer-events-none font-medium text-xs sm:text-sm"
                >
                  {isDeleting ? 'Deleting...' : <><span className="hidden sm:inline">Confirm </span>Delete</>}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
