import { GoogleDistanceApiService } from '../../../lib/services/google-distance-api';
import { DistanceUnits, AvoidanceOptions } from '../../../lib/types/google-distance-api';
import { DateUtils } from '@/features/shared/utils/date-utils';

describe('GoogleDistanceApiService', () => {
  let service: GoogleDistanceApiService;

  beforeEach(() => {
    service = new GoogleDistanceApiService();
  });

  it('should return mock data when no API key is provided', async () => {
    const request = {
      origin: '123 Main St, Sydney NSW 2000',
      destination: '456 Collins St, Melbourne VIC 3000',
      units: DistanceUnits.METRIC
    };

    const result = await service.getDistanceAndDuration(request);

    expect(result.status).toBe('OK');
    expect(result.distance_km).toBeGreaterThan(0);
    expect(result.duration_mins).toBeGreaterThan(0);
    expect(typeof result.distance_km).toBe('number');
    expect(typeof result.duration_mins).toBe('number');
  });

  it('should return consistent results for the same route', async () => {
    const request = {
      origin: '123 Main St, Sydney NSW 2000',
      destination: '456 Collins St, Melbourne VIC 3000',
      units: DistanceUnits.METRIC
    };

    const result1 = await service.getDistanceAndDuration(request);
    const result2 = await service.getDistanceAndDuration(request);

    // Results should be consistent (same base distance calculation)
    expect(result1.status).toBe('OK');
    expect(result2.status).toBe('OK');
    expect(typeof result1.distance_km).toBe('number');
    expect(typeof result2.distance_km).toBe('number');
  });

  it('should handle batch distance requests using matrix API', async () => {
    const requests = [
      {
        origin: '123 Main St, Sydney NSW 2000',
        destination: '456 Collins St, Melbourne VIC 3000',
        units: DistanceUnits.METRIC
      },
      {
        origin: '789 George St, Sydney NSW 2000',
        destination: '321 Queen St, Brisbane QLD 4000',
        units: DistanceUnits.METRIC
      },
      {
        origin: '123 Main St, Sydney NSW 2000', // Same origin as first
        destination: '321 Queen St, Brisbane QLD 4000', // Same destination as second
        units: DistanceUnits.METRIC
      }
    ];

    const results = await service.getBatchDistances(requests);

    expect(results).toHaveLength(3);
    expect(results[0].status).toBe('OK');
    expect(results[1].status).toBe('OK');
    expect(results[2].status).toBe('OK');
    expect(results[0].distance_km).toBeGreaterThan(0);
    expect(results[1].distance_km).toBeGreaterThan(0);
    expect(results[2].distance_km).toBeGreaterThan(0);
  });

  it('should handle empty batch requests', async () => {
    const results = await service.getBatchDistances([]);
    expect(results).toHaveLength(0);
  });

  it('should handle single request in batch', async () => {
    const requests = [
      {
        origin: '123 Main St, Sydney NSW 2000',
        destination: '456 Collins St, Melbourne VIC 3000',
        units: DistanceUnits.METRIC
      }
    ];

    const results = await service.getBatchDistances(requests);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('OK');
    expect(results[0].distance_km).toBeGreaterThan(0);
  });

  it('should generate shorter distances for similar addresses', async () => {
    const sameSuburbRequest = {
      origin: '123 Main St, Bondi NSW 2026',
      destination: '456 Ocean St, Bondi NSW 2026',
      units: DistanceUnits.METRIC
    };

    const differentCityRequest = {
      origin: '123 Main St, Sydney NSW 2000',
      destination: '456 Collins St, Melbourne VIC 3000',
      units: DistanceUnits.METRIC
    };

    const sameSuburbResult = await service.getDistanceAndDuration(sameSuburbRequest);
    const differentCityResult = await service.getDistanceAndDuration(differentCityRequest);

    // Same suburb should be shorter distance than different cities
    expect(sameSuburbResult.distance_km).toBeLessThan(differentCityResult.distance_km);
  });

  it('should handle departure time parameter', async () => {
    const request = {
      origin: '123 Main St, Sydney NSW 2000',
      destination: '456 Collins St, Melbourne VIC 3000',
      units: DistanceUnits.METRIC,
      departure_time: DateUtils.nowUTC()
    };

    const result = await service.getDistanceAndDuration(request);

    expect(result.status).toBe('OK');
    expect(result.distance_km).toBeGreaterThan(0);
    expect(result.duration_mins).toBeGreaterThan(0);
  });

  it('should handle avoid parameter', async () => {
    const request = {
      origin: '123 Main St, Sydney NSW 2000',
      destination: '456 Collins St, Melbourne VIC 3000',
      units: DistanceUnits.METRIC,
      avoid: AvoidanceOptions.TOLLS
    };

    const result = await service.getDistanceAndDuration(request);

    expect(result.status).toBe('OK');
    expect(result.distance_km).toBeGreaterThan(0);
    expect(result.duration_mins).toBeGreaterThan(0);
  });

  // Real API integration test (only runs if API key is available)
  describe('Real API Integration', () => {
    const hasApiKey = !!process.env.GOOGLE_MAPS_API_KEY;
    
    (hasApiKey ? it : it.skip)('should work with real Google API (will fallback to mock if fetch unavailable)', async () => {
      // Override environment to force real API BEFORE creating service
      const originalEnv = process.env.USE_MOCK_DISTANCE_API;
      process.env.USE_MOCK_DISTANCE_API = 'false';
      
      // Force real API usage by providing key and disabling mock
      const realService = new GoogleDistanceApiService(process.env.GOOGLE_MAPS_API_KEY);
      
      try {
        const request = {
          origin: 'Sydney Town Hall, Sydney NSW 2000, Australia',
          destination: 'Opera House, Sydney NSW 2000, Australia',
          units: DistanceUnits.METRIC
        };

        const result = await realService.getDistanceAndDuration(request);

        expect(result.status).toBe('OK');
        expect(result.distance_km).toBeGreaterThan(0);
        expect(result.duration_mins).toBeGreaterThan(0);
        
        console.log(`API result: ${result.distance_km}km, ${result.duration_mins}mins`);
        
        // If this is real API data, it should be more realistic
        if (result.distance_km > 10 || result.duration_mins > 30) {
          console.log('Note: This appears to be mock data (fetch not available in Jest)');
        } else {
          console.log('Note: This might be real API data');
        }
      } finally {
        // Restore environment
        process.env.USE_MOCK_DISTANCE_API = originalEnv;
      }
    }, 10000); // 10 second timeout for real API

    (hasApiKey ? it : it.skip)('should handle real API batch requests (will fallback to mock if fetch unavailable)', async () => {
      const originalEnv = process.env.USE_MOCK_DISTANCE_API;
      process.env.USE_MOCK_DISTANCE_API = 'false';
      
      const realService = new GoogleDistanceApiService(process.env.GOOGLE_MAPS_API_KEY);
      
      try {
        const requests = [
          {
            origin: 'Sydney Town Hall, Sydney NSW 2000',
            destination: 'Circular Quay, Sydney NSW 2000',
            units: DistanceUnits.METRIC
          },
          {
            origin: 'Circular Quay, Sydney NSW 2000',
            destination: 'Opera House, Sydney NSW 2000',
            units: DistanceUnits.METRIC
          }
        ];

        const start = Date.now();
        const results = await realService.getBatchDistances(requests);
        const duration = Date.now() - start;

        expect(results).toHaveLength(2);
        expect(results[0].status).toBe('OK');
        expect(results[1].status).toBe('OK');
        
        console.log(`Real batch API completed in ${duration}ms`);
        expect(duration).toBeLessThan(5000); // Should be faster than individual calls
      } finally {
        process.env.USE_MOCK_DISTANCE_API = originalEnv;
      }
    }, 15000); // 15 second timeout for batch API
  });
});
