import { BusinessContextProvider } from '../../../lib/database/business-context-provider';

describe('BusinessContextProvider Performance Test', () => {
  let businessContextProvider: BusinessContextProvider;
  const testPhoneNumber = '+61473164581';

  beforeAll(async () => {
    businessContextProvider = new BusinessContextProvider();
  });

  it('should retrieve business context by phone number and measure performance', async () => {
    // Warm up call (to account for any connection establishment)
    console.log('🔥 Warming up database connection...');
    const warmupStart = performance.now();
    try {
      await businessContextProvider.getBusinessContextByPhone(testPhoneNumber);
    } catch {
      // Ignore errors in warmup
    }
    const warmupEnd = performance.now();
    console.log(`⏱️  Warmup time: ${(warmupEnd - warmupStart).toFixed(2)}ms`);

    // Actual performance test - Raw context
    console.log('\n📊 Testing raw business context retrieval...');
    const start1 = performance.now();
    const context = await businessContextProvider.getBusinessContextByPhone(testPhoneNumber);
    const end1 = performance.now();
    const rawTime = end1 - start1;

    // Verify the context is valid
    expect(context).toBeDefined();
    expect(context.businessInfo).toBeDefined();
    expect(context.businessInfo.phone).toBe(testPhoneNumber);
    expect(context.services).toBeDefined();
    expect(context.frequently_asked_questions).toBeDefined();

    console.log(`✅ Raw context retrieval time: ${rawTime.toFixed(2)}ms`);
    console.log(`📋 Business: ${context.businessInfo.name}`);
    console.log(`🛠️  Services found: ${context.services.length}`);
    console.log(`❓ FAQs found: ${context.frequently_asked_questions.length}`);

    // Test LLM-formatted context (what the call agent actually uses)
    console.log('\n🤖 Testing LLM-formatted context retrieval...');
    const start2 = performance.now();
    const llmContext = await businessContextProvider.getBusinessContextByPhoneForLLM(testPhoneNumber);
    const end2 = performance.now();
    const llmTime = end2 - start2;

    expect(llmContext).toBeDefined();
    expect(typeof llmContext).toBe('string');
    expect(llmContext.length).toBeGreaterThan(100);

    console.log(`✅ LLM context retrieval time: ${llmTime.toFixed(2)}ms`);
    console.log(`📝 LLM context length: ${llmContext.length} characters`);

    // Multiple calls test (simulating concurrent calls)
    console.log('\n🔄 Testing multiple concurrent retrievals...');
    const concurrentStart = performance.now();
    const promises = Array.from({ length: 5 }, () =>
      businessContextProvider.getBusinessContextByPhoneForLLM(testPhoneNumber)
    );
    const results = await Promise.all(promises);
    const concurrentEnd = performance.now();
    const concurrentTime = concurrentEnd - concurrentStart;
    const avgConcurrentTime = concurrentTime / 5;

    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    console.log(`✅ 5 concurrent calls completed in: ${concurrentTime.toFixed(2)}ms`);
    console.log(`📊 Average time per concurrent call: ${avgConcurrentTime.toFixed(2)}ms`);

    // Performance summary
    console.log('\n📈 PERFORMANCE SUMMARY FOR CALL AGENT');
    console.log('=====================================');
    console.log(`📞 Phone number tested: ${testPhoneNumber}`);
    console.log(`⚡ Raw context retrieval: ${rawTime.toFixed(2)}ms`);
    console.log(`🤖 LLM context retrieval: ${llmTime.toFixed(2)}ms`);
    console.log(`🔄 Concurrent avg: ${avgConcurrentTime.toFixed(2)}ms`);
    console.log('=====================================');

    // Performance assertions for call agent requirements
    expect(rawTime).toBeLessThan(2000); // Should be under 2 seconds
    expect(llmTime).toBeLessThan(3000); // LLM formatting should be under 3 seconds
    expect(avgConcurrentTime).toBeLessThan(5000); // Concurrent calls should be under 5 seconds each

    // Log a sample of the LLM context for verification
    console.log('\n📝 Sample LLM Context (first 500 chars):');
    console.log('----------------------------------------');
    console.log(llmContext.substring(0, 500) + '...');
    console.log('----------------------------------------');
  });

  it('should handle non-existent phone number gracefully', async () => {
    const nonExistentPhone = '+61999999999';

    console.log(`\n🔍 Testing non-existent phone: ${nonExistentPhone}`);
    const start = performance.now();

    await expect(
      businessContextProvider.getBusinessContextByPhone(nonExistentPhone)
    ).rejects.toThrow(`Business not found for phone number: ${nonExistentPhone}`);

    const end = performance.now();
    const errorTime = end - start;

    console.log(`⚡ Error handling time: ${errorTime.toFixed(2)}ms`);
    expect(errorTime).toBeLessThan(1000); // Error should be fast
  });
});
