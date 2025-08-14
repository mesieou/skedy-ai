import type { BookingCalculationInput } from '@/features/scheduling/lib/types/booking-calculations';
import { AddressRole } from '@/features/scheduling/lib/types/booking-calculations';
import type { Business } from '../../types/business';
import type { Service } from '../../types/service';
import type { CreateAddressData } from '../../types/addresses';
import { AddressType } from '../../types/addresses';

// Clean, structured booking scenarios - each scenario is complete and self-contained
export interface BookingScenario {
  services: Array<{
    name: string;
    quantity: number;
  }>;
  addresses: Array<{
    role: AddressRole;
    addressKey: string;
  }>;
}

// All booking scenarios as clean, structured data
export const bookingScenarios = {
  // Beauty services
  manicureAtHome: {
    services: [{ name: 'manicure', quantity: 1 }],
    addresses: [{ role: AddressRole.SERVICE, addressKey: 'luxuryApartment' }]
  },
  
  pedicureAtHome: {
    services: [{ name: 'pedicure', quantity: 1 }],
    addresses: [{ role: AddressRole.SERVICE, addressKey: 'familyHome' }]
  },
  
  massageWithTravel: {
    services: [{ name: 'massage', quantity: 1 }],
    addresses: [
      { role: AddressRole.BUSINESS_BASE, addressKey: 'businessBase' },
      { role: AddressRole.SERVICE, addressKey: 'distantSuburb' }
    ]
  },
  
  beautyPackage: {
    services: [
      { name: 'manicure', quantity: 1 },
      { name: 'pedicure', quantity: 1 }
    ],
    addresses: [{ role: AddressRole.SERVICE, addressKey: 'spaLocation' }]
  },

  // Transport services
  singlePersonMove: {
    services: [{ name: 'removal', quantity: 1 }],
    addresses: [
      { role: AddressRole.PICKUP, addressKey: 'apartmentPickup' },
      { role: AddressRole.DROPOFF, addressKey: 'yallaDropoff' }
    ]
  },
  
  teamMove: {
    services: [{ name: 'removal', quantity: 2 }],
    addresses: [
      { role: AddressRole.PICKUP, addressKey: 'housePickup' },
      { role: AddressRole.DROPOFF, addressKey: 'hawthornDropoff' }
    ]
  },
  
  largeMove: {
    services: [{ name: 'removal', quantity: 3 }],
    addresses: [
      { role: AddressRole.PICKUP, addressKey: 'commercialPickup' },
      { role: AddressRole.DROPOFF, addressKey: 'hawthornDropoff' }
    ]
  },

  smallItemMove: {
    services: [{ name: 'removal', quantity: 2 }],
    addresses: [
      { role: AddressRole.PICKUP, addressKey: 'apartmentPickup' },
      { role: AddressRole.DROPOFF, addressKey: 'yallaDropoff' }
    ]
  },

  longDistanceMove: {
    services: [{ name: 'removal', quantity: 2 }],
    addresses: [
      { role: AddressRole.PICKUP, addressKey: 'commercialPickup' },
      { role: AddressRole.DROPOFF, addressKey: 'hawthornDropoff' }
    ]
  },

  // Cleaning services
  houseCleaning: {
    services: [{ name: 'housecleaning', quantity: 1 }],
    addresses: [{ role: AddressRole.SERVICE, addressKey: 'smallOffice' }]
  },
  
  teamCleaning: {
    services: [{ name: 'housecleaning', quantity: 2 }],
    addresses: [{ role: AddressRole.SERVICE, addressKey: 'mediumOffice' }]
  },
  
  commercialCleaning: {
    services: [{ name: 'commercialcleaning', quantity: 1 }],
    addresses: [{ role: AddressRole.SERVICE, addressKey: 'largeOffice' }]
  },

  // Handyman services
  plumbingJob: {
    services: [{ name: 'plumbing', quantity: 1 }],
    addresses: [{ role: AddressRole.SERVICE, addressKey: 'leakyPipe' }]
  },
  
  electricalJob: {
    services: [{ name: 'electrical', quantity: 1 }],
    addresses: [{ role: AddressRole.SERVICE, addressKey: 'powerOutage' }]
  },
  
  emergencyRepair: {
    services: [{ name: 'plumbing', quantity: 1 }],
    addresses: [{ role: AddressRole.SERVICE, addressKey: 'emergencyRepair' }]
  }
} as const;

// Clean service finder - matches service by name
function findServiceByName(services: Service[], name: string): Service {
  const service = services.find(s => 
    s.name.toLowerCase().includes(name.toLowerCase()) ||
    s.name.toLowerCase().replace(/\s+/g, '').includes(name.toLowerCase())
  );
  
  if (!service) {
    throw new Error(`Service not found for name: ${name}. Available: ${services.map(s => s.name).join(', ')}`);
  }
  
  return service;
}

// Clean address resolver - gets address data by key
function resolveAddress(
  addressKey: string, 
  addressRegistry: Record<string, CreateAddressData>,
  business?: Business
): CreateAddressData {
  // Handle dynamic business address
  if (addressKey === 'businessBase' && business) {
    return {
      service_id: 'placeholder',
      type: AddressType.BUSINESS,
      address_line_1: business.address,
      address_line_2: null,
      city: 'Prahran',
      postcode: '3181',
      state: 'VIC',
      country: 'Australia'
    };
  }
  
  const address = addressRegistry[addressKey];
  if (!address) {
    throw new Error(`Address not found for key: ${addressKey}. Available: ${Object.keys(addressRegistry).join(', ')}`);
  }
  
  return address;
}

// Clean, simple booking creation - no weird arrays or mappings
export function createBooking(
  scenarioName: keyof typeof bookingScenarios,
  business: Business,
  availableServices: Service[],
  addressRegistry: Record<string, CreateAddressData>
): BookingCalculationInput {
  const scenario = bookingScenarios[scenarioName];
  
  if (!scenario) {
    throw new Error(`Scenario not found: ${scenarioName}. Available: ${Object.keys(bookingScenarios).join(', ')}`);
  }

  // Build services array
  const services = scenario.services.map(serviceSpec => ({
    service: findServiceByName(availableServices, serviceSpec.name),
    quantity: serviceSpec.quantity,
    serviceAddresses: []
  }));

  // Build addresses array
  const addresses = scenario.addresses.map((addressSpec, index) => {
    const address = resolveAddress(addressSpec.addressKey, addressRegistry, business);
    const primaryService = services[0].service;
    
    return {
      id: `address-${index}`,
      service_id: primaryService.id,
      sequence_order: index + 1,
      role: addressSpec.role,
      address: {
        ...address,
        id: `addr-${primaryService.id}-${index}`
      }
    };
  });

  return {
    business,
    services,
    addresses
  };
}