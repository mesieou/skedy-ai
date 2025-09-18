import { BaseSeeder } from './base-seeder';
import { PromptRepository } from '../repositories/prompt-repository';
import type { Prompt } from '../types/prompt';

export class PromptsSeeder extends BaseSeeder<Prompt> {
  constructor() {
    super(new PromptRepository());
  }
}

export const promptsSeeder = new PromptsSeeder();
