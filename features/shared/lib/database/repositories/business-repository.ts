import { BaseRepository } from '../base-repository';
import type { Business } from '../types/business';
import { DateUtils } from '@/features/shared/utils/date-utils';

export class BusinessRepository extends BaseRepository<Business> {
  constructor() {
    super('businesses'); // Table name (plural)
  }

  async findBusinessesAtMidnight(currentUtcTime?: string): Promise<Business[]> {
    const utcTime = currentUtcTime || DateUtils.nowUTC();
    const allBusinesses = await this.findAll();
    
    return allBusinesses.filter(business => 
      DateUtils.isMidnightInTimezone(utcTime, business.time_zone)
    );
  }
}
