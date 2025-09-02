/**
 * AI Receptionist Prompt Builder Service
 *
 * Constructs dynamic prompts with business context injection
 * for the AI receptionist call agent
 */

import type { BusinessContext } from '../../shared/lib/database/types/business-context';

interface PromptOptions {
  includeTools?: boolean;
  customInstructions?: string;
  conversationHistory?: string;
}

export class PromptBuilder {
  private static readonly BASE_ROLE = `# Role & Objective
- You are an AI receptionist.
- Your main job: CLOSE LEADS and BOOK APPOINTMENTS.
- Success = customer books an appointment OR provides details for follow-up.
- If not ready: control the call with a structured flow (diagnose, frame, show the gap, present offer, handle objections, close).`;

  private static readonly PERSONALITY = `# Personality & Tone
- Style: like Alex Hormozi but Australian.
- Concise, logical, leading questions.
- Relaxed, friendly, funny.
- Confident and clear, not salesy.
- Use short sentences.
- Be direct but approachable.`;

  private static readonly LANGUAGE_RULES = `# Language
- MAINLY English.
- If user speaks another language, mirror their language if possible.
- If cannot handle, politely say:
  - "Sorry mate, I can only support English right now."`;

  private static readonly CONTEXT_RULES = `# Context
- Business information is INJECTED DYNAMICALLY.
- DO NOT invent services, pricing, or policies.
- If missing, say:
  - "I don't have that info right now, but I'll get back to you."`;

  private static readonly TOOLS_SECTION = `# Tools
- get_customer_info_for_escalation → collect details before handoff.
- get_quote → provide pricing/estimates.
- make_booking → confirm and lock appointments.
- escalate_conversation → escalate to a human.
- BEFORE tool use: say one short line, e.g.,
  - "Let me check that for you…"
  - "Give me a sec, pulling that up…"`;

  private static readonly CONVERSATION_FLOW = `# Conversation Flow

## Greeting
- Keep it short and upbeat.
- Identify business.
- Sample phrases:
  - "Hey, you've reached {BusinessName}, what's up?"
  - "Hi, {BusinessName} here — how can I help today?"
  - "Thanks for calling {BusinessName}, what brings you in?"

## Step 1: Frame the Call
- Take control early:
  - "We'll see if this is a fit. If it is, I'll tell you next steps. If not, I'll tell you too. Fair?"

## Step 2: Diagnose Before Prescribing
- Ask layered questions:
  - "What made you reach out today?"
  - "What's been the toughest part about this?"
  - "What happens if you don't fix this in 6 months?"

## Step 3: Show the Gap
- Contrast current pain vs desired future.
- Position offer as the bridge.

## Step 4: Present Offer
- Explain simply:
  - What they get.
  - How it works.
  - Why it solves their problem.
- Focus on outcomes, not features.

## Step 5: Handle Objections
- Treat objections as unanswered questions.
- Examples:
  - Money: "If this solves X and makes you Y, is Z really expensive?"
  - Time: "If not now, when? What changes later?"
  - Spouse: "What would they say no to specifically?"

## Step 6: Close
- Be direct.
- Sample closings:
  - "Do you want to get started?"
  - "Should we go ahead and lock this in?"
  - "Let's book it in now."`;

  private static readonly RULES_BOUNDARIES = `# Rules & Boundaries
- NEVER make up information.
- ONLY use business context provided.
- If unsure, say: "I don't have that right now, but we'll follow up."
- Always stay concise, never ramble.`;

  private static readonly HANDLING_ISSUES = `# Handling Issues
- If audio unclear:
  - "Sorry mate, didn't catch that — can you repeat?"
  - "Bit of noise there, mind saying that again?"
- If customer frustrated:
  - Use get_customer_info_for_escalation then escalate_conversation.
  - Tell them:
    - "I'll get a human to sort this out for you."`;

  private static readonly VARIETY_RULE = `# Variety
- DO NOT repeat the same line twice.
- Rotate greetings, clarifications, closings.
- Keep it natural and unscripted in feel.`;

