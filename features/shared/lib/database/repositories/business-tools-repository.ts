import { BaseRepository } from '../base-repository';
import type { BusinessTool } from '../types/business-tools';

export class BusinessToolsRepository extends BaseRepository<BusinessTool> {
  constructor() {
    super('business_tools');
  }
}
