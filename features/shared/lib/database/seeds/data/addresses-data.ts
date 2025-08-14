import type { CreateAddressData } from '../../types/addresses';
import { AddressType } from '../../types/addresses';

// Base address templates
export const pickupAddressData: CreateAddressData = {
  service_id: "placeholder-service-id",
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

// Beauty business specific addresses
export const luxuryApartmentAddress = {
  ...pickupAddressData,
  type: AddressType.CUSTOMER,
  address_line_1: '123 Luxury Apartment',
  address_line_2: 'Penthouse',
  city: 'South Yarra',
  postcode: '3141'
};

export const familyHomeAddress = {
  ...deliveryAddressData,
  type: AddressType.CUSTOMER,
  address_line_1: '456 Family Home',
  city: 'Brighton',
  postcode: '3186'
};

export const distantSuburbAddress = {
  ...deliveryAddressData,
  type: AddressType.CUSTOMER,
  address_line_1: '789 Distant Suburb',
  city: 'Frankston',
  postcode: '3199'
};

export const spaLocationAddress = {
  ...pickupAddressData,
  type: AddressType.CUSTOMER,
  address_line_1: '321 Spa Day Location',
  city: 'Toorak',
  postcode: '3142'
};

// Transport business specific addresses
export const apartmentPickupAddress = {
  ...pickupAddressData,
  type: AddressType.PICKUP,
  address_line_2: 'Apartment 5'
};

export const housePickupAddress = {
  ...pickupAddressData,
  type: AddressType.PICKUP,
  address_line_1: '789 Burke Street',
  address_line_2: 'House'
};

export const commercialPickupAddress = {
  ...pickupAddressData,
  type: AddressType.PICKUP,
  address_line_1: '999 Large House Street',
  address_line_2: '4 Bedroom House',
  city: 'Camberwell',
  postcode: '3124'
};

export const yallaDropoffAddress = {
  ...deliveryAddressData,
  type: AddressType.DROPOFF,
  address_line_1: '321 Toorak Road',
  city: 'Toorak',
  postcode: '3142'
};

export const hawthornDropoffAddress = {
  ...deliveryAddressData,
  type: AddressType.DROPOFF,
  address_line_1: '111 New Home Avenue',
  address_line_2: 'Large Property',
  city: 'Hawthorn',
  postcode: '3122'
};

// Cleaning business specific addresses
export const smallOfficeAddress = {
  ...pickupAddressData,
  type: AddressType.CUSTOMER,
  address_line_1: '123 Business Park',
  address_line_2: 'Suite 5, Small Office',
  city: 'Richmond',
  postcode: '3121'
};

export const mediumOfficeAddress = {
  ...pickupAddressData,
  type: AddressType.CUSTOMER,
  address_line_1: '456 Corporate Plaza',
  address_line_2: 'Level 3, Medium Office',
  city: 'Melbourne',
  postcode: '3000'
};

export const largeOfficeAddress = {
  ...pickupAddressData,
  type: AddressType.CUSTOMER,
  address_line_1: '789 Enterprise Tower',
  address_line_2: 'Floor 10-12, Large Office',
  city: 'Southbank',
  postcode: '3006'
};

// Handyman business specific addresses
export const leakyPipeAddress = {
  ...pickupAddressData,
  type: AddressType.CUSTOMER,
  address_line_1: '123 Leaky Pipe Street',
  address_line_2: 'Unit 5',
  city: 'Richmond',
  postcode: '3121'
};

export const powerOutageAddress = {
  ...deliveryAddressData,
  type: AddressType.CUSTOMER,
  address_line_1: '456 Power Outage Avenue',
  city: 'Carlton',
  postcode: '3053'
};

export const renovationAddress = {
  ...storageAddressData,
  type: AddressType.CUSTOMER,
  address_line_1: '789 Major Renovation Road',
  address_line_2: 'Large Commercial Building',
  city: 'Southbank',
  postcode: '3006'
};

export const emergencyRepairAddress = {
  ...pickupAddressData,
  type: AddressType.CUSTOMER,
  address_line_1: '999 Emergency Street',
  address_line_2: 'Urgent Repair Needed',
  city: 'Melbourne',
  postcode: '3000'
};

// Address mappings for booking scenarios
export const addressMappings = {
  beauty: {
    luxuryApartment: luxuryApartmentAddress,
    familyHome: familyHomeAddress,
    distantSuburb: distantSuburbAddress,
    spaLocation: spaLocationAddress
  },
  transport: {
    apartmentPickup: apartmentPickupAddress,
    housePickup: housePickupAddress,
    commercialPickup: commercialPickupAddress,
    yallaDropoff: yallaDropoffAddress,
    hawthornDropoff: hawthornDropoffAddress
  },
  cleaning: {
    smallOffice: smallOfficeAddress,
    mediumOffice: mediumOfficeAddress,
    largeOffice: largeOfficeAddress
  },
  handyman: {
    leakyPipe: leakyPipeAddress,
    powerOutage: powerOutageAddress,
    renovation: renovationAddress,
    emergencyRepair: emergencyRepairAddress
  }
};