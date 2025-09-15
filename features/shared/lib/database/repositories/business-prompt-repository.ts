import { BaseRepository } from '../base-repository';
import type { BusinessPrompt } from '../types/business-prompt';

export class BusinessPromptRepository extends BaseRepository<BusinessPrompt> {
  constructor() {
    super('business_prompts');
  }
}
