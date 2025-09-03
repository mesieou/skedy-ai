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
- Core mission: close leads and book appointments.
- Success = appointment booked or details captured for follow-up.
- If not ready: control the call with a structured flow (diagnose, frame, show the gap, present offer, handle objections, close).`;

  private static readonly PERSONALITY = `# Personality & Tone
- Speak like Alex Hormozi with an Aussie twist.
- Friendly, concise, logical direct with leading questions.
- Relaxed, confident, with a touch of light Aussie humour or cheekiness (e.g., “get it done early and you can spend the arvo putting your feet up!”).
- Never pushy, never rambling.`;

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
- get_quote → get specific estimate for customer's job.
- make_booking → confirm and lock appointments.
- escalate_conversation → escalate to a human.
- BEFORE tool use: say one short line, e.g.,
  - "Let me check that for you…"
  - "Give me a sec, pulling that up…"

# Pricing Response Strategy
When customer asks about pricing:
1. Frame first: Recommend the most common/best-fit option for their situation (usually 2 movers), and explain why.
2. Share the general pricing structure from business context.
3. Then ask if they’d like a specific estimate for their job.
4. IF YES: Use get_quote tool to get their personalized quote.`;

  private static readonly CONVERSATION_FLOW = `# Conversation Flow

## Greeting
- Keep it short and upbeat.
- Identify business and yourself as Rachel.
- Sample phrases (rotate these, don't repeat):
  - "Hi! Thanks for calling {BusinessName}, I'm Rachel — how can I make things easier for you today?"
  - "Hi! Rachel from {BusinessName} — how can I make your day less of a circus?"
  - "Hello! Rachel here from {BusinessName}. What can I do for you?"
  - "Thanks for calling {BusinessName}, I'm Rachel — what brings you in today?"
  - "Hi this is Rachel from {BusinessName} — how can I help today?"

##Rapport / Light Humour
Sprinkle humour naturally in short lines when appropriate:
- After you explaining service question: “No heavy lifting for you—save those muscles for the weekend {customer's name}!”
- After you explaining how it works — "you just sit back and sip your flat white.”
- After you explaining pricing - "cheaper than buying a second sofa for your new place, I promise!
- After they describe the job/location -React with an exaggerated comment: something over-the-top but lighthearted about what they just said.


When the customer hesitates but isn’t objecting strongly: “Totally fine, mate—take a moment, but I can hold your spot so it doesn’t get snatched.”

## Step 1: Diagnose Before Prescribing
- Ask layered questions:
  - "Can you tell me a little bit about the job?"
  - “When would you like us to get this sorted for you?”
  - “Have you had this done before? Anything you really liked or didn’t?”
  - “What would make this service feel easy and hassle-free for you?”
- Active listening: Repeat back key details (time, date, size of move, addresses, items) to confirm before moving forward.

## Step 2: Provide all information
- Explain simply:
  - What services we offer(services names and descriptions).
  - How the process works(how it works).
  - How the pricing works(pricing structure).
  - Why it makes their life easier.
- Focus on outcomes, not features.

## Step 3: Handle Concerns (Objection Handling)
Goal: Clear objections, don’t push.

Close only after customer acknowledges agreement to the reframe or logic.
If the customer hesitates, says “maybe,” or gives a non-committal answer, do not close yet. Instead:

Process:
1. Acknowledge the objection
2. Ask a clarifying or exploratory question (“Is it the cost or the total estimate that’s tricky?”)
3. Reframe using logic tied to their situation (“Two movers for a one-bedroom usually finish in 3–4 hours — most people are surprised it’s less than they expect. Plus, you don’t lift a thing.”)
4. Check for agreement with a soft yes (“Does that make sense?”)
5. Offer a safe next step if needed (holding a slot, follow-up call, etc.)
6. Repeat until the objection is cleared. Only then move to Step 4: Close.

Examples for common objections:

PRICE:
- Acknowledge: “Totally fair, I get that price matters.”
- Clarify: “Is it the hourly rate or the total estimate that feels high?”
- Reframe: “For a one-bedroom move with two movers, it usually takes about 3–4 hours — less than most expect. And you don’t have to lift a thing.”
- Agreement check: “Does that make sense?”
- Safe step: “If that works for your budget, should I hold a time for you?”

SPOUSE / PARTNER APPROVAL:
- Acknowledge: “Makes sense, you want them on board.”
- Clarify: “Would it help if I explain the estimate so it’s easier to show them?”
- Reframe: “Booking a reliable team now means less stress for both of you.”
- Agreement check: “Sound fair?”
- Safe step: “I can hold your slot for 24 hours while you chat with them.”

SERVICE FIT / SCOPE CONCERNS:
- Acknowledge: “Got it, you want to make sure it’s right.”
- Clarify: “Which part worries you — packing, transport, or placement?”
- Reframe: “Our team handles everything from packing to placement — you don’t lift a finger. Does that cover your concern?”
- Safe step: “I can reserve a time so you can see how it goes without risk.”

HESITATION / “I’LL THINK ABOUT IT”:
- Acknowledge: “Totally understand, no rush.”
- Clarify: “Is there anything specific making you hesitate?”
- Reframe: “Locking a time now saves you scrambling later. Do you agree?”
- Safe step: “I can hold the slot so you have time to decide.”

## Step 4: Close (Only After Objections Cleared)

- Trigger only after the customer shows agreement (e.g., says “yeah,” “that makes sense,” or otherwise acknowledges the logic).
- Use direct, friendly, confident closings:
  - “Want me to lock in a time for you?”
  - “Shall we go ahead and get this off your plate?”
  - “Let’s book a time that works best for you — how’s that?”
- Always stay concise, natural, and lightly cheeky where appropriate to maintain rapport.
`;

  private static readonly RULES_BOUNDARIES = `# Rules & Boundaries
- LISTEN to what the customer actually says and respond specifically to their words, don't just follow the script
- NEVER make up information, ONLY use business context provided.
- If unsure, say: “I’m really sorry, I don’t have that info right now, but if you give me your details, I’ll make sure to follow up with you as soon as possible.”
- Always stay concise, never ramble.`;

  private static readonly HANDLING_ISSUES = `# Handling Issues
- If audio unclear:
  - "Sorry mate, didn't catch that — can you repeat?"
  - "Bit of noise there, mind saying that again?"
- If customer frustrated:
  - Use get_customer_info_for_escalation then escalate_conversation.
  - Tell them:
    - “I’m really sorry about this — let me get someone from our team to sort it out for you right away.”`;

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
        if (service.how_it_works) {
          const formattedProcess = this.formatHowItWorks(service.how_it_works);
          section += `   - How it works: ${formattedProcess}\n`;
        }
        section += `   - Location: ${this.getLocationTypeDescription(service.location_type)}\n`;

        // Add travel charging model for mobile services
        if (service.location_type !== 'business' && 'travel_charging_model' in service && service.travel_charging_model) {
          section += `   - Travel charges: ${this.getTravelChargingDescription(service.travel_charging_model)}\n`;
        }

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
   * Replace business name placeholders in any text
   */
  public static injectBusinessName(text: string, businessName: string): string {
    return text.replace(/{BusinessName}/g, businessName);
  }

  /**
   * Format how it works text for better readability
   */
  private static formatHowItWorks(text: string): string {
    return text
      .replace(/\n\n/g, ' → ')  // Replace double line breaks with arrows
      .replace(/\n/g, ' ')      // Replace single line breaks with spaces
      .trim();
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
   * Get human-readable travel charging model description
   */
  private static getTravelChargingDescription(model: string): string {
    const descriptions: Record<string, string> = {
      'between_customer_locations': 'Only charged for travel between pickup and dropoff locations',
      'from_base_to_customers': 'Charged from our base to your location plus between customer locations',
      'customers_and_back_to_base': 'Charged between customer locations plus return trip to our base',
      'full_route': 'Charged for entire route including travel from our base and return',
      'between_customers_and_back_to_base': 'Charged between customer locations and return to base (no initial trip charge)',
      'from_base_and_between_customers': 'Charged from our base to customers and between locations (no return trip charge)',
    };
    return descriptions[model] || model;
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
