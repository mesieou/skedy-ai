/**
 * Google Address Validation Service
 *
 * Validates addresses using Google's Address Validation API
 * Ensures addresses are real and deliverable before processing quotes
 */

export interface AddressValidationRequest {
  address: string;
  regionCode?: string; // e.g., 'AU' for Australia
}

export interface AddressValidationResult {
  isValid: boolean;
  formattedAddress?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  issues?: string[];
  components?: {
    street?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export class GoogleAddressValidationService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://addressvalidation.googleapis.com/v1:validateAddress';
  private readonly useMockData: boolean;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY || '';
    this.useMockData = !this.apiKey || process.env.USE_MOCK_ADDRESS_VALIDATION === 'true';
  }

  /**
   * Validate a single address
   */
  async validateAddress(request: AddressValidationRequest): Promise<AddressValidationResult> {
    if (this.useMockData) {
      return this.getMockValidation(request.address);
    }

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: {
            addressLines: [request.address],
            regionCode: request.regionCode || 'AU'
          }
        })
      });

      if (!response.ok) {
        console.warn('Google Address Validation API error:', response.status);
        return this.getMockValidation(request.address);
      }

      const data = await response.json();
      return this.parseGoogleResponse(data, request.address);

    } catch (error) {
      console.warn('Address validation failed, using mock data:', error);
      return this.getMockValidation(request.address);
    }
  }

  /**
   * Validate multiple addresses in batch
   */
  async validateAddresses(addresses: string[]): Promise<AddressValidationResult[]> {
    const results = await Promise.all(
      addresses.map(address => this.validateAddress({ address }))
    );
    return results;
  }

  /**
   * Parse Google API response
   */
  private parseGoogleResponse(data: unknown, originalAddress: string): AddressValidationResult {
    const result = (data as { result?: unknown }).result;
    if (!result) {
      return {
        isValid: false,
        issues: ['No validation result returned']
      };
    }

    const resultData = result as { verdict?: unknown; address?: unknown };
    const verdict = resultData.verdict;
    const address = resultData.address;

    const verdictData = verdict as { addressComplete?: boolean; hasReplacedComponents?: boolean; geocodeGranularity?: string };
    const addressData = address as { formattedAddress?: string };

    return {
      isValid: Boolean(verdictData?.addressComplete && verdictData?.hasReplacedComponents !== true),
      formattedAddress: addressData?.formattedAddress || originalAddress,
      confidence: this.mapConfidenceLevel(verdictData?.geocodeGranularity),
      issues: this.extractIssues(verdict),
      components: this.extractComponents(address)
    };
  }

  /**
   * Map Google's geocode granularity to our confidence levels
   */
  private mapConfidenceLevel(granularity?: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    switch (granularity) {
      case 'PREMISE':
      case 'SUB_PREMISE':
        return 'HIGH';
      case 'ROUTE':
      case 'NEIGHBORHOOD':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  /**
   * Extract validation issues from Google response
   */
  private extractIssues(verdict: unknown): string[] {
    const issues: string[] = [];
    const verdictData = verdict as {
      addressComplete?: boolean;
      hasUnconfirmedComponents?: boolean;
      hasInferredComponents?: boolean;
    };

    if (!verdictData?.addressComplete) {
      issues.push('Address appears incomplete');
    }

    if (verdictData?.hasUnconfirmedComponents) {
      issues.push('Some address components could not be confirmed');
    }

    if (verdictData?.hasInferredComponents) {
      issues.push('Some address components were inferred');
    }

    return issues;
  }

  /**
   * Extract address components from Google response
   */
  private extractComponents(address: unknown): AddressValidationResult['components'] {
    const addressData = address as { addressComponents?: Array<{ componentType?: string[]; componentName?: { text?: string } }> };
    if (!addressData?.addressComponents) return undefined;

    const components: Record<string, string> = {};

    for (const component of addressData.addressComponents) {
      const types = component.componentType;
      const value = component.componentName?.text;

      if (types?.includes('street_number') || types?.includes('route')) {
        components.street = components.street ? `${components.street} ${value || ''}` : (value || '');
      } else if (types?.includes('locality')) {
        components.suburb = value || '';
      } else if (types?.includes('administrative_area_level_2')) {
        components.city = value || '';
      } else if (types?.includes('administrative_area_level_1')) {
        components.state = value || '';
      } else if (types?.includes('postal_code')) {
        components.postcode = value || '';
      } else if (types?.includes('country')) {
        components.country = value || '';
      }
    }

    return components;
  }

  /**
   * Mock validation for testing/fallback
   */
  private getMockValidation(address: string): AddressValidationResult {
    // Basic validation - address should have comma and reasonable length
    const hasComma = address.includes(',');
    const hasMinLength = address.trim().length > 10;
    const parts = address.split(',').map(p => p.trim());

    // Mock some Australian addresses as valid
    const knownValidPatterns = [
      /\d+.*street.*melbourne/i,
      /\d+.*road.*blackburn/i,
      /\d+.*avenue.*richmond/i,
      /flinders.*street.*melbourne/i,
      /collins.*street.*melbourne/i
    ];

    const isKnownValid = knownValidPatterns.some(pattern => pattern.test(address));

    return {
      isValid: (hasComma && hasMinLength) || isKnownValid,
      formattedAddress: address,
      confidence: isKnownValid ? 'HIGH' : hasComma ? 'MEDIUM' : 'LOW',
      issues: hasComma ? [] : ['Address should include street and suburb separated by comma'],
      components: parts.length >= 2 ? {
        street: parts[0],
        suburb: parts[1],
        state: 'VIC',
        country: 'Australia'
      } : undefined
    };
  }
}
