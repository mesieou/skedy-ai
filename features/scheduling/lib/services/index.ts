export { GoogleDistanceApiService } from './google-distance-api';
export type { DistanceApiRequest, DistanceApiResponse } from '../types/google-distance-api';
export { GoogleAddressValidationService } from './google-address-validation';
export { initializeAutocomplete, loadGoogleMapsScript, parseGooglePlaceToAddress } from './google-places-autocomplete';
export type { ParsedAddress } from './google-places-autocomplete';

// Re-export consolidated address types for convenience
export type { AddressInput, BookingAddress, ParsedGoogleAddress } from '../../../shared/lib/database/types/addresses';
export { AddressType } from '../../../shared/lib/database/types/addresses';
