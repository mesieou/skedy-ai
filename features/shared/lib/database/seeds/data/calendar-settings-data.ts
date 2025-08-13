import type { CreateCalendarSettingsData } from '../../types/calendar-settings';

// Test calendar settings data for seeding
export const weekdayCalendarSettingsData: CreateCalendarSettingsData = {
  user_id: "placeholder-user-id", // Will be replaced with actual user_id
  settings: {
    "bufferTime": 15,
  },
  working_hours: {
    mon: { start: '07:00', end: '17:00' },
    tue: { start: '07:00', end: '17:00' },
    wed: { start: '07:00', end: '17:00' },
    thu: { start: '07:00', end: '17:00' },
    sat: null,
    sun: null, 

  }
};

// Test calendar settings data for seeding
export const weekendCalendarSettingsData: CreateCalendarSettingsData = {
    user_id: "placeholder-user-id", // Will be replaced with actual user_id
    settings: {
      "bufferTime": 30,
    },
    working_hours: {
      mon: { start: '07:00', end: '17:00' },
      tue: { start: '07:00', end: '17:00' },
      wed: { start: '07:00', end: '17:00' },
      thu: { start: '07:00', end: '17:00' },
      fri: null,
      sat: { start: '07:00', end: '13:00' },
      sun: { start: '07:00', end: '13:00' }
    }
  };
