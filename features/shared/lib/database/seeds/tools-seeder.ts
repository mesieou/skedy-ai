import { BaseSeeder } from './base-seeder';
import { ToolsRepository } from '../repositories/tools-repository';
import type { Tool } from '../types/tools';

export class ToolsSeeder extends BaseSeeder<Tool> {
  constructor() {
    super(new ToolsRepository());
  }
}

export const toolsSeeder = new ToolsSeeder();
