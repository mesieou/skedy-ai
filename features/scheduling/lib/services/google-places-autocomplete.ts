/**
 * Google Places Autocomplete Service
 * Client-side service for address autocomplete functionality
 *
 * Note: Google Maps types are defined in /types/google-maps.d.ts
 */

import type { ParsedGoogleAddress } from '../../../shared/lib/database/types/addresses';

// Re-export for convenience
export type ParsedAddress = ParsedGoogleAddress;

/**
 * Parse Google Place Details into our address format
 */
export function parseGooglePlaceToAddress(placeDetails: google.maps.places.PlaceResult): ParsedAddress {
  const components = placeDetails.address_components || [];

  const getComponent = (types: string[]): string => {
    const component = components.find(c =>
      types.some(type => c.types.includes(type))
    );
    return component?.long_name || '';
  };

  const getShortComponent = (types: string[]): string => {
    const component = components.find(c =>
      types.some(type => c.types.includes(type))
    );
    return component?.short_name || '';
  };

  // Extract address components
  const streetNumber = getComponent(['street_number']);
  const route = getComponent(['route']);
  const subpremise = getComponent(['subpremise']); // For unit/apartment numbers
  const locality = getComponent(['locality', 'postal_town']);
  const state = getShortComponent(['administrative_area_level_1']);
  const postcode = getComponent(['postal_code']);
  const country = getShortComponent(['country']);

  // Build address_line_1 (street address)
  let addressLine1 = '';
  if (streetNumber && route) {
    addressLine1 = `${streetNumber} ${route}`;
  } else if (route) {
    addressLine1 = route;
  }

  // Build address_line_2 (unit/apartment)
  const addressLine2 = subpremise ? `Unit ${subpremise}` : undefined;

  return {
    address_line_1: addressLine1 || placeDetails.formatted_address?.split(',')[0] || '',
    address_line_2: addressLine2,
    city: locality,
    state: state,
    postcode: postcode,
    country: country,
    formatted_address: placeDetails.formatted_address,
    geometry: placeDetails.geometry?.location ? {
      lat: placeDetails.geometry.location.lat,
      lng: placeDetails.geometry.location.lng
    } : undefined
  };
}

/**
 * Initialize Google Places Autocomplete on an input element
 * This should be called from a React component effect
 */
export function initializeAutocomplete(
  inputElement: HTMLInputElement,
  options: {
    onPlaceSelected: (place: ParsedAddress) => void;
    countries?: string[]; // Restrict to specific countries (e.g., ['au'])
    types?: string[]; // Restrict to specific types (e.g., ['address'])
  }
): google.maps.places.Autocomplete | null {
  // Check if Google Maps API is loaded
  if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
    console.error('Google Maps Places API not loaded');
    return null;
  }

  const autocompleteOptions: google.maps.places.AutocompleteOptions = {
    componentRestrictions: options.countries ? { country: options.countries } : undefined,
    types: options.types || ['address'],
    fields: ['address_components', 'formatted_address', 'geometry']
  };

  const autocomplete = new google.maps.places.Autocomplete(inputElement, autocompleteOptions);

  // Listen for place selection
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();

    if (!place.address_components) {
      console.warn('No address details available for selected place');
      return;
    }

    const parsedAddress = parseGooglePlaceToAddress(place);
    options.onPlaceSelected(parsedAddress);
  });

  return autocomplete;
}

/**
 * Load Google Maps JavaScript API dynamically
 */
export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof google !== 'undefined' && google.maps) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));

    document.head.appendChild(script);
  });
}
