/**
 * Date utility functions for scheduling operations - ALL DATES IN UTC
 * Uses only native JavaScript Date methods with UTC ISO strings
 */
export class DateUtils {
  /**
   * Get current UTC timestamp as ISO string
   */
  static nowUTC(): string {
    return new Date().toISOString();
  }

  /**
   * Create UTC ISO string from date components
   */
  static createUTC(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): string {
    // Note: month is 0-indexed in Date constructor
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).toISOString();
  }

  /**
   * Add minutes to a UTC ISO string and return new UTC ISO string
   */
  static addMinutesUTC(utcIsoString: string, minutes: number): string {
    const date = new Date(utcIsoString);
    date.setUTCMinutes(date.getUTCMinutes() + minutes);
    return date.toISOString();
  }

  /**
   * Add hours to a UTC ISO string and return new UTC ISO string
   */
  static addHoursUTC(utcIsoString: string, hours: number): string {
    return this.addMinutesUTC(utcIsoString, hours * 60);
  }

  /**
   * Add days to a UTC ISO string and return new UTC ISO string
   */
  static addDaysUTC(utcIsoString: string, days: number): string {
    const date = new Date(utcIsoString);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
  }

  /**
   * Add weeks to a UTC ISO string and return new UTC ISO string
   */
  static addWeeksUTC(utcIsoString: string, weeks: number): string {
    return this.addDaysUTC(utcIsoString, weeks * 7);
  }

  /**
   * Add months to a UTC ISO string and return new UTC ISO string
   */
  static addMonthsUTC(utcIsoString: string, months: number): string {
    const date = new Date(utcIsoString);
    date.setUTCMonth(date.getUTCMonth() + months);
    return date.toISOString();
  }

  /**
   * Add years to a UTC ISO string and return new UTC ISO string
   */
  static addYearsUTC(utcIsoString: string, years: number): string {
    const date = new Date(utcIsoString);
    date.setUTCFullYear(date.getUTCFullYear() + years);
    return date.toISOString();
  }

  /**
   * Get difference in minutes between two UTC ISO strings
   */
  static diffMinutesUTC(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  }

  /**
   * Get difference in hours between two UTC ISO strings
   */
  static diffHoursUTC(start: string, end: string): number {
    return Math.round(this.diffMinutesUTC(start, end) / 60);
  }

  /**
   * Get difference in days between two UTC ISO strings
   */
  static diffDaysUTC(start: string, end: string): number {
    return Math.round(this.diffHoursUTC(start, end) / 24);
  }

  /**
   * Check if a UTC ISO string is valid
   */
  static isValidUTC(utcIsoString: string): boolean {
    const date = new Date(utcIsoString);
    return !isNaN(date.getTime()) && utcIsoString.endsWith('Z');
  }

  /**
   * Check if a date string is valid YYYY-MM-DD format
   */
  static isValidDateFormat(dateStr: string): boolean {
    // Check format first
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return false;
    }

    // Check if it's a valid date (e.g., not 2023-02-30)
    const date = new Date(dateStr + 'T00:00:00.000Z');
    return !isNaN(date.getTime()) && this.extractDateString(date.toISOString()) === dateStr;
  }

  /**
   * Check if a time string is valid HH:MM format (24-hour)
   */
  static isValidTimeFormat(timeStr: string): boolean {
    // Check format first
    if (!timeStr.match(/^\d{2}:\d{2}$/)) {
      return false;
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }

  /**
   * Normalize phone number for consistency (remove formatting)
   */
  static normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/[\s\-\(\)]/g, '');
  }

  /**
   * Format date for natural display using Australian conventions
   */
  static formatDateForDisplay(dateStr: string): string {
    // Use DateUtils to create proper UTC timestamp
    const utcTimestamp = this.createSlotTimestamp(dateStr, '00:00:00');

    // Convert to Australian timezone
    const { date: localDate } = this.convertUTCToTimezone(utcTimestamp, 'Australia/Melbourne');

    // Create date object for formatting
    const date = new Date(localDate + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'Australia/Melbourne'
    };

    const formatted = date.toLocaleDateString('en-AU', options);

    // Add ordinal suffix to day
    const day = date.getDate();
    const suffix = this.getOrdinalSuffix(day);

    return formatted.replace(`${day}`, `${day}${suffix}`);
  }

  /**
   * Format time for natural display using Australian conventions
   */
  static formatTimeForDisplay(timeStr: string): string {
    // Create a UTC timestamp for the time
    const today = this.extractDateString(this.nowUTC());
    const utcTimestamp = this.createSlotTimestamp(today, timeStr + ':00');

    // Convert to Australian timezone
    const { time: localTime } = this.convertUTCToTimezone(utcTimestamp, 'Australia/Melbourne');

    // Parse the local time and format for display
    const [hours, minutes] = localTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Australia/Melbourne'
    });
  }

  /**
   * Get ordinal suffix for day (1st, 2nd, 3rd, 4th, etc.)
   */
  private static getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  /**
   * Ensure date string is properly formatted as UTC ISO string
   */
  static ensureUTC(dateInput: string | Date): string {
    if (typeof dateInput === 'string') {
      if (this.isValidUTC(dateInput)) {
        return dateInput;
      }
      // Try to parse and convert to UTC
      return new Date(dateInput).toISOString();
    }
    return dateInput.toISOString();
  }

  /**
   * Format UTC ISO string for display (YYYY-MM-DD HH:mm UTC)
   */
  static formatUTC(utcIsoString: string): string {
    const date = new Date(utcIsoString);
    return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
  }

  /**
   * Extract date string (YYYY-MM-DD) from UTC ISO string
   */
  static extractDateString(utcIsoString: string): string {
    return utcIsoString.split('T')[0];
  }

  /**
   * Extract time string (HH:mm:ss) from UTC ISO string
   */
  static extractTimeString(utcIsoString: string): string {
    return utcIsoString.split('T')[1].split('Z')[0];
  }

  /**
   * Get milliseconds timestamp from UTC ISO string
   */
  static getTimestamp(utcIsoString: string): number {
    return new Date(utcIsoString).getTime();
  }

  /**
   * Create UTC ISO string from date and time strings
   */
  static createSlotTimestamp(dateStr: string, timeStr: string): string {
    return `${dateStr}T${timeStr}Z`;
  }

  /**
   * Calculate end UTC ISO string from start and duration in minutes
   */
  static calculateEndTimestamp(startUtcIso: string, durationMinutes: number): string {
    return this.addMinutesUTC(startUtcIso, durationMinutes);
  }

  /**
   * Check if two UTC time periods overlap
   */
  static doPeriodsOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const start1Ms = this.getTimestamp(start1);
    const end1Ms = this.getTimestamp(end1);
    const start2Ms = this.getTimestamp(start2);
    const end2Ms = this.getTimestamp(end2);
    return start1Ms < end2Ms && end1Ms > start2Ms;
  }

  /**
   * Get start of day in UTC (00:00:00.000Z)
   */
  static startOfDayUTC(utcIsoString: string): string {
    const dateStr = this.extractDateString(utcIsoString);
    return `${dateStr}T00:00:00.000Z`;
  }

  /**
   * Get end of day in UTC (23:59:59.999Z)
   */
  static endOfDayUTC(utcIsoString: string): string {
    const dateStr = this.extractDateString(utcIsoString);
    return `${dateStr}T23:59:59.999Z`;
  }

  /**
   * Check if two UTC dates are on the same day
   */
  static isSameDayUTC(date1: string, date2: string): boolean {
    return this.extractDateString(date1) === this.extractDateString(date2);
  }

  /**
   * Check if a UTC date is before another UTC date
   */
  static isBeforeUTC(date1: string, date2: string): boolean {
    return this.getTimestamp(date1) < this.getTimestamp(date2);
  }

  /**
   * Check if a UTC date is after another UTC date
   */
  static isAfterUTC(date1: string, date2: string): boolean {
    return this.getTimestamp(date1) > this.getTimestamp(date2);
  }

  /**
   * Get the earlier of two UTC dates
   */
  static minUTC(date1: string, date2: string): string {
    return this.isBeforeUTC(date1, date2) ? date1 : date2;
  }

  /**
   * Get the later of two UTC dates
   */
  static maxUTC(date1: string, date2: string): string {
    return this.isAfterUTC(date1, date2) ? date1 : date2;
  }

  /**
   * Get yesterday's date from a UTC ISO string
   */
  static getYesterdayUTC(utcIsoString: string): string {
    return this.addDaysUTC(utcIsoString, -1);
  }

  /**
   * Check if it's midnight (00:00) in a specific timezone for a given UTC time
   */
  static isMidnightInTimezone(utcIsoString: string, timezone: string): boolean {
    try {
      const date = new Date(utcIsoString);
      const localTime = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);

      // Handle both "00:00" and "24:00" as midnight (JavaScript quirk)
      return localTime === '00:00' || localTime === '24:00';
    } catch (error) {
      console.error(`Invalid timezone: ${timezone}`, error);
      return false;
    }
  }

  /**
   * Convert UTC time to local time in a specific timezone
   */
  static convertUTCToTimezone(utcIsoString: string, timezone: string): { date: string; time: string } {
    try {
      const date = new Date(utcIsoString);
      const localDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);

      const localTime = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);

      return { date: localDate, time: localTime };
    } catch (error) {
      console.error(`Error converting UTC to timezone ${timezone}:`, error);
      throw new Error(`Invalid timezone: ${timezone}`);
    }
  }

  /**
   * Convert business local time to UTC ISO string
   */
  static convertBusinessTimeToUTC(dateStr: string, timeStr: string, timezone: string): string {
    try {
      // Create a date object in the business timezone
      const localDateTime = `${dateStr}T${timeStr}`;

      // Parse as local time in the specified timezone
      const date = new Date(localDateTime);

      // Get timezone offset for the specific date (handles DST)
      const tempDate = new Date(localDateTime);
      const utcTime = tempDate.getTime();
      const localTime = new Date(tempDate.toLocaleString("en-US", { timeZone: timezone })).getTime();
      const timezoneOffset = utcTime - localTime;

      // Adjust for timezone offset
      const utcDate = new Date(date.getTime() + timezoneOffset);

      return utcDate.toISOString();
    } catch (error) {
      console.error(`Error converting business time to UTC: ${dateStr} ${timeStr} in ${timezone}`, error);
      throw new Error(`Invalid date/time conversion: ${dateStr} ${timeStr}`);
    }
  }

  /**
   * Get the next date that needs availability generated based on existing slots
   */
  static getNextAvailabilityDate(existingSlots: { [dateKey: string]: { [durationKey: string]: [string, number][] } }): string {
    const existingDates = Object.keys(existingSlots);

    if (existingDates.length === 0) {
      // No existing slots, start from today
      return this.extractDateString(this.nowUTC());
    }

    // Sort dates and get the latest one
    const sortedDates = existingDates.sort();
    const latestDate = sortedDates[sortedDates.length - 1];

    // Return the day after the latest date
    const nextDay = this.addDaysUTC(`${latestDate}T00:00:00.000Z`, 1);
    return this.extractDateString(nextDay);
  }
}
