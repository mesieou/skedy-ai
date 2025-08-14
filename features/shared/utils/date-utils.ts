import { DateTime } from 'luxon';

/**
 * Date utility functions for scheduling operations - ALL DATES IN UTC
 */
export class DateUtils {
  // ========================
  // UTC DATE UTILITIES
  // ========================
  
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
   * Get difference in minutes between two UTC ISO strings
   */
  static diffMinutesUTC(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  }

  /**
   * Check if a UTC ISO string is valid
   */
  static isValidUTC(utcIsoString: string): boolean {
    const date = new Date(utcIsoString);
    return !isNaN(date.getTime()) && utcIsoString.endsWith('Z');
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

  // ========================
  // EXISTING LUXON UTILITIES (for compatibility)
  // ========================

  /**
   * Create Date from datetime string in timezone and return milliseconds
   */
  static createDateTimeInMillis(dateTime: string, timezone: string): number {
    return DateTime.fromISO(dateTime, { zone: timezone }).toMillis();
  }

  /**
   * Extract date string (YYYY-MM-DD) from a Date object
   */
  static extractDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get milliseconds timestamp from a Date object
   */
  static getTimestamp(date: Date): number {
    return date.getTime();
  }

  /**
   * Create DateTime from date string and time string, return milliseconds
   */
  static createSlotTimestamp(dateStr: string, timeStr: string): number {
    return DateTime.fromISO(`${dateStr}T${timeStr}`).toMillis();
  }

  /**
   * Calculate end timestamp from start timestamp and duration in minutes
   */
  static calculateEndTimestamp(startTimestamp: number, durationMinutes: number): number {
    return startTimestamp + durationMinutes * 60 * 1000;
  }

  /**
   * Check if two time periods overlap
   */
  static doPeriodsOverlap(
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): boolean {
    return start1 < end2 && end1 > start2;
  }
}
