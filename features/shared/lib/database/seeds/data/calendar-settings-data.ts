import type { CreateCalendarSettingsData } from '../../types/calendar-settings';

// Test calendar settings data for seeding - Monday to Friday worker
// Working hours are stored in LOCAL BUSINESS TIME (Melbourne timezone)
export const weekdayCalendarSettingsData: CreateCalendarSettingsData = {
  user_id: "placeholder-user-id", // Will be replaced with actual user_id
  settings: {
    "bufferTime": 15,
  },
  working_hours: {
    mon: { start: '07:00', end: '17:00' }, // Melbourne 7 AM - 5 PM (local time)
    tue: { start: '07:00', end: '17:00' },
    wed: { start: '07:00', end: '17:00' },
    thu: { start: '07:00', end: '17:00' },
    fri: { start: '07:00', end: '17:00' },
    sat: null,
    sun: null
  }
};

// Test calendar settings data for seeding - Monday to Thursday + Weekend worker
// Working hours are stored in LOCAL BUSINESS TIME (Melbourne timezone)
export const weekendCalendarSettingsData: CreateCalendarSettingsData = {
    user_id: "placeholder-user-id", // Will be replaced with actual user_id
    settings: {
      "bufferTime": 30,
    },
    working_hours: {
      mon: { start: '07:00', end: '17:00' }, // Melbourne 7 AM - 5 PM (local time)
      tue: { start: '07:00', end: '17:00' },
      wed: { start: '07:00', end: '17:00' },
      thu: { start: '07:00', end: '17:00' },
      fri: null, // Takes Friday off
      sat: { start: '07:00', end: '13:00' }, // Melbourne 7 AM - 1 PM (local time)
      sun: { start: '07:00', end: '13:00' }
    }
  };

  export const TigaCalendar1SettingsData: CreateCalendarSettingsData = {
    user_id: "placeholder-user-id", // Will be replaced with actual user_id
    settings: {
      "bufferTime": 30,
    },
    working_hours: {
      mon: { start: '06:00', end: '23:00' }, // Melbourne 7 AM - 5 PM (local time)
      tue: { start: '06:00', end: '23:00' },
      wed: { start: '06:00', end: '23:00' },
      thu: { start: '06:00', end: '23:00' },
      fri: { start: '06:00', end: '23:00' },
      sat: { start: '06:00', end: '23:00' }, // Melbourne 7 AM - 1 PM (local time)
      sun: { start: '06:00', end: '23:00' }
    }
  };

  export const TigaCalendar2SettingsData: CreateCalendarSettingsData = {
    user_id: "placeholder-user-id", // Will be replaced with actual user_id
    settings: {
      "bufferTime": 30,
    },
    working_hours: {
      mon: { start: '06:00', end: '23:00' }, // Melbourne 7 AM - 5 PM (local time)
      tue: { start: '06:00', end: '23:00' },
      wed: { start: '06:00', end: '23:00' },
      thu: { start: '06:00', end: '23:00' },
      fri: { start: '06:00', end: '23:00' },
      sat: { start: '06:00', end: '23:00' }, // Melbourne 7 AM - 1 PM (local time)
      sun: { start: '06:00', end: '23:00' }
    }
  };

  export const TigaCalendar3SettingsData: CreateCalendarSettingsData = {
    user_id: "placeholder-user-id", // Will be replaced with actual user_id
    settings: {
      "bufferTime": 30,
    },
    working_hours: {
      mon: { start: '06:00', end: '23:00' }, // Melbourne 7 AM - 5 PM (local time)
      tue: { start: '06:00', end: '23:00' },
      wed: { start: '06:00', end: '23:00' },
      thu: { start: '06:00', end: '23:00' },
      fri: { start: '06:00', end: '23:00' },
      sat: { start: '06:00', end: '23:00' }, // Melbourne 7 AM - 1 PM (local time)
      sun: { start: '06:00', end: '23:00' }
    }
  };

  export const TigaCalendar4SettingsData: CreateCalendarSettingsData = {
    user_id: "placeholder-user-id", // Will be replaced with actual user_id
    settings: {
      "bufferTime": 30,
    },
    working_hours: {
      mon: { start: '06:00', end: '23:00' }, // Melbourne 7 AM - 5 PM (local time)
      tue: { start: '06:00', end: '23:00' },
      wed: { start: '06:00', end: '23:00' },
      thu: { start: '06:00', end: '23:00' },
      fri: { start: '06:00', end: '23:00' },
      sat: { start: '06:00', end: '23:00' }, // Melbourne 7 AM - 1 PM (local time)
      sun: { start: '06:00', end: '23:00' }
    }
  };

  export const TigaCalendar5SettingsData: CreateCalendarSettingsData = {
    user_id: "placeholder-user-id", // Will be replaced with actual user_id
    settings: {
      "bufferTime": 30,
    },
    working_hours: {
      mon: { start: '06:00', end: '23:00' }, // Melbourne 7 AM - 5 PM (local time)
      tue: { start: '06:00', end: '23:00' },
      wed: { start: '06:00', end: '23:00' },
      thu: { start: '06:00', end: '23:00' },
      fri: { start: '06:00', end: '23:00' },
      sat: { start: '06:00', end: '23:00' }, // Melbourne 7 AM - 1 PM (local time)
      sun: { start: '06:00', end: '23:00' }
    }
  };
