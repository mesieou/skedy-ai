import { BaseRepository } from '../base-repository';
import type { BusinessTool } from '../types/tools';

export class BusinessToolsRepository extends BaseRepository<BusinessTool> {
  constructor() {
    super('business_tools');
  }

  /**
   * Find all tools for a business
   */
  async findByBusinessId(businessId: string): Promise<BusinessTool[]> {
    return await this.findAll(
      { orderBy: 'created_at', ascending: true },
      { business_id: businessId }
    );
  }

  /**
   * Find active tools for a business
   */
  async findActiveByBusinessId(businessId: string): Promise<BusinessTool[]> {
    return await this.findAll(
      { orderBy: 'created_at', ascending: true },
      { business_id: businessId, active: true }
    );
  }

  /**
   * Find specific business tool
   */
  async findByBusinessAndTool(businessId: string, toolId: string): Promise<BusinessTool | null> {
    return await this.findOne({ business_id: businessId, tool_id: toolId });
  }

  /**
   * Enable/disable tool for business
   */
  async setToolActive(businessId: string, toolId: string, active: boolean): Promise<void> {
    await this.updateOne(
      { business_id: businessId, tool_id: toolId },
      { active }
    );
  }
}
