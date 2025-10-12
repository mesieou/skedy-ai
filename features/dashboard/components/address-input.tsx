"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Loader2, MapPin } from "lucide-react";
import { initializeAutocomplete, loadGoogleMapsScript, type ParsedAddress } from "@/features/scheduling/lib/services/google-places-autocomplete";
import type { AddressInput } from "@/features/shared/lib/database/types/addresses";

interface AddressInputProps {
  label: string;
  value: AddressInput;
  onChange: (address: AddressInput) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  apiKey: string;
  countries?: string[]; // e.g., ['au'] for Australia
}

export function AddressInput({
  label,
  value,
  onChange,
  placeholder = "Start typing an address...",
  required = false,
  disabled = false,
  apiKey,
  countries = ['au']
}: AddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [showManualFields, setShowManualFields] = useState(false);
  const [displayValue, setDisplayValue] = useState("");

  // Load Google Maps script on mount
  useEffect(() => {
    if (!apiKey) {
      console.error('Google Maps API key not provided');
      return;
    }

    setIsLoading(true);
    loadGoogleMapsScript(apiKey)
      .then(() => {
        setIsScriptLoaded(true);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load Google Maps script:', error);
        setIsLoading(false);
        setShowManualFields(true); // Fallback to manual entry
      });
  }, [apiKey]);

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || autocompleteRef.current) {
      return;
    }

    try {
      const autocomplete = initializeAutocomplete(inputRef.current, {
        onPlaceSelected: (parsedAddress: ParsedAddress) => {
          // Update display value
          setDisplayValue(parsedAddress.formatted_address || '');

          // Notify parent component
          onChange({
            address_line_1: parsedAddress.address_line_1,
            address_line_2: parsedAddress.address_line_2,
            city: parsedAddress.city,
            state: parsedAddress.state,
            postcode: parsedAddress.postcode,
            country: parsedAddress.country,
            formatted_address: parsedAddress.formatted_address
          });
        },
        countries: countries,
        types: ['address']
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('Failed to initialize autocomplete:', error);
      setShowManualFields(true);
    }
  }, [isScriptLoaded, countries, onChange]);

  // Update display value when value prop changes
  useEffect(() => {
    if (value.formatted_address) {
      setDisplayValue(value.formatted_address);
    } else if (value.address_line_1) {
      const parts = [
        value.address_line_1,
        value.address_line_2,
        value.city,
        value.state,
        value.postcode
      ].filter(Boolean);
      setDisplayValue(parts.join(', '));
    }
  }, [value]);

  // Handle manual input change
  const handleManualChange = (field: keyof AddressInput, fieldValue: string) => {
    onChange({
      ...value,
      [field]: fieldValue
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading address lookup...</span>
        </div>
      </div>
    );
  }

  if (showManualFields || !isScriptLoaded) {
    // Fallback: Manual address entry
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`${label}-line1`}>
            {label} - Street Address {required && '*'}
          </Label>
          <Input
            id={`${label}-line1`}
            value={value.address_line_1 || ''}
            onChange={(e) => handleManualChange('address_line_1', e.target.value)}
            placeholder="123 Main St"
            required={required}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${label}-line2`}>Unit/Apartment (Optional)</Label>
          <Input
            id={`${label}-line2`}
            value={value.address_line_2 || ''}
            onChange={(e) => handleManualChange('address_line_2', e.target.value)}
            placeholder="Unit 5"
            disabled={disabled}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${label}-city`}>City {required && '*'}</Label>
            <Input
              id={`${label}-city`}
              value={value.city || ''}
              onChange={(e) => handleManualChange('city', e.target.value)}
              placeholder="Melbourne"
              required={required}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${label}-state`}>State {required && '*'}</Label>
            <Input
              id={`${label}-state`}
              value={value.state || ''}
              onChange={(e) => handleManualChange('state', e.target.value)}
              placeholder="VIC"
              required={required}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${label}-postcode`}>Postcode {required && '*'}</Label>
            <Input
              id={`${label}-postcode`}
              value={value.postcode || ''}
              onChange={(e) => handleManualChange('postcode', e.target.value)}
              placeholder="3000"
              required={required}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${label}-country`}>Country {required && '*'}</Label>
            <Input
              id={`${label}-country`}
              value={value.country || ''}
              onChange={(e) => handleManualChange('country', e.target.value)}
              placeholder="AU"
              required={required}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    );
  }

  // Google Places Autocomplete
  return (
    <div className="space-y-2">
      <Label htmlFor={label}>
        {label} {required && '*'}
      </Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          id={label}
          value={displayValue}
          onChange={(e) => setDisplayValue(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="pl-10"
        />
      </div>
      <button
        type="button"
        onClick={() => setShowManualFields(true)}
        className="text-xs text-muted-foreground hover:text-foreground underline"
      >
        Enter address manually
      </button>
    </div>
  );
}
