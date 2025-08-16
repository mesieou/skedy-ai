import type { CreateAddressData } from '../../types/addresses';
import { AddressType } from '../../types/addresses';

// ===================================================================
// BUSINESS BASE ADDRESSES
// ===================================================================

export const removalistBaseAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.BUSINESS,
  address_line_1: "123 Collins Street",
  address_line_2: "Removals Depot",
  city: "Melbourne",
  postcode: "3000",
  state: "VIC",
  country: "Australia"
};

export const manicuristBaseAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.BUSINESS,
  address_line_1: "321 High Street",
  address_line_2: "Beauty Salon",
  city: "Prahran",
  postcode: "3181",
  state: "VIC",
  country: "Australia"
};

export const spaBaseAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.BUSINESS,
  address_line_1: "456 Chapel Street",
  address_line_2: "Spa & Massage Center",
  city: "South Yarra",
  postcode: "3141",
  state: "VIC",
  country: "Australia"
};

// ===================================================================
// REMOVALIST CUSTOMER ADDRESSES (Examples 1-4)
// ===================================================================

// Example 1-4: Various pickup and dropoff locations for removalist services
export const melbournePickupAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.PICKUP,
  address_line_1: "789 Burke Street",
  address_line_2: "Apartment 5B",
  city: "Melbourne",
  postcode: "3000",
  state: "VIC",
  country: "Australia"
};

export const richmondDropoffAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.DROPOFF,
  address_line_1: "456 Swan Street",
  address_line_2: "Unit 12",
  city: "Richmond",
  postcode: "3121",
  state: "VIC",
  country: "Australia"
};

export const hawthornPickupAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.PICKUP,
  address_line_1: "321 Burwood Road",
  address_line_2: "House",
  city: "Hawthorn",
  postcode: "3122",
  state: "VIC",
  country: "Australia"
};

export const camberweelDropoffAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.DROPOFF,
  address_line_1: "654 Riversdale Road",
  address_line_2: "Storage Unit 45",
  city: "Camberwell",
  postcode: "3124",
  state: "VIC",
  country: "Australia"
};

export const brightonPickupAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.PICKUP,
  address_line_1: "987 Bay Street",
  address_line_2: "Large Family Home",
  city: "Brighton",
  postcode: "3186",
  state: "VIC",
  country: "Australia"
};

export const toorakDropoffAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.DROPOFF,
  address_line_1: "234 Toorak Road",
  address_line_2: "Luxury Apartment",
  city: "Toorak",
  postcode: "3142",
  state: "VIC",
  country: "Australia"
};

// ===================================================================
// MANICURIST CUSTOMER ADDRESSES (Examples 5-8)
// ===================================================================

// Example 5-8: Customer locations for mobile manicurist services
export const northMelbourneHomeAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.CUSTOMER,
  address_line_1: "123 Arden Street",
  address_line_2: "Townhouse",
  city: "North Melbourne",
  postcode: "3051",
  state: "VIC",
  country: "Australia"
};

export const southYarraApartmentAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.CUSTOMER,
  address_line_1: "567 Chapel Street",
  address_line_2: "Apartment 8C",
  city: "South Yarra",
  postcode: "3141",
  state: "VIC",
  country: "Australia"
};

export const fitzroyOfficeAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.CUSTOMER,
  address_line_1: "89 Brunswick Street",
  address_line_2: "Office Level 2",
  city: "Fitzroy",
  postcode: "3065",
  state: "VIC",
  country: "Australia"
};

export const carltonHomeAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.CUSTOMER,
  address_line_1: "456 Lygon Street",
  address_line_2: "Victorian Terrace",
  city: "Carlton",
  postcode: "3053",
  state: "VIC",
  country: "Australia"
};

export const elsternwickHomeAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.CUSTOMER,
  address_line_1: "321 Glen Huntly Road",
  address_line_2: "Family Home",
  city: "Elsternwick",
  postcode: "3185",
  state: "VIC",
  country: "Australia"
};

// ===================================================================
// ADDITIONAL CUSTOMER ADDRESSES FOR COMPLEX SCENARIOS
// ===================================================================

export const caulfieldhomeAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.CUSTOMER,
  address_line_1: "789 Hawthorn Road",
  address_line_2: "Modern Home",
  city: "Caulfield",
  postcode: "3162",
  state: "VIC",
  country: "Australia"
};

export const malvernOfficeAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.CUSTOMER,
  address_line_1: "654 Malvern Road",
  address_line_2: "Corporate Office",
  city: "Malvern",
  postcode: "3144",
  state: "VIC",
  country: "Australia"
};

export const frankstonDistantAddress: CreateAddressData = {
  service_id: "placeholder-service-id",
  type: AddressType.CUSTOMER,
  address_line_1: "123 Frankston-Dandenong Road",
  address_line_2: "Distant Suburb",
  city: "Frankston",
  postcode: "3199",
  state: "VIC",
  country: "Australia"
};

// ===================================================================
// ADDRESS MAPPINGS BY BUSINESS TYPE
// ===================================================================

export const businessBaseAddresses = {
  removalist: removalistBaseAddress,
  manicurist: manicuristBaseAddress,
  spa: spaBaseAddress
};

export const removalistAddresses = {
  base: removalistBaseAddress,
  melbournePickup: melbournePickupAddress,
  richmondDropoff: richmondDropoffAddress,
  hawthornPickup: hawthornPickupAddress,
  camberweelDropoff: camberweelDropoffAddress,
  brightonPickup: brightonPickupAddress,
  toorakDropoff: toorakDropoffAddress
};

export const manicuristAddresses = {
  base: manicuristBaseAddress,
  northMelbourneHome: northMelbourneHomeAddress,
  southYarraApartment: southYarraApartmentAddress,
  fitzroyOffice: fitzroyOfficeAddress,
  carltonHome: carltonHomeAddress,
  elsternwickHome: elsternwickHomeAddress,
  caulfieldHome: caulfieldhomeAddress,
  malvernOffice: malvernOfficeAddress,
  frankstonDistant: frankstonDistantAddress
};

export const spaAddresses = {
  base: spaBaseAddress
};



// ===================================================================
// COMPLEX SCENARIO ADDRESS SETS
// ===================================================================

// Multi-stop removalist route: Base → Melbourne → Hawthorn → Richmond → Base
export const multiStopRemovalistRoute = [
  removalistBaseAddress,
  melbournePickupAddress,
  hawthornPickupAddress,
  richmondDropoffAddress,
  removalistBaseAddress
];

// Manicurist multi-customer route: Base → North Melbourne → South Yarra → Carlton → Base
export const multiCustomerManicuristRoute = [
  manicuristBaseAddress,
  northMelbourneHomeAddress,
  southYarraApartmentAddress,
  carltonHomeAddress,
  manicuristBaseAddress
];

// Single customer mobile service: Base → Customer → Base
export const singleCustomerMobileRoute = [
  manicuristBaseAddress,
  southYarraApartmentAddress,
  manicuristBaseAddress
];

// Customer-to-customer only route (no base)
export const customerToCustomerRoute = [
  melbournePickupAddress,
  richmondDropoffAddress
];