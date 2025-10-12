// Google Maps JavaScript API type definitions
// Minimal types needed for Places Autocomplete

declare namespace google {
  namespace maps {
    namespace places {
      interface AutocompleteOptions {
        componentRestrictions?: { country?: string | string[] };
        types?: string[];
        fields?: string[];
      }

      class Autocomplete {
        constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions);
        addListener(eventName: string, handler: () => void): void;
        getPlace(): PlaceResult;
      }

      interface PlaceResult {
        address_components?: AddressComponent[];
        formatted_address?: string;
        geometry?: {
          location: {
            lat: number;
            lng: number;
          };
        };
      }

      interface AddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }
    }
  }
}
