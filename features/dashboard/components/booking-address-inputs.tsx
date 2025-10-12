"use client";

import { useEffect } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Label } from "@/features/shared/components/ui/label";
import { Plus, X, Loader2 } from "lucide-react";
import { AddressInput as AddressInputComponent } from "./address-input";
import type { AddressInput, Address } from "@/features/shared/lib/database/types/addresses";
import { AddressType } from "@/features/shared/lib/database/types/addresses";
import { LocationType } from "@/features/shared/lib/database/types/service";
import type { Service } from "@/features/shared/lib/database/types/service";

interface BookingAddressInputsProps {
  selectedService: Service | null;
  loadingServiceDetails: boolean;
  googleMapsApiKey: string;
  pickupAddresses: AddressInput[];
  setPickupAddresses: (addresses: AddressInput[]) => void;
  dropoffAddresses: AddressInput[];
  setDropoffAddresses: (addresses: AddressInput[]) => void;
  serviceAddress: AddressInput | null;
  setServiceAddress: (address: AddressInput | null) => void;
  // For edit mode - existing addresses to populate initial state
  existingAddresses?: Address[];
  isEditMode?: boolean;
}

export function BookingAddressInputs({
  selectedService,
  loadingServiceDetails,
  googleMapsApiKey,
  pickupAddresses,
  setPickupAddresses,
  dropoffAddresses,
  setDropoffAddresses,
  serviceAddress,
  setServiceAddress,
  existingAddresses = [],
  isEditMode = false
}: BookingAddressInputsProps) {
  // Initialize addresses from existing data when in edit mode
  useEffect(() => {
    if (isEditMode && existingAddresses.length > 0 && selectedService) {
      const pickupAddrs = existingAddresses
        .filter(addr => addr.type === AddressType.PICKUP)
        .map(addr => ({
          address_line_1: addr.address_line_1,
          address_line_2: addr.address_line_2 || '',
          city: addr.city,
          state: addr.state || '',
          postcode: addr.postcode,
          country: addr.country
        }));

      const dropoffAddrs = existingAddresses
        .filter(addr => addr.type === AddressType.DROPOFF)
        .map(addr => ({
          address_line_1: addr.address_line_1,
          address_line_2: addr.address_line_2 || '',
          city: addr.city,
          state: addr.state || '',
          postcode: addr.postcode,
          country: addr.country
        }));

      const customerAddr = existingAddresses.find(addr => addr.type === AddressType.CUSTOMER);
      const serviceAddr = customerAddr ? {
        address_line_1: customerAddr.address_line_1,
        address_line_2: customerAddr.address_line_2 || '',
        city: customerAddr.city,
        state: customerAddr.state || '',
        postcode: customerAddr.postcode,
        country: customerAddr.country
      } : null;

      if (selectedService.location_type === LocationType.PICKUP_AND_DROPOFF) {
        setPickupAddresses(pickupAddrs.length > 0 ? pickupAddrs : [{ address_line_1: '', city: '', state: '', postcode: '', country: '' }]);
        setDropoffAddresses(dropoffAddrs.length > 0 ? dropoffAddrs : [{ address_line_1: '', city: '', state: '', postcode: '', country: '' }]);
      } else if (selectedService.location_type === LocationType.CUSTOMER) {
        setServiceAddress(serviceAddr || { address_line_1: '', city: '', state: '', postcode: '', country: '' });
      }
    }
  }, [isEditMode, existingAddresses, selectedService, setPickupAddresses, setDropoffAddresses, setServiceAddress]);

  if (loadingServiceDetails && selectedService) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading service details...</span>
      </div>
    );
  }

  if (!selectedService) {
    return null;
  }

  return (
    <>
      {selectedService.location_type === LocationType.CUSTOMER && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Customer Address (Optional)</Label>
          </div>
          {googleMapsApiKey ? (
            <AddressInputComponent
              label="Service Address"
              value={serviceAddress || { address_line_1: '', city: '', state: '', postcode: '', country: '' }}
              onChange={setServiceAddress}
              placeholder="Enter customer address..."
              apiKey={googleMapsApiKey}
              countries={['au']}
            />
          ) : (
            <div className="text-sm text-muted-foreground">Google Maps not available</div>
          )}
        </div>
      )}

      {selectedService.location_type === LocationType.PICKUP_AND_DROPOFF && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
          {/* Pickup Addresses */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Pickup Addresses (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickupAddresses([...pickupAddresses, { address_line_1: '', city: '', state: '', postcode: '', country: '' }])}
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Pickup
              </Button>
            </div>
            {pickupAddresses.map((address, index) => (
              <div key={index} className="relative">
                {googleMapsApiKey ? (
                  <AddressInputComponent
                    label={`Pickup ${index + 1}`}
                    value={address}
                    onChange={(newAddress) => {
                      const updated = [...pickupAddresses];
                      updated[index] = newAddress;
                      setPickupAddresses(updated);
                    }}
                    placeholder="Enter pickup address..."
                    apiKey={googleMapsApiKey}
                    countries={['au']}
                  />
                ) : null}
                {pickupAddresses.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPickupAddresses(pickupAddresses.filter((_, i) => i !== index))}
                    className="absolute top-0 right-0 text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {pickupAddresses.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No pickup addresses added yet</p>
            )}
          </div>

          {/* Dropoff Addresses */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Dropoff Addresses (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDropoffAddresses([...dropoffAddresses, { address_line_1: '', city: '', state: '', postcode: '', country: '' }])}
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Dropoff
              </Button>
            </div>
            {dropoffAddresses.map((address, index) => (
              <div key={index} className="relative">
                {googleMapsApiKey ? (
                  <AddressInputComponent
                    label={`Dropoff ${index + 1}`}
                    value={address}
                    onChange={(newAddress) => {
                      const updated = [...dropoffAddresses];
                      updated[index] = newAddress;
                      setDropoffAddresses(updated);
                    }}
                    placeholder="Enter dropoff address..."
                    apiKey={googleMapsApiKey}
                    countries={['au']}
                  />
                ) : null}
                {dropoffAddresses.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDropoffAddresses(dropoffAddresses.filter((_, i) => i !== index))}
                    className="absolute top-0 right-0 text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {dropoffAddresses.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No dropoff addresses added yet</p>
            )}
          </div>
        </div>
      )}

      {selectedService.location_type === LocationType.BUSINESS && (
        <div className="p-3 border rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground italic">
            ℹ️ This service is provided at the business location - no customer address needed
          </p>
        </div>
      )}
    </>
  );
}
