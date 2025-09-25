import type { CreateCalendarSettingsData } from '../../types/calendar-settings';

// Test calendar settings data for seeding - Monday to Friday worker
// Working hours are stored in UTC (Melbourne 07:00-17:00 = UTC 21:00-07:00)
export const weekdayCalendarSettingsData: CreateCalendarSettingsData = {
  user_id: "placeholder-user-id", // Will be replaced with actual user_id
  settings: {
    "bufferTime": 15,
  },
  working_hours: {
    mon: { start: '21:00', end: '07:00' }, // Melbourne 7 AM - 5 PM = UTC 21:00 - 07:00 next day
    tue: { start: '21:00', end: '07:00' },
    wed: { start: '21:00', end: '07:00' },
    thu: { start: '21:00', end: '07:00' },
    fri: { start: '21:00', end: '07:00' },
    sat: null,
    sun: null
  }
};

// Test calendar settings data for seeding - Monday to Thursday + Weekend worker
// Working hours are stored in UTC (Melbourne times converted to UTC)
export const weekendCalendarSettingsData: CreateCalendarSettingsData = {
    user_id: "placeholder-user-id", // Will be replaced with actual user_id
    settings: {
      "bufferTime": 30,
    },
    working_hours: {
      mon: { start: '21:00', end: '07:00' }, // Melbourne 7 AM - 5 PM = UTC 21:00 - 07:00 next day
      tue: { start: '21:00', end: '07:00' },
      wed: { start: '21:00', end: '07:00' },
      thu: { start: '21:00', end: '07:00' },
      fri: null, // Takes Friday off
      sat: { start: '21:00', end: '03:00' }, // Melbourne 7 AM - 1 PM = UTC 21:00 - 03:00 next day
      sun: { start: '21:00', end: '03:00' }
    }
  };
