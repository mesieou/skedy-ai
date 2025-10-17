import { KnowledgeBaseManager } from '@/features/knowledge-base';
import { BusinessAnalysis } from '../types/onboarding-session';
import { BusinessCategory } from '@/features/shared/lib/database/types/business';
import { ScrapingJobService } from './scraping-job-service';

/**
 * Website Analyzer Service
 * Integrates with MCP server to scrape and analyze business websites
 */
export class WebsiteAnalyzerService {
  private knowledgeBaseManager: KnowledgeBaseManager;

  constructor(databaseUrl?: string) {
    this.knowledgeBaseManager = KnowledgeBaseManager.fromEnv(databaseUrl);
  }

  /**
   * Analyze a business website
   * 1. Scrape website using MCP server (Docling)
   * 2. Use AI to extract structured business information
   */
  async analyzeWebsite(
    websiteUrl: string,
    businessId?: string,
    sessionId?: string
  ): Promise<BusinessAnalysis> {
    console.log(`\n🔍 [WebsiteAnalyzer] ========================================`);
    console.log(`🔍 [WebsiteAnalyzer] Starting analysis of: ${websiteUrl}`);
    console.log(`🔍 [WebsiteAnalyzer] Business ID: ${businessId || 'none (new business)'}`);
    console.log(`🔍 [WebsiteAnalyzer] Session ID: ${sessionId || 'none'}`);
    
    try {
      // Step 1: Generate descriptive table name based on domain
      // Format: {domain}_website_data (e.g., poolcentre_website_data)
      const domainName = this.extractDomainName(websiteUrl);
      
      // Create table name with domain for better identification and faster fetching
      const tableName = businessId 
        ? `business_${businessId}_${domainName}_website_data`
        : sessionId
        ? `${domainName}_onboarding_${sessionId.substring(0, 8)}_website_data`
        : `${domainName}_website_data`;

      console.log(`🌐 [WebsiteAnalyzer] Connecting to MCP server...`);
      console.log(`🌐 [WebsiteAnalyzer] Target table: ${tableName}`);
      console.log(`🌐 [WebsiteAnalyzer] Max tokens: 8191`);
      console.log(`🌐 [WebsiteAnalyzer] Session ID: ${sessionId || 'none'}`);
      
      // Create scraping job for progress tracking
      const job = sessionId ? ScrapingJobService.create(sessionId, websiteUrl, tableName) : null;
      if (job) {
        console.log(`✅ [WebsiteAnalyzer] Created scraping job: ${job.id}`);
        ScrapingJobService.updateProgress(job.id, 'scraping', 'Connecting to MCP server...');
      } else {
        console.warn(`⚠️ [WebsiteAnalyzer] No session ID provided - progress tracking disabled`);
      }
      
      const mcpStartTime = Date.now();
      let loadResult;
      
      // Start progress monitoring interval
      const progressInterval = job ? setInterval(async () => {
        const elapsed = Math.floor((Date.now() - mcpStartTime) / 1000);
        await ScrapingJobService.checkDatabaseProgress(job.id);
        console.log(`⏳ [WebsiteAnalyzer] Processing... ${elapsed}s elapsed`);
      }, 10000) : null; // Check every 10 seconds
      
      try {
        // Start MCP scraping but don't wait for it (fire and forget)
        // The MCP server will continue scraping in the background and save to database
        const mcpPromise = this.knowledgeBaseManager.loadWebsite({
          websiteUrl,
          databaseUrl: process.env.DATABASE_URL!,
          businessId,
          tableName,
          maxTokens: 2000 // Reduced from 8191 to avoid MCP timeout (faster scraping)
        });
        
        // Wait maximum 30 seconds for MCP response
        // If it times out, we'll check the database instead
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MCP_TIMEOUT')), 30000)
        );
        
        try {
          loadResult = await Promise.race([mcpPromise, timeoutPromise]) as any;
        } catch (raceError: any) {
          // If we hit our 30s timeout, treat it as MCP timeout
          if (raceError.message === 'MCP_TIMEOUT') {
            throw new Error('MCP error -32001: Request timed out');
          }
          throw raceError;
        }
      } catch (mcpError) {
        const mcpDuration = Date.now() - mcpStartTime;
        const errorMessage = mcpError instanceof Error ? mcpError.message : String(mcpError);
        const isMcpTimeout = errorMessage.includes('timed out') || errorMessage.includes('-32001');
        
        console.warn(`⚠️ [WebsiteAnalyzer] MCP server error after ${mcpDuration}ms:`, mcpError);
        
        if (isMcpTimeout) {
          console.log(`⏰ [WebsiteAnalyzer] MCP request timed out - this is normal for large websites`);
          console.log(`🔍 [WebsiteAnalyzer] The scraping may still be running in the background...`);
        }
        
        console.log(`🔍 [WebsiteAnalyzer] Checking if data was saved despite error...`);
        
        // FALLBACK: Check if data exists in the table even though scraping failed/timed out
        // For MCP timeouts, retry more times with longer delays since scraping continues in background
        let fallbackData = null;
        const maxRetries = isMcpTimeout ? 20 : 3; // More retries for timeouts (100 seconds total)
        const retryDelay = isMcpTimeout ? 5000 : 3000; // Longer delay for timeouts (5 seconds)
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          console.log(`🔍 [WebsiteAnalyzer] Fallback attempt ${attempt}/${maxRetries}...`);
          
          // Update job status to show we're checking
          if (job) {
            ScrapingJobService.updateProgress(
              job.id, 
              'scraping', 
              `MCP timeout - checking for saved data (attempt ${attempt}/${maxRetries})...`
            );
          }
          
          fallbackData = await this.checkTableForData(tableName);
          
          if (fallbackData) {
            console.log(`✅ [WebsiteAnalyzer] Found ${fallbackData.rowCount} rows in table on attempt ${attempt}`);
            break;
          }
          
          if (attempt < maxRetries) {
            const waitSeconds = retryDelay / 1000;
            console.log(`⏳ [WebsiteAnalyzer] No data yet, waiting ${waitSeconds} seconds before retry...`);
            console.log(`💡 [WebsiteAnalyzer] MCP server may still be scraping in the background`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
        
        if (fallbackData) {
          console.log(`✅ [WebsiteAnalyzer] Successfully recovered data from database!`);
          loadResult = {
            success: true,
            content: fallbackData.content,
            duration: mcpDuration,
            tableName,
            partialScrape: true // Flag to indicate this was a partial/interrupted scrape
          };
        } else {
          console.error(`❌ [WebsiteAnalyzer] No data found in table after ${maxRetries} attempts`);
          console.error(`❌ [WebsiteAnalyzer] This likely means the MCP server failed to start scraping`);
          
          // Clear progress interval before throwing
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          
          throw mcpError;
        }
      }
      
      // Clear progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      const mcpDuration = Date.now() - mcpStartTime;

      if (!loadResult.success) {
        console.error(`❌ [WebsiteAnalyzer] MCP server failed after ${mcpDuration}ms:`, loadResult.error);
        if (job) {
          ScrapingJobService.fail(job.id, loadResult.error || 'MCP server failed');
        }
        throw new Error(`Failed to load website: ${loadResult.error}`);
      }

      console.log(`✅ [WebsiteAnalyzer] MCP server completed in ${mcpDuration}ms`);
      console.log(`✅ [WebsiteAnalyzer] Website loaded to table: ${loadResult.tableName}`);
      
      if (loadResult.partialScrape) {
        console.warn(`⚠️ [WebsiteAnalyzer] Note: This was a partial/interrupted scrape - some content may be missing`);
      }

      // Update job status
      if (job) {
        ScrapingJobService.updateProgress(job.id, 'analyzing', 'Analyzing scraped content with AI...');
      }

      // Step 2: Extract structured information using AI
      console.log(`🤖 [WebsiteAnalyzer] Extracting business information with AI...`);
      const aiStartTime = Date.now();
      
      const analysis = await this.extractBusinessInfo(
        loadResult.content,
        websiteUrl,
        loadResult.tableName,
        loadResult.partialScrape
      );
      
      const aiDuration = Date.now() - aiStartTime;
      console.log(`✅ [WebsiteAnalyzer] AI extraction completed in ${aiDuration}ms`);
      console.log(`✅ [WebsiteAnalyzer] Analysis complete:`, {
        businessName: analysis.businessName,
        servicesFound: analysis.services?.length || 0,
        confidence: analysis.confidence
      });
      console.log(`🔍 [WebsiteAnalyzer] ========================================\n`);

      // Mark job as complete
      if (job) {
        ScrapingJobService.complete(job.id, {
          businessName: analysis.businessName,
          servicesFound: analysis.services?.length || 0,
          confidence: analysis.confidence
        });
      }

      return analysis;

    } catch (error) {
      console.error(`❌ [WebsiteAnalyzer] Analysis failed:`, error);
      console.error(`❌ [WebsiteAnalyzer] Error details:`, error instanceof Error ? error.message : 'Unknown error');
      console.error(`❌ [WebsiteAnalyzer] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.log(`🔍 [WebsiteAnalyzer] ========================================\n`);
      
      // Mark job as failed if it exists
      if (sessionId) {
        const job = ScrapingJobService.getBySessionId(sessionId);
        if (job) {
          const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
          ScrapingJobService.fail(job.id, errorMessage);
        }
      }
      
      throw error;
    }
  }

  /**
   * Extract structured business information from scraped content
   * Uses OpenAI to parse and structure the data
   */
  private async extractBusinessInfo(
    rawContent: unknown,
    websiteUrl: string,
    tableName: string,
    partialScrape?: boolean
  ): Promise<BusinessAnalysis> {
    // Import OpenAI dynamically to avoid build-time issues
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Convert content to string for analysis
    const contentStr = typeof rawContent === 'string' 
      ? rawContent 
      : JSON.stringify(rawContent);

    const systemPrompt = `You are a business analyst AI. Analyze website content and extract structured business information.
    ${partialScrape ? '\n⚠️ NOTE: This content may be incomplete due to an interrupted scrape. Extract what you can from the available data.\n' : ''}
    Extract the following information:
    1. Business name
    2. Business description (1-2 sentences)
    3. Industry and category
    4. Services offered (name, description, estimated price if mentioned, duration if mentioned)
    5. Contact information (email, phone, address)
    6. Business characteristics (mobile services, location-based services, operating hours, service area)
    7. Social media links

    Return your analysis as a JSON object with this structure:
    {
      "businessName": "string",
      "description": "string",
      "industry": "string",
      "category": "removalist|manicurist|plumber|other",
      "email": "string",
      "phone": "string",
      "address": "string",
      "services": [
        {
          "name": "string",
          "description": "string",
          "suggestedPrice": number,
          "duration": number (in minutes)
        }
      ],
      "hasMobileServices": boolean,
      "hasLocationServices": boolean,
      "operatingHours": "string",
      "serviceArea": "string",
      "socialMedia": {
        "facebook": "string",
        "instagram": "string",
        "linkedin": "string"
      },
      "confidence": number (0-1, your confidence in this analysis)
    }

    Only include fields you can confidently extract. Use null for missing information.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analyze this website content and extract business information:\n\n${contentStr.substring(0, 15000)}` 
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      const analysisText = response.choices[0]?.message?.content || '{}';
      const parsedAnalysis = JSON.parse(analysisText);

      // Map to BusinessAnalysis type
      const analysis: BusinessAnalysis = {
        businessName: parsedAnalysis.businessName,
        description: parsedAnalysis.description,
        industry: parsedAnalysis.industry,
        category: this.mapToBusinessCategory(parsedAnalysis.category),
        email: parsedAnalysis.email,
        phone: parsedAnalysis.phone,
        address: parsedAnalysis.address,
        services: parsedAnalysis.services || [],
        hasMobileServices: parsedAnalysis.hasMobileServices,
        hasLocationServices: parsedAnalysis.hasLocationServices,
        operatingHours: parsedAnalysis.operatingHours,
        serviceArea: parsedAnalysis.serviceArea,
        socialMedia: parsedAnalysis.socialMedia,
        rawContent,
        confidence: parsedAnalysis.confidence || 0.7,
        partialScrape, // Include partial scrape flag
        analyzedAt: Date.now(),
        websiteUrl,
        knowledgeBaseTableName: tableName
      };

      return analysis;

    } catch (error) {
      console.error(`❌ [WebsiteAnalyzer] AI extraction failed:`, error);
      
      // Return minimal analysis on failure
      return {
        websiteUrl,
        analyzedAt: Date.now(),
        rawContent,
        confidence: 0,
        knowledgeBaseTableName: tableName
      };
    }
  }

  /**
   * Map extracted category to BusinessCategory enum
   */
  private mapToBusinessCategory(category?: string): string | undefined {
    if (!category) return undefined;

    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('removalist') || categoryLower.includes('moving')) {
      return BusinessCategory.REMOVALIST;
    }
    if (categoryLower.includes('manicur') || categoryLower.includes('nail')) {
      return BusinessCategory.MANICURIST;
    }
    if (categoryLower.includes('plumb')) {
      return BusinessCategory.PLUMBER;
    }
    
    return category;
  }

  /**
   * Extract clean domain name from URL for table naming
   * Examples:
   * - https://poolcentre.com.au/ -> poolcentre
   * - https://www.example.com -> example
   * - https://my-business.co.uk -> my_business
   */
  private extractDomainName(url: string): string {
    try {
      const urlObj = new URL(url);
      let hostname = urlObj.hostname;
      
      // Remove www. prefix
      hostname = hostname.replace(/^www\./, '');
      
      // Get the main domain name (before first dot)
      const parts = hostname.split('.');
      let domainName = parts[0];
      
      // Clean up: replace hyphens with underscores, remove special chars
      domainName = domainName
        .replace(/-/g, '_')
        .replace(/[^a-z0-9_]/gi, '')
        .toLowerCase();
      
      // Limit length to 50 chars for database table name compatibility
      if (domainName.length > 50) {
        domainName = domainName.substring(0, 50);
      }
      
      return domainName || 'website';
    } catch (error) {
      console.warn(`⚠️ [WebsiteAnalyzer] Failed to extract domain from ${url}:`, error);
      return 'website';
    }
  }

  /**
   * Check if data exists in the table (fallback for interrupted scrapes)
   * Returns content if data exists, null otherwise
   */
  private async checkTableForData(tableName: string): Promise<{ content: string; rowCount: number } | null> {
    try {
      // Import Supabase client
      const { createAdminClient } = await import('@/features/shared/lib/supabase/admin-client');
      const supabase = createAdminClient();
      
      console.log(`🔍 [WebsiteAnalyzer] Checking table: ${tableName}`);
      
      // Query the table to see if any data was saved
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1000); // Get up to 1000 rows
      
      if (error) {
        console.warn(`⚠️ [WebsiteAnalyzer] Error checking table:`, error.message);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log(`📭 [WebsiteAnalyzer] Table ${tableName} is empty or doesn't exist`);
        return null;
      }
      
      console.log(`✅ [WebsiteAnalyzer] Found ${count || data.length} rows in ${tableName}`);
      
      // Combine all content from the rows
      // Assuming the table has a 'content' or 'text' column
      const combinedContent = data
        .map(row => row.content || row.text || JSON.stringify(row))
        .join('\n\n');
      
      return {
        content: combinedContent,
        rowCount: count || data.length
      };
      
    } catch (error) {
      console.error(`❌ [WebsiteAnalyzer] Failed to check table:`, error);
      return null;
    }
  }

  /**
   * Re-analyze specific aspect of business
   * Useful when user wants to refine certain information
   */
  async refineAnalysis(
    tableName: string,
    aspect: 'services' | 'contact' | 'hours' | 'all'
  ): Promise<Partial<BusinessAnalysis>> {
    // TODO: Implement targeted re-analysis
    // This would query the knowledge base table and re-run AI analysis
    // on specific aspects only
    console.log(`🔄 [WebsiteAnalyzer] Refining analysis for: ${aspect} in ${tableName}`);
    throw new Error('Not implemented yet');
  }
}
