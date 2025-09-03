import { PromptBuilder } from '../../intelligence/prompt-builder';
import { businessContextProvider } from '../../../shared/lib/database/business-context-provider';
import type { BusinessContext } from '../../../shared/lib/database/types/business-context';

describe('PromptBuilder', () => {
  let realBusinessContext: BusinessContext;
  const testTwilioAccountSid = process.env.TEST_TWILIO_ACCOUNT_SID || 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

  beforeAll(async () => {
    // Get real business context from database using Twilio Account SID
    realBusinessContext = await businessContextProvider.getBusinessContextByTwilioSid(testTwilioAccountSid);
    console.log(`✅ Loaded real business context for: ${realBusinessContext.businessInfo.name}`);
  });

  describe('buildPrompt', () => {
    it('should build complete AI receptionist prompt with real business context', () => {
      const prompt = PromptBuilder.buildPrompt(realBusinessContext);

      expect(prompt).toContain('# Role & Objective');
      expect(prompt).toContain('You are an AI receptionist');
      expect(prompt).toContain('CLOSE LEADS and BOOK APPOINTMENTS');
      expect(prompt).toContain('# Personality & Tone');
      expect(prompt).toContain('like Alex Hormozi but Australian');
      expect(prompt).toContain('# INJECTED BUSINESS CONTEXT');
      expect(prompt).toContain(realBusinessContext.businessInfo.name);
      expect(prompt).toContain(realBusinessContext.businessInfo.phone);

      // Check services are included
      if (realBusinessContext.services.length > 0) {
        expect(prompt).toContain(realBusinessContext.services[0].name);
      }

      // Check FAQs are included if they exist
      if (realBusinessContext.frequently_asked_questions.length > 0) {
        expect(prompt).toContain(realBusinessContext.frequently_asked_questions[0].title);
      }
    });

    it('should include tools section by default', () => {
      const prompt = PromptBuilder.buildPrompt(realBusinessContext);

      expect(prompt).toContain('# Tools');
      expect(prompt).toContain('get_customer_info_for_escalation');
      expect(prompt).toContain('get_quote');
      expect(prompt).toContain('make_booking');
      expect(prompt).toContain('escalate_conversation');
    });

    it('should exclude tools section when requested', () => {
      const prompt = PromptBuilder.buildPrompt(realBusinessContext, {
        includeTools: false
      });

      expect(prompt).not.toContain('# Tools');
      expect(prompt).not.toContain('get_quote');
      expect(prompt).not.toContain('make_booking');
    });

    it('should include custom instructions when provided', () => {
      const customInstructions = 'Focus on premium service quality';
      const prompt = PromptBuilder.buildPrompt(realBusinessContext, {
        customInstructions
      });

      expect(prompt).toContain('# Additional Instructions');
      expect(prompt).toContain(customInstructions);
    });

    it('should include conversation history when provided', () => {
      const conversationHistory = 'Customer called about house moving quote';
      const prompt = PromptBuilder.buildPrompt(realBusinessContext, {
        conversationHistory
      });

      expect(prompt).toContain('# Current Conversation Context');
      expect(prompt).toContain(conversationHistory);
    });

    it('should include escalation tools in handling issues section', () => {
      const prompt = PromptBuilder.buildPrompt(realBusinessContext);

      expect(prompt).toContain('# Handling Issues');
      expect(prompt).toContain('Use get_customer_info_for_escalation then escalate_conversation');
    });
  });

  describe('comprehensive prompt content', () => {
    it('should include greeting variations in main prompt', () => {
      const prompt = PromptBuilder.buildPrompt(realBusinessContext);

      expect(prompt).toContain('Greeting');
      expect(prompt).toContain('Rachel');
      expect(prompt).toContain(realBusinessContext.businessInfo.name);
      expect(prompt).toContain('Short and upbeat');
    });

    it('should include closing techniques in main prompt', () => {
      const prompt = PromptBuilder.buildPrompt(realBusinessContext);

      expect(prompt).toContain('Close');
      expect(prompt).toContain('Do you want to get started?');
      expect(prompt).toContain('Let\'s book it in now');
      expect(prompt).toContain('direct');
    });

    it('should include objection handling in main prompt', () => {
      const prompt = PromptBuilder.buildPrompt(realBusinessContext);

      expect(prompt).toContain('Handle Concerns');
      expect(prompt).toContain('Alex Hormozi');
      expect(prompt).toContain('reassurance');
    });

    it('should include diagnostic questions in main prompt', () => {
      const prompt = PromptBuilder.buildPrompt(realBusinessContext);

      expect(prompt).toContain('Diagnose Before Prescribing');
      expect(prompt).toContain('Can you tell me a little bit about the job?');
      expect(prompt).toContain('When would you like us to get this sorted');
    });
  });

  describe('injectBusinessName', () => {
    it('should replace business name placeholders', () => {
      const text = 'Welcome to {BusinessName}, how can {BusinessName} help?';
      const result = PromptBuilder.injectBusinessName(text, realBusinessContext.businessInfo.name);

      expect(result).toBe(`Welcome to ${realBusinessContext.businessInfo.name}, how can ${realBusinessContext.businessInfo.name} help?`);
    });
  });

  describe('business context section', () => {
    it('should format real business payment information correctly', () => {
      const prompt = PromptBuilder.buildPrompt(realBusinessContext);

      expect(prompt).toContain(`**Payment Methods**: ${realBusinessContext.businessInfo.payment_methods.join(', ')}`);
      expect(prompt).toContain(`**Preferred Payment**: ${realBusinessContext.businessInfo.preferred_payment_method}`);

      if (realBusinessContext.businessInfo.charges_deposit) {
        if (realBusinessContext.businessInfo.deposit_percentage) {
          expect(prompt).toContain(`**Deposit Required**: ${realBusinessContext.businessInfo.deposit_percentage}% of total`);
        } else if (realBusinessContext.businessInfo.deposit_fixed_amount) {
          expect(prompt).toContain(`**Deposit Required**: ${realBusinessContext.businessInfo.currency_code} ${realBusinessContext.businessInfo.deposit_fixed_amount}`);
        }
      } else {
        expect(prompt).toContain('**Deposit**: No deposit required');
      }
    });

    it('should format real business service location information correctly', () => {
      const prompt = PromptBuilder.buildPrompt(realBusinessContext);

      if (realBusinessContext.businessInfo.offer_mobile_services && realBusinessContext.businessInfo.offer_location_services) {
        expect(prompt).toContain('Both mobile (we come to you) and location-based (you come to us)');
      } else if (realBusinessContext.businessInfo.offer_mobile_services) {
        expect(prompt).toContain('Mobile service only - we come to your location');
      } else if (realBusinessContext.businessInfo.offer_location_services) {
        expect(prompt).toContain('Location-based only - customers come to our location');
      }
    });

    it('should include real business services with pricing', () => {
      const prompt = PromptBuilder.buildPrompt(realBusinessContext);

      if (realBusinessContext.services.length > 0) {
        expect(prompt).toContain('**Available Services**:');
        expect(prompt).toContain(realBusinessContext.services[0].name);
        expect(prompt).toContain(realBusinessContext.services[0].description);
      }
    });

    it('should include real business FAQs if they exist', () => {
      const prompt = PromptBuilder.buildPrompt(realBusinessContext);

      if (realBusinessContext.frequently_asked_questions.length > 0) {
        expect(prompt).toContain('**Frequently Asked Questions**:');
        expect(prompt).toContain(realBusinessContext.frequently_asked_questions[0].title);
        expect(prompt).toContain(realBusinessContext.frequently_asked_questions[0].content);
      }
    });
  });
});
