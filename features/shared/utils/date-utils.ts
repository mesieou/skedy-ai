import { DateTime } from 'luxon';

/**
 * Date utility functions for scheduling operations
 */
export class DateUtils {
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