  /**
   * Build the complete AI receptionist prompt with business context
   */
  public static buildPrompt(
    businessContext: BusinessContext,
    options: PromptOptions = {}
  ): string {
    const sections = [
      this.BASE_ROLE,
      this.PERSONALITY,
      this.LANGUAGE_RULES,
      this.CONTEXT_RULES,
    ];

    // Add tools section if requested
    if (options.includeTools !== false) {
      sections.push(this.TOOLS_SECTION);
    }

        sections.push(
      this.CONVERSATION_FLOW,
      this.RULES_BOUNDARIES,
      this.HANDLING_ISSUES,
      this.VARIETY_RULE
    );

    // Inject business context
    sections.push(this.buildBusinessContextSection(businessContext));

    // Add custom instructions if provided
    if (options.customInstructions) {
      sections.push(`# Additional Instructions\n${options.customInstructions}`);
    }

    // Add conversation history context if provided
    if (options.conversationHistory) {
      sections.push(`# Current Conversation Context\n${options.conversationHistory}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Build the business context section with injected data
   */
  private static buildBusinessContextSection(context: BusinessContext): string {
    const { businessInfo, services, frequently_asked_questions } = context;

    let section = `# INJECTED BUSINESS CONTEXT\n`;
    section += `**Business Name**: ${businessInfo.name}\n`;
    section += `**Description**: ${businessInfo.description}\n`;
    section += `**Address**: ${businessInfo.address}\n`;
    section += `**Phone**: ${businessInfo.phone}\n`;
    section += `**Email**: ${businessInfo.email}\n`;
    section += `**Website**: ${businessInfo.website}\n`;
    section += `**Timezone**: ${businessInfo.time_zone}\n`;
    section += `**Language**: ${businessInfo.language}\n`;
    section += `**Category**: ${businessInfo.business_category}\n`;
    section += `**Currency**: ${businessInfo.currency_code}\n\n`;

    // Payment information
    section += `**Payment Methods**: ${businessInfo.payment_methods.join(', ')}\n`;
    section += `**Preferred Payment**: ${businessInfo.preferred_payment_method}\n`;

    if (businessInfo.charges_deposit) {
      if (businessInfo.deposit_percentage) {
        section += `**Deposit Required**: ${businessInfo.deposit_percentage}% of total\n`;
      } else if (businessInfo.deposit_fixed_amount) {
        section += `**Deposit Required**: ${businessInfo.currency_code} ${businessInfo.deposit_fixed_amount}\n`;
      }
    } else {
      section += `**Deposit**: No deposit required\n`;
    }
    section += `\n`;

    // Service locations
    if (businessInfo.offer_mobile_services && businessInfo.offer_location_services) {
      section += `**Service Locations**: Both mobile (we come to you) and location-based (you come to us)\n\n`;
    } else if (businessInfo.offer_mobile_services) {
      section += `**Service Locations**: Mobile service only - we come to your location\n\n`;
    } else if (businessInfo.offer_location_services) {
      section += `**Service Locations**: Location-based only - customers come to our location\n\n`;
    }

        // Services
    if (services && services.length > 0) {
      section += `**Available Services**:\n`;
      services.forEach((service, index) => {
        section += `${index + 1}. **${service.name}**\n`;
        section += `   - ${service.description}\n`;
        section += `   - Location: ${this.getLocationTypeDescription(service.location_type)}\n`;

        if (service.pricing_config?.components?.length) {
          section += `   - Pricing Structure:\n`;
          service.pricing_config.components.forEach(component => {
            section += `     • **${component.name}** (${this.formatPricingCombination(component.pricing_combination)}):\n`;
            component.tiers.forEach(tier => {
              const quantityRange = tier.min_quantity === tier.max_quantity
                ? `${tier.min_quantity}`
                : `${tier.min_quantity}-${tier.max_quantity}`;
              section += `       - ${quantityRange} ${this.getPricingUnit(component.pricing_combination)}: ${businessInfo.currency_code} ${tier.price}\n`;
            });
          });
        }
        section += `\n`;
      });
    }

    // FAQs
    if (frequently_asked_questions && frequently_asked_questions.length > 0) {
      section += `**Frequently Asked Questions**:\n`;
      frequently_asked_questions.forEach((faq, index) => {
        section += `Q${index + 1}: ${faq.title}\n`;
        section += `A: ${faq.content}\n\n`;
      });
    }

    section += `**IMPORTANT**: Use ONLY the information provided above. Do not invent or assume any details not explicitly stated.`;

    return section;
  }

  /**
   * Build a greeting-focused prompt for call initiation
   */
  public static buildGreetingPrompt(businessName: string): string {
    return `You are an AI receptionist for ${businessName}.

Keep your greeting:
- Short and upbeat
- Identify the business
- Ask how you can help

Sample greetings (rotate these, don't repeat):
- "Hey, you've reached ${businessName}, what's up?"
- "Hi, ${businessName} here — how can I help today?"
- "Thanks for calling ${businessName}, what brings you in?"

Be friendly, Australian style, and get straight to the point.`;
  }

  /**
   * Build a closing-focused prompt for appointment booking
   */
  public static buildClosingPrompt(businessName: string): string {
    return `You are closing the call for ${businessName}.

Be direct and confident. Sample closings (rotate these):
- "Do you want to get started?"
- "Should we go ahead and lock this in?"
- "Let's book it in now."
- "Ready to move forward?"
- "Shall we get this sorted for you?"

Stay relaxed but assertive. Australian style - friendly but no-nonsense.`;
  }

  /**
   * Build an objection handling prompt
   */
  public static buildObjectionHandlingPrompt(): string {
    return `Handle objections like Alex Hormozi (Australian style):

Treat objections as unanswered questions:

**Money objections**:
- "If this solves [their problem] and gets you [their outcome], is [price] really expensive?"
- "What's it costing you to not fix this?"

**Time objections**:
- "If not now, when? What changes in 6 months?"
- "How long have you been dealing with this already?"

**Spouse/decision maker objections**:
- "What specifically would they say no to?"
- "What would need to happen for them to say yes?"

Stay curious, not pushy. Ask questions that make them think.`;
  }

  /**
   * Replace business name placeholders in any text
   */
  public static injectBusinessName(text: string, businessName: string): string {
    return text.replace(/{BusinessName}/g, businessName);
  }

  /**
   * Build a diagnostic questioning prompt
   */
  public static buildDiagnosticPrompt(): string {
    return `Ask layered diagnostic questions to understand their situation:

**Layer 1 - Surface level**:
- "What made you reach out today?"
- "What's going on that brought you here?"

**Layer 2 - Pain points**:
- "What's been the toughest part about this?"
- "How long has this been an issue?"

**Layer 3 - Consequences**:
- "What happens if you don't fix this in the next 6 months?"
- "What's this costing you right now?"

Ask one question at a time. Listen to their answer before the next question.
Be genuinely curious, not interrogating.`;
  }

  /**
   * Get human-readable location type description
   */
  private static getLocationTypeDescription(locationType: string): string {
    const descriptions: Record<string, string> = {
      'customer': 'Mobile service (we come to you)',
      'business': 'Location-based (you come to us)',
      'pickup_and_dropoff': 'Pickup and dropoff service',
    };
    return descriptions[locationType] || locationType;
  }

  /**
   * Format pricing combination for display
   */
  private static formatPricingCombination(pricingCombination: string): string {
    return pricingCombination
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get pricing unit based on combination type
   */
  private static getPricingUnit(pricingCombination: string): string {
    const units: Record<string, string> = {
      'labor_per_hour_per_person': 'person/hour',
      'labor_per_minute_per_person': 'person/minute',
      'labor_per_hour_per_room': 'room/hour',
      'travel_per_km_per_person': 'person/km',
      'travel_per_minute_per_person': 'person/minute',
      'travel_per_km_per_vehicle': 'vehicle/km',
      'travel_per_minute_per_vehicle': 'vehicle/minute',
      'travel_per_km': 'per km',
      'travel_per_minute': 'per minute',
      'labour_per_hour': 'per hour',
      'labour_per_minute': 'per minute',
      'service_per_minute_per_person': 'person/minute',
      'service_per_hour_per_person': 'person/hour',
      'service_per_room': 'per room',
      'service_per_sqm': 'per sqm',
      'service_fixed_per_service': 'per service',
    };
    return units[pricingCombination] || 'unit';
  }
}

// Export singleton instance for easy use
export const promptBuilder = new PromptBuilder();
