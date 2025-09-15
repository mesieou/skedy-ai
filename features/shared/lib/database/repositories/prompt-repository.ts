import { BaseRepository } from '../base-repository';
import type { Prompt } from '../types/prompt';

export class PromptRepository extends BaseRepository<Prompt> {
  constructor() {
    super('prompts');
  }
}
