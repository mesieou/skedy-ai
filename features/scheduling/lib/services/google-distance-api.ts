/**
 * Google Distance Matrix API Service
 * Handles distance and duration calculations between addresses
 */

import type {
  DistanceApiResponse,
  DistanceApiRequest,
  GoogleApiResponse,
  ApiConfiguration,
  IDistanceApiService,
  DistanceApiStatus,
  RequestMapping
} from '../types/google-distance-api';

import {
  DEFAULT_DRIVING_SPEED_KMH,
  API_BASE_URL,
  DistanceApiStatus as Status,
  DistanceUnits,
  TransportMode
} from '../types/google-distance-api';

export class GoogleDistanceApiService implements IDistanceApiService {
  private readonly config: ApiConfiguration;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GOOGLE_MAPS_API_KEY || '';

    // For production quotes, we need real API data
    const forceReal = process.env.USE_MOCK_DISTANCE_API === 'false';
    const useMockData = !key || (!forceReal && process.env.NODE_ENV === 'test');

    this.config = Object.freeze({ apiKey: key, baseUrl: API_BASE_URL, useMockData });

    if (this.config.useMockData && process.env.NODE_ENV !== 'test') {
      console.warn('[GoogleDistanceApiService] Using mock data - no API key configured');
    }
  }

  async getDistanceAndDuration(request: DistanceApiRequest): Promise<DistanceApiResponse> {
    try {
      if (this.config.useMockData) {
        return this.generateMockResponse(request);
      }

      // Check if fetch is available
      if (typeof fetch === 'undefined') {
        console.warn('[GoogleDistanceApiService] fetch not available, using mock data');
        return this.generateMockResponse(request);
      }

      const params = new URLSearchParams({
        origins: request.origin,
        destinations: request.destination,
        mode: TransportMode.DRIVING,
        units: request.units || DistanceUnits.METRIC,
        key: this.config.apiKey
      });

      this.addOptionalParams(params, request);
      const url = `${this.config.baseUrl}?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: unknown = await response.json();
      return this.parseApiResponse(data);

    } catch (error) {
      console.error(`[GoogleDistanceApiService] Failed to fetch distance data:`, error);

      // For production quotes, fail hard instead of using mock data
      if (!this.config.useMockData) {
        throw new Error(`Google Distance API failed: ${error instanceof Error ? error.message : 'Unknown error'}. Cannot calculate accurate travel costs.`);
      }

      // Only fallback to mock data in test environments
      console.warn('[GoogleDistanceApiService] Falling back to mock data (test environment)');
      return this.generateMockResponse(request);
    }
  }

  async getBatchDistances(requests: readonly DistanceApiRequest[]): Promise<readonly DistanceApiResponse[]> {
    if (requests.length === 0) return Object.freeze([]);
    if (requests.length === 1) {
      const result = await this.getDistanceAndDuration(requests[0]);
      return Object.freeze([result]);
    }

    try {
      if (this.config.useMockData) {
        const results = requests.map(request => this.generateMockResponse(request));
        return Object.freeze(results);
      }

      return await this.processBatchWithMatrix(requests);
    } catch (error) {
      console.error(`[GoogleDistanceApiService] Batch calculation failed:`, error);

      // For production quotes, fail hard instead of using mock data
      if (!this.config.useMockData) {
        throw new Error(`Google Distance API batch request failed: ${error instanceof Error ? error.message : 'Unknown error'}. Cannot calculate accurate travel costs.`);
      }

      // Only fallback to mock data in test environments
      console.warn('[GoogleDistanceApiService] Falling back to mock data (test environment)');
      const results = requests.map(request => this.generateMockResponse(request));
      return Object.freeze(results);
    }
  }

  private async processBatchWithMatrix(requests: readonly DistanceApiRequest[]): Promise<readonly DistanceApiResponse[]> {
    const uniqueOrigins = [...new Set(requests.map(r => r.origin))];
    const uniqueDestinations = [...new Set(requests.map(r => r.destination))];

    const mappings: RequestMapping[] = requests.map(request => ({
      originIndex: uniqueOrigins.indexOf(request.origin),
      destinationIndex: uniqueDestinations.indexOf(request.destination),
      originalRequest: request
    }));

    const params = new URLSearchParams({
      origins: uniqueOrigins.join('|'),
      destinations: uniqueDestinations.join('|'),
      mode: TransportMode.DRIVING,
      units: requests[0].units || DistanceUnits.METRIC,
      key: this.config.apiKey
    });

    this.addOptionalParams(params, requests[0]);
    const url = `${this.config.baseUrl}?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: unknown = await response.json();
    return this.parseMatrixResponse(data, mappings);
  }

  private addOptionalParams(params: URLSearchParams, request: DistanceApiRequest): void {
    if (request.avoidTolls) {
      params.append('avoid', 'tolls');
    }

    if (request.traffic_model) params.append('traffic_model', request.traffic_model);
    if (request.departure_time) {
      const timestamp = Math.floor(new Date(request.departure_time).getTime() / 1000);
      params.append('departure_time', timestamp.toString());
    }
  }

  private parseApiResponse(data: unknown): DistanceApiResponse {
    if (!this.isValidApiResponse(data)) {
      throw new Error('Invalid API response format');
    }

    const apiData = data as GoogleApiResponse;
    if (apiData.status !== Status.OK) {
      return this.createApiErrorResponse(apiData.status, apiData.error_message);
    }

    return this.extractSingleElement(apiData);
  }

  private extractSingleElement(apiData: GoogleApiResponse): DistanceApiResponse {
    const element = apiData.rows?.[0]?.elements?.[0];
    if (!element || element.status !== Status.OK) {
      return this.createApiErrorResponse(element?.status || Status.UNKNOWN_ERROR, 'No route found');
    }

    return this.extractDistanceData(element);
  }

  private parseMatrixResponse(data: unknown, mappings: RequestMapping[]): readonly DistanceApiResponse[] {
    if (!this.isValidApiResponse(data)) {
      throw new Error('Invalid matrix API response format');
    }

    const matrixData = data as GoogleApiResponse;
    if (matrixData.status !== Status.OK) {
      const errorResponse = this.createApiErrorResponse(matrixData.status, matrixData.error_message);
      return Object.freeze(mappings.map(() => errorResponse));
    }

    const results = mappings.map(mapping => this.extractMatrixElement(matrixData, mapping));
    return Object.freeze(results);
  }

  private extractMatrixElement(matrixData: GoogleApiResponse, mapping: RequestMapping): DistanceApiResponse {
    const element = matrixData.rows?.[mapping.originIndex]?.elements?.[mapping.destinationIndex];

    if (!element || element.status !== Status.OK) {
      return this.createApiErrorResponse(element?.status || Status.UNKNOWN_ERROR, 'No route found');
    }

    return this.extractDistanceData(element);
  }

  private extractDistanceData(element: { distance?: { value: number }; duration?: { value: number } }): DistanceApiResponse {
    if (!element.distance?.value || !element.duration?.value) {
      throw new Error('Missing distance or duration data');
    }

    return Object.freeze({
      distance_km: Math.round((element.distance.value / 1000) * 100) / 100,
      duration_mins: Math.round(element.duration.value / 60),
      status: Status.OK
    });
  }

  private createApiErrorResponse(status: string, message?: string): DistanceApiResponse {
    return Object.freeze({
      distance_km: 0,
      duration_mins: 0,
      status: status as DistanceApiStatus,
      error_message: message
    });
  }

  private createErrorResponse(error: unknown): DistanceApiResponse {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return Object.freeze({
      distance_km: 0,
      duration_mins: 0,
      status: Status.UNKNOWN_ERROR,
      error_message: message
    });
  }

  private isValidApiResponse(data: unknown): data is GoogleApiResponse {
    return data !== null && typeof data === 'object' && 'status' in data;
  }

  private generateMockResponse(request: DistanceApiRequest): DistanceApiResponse {
    const similarity = this.calculateAddressSimilarity(request.origin.toLowerCase(), request.destination.toLowerCase());
    // Use address length as a seed for consistent results in tests
    const seed = (request.origin.length + request.destination.length) % 100;
    const baseDistance = similarity > 0.7 ? (seed % 5) + 1 : (seed % 25) + 5;
    const distance_km = Math.round(baseDistance * 100) / 100;
    const duration_mins = Math.round(distance_km * (60 / DEFAULT_DRIVING_SPEED_KMH));

    return Object.freeze({
      distance_km,
      duration_mins,
      status: Status.OK
    });
  }

  private calculateAddressSimilarity(addr1: string, addr2: string): number {
    const words1 = addr1.split(/\W+/).filter(word => word.length > 2);
    const words2 = addr2.split(/\W+/).filter(word => word.length > 2);
    const commonWords = words1.filter(word => words2.includes(word)).length;
    return commonWords / Math.max(words1.length, words2.length, 1);
  }
}
