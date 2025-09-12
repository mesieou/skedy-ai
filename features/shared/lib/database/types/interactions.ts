import { BaseEntity } from "./base";

/**
 * AI Interaction Types
 */
export enum InteractionType {
  INITIAL = 'initial',     // Model greeting/initial response (doesn't count as normal)
  NORMAL = 'normal'        // Normal conversation response
}

/**
 * AI Interaction Tracking
 *
 * Tracks AI model interactions for evaluation and alignment
 */
export interface Interaction extends BaseEntity {
  // Session tracking
  session_id: string;              // Chat session this interaction belongs to
  business_id: string;             // Business context
  user_id?: string | null;         // User (nullable for anonymous calls)

  // Interaction classification
  type: InteractionType;           // initial or normal interaction

  // Required fields
  customer_input?: string | null;  // What the customer actually said (null for initial interactions)
  prompt: string;                  // Full prompt sent to model
  prompt_name: string;             // Name/identifier of the prompt template used
  prompt_version: string;          // Version of the prompt (for A/B testing)
  model_output: string;            // Model response or output

  // Tool calling tracking
  generated_from_tool_calling: boolean;           // Whether this was generated from tool execution
  tool_schema?: string | null;                    // JSON schema of the tool (if tool calling)
  tool_schema_version?: string | null;            // Version of the tool schema used
  tool_result?: string | null;                    // Result returned by the tool (if tool calling)
  tool_name?: string | null;                      // Name of the tool that was called

  // Optional evaluation fields
  model_critique?: string | null;   // Model self-critique or evaluation
  model_outcome?: boolean | null;   // Model assessment (true=good, false=bad)
  human_critique?: string | null;   // Human evaluation or feedback
  human_outcome?: boolean | null;   // Human assessment (true=good, false=bad)
  alignment?: boolean | null;       // Overall alignment (true=aligned, false=misaligned)
}

// Create/Update types
export type CreateInteractionData = Omit<Interaction, 'id' | 'created_at' | 'updated_at'>;
export type UpdateInteractionData = Partial<Omit<Interaction, 'id' | 'created_at' | 'updated_at'>>;

// Evaluation types for better type safety
export type ModelOutcome = boolean;  // true = good, false = bad
export type HumanOutcome = boolean;  // true = good, false = bad
export type AlignmentStatus = boolean; // true = aligned, false = misaligned

// Query helper types
export interface InteractionFilters {
  sessionId?: string;
  businessId?: string;
  userId?: string;
  type?: InteractionType;
  promptName?: string;
  promptVersion?: string;
  generatedFromToolCalling?: boolean;
  toolName?: string;
  toolSchemaVersion?: string;
  hasModelCritique?: boolean;
  hasHumanCritique?: boolean;
  modelOutcome?: ModelOutcome;
  humanOutcome?: HumanOutcome;
  alignment?: AlignmentStatus;
  dateRange?: {
    start: string;
    end: string;
  };
}
