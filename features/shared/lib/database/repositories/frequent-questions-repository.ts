import { BaseRepository } from '../base-repository';
import type { FrequentQuestion } from '../types/frequent-questions';

export class FrequentQuestionsRepository extends BaseRepository<FrequentQuestion> {
  constructor() {
    super('frequent_questions');
  }
}
