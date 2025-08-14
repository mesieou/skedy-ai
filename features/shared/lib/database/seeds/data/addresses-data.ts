import type { CreateAddressData } from '../../types/addresses';
import { AddressType } from '../../types/addresses';

// Test address data for seeding
export const pickupAddressData: CreateAddressData = {
  service_id: "placeholder-service-id", // Will be replaced with actual service_id
  type: AddressType.PICKUP,
  address_line_1: "123 Collins Street",
  address_line_2: "Unit 15",
  city: "Melbourne",
  postcode: "3000",
  state: "VIC",
  country: "Australia"
};

export const deliveryAddressData: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.DROPOFF,
  address_line_1: "456 Chapel Street", 
  address_line_2: null,
  city: "South Yarra",
  postcode: "3141",
  state: "VIC",
  country: "Australia"
};

export const storageAddressData: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.BUSINESS,
  address_line_1: "789 Industrial Drive",
  address_line_2: "Warehouse 5",
  city: "Clayton",
  postcode: "3168", 
  state: "VIC",
  country: "Australia"
};
