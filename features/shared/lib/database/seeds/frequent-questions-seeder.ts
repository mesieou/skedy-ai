// Frequent questions seeder
import { BaseSeeder } from './base-seeder';
import { FrequentQuestionsRepository } from '../repositories/frequent-questions-repository';
import type { FrequentQuestion, CreateFrequentQuestionData } from '../types/frequent-questions';
import {
  cancellationQuestionData,
  depositQuestionData,
  howAgentWorksQuestionData,
  targetBusinessesQuestionData,
  gettingStartedQuestionData,
  availabilityQuestionData,
  accuracyQuestionData,
  customerExperienceQuestionData,
  integrationQuestionData,
  controlQuestionData,
  missedCallsQuestionData,
  dataSecurityQuestionData,
  supportQuestionData,
  costSavingsQuestionData,
  trialQuestionData,
  customizationQuestionData
} from './data/frequent-questions-data';

export class FrequentQuestionsSeeder extends BaseSeeder<FrequentQuestion> {
  constructor() {
    super(new FrequentQuestionsRepository());
  }

  // Create frequent question with custom data
  async createFrequentQuestionWith(data: CreateFrequentQuestionData): Promise<FrequentQuestion> {
    return await this.create(data);
  }

  // Create all Skedy FAQ questions for a business
  async createSkedyFrequentQuestions(businessId: string): Promise<FrequentQuestion[]> {
    const skedyQuestions = [
      howAgentWorksQuestionData,
      targetBusinessesQuestionData,
      gettingStartedQuestionData,
      availabilityQuestionData,
      accuracyQuestionData,
      customerExperienceQuestionData,
      integrationQuestionData,
      controlQuestionData,
      missedCallsQuestionData,
      dataSecurityQuestionData,
      supportQuestionData,
      costSavingsQuestionData,
      trialQuestionData,
      customizationQuestionData
    ];

    const createdQuestions: FrequentQuestion[] = [];

    for (const questionData of skedyQuestions) {
      const data = {
        ...questionData,
        business_id: businessId // Replace placeholder with actual business ID
      };
      const question = await this.create(data);
      createdQuestions.push(question);
    }

    return createdQuestions;
  }

  // Create removalist/service business FAQ questions
  async createServiceBusinessFrequentQuestions(businessId: string): Promise<FrequentQuestion[]> {
    const serviceQuestions = [
      cancellationQuestionData,
      depositQuestionData
    ];

    const createdQuestions: FrequentQuestion[] = [];

    for (const questionData of serviceQuestions) {
      const data = {
        ...questionData,
        business_id: businessId // Replace placeholder with actual business ID
      };
      const question = await this.create(data);
      createdQuestions.push(question);
    }

    return createdQuestions;
  }
}
