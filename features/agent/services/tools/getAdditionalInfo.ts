import type { Session } from '../../sessions/session';
import { buildToolResponse } from '../helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';
import { KnowledgeBaseManager } from '@/features/knowledge-base';

/**
 * Get additional information from business knowledge base
 *
 * Searches the documents table using vector similarity for non-service/pricing questions
 * Examples: business hours, insurance, coverage areas, policies, etc.
 */
export async function getAdditionalInfo(
  args: {
    question: string;
  },
  session: Session
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  try {
    sentry.addBreadcrumb(`Querying knowledge base`, 'tool-additional-info', {
      sessionId: session.id,
      businessId: session.businessId,
      question: args.question
    });

    // Initialize knowledge base manager
    const kbManager = KnowledgeBaseManager.fromEnv();

    // Query the knowledge base
    const result = await kbManager.queryKnowledge({
      question: args.question,
      databaseUrl: process.env.DATABASE_URL!,
      businessId: session.businessId,
      tableName: 'documents',  // Standard documents table
      matchThreshold: 0.7,
      matchCount: 3
    });

    const duration = Date.now() - startTime;

    if (!result.success || result.sources.length === 0) {
      sentry.addBreadcrumb(`Knowledge base query failed or no results`, 'tool-additional-info', {
        sessionId: session.id,
        duration,
        error: result.error,
        sourcesCount: 0
      });

      return buildToolResponse(
        null,
        'No relevant information found in the knowledge base.',
        false
      );
    }

    sentry.addBreadcrumb(`Knowledge base query successful`, 'tool-additional-info', {
      sessionId: session.id,
      duration,
      sourcesCount: result.sources.length
    });

    // Format sources for the agent to naturally incorporate into conversation
    const contextInfo = result.sources.map((source, idx) =>
      `Source ${idx + 1} (${(source.similarity * 100).toFixed(1)}% match):\n${source.text}`
    ).join('\n\n');

    return buildToolResponse(
      {
        sources_found: result.sources.length,
        context: contextInfo
      } as unknown as Record<string, unknown>,
      `Found ${result.sources.length} relevant information source(s). Use this context to answer the question:\n\n${contextInfo}`,
      true
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_get_additional_info',
      metadata: {
        duration,
        question: args.question
      }
    });

    throw error;
  }
}
