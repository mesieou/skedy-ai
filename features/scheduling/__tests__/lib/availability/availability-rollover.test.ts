/**
 * Availability Rollover Test
 * Tests rollover functionality with updated availability generation logic
 */

import { AvailabilityManager } from '../../../lib/availability/availability-manager';
import { createTigaRemovalistBusinessData } from '@/features/shared/lib/database/seeds/data/business-data';
import { weekdayCalendarSettingsData, weekendCalendarSettingsData } from '@/features/shared/lib/database/seeds/data/calendar-settings-data';
import type { User } from '@/features/shared/lib/database/types/user';
import { UserRole } from '@/features/shared/lib/database/types/user';
import type { CalendarSettings } from '@/features/shared/lib/database/types/calendar-settings';
import type { Business } from '@/features/shared/lib/database/types/business';
import type { AvailabilitySlots } from '@/features/shared/lib/database/types/availability-slots';
import { DateUtils } from '@/features/shared/utils/date-utils';

describe('Availability Rollover Test', () => {
  let business: Business;
  let providers: User[];
  let calendarSettings: CalendarSettings[];

  beforeEach(() => {
    const businessData = createTigaRemovalistBusinessData();
    business = {
      id: 'test-business-id',
      ...businessData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Business;

    providers = [
      {
        id: 'provider-1-id',
        business_id: business.id,
        email: 'provider1@test.com',
        first_name: 'John',
        last_name: 'Smith',
        phone_number: '+61400000001',
        role: UserRole.PROVIDER,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'provider-2-id',
        business_id: business.id,
        email: 'provider2@test.com',
        first_name: 'Jane',
        last_name: 'Doe',
        phone_number: '+61400000002',
        role: UserRole.PROVIDER,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    calendarSettings = [
      {
        id: 'calendar-1-id',
        user_id: providers[0].id,
        settings: weekdayCalendarSettingsData.settings,
        working_hours: weekdayCalendarSettingsData.working_hours,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'calendar-2-id',
        user_id: providers[1].id,
        settings: weekendCalendarSettingsData.settings,
        working_hours: weekendCalendarSettingsData.working_hours,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  });

  describe('30-Day Availability Generation', () => {
    it('should generate correct slot format for 30 days', async () => {
      const emptySlots: AvailabilitySlots = {
        id: 'availability-id',
        business_id: business.id,
        slots: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const manager = new AvailabilityManager(emptySlots, business);

      const result = await manager.generateInitialBusinessAvailability(
        providers,
        calendarSettings,
        '2025-10-02',
        30
      );

      const utcDates = Object.keys(result.slots).sort();
      expect(utcDates.length).toBeGreaterThan(30);

      // Verify slot format [time, count, timestampMs]
      const firstDate = utcDates[0];
      const slots = result.slots[firstDate]['60'];

      slots.forEach(([time, count, timestampMs]) => {
        expect(typeof time).toBe('string');
        expect(typeof count).toBe('number');
        expect(typeof timestampMs).toBe('number');
        expect(time).toMatch(/^\d{2}:\d{2}$/);
      });

      console.log(`Generated ${utcDates.length} UTC dates for 30 business days`);
    });
  });

  describe('Cron Job Integration', () => {
    it('should have orchestrateAvailabilityRollover method', () => {
      expect(typeof AvailabilityManager.orchestrateAvailabilityRollover).toBe('function');
      console.log('Cron job method exists');
    });

    it('should handle timezone midnight detection', () => {
      const melbourneMidnight = "2025-01-15T13:00:00.000Z";
      const isMidnight = DateUtils.isMidnightInTimezone(melbourneMidnight, "Australia/Melbourne");
      expect(isMidnight).toBe(true);
      console.log('Timezone midnight detection working');
    });
  });
});
