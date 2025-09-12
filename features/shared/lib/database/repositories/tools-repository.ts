import { BaseRepository } from '../base-repository';
import type { Tool } from '../types/tools';

export class ToolsRepository extends BaseRepository<Tool> {
  constructor() {
    super('tools');
  }

  /**
   * Find tool by name
   */
  async findByName(name: string): Promise<Tool | null> {
    return await this.findOne({ name });
  }

  /**
   * Find all active tools
   */
  async findActive(): Promise<Tool[]> {
    return await this.findAll({
      orderBy: 'name',
      ascending: true
    });
  }

  /**
   * Find tools by version
   */
  async findByVersion(version: string): Promise<Tool[]> {
    return await this.findAll(
      { orderBy: 'name', ascending: true },
      { version }
    );
  }
}
