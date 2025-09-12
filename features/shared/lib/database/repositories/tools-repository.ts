import { BaseRepository } from '../base-repository';
import type { Tool } from '../types/tools';

export class ToolsRepository extends BaseRepository<Tool> {
  constructor() {
    super('tools');
  }
}
