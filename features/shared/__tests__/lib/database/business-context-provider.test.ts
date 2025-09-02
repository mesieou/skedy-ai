import { BusinessContextProvider } from '../../../lib/database/business-context-provider';

describe('BusinessContextProvider Performance Test', () => {
  let businessContextProvider: BusinessContextProvider;
  const testTwilioAccountSid = process.env.TEST_TWILIO_ACCOUNT_SID || 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

  beforeAll(async () => {
    businessContextProvider = new BusinessContextProvider();
  });

    it('should retrieve business context by Twilio Account SID and measure performance', async () => {
    // Warm up call (to account for any connection establishment)
    console.log('🔥 Warming up database connection...');
    const warmupStart = performance.now();
    try {
      await businessContextProvider.getBusinessContextByTwilioSid(testTwilioAccountSid);
    } catch {
      // Ignore errors in warmup
    }
    const warmupEnd = performance.now();
    console.log(`⏱️  Warmup time: ${(warmupEnd - warmupStart).toFixed(2)}ms`);

    // Actual performance test - Raw context
    console.log('\n📊 Testing raw business context retrieval...');
    const start1 = performance.now();
    const context = await businessContextProvider.getBusinessContextByTwilioSid(testTwilioAccountSid);
    const end1 = performance.now();
    const rawTime = end1 - start1;

    // Verify the context is valid
    expect(context).toBeDefined();
    expect(context.businessInfo).toBeDefined();
    expect(context.businessInfo.phone).toBeDefined();
    expect(context.services).toBeDefined();
    expect(context.frequently_asked_questions).toBeDefined();

    console.log(`✅ Raw context retrieval time: ${rawTime.toFixed(2)}ms`);
    console.log(`📋 Business: ${context.businessInfo.name}`);
    console.log(`🛠️  Services found: ${context.services.length}`);
    console.log(`❓ FAQs found: ${context.frequently_asked_questions.length}`);

    // Multiple calls test (simulating concurrent calls)
    console.log('\n🔄 Testing multiple concurrent retrievals...');
    const concurrentStart = performance.now();
    const promises = Array.from({ length: 5 }, () =>
      businessContextProvider.getBusinessContextByTwilioSid(testTwilioAccountSid)
    );
    const results = await Promise.all(promises);
    const concurrentEnd = performance.now();
    const concurrentTime = concurrentEnd - concurrentStart;
    const avgConcurrentTime = concurrentTime / 5;

    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(result.businessInfo).toBeDefined();
    });

    console.log(`✅ 5 concurrent calls completed in: ${concurrentTime.toFixed(2)}ms`);
    console.log(`📊 Average time per concurrent call: ${avgConcurrentTime.toFixed(2)}ms`);

    // Performance summary
    console.log('\n📈 PERFORMANCE SUMMARY FOR CALL AGENT');
    console.log('=====================================');
    console.log(`🆔 Twilio Account SID tested: ${testTwilioAccountSid}`);
    console.log(`⚡ Raw context retrieval: ${rawTime.toFixed(2)}ms`);
    console.log(`🔄 Concurrent avg: ${avgConcurrentTime.toFixed(2)}ms`);
    console.log('=====================================');

    // Performance assertions for call agent requirements
    expect(rawTime).toBeLessThan(2000); // Should be under 2 seconds
    expect(avgConcurrentTime).toBeLessThan(5000); // Concurrent calls should be under 5 seconds each
  });

  it('should handle non-existent Twilio Account SID gracefully', async () => {
    const nonExistentSid = 'AC999999999999999999999999999999';

    console.log(`\n🔍 Testing non-existent Twilio SID: ${nonExistentSid}`);
    const start = performance.now();

    await expect(
      businessContextProvider.getBusinessContextByTwilioSid(nonExistentSid)
    ).rejects.toThrow(`Business not found for Twilio Account SID: ${nonExistentSid}`);

    const end = performance.now();
    const errorTime = end - start;

    console.log(`⚡ Error handling time: ${errorTime.toFixed(2)}ms`);
    expect(errorTime).toBeLessThan(1000); // Error should be fast
  });
});
