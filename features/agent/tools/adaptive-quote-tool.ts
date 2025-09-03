/**
 * Adaptive Quote Tool
 *
 * Simplified conversation flow manager for quote collection
 * Focuses on session management and question progression
 */

import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { QuoteSession, QuoteRequirements } from './types';
import { RequirementsEngine } from './requirements-engine';

export class AdaptiveQuoteTool {
  private requirementsEngine: RequirementsEngine;
  private businessContext: BusinessContext;

  constructor(businessContext: BusinessContext) {
    this.businessContext = businessContext;
    this.requirementsEngine = new RequirementsEngine(businessContext.businessInfo);
  }

  /**
   * Start a quote process - handles single or multi-service scenarios
   */
  startQuote(
    serviceIds?: string[]
  ): {
    needsMoreInfo: boolean;
    nextQuestion?: string;
    availableServices?: Array<{id: string; name: string}>;
    error?: string;
    session?: QuoteSession;
  } {
    // If no services specified, help customer choose
    if (!serviceIds || serviceIds.length === 0) {
      return {
        needsMoreInfo: true,
        nextQuestion: "Which service are you interested in?",
        availableServices: this.businessContext.services.map(s => ({
          id: s.id,
          name: s.name
        })),
        session: this.createInitialSession([], false)
      };
    }

    // Validate services exist
    const validServices = this.validateServices(serviceIds);
    if (validServices.length === 0) {
      return {
        needsMoreInfo: false,
        error: "No valid services found"
      };
    }

    // Get services and analyze requirements
    const services = validServices.map(id =>
      this.businessContext.services.find(s => s.id === id)!
    );
    const isMultiService = services.length > 1;

    const requirements = isMultiService
      ? this.requirementsEngine.analyzeMultipleServices(services)
      : this.requirementsEngine.analyzeService(services[0]);

    const questions = this.requirementsEngine.generateQuestions(requirements);
    const missingRequirements = this.extractRequiredFields(requirements);

    return {
      needsMoreInfo: questions.length > 0,
      nextQuestion: questions[0],
      session: {
        serviceIds: validServices,
        collectedInfo: {},
        missingRequirements,
        isMultiService,
        currentStep: 'info_collection'
      }
    };
  }

  /**
   * Process customer response and determine next step
   */
  processResponse(
    session: QuoteSession,
    customerResponse: string
  ): {
    needsMoreInfo: boolean;
    nextQuestion?: string;
    readyForQuote: boolean;
    updatedSession: QuoteSession;
  } {
    // Parse response to extract information
    const extractedInfo = this.parseCustomerResponse(customerResponse, session);

    // Update session with extracted info
    const updatedSession = {
      ...session,
      collectedInfo: { ...session.collectedInfo, ...extractedInfo }
    };

    // Get services and requirements
    const services = session.serviceIds.map(id =>
      this.businessContext.services.find(s => s.id === id)!
    );

    const requirements = session.isMultiService
      ? this.requirementsEngine.analyzeMultipleServices(services)
      : this.requirementsEngine.analyzeService(services[0]);

    // Check what's still missing
    const missingRequirements = this.getMissingRequirements(requirements, updatedSession.collectedInfo);
    updatedSession.missingRequirements = missingRequirements;

    // Determine if ready for quote
    if (missingRequirements.length === 0) {
      updatedSession.currentStep = 'quote_generation';
      return {
        needsMoreInfo: false,
        nextQuestion: undefined,
        readyForQuote: true,
        updatedSession
      };
    }

    // Still need more info - ask next question
    const questions = this.requirementsEngine.generateQuestions(requirements);
    const completedRequirements = this.extractRequiredFields(requirements).length - missingRequirements.length;
    const nextQuestion = questions[completedRequirements] || "What else can you tell me about your job?";

    return {
      needsMoreInfo: true,
      nextQuestion,
      readyForQuote: false,
      updatedSession
    };
  }

  /**
   * Create initial session for service selection
   */
  private createInitialSession(serviceIds: string[], isMultiService: boolean): QuoteSession {
    return {
      serviceIds,
      collectedInfo: {},
      missingRequirements: [],
      isMultiService,
      currentStep: 'service_selection'
    };
  }

  /**
   * Validate that service IDs exist in business context
   */
  private validateServices(serviceIds: string[]): string[] {
    return serviceIds.filter(id =>
      this.businessContext.services.some(s => s.id === id)
    );
  }

  /**
   * Extract required field names from requirements
   */
  private extractRequiredFields(requirements: QuoteRequirements): string[] {
    return [...requirements.basic, ...requirements.addresses]
      .filter(req => req.required)
      .map(req => req.field);
  }

  /**
   * Parse customer response to extract structured information
   * This is a simplified version - in production, use NLP/AI parsing
   */
  private parseCustomerResponse(response: string, session: QuoteSession): Record<string, string | number | boolean | string[]> {
    const extracted: Record<string, string | number | boolean | string[]> = {};
    const lowerResponse = response.toLowerCase();

    // Simple pattern matching - in production, use more sophisticated parsing
    // Numbers
    const numberMatch = response.match(/(\d+)/);
    if (numberMatch && session.missingRequirements.some(req => req.includes('number_'))) {
      const numberField = session.missingRequirements.find(req => req.includes('number_'));
      if (numberField) {
        extracted[numberField] = parseInt(numberMatch[1]);
      }
    }

    // Addresses (very simplified)
    if (lowerResponse.includes('street') || lowerResponse.includes('road') || lowerResponse.includes('avenue')) {
      if (session.missingRequirements.includes('pickup_address')) {
        extracted.pickup_address = response;
      } else if (session.missingRequirements.includes('service_address')) {
        extracted.service_address = response;
      }
    }

    // Job scope keywords
    const jobScopeKeywords = ['one item', 'few items', 'bedroom', 'office'];
    const jobScopeMatch = jobScopeKeywords.find(keyword => lowerResponse.includes(keyword));
    if (jobScopeMatch && session.missingRequirements.includes('job_scope')) {
      extracted.job_scope = jobScopeMatch.replace(' ', '_');
    }

    return extracted;
  }

  /**
   * Get missing required fields from current collected info
   */
  private getMissingRequirements(requirements: QuoteRequirements, collectedInfo: Record<string, string | number | boolean | string[]>): string[] {
    return [...requirements.basic, ...requirements.addresses]
      .filter(req => req.required && !collectedInfo[req.field])
      .map(req => req.field);
  }
}
