import { GoogleAddressValidationService } from '../../../lib/services/google-address-validation';

describe('GoogleAddressValidationService', () => {
  let service: GoogleAddressValidationService;

  beforeEach(() => {
    service = new GoogleAddressValidationService();
  });

  describe('Mock Validation', () => {
    it('should validate complete addresses with comma separation', async () => {
      const result = await service.validateAddress({
        address: '123 Collins Street, Melbourne'
      });

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe('MEDIUM');
      expect(result.formattedAddress).toBe('123 Collins Street, Melbourne');
      expect(result.components?.street).toBe('123 Collins Street');
      expect(result.components?.suburb).toBe('Melbourne');
    });

    it('should reject incomplete addresses without comma', async () => {
      const result = await service.validateAddress({
        address: '123 Collins Street'
      });

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Address should include street and suburb separated by comma');
    });

    it('should validate known Australian address patterns', async () => {
      const addresses = [
        '1 Flinders Street, Melbourne',
        '123 Collins Street, Melbourne',
        '456 Chapel Street, Richmond',
        '789 Burke Road, Blackburn'
      ];

      for (const address of addresses) {
        const result = await service.validateAddress({ address });
        expect(result.isValid).toBe(true);
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result.confidence);
      }
    });

    it('should handle very short addresses', async () => {
      const result = await service.validateAddress({
        address: '123'
      });

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBe('LOW');
    });

    it('should validate batch addresses', async () => {
      const addresses = [
        '123 Collins Street, Melbourne',
        '456 Chapel Street, Richmond',
        'invalid'
      ];

      const results = await service.validateAddresses(addresses);

      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
      expect(results[2].isValid).toBe(false);
    });

    it('should extract address components correctly', async () => {
      const result = await service.validateAddress({
        address: '123 Collins Street, Melbourne'
      });

      expect(result.components).toBeDefined();
      expect(result.components?.street).toBe('123 Collins Street');
      expect(result.components?.suburb).toBe('Melbourne');
      expect(result.components?.state).toBe('VIC');
      expect(result.components?.country).toBe('Australia');
    });
  });

  describe('Real API Integration', () => {
    const hasApiKey = !!process.env.GOOGLE_MAPS_API_KEY;

    (hasApiKey ? it : it.skip)('should validate real addresses with Google API', async () => {
      // Force real API usage
      const originalEnv = process.env.USE_MOCK_ADDRESS_VALIDATION;
      process.env.USE_MOCK_ADDRESS_VALIDATION = 'false';

      const realService = new GoogleAddressValidationService(process.env.GOOGLE_MAPS_API_KEY);

      try {
        const result = await realService.validateAddress({
          address: 'Sydney Opera House, Sydney NSW 2000, Australia',
          regionCode: 'AU'
        });

        expect(result.isValid).toBeDefined();
        expect(result.formattedAddress).toBeDefined();
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result.confidence);

        console.log('Real API validation result:', {
          isValid: result.isValid,
          formatted: result.formattedAddress,
          confidence: result.confidence,
          issues: result.issues
        });

      } finally {
        process.env.USE_MOCK_ADDRESS_VALIDATION = originalEnv;
      }
    }, 10000);

    (hasApiKey ? it : it.skip)('should handle invalid addresses with real API', async () => {
      const originalEnv = process.env.USE_MOCK_ADDRESS_VALIDATION;
      process.env.USE_MOCK_ADDRESS_VALIDATION = 'false';

      const realService = new GoogleAddressValidationService(process.env.GOOGLE_MAPS_API_KEY);

      try {
        const result = await realService.validateAddress({
          address: 'Invalid Address That Does Not Exist 12345',
          regionCode: 'AU'
        });

        expect(result.isValid).toBeDefined();
        expect(result.issues).toBeDefined();

        console.log('Invalid address result:', {
          isValid: result.isValid,
          issues: result.issues
        });

      } finally {
        process.env.USE_MOCK_ADDRESS_VALIDATION = originalEnv;
      }
    }, 10000);

    (hasApiKey ? it : it.skip)('should validate batch addresses with real API', async () => {
      const originalEnv = process.env.USE_MOCK_ADDRESS_VALIDATION;
      process.env.USE_MOCK_ADDRESS_VALIDATION = 'false';

      const realService = new GoogleAddressValidationService(process.env.GOOGLE_MAPS_API_KEY);

      try {
        const addresses = [
          'Sydney Town Hall, Sydney NSW 2000',
          'Melbourne Town Hall, Melbourne VIC 3000'
        ];

        const results = await realService.validateAddresses(addresses);

        expect(results).toHaveLength(2);
        results.forEach((result, index) => {
          expect(result.isValid).toBeDefined();
          console.log(`Address ${index + 1} validation:`, {
            original: addresses[index],
            isValid: result.isValid,
            formatted: result.formattedAddress,
            confidence: result.confidence
          });
        });

      } finally {
        process.env.USE_MOCK_ADDRESS_VALIDATION = originalEnv;
      }
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should fallback to mock validation when API fails', async () => {
      // Create service with invalid API key to simulate failure
      const failingService = new GoogleAddressValidationService('invalid-key');

      const result = await failingService.validateAddress({
        address: '123 Collins Street, Melbourne'
      });

      // Should still return a result (mock fallback)
      expect(result.isValid).toBeDefined();
      expect(result.formattedAddress).toBe('123 Collins Street, Melbourne');
    });

    it('should handle empty addresses gracefully', async () => {
      const result = await service.validateAddress({
        address: ''
      });

      expect(result.isValid).toBe(false);
      expect(result.issues).toBeDefined();
    });

    it('should handle whitespace-only addresses', async () => {
      const result = await service.validateAddress({
        address: '   '
      });

      expect(result.isValid).toBe(false);
    });
  });
});
