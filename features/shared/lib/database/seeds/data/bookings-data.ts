// ===================================================================
// BOOKING TEST SCENARIOS FOR ALL 9 EXAMPLES
// ===================================================================

import { AddressType } from '@/features/scheduling/lib/types/booking-calculations';

// Clean, structured booking scenarios - each scenario is complete and self-contained
export interface BookingScenario {
  name: string;
  description: string;
  businessType: 'removalist' | 'manicurist' | 'spa';
  services: Array<{
    serviceKey: string;
    quantity: number;
  }>;
  addresses: Array<{
    type: AddressType;
    addressKey: string;
    sequence_order: number;
  }>;
}

// ===================================================================
// EXAMPLE 1-4: REMOVALIST SCENARIOS
// ===================================================================

export const removalistScenarios: BookingScenario[] = [
  // Example 1: BETWEEN_CUSTOMER_LOCATIONS
  {
    name: "Example 1: Between Customers Only",
    description: "2-person team, charges only between pickup and dropoff",
    businessType: 'removalist',
    services: [{ serviceKey: 'removalistExample1', quantity: 2 }],
    addresses: [
      { type: AddressType.BUSINESS, addressKey: 'removalistBase', sequence_order: 0 },
      { type: AddressType.PICKUP, addressKey: 'melbournePickup', sequence_order: 1 },
      { type: AddressType.DROPOFF, addressKey: 'richmondDropoff', sequence_order: 2 },
      { type: AddressType.BUSINESS, addressKey: 'removalistBase', sequence_order: 3 }
    ]
  },

  // Example 2: FROM_BASE_AND_BETWEEN_CUSTOMERS
  {
    name: "Example 2: Base + Between Customers",
    description: "Interstate move, charges from base plus between customers",
    businessType: 'removalist',
    services: [{ serviceKey: 'removalistExample2', quantity: 2 }],
    addresses: [
      { type: AddressType.BUSINESS, addressKey: 'removalistBase', sequence_order: 0 },
      { type: AddressType.PICKUP, addressKey: 'melbournePickup', sequence_order: 1 },
      { type: AddressType.PICKUP, addressKey: 'hawthornPickup', sequence_order: 2 },
      { type: AddressType.DROPOFF, addressKey: 'richmondDropoff', sequence_order: 3 },
      { type: AddressType.BUSINESS, addressKey: 'removalistBase', sequence_order: 4 }
    ]
  },

  // Example 3: BETWEEN_CUSTOMERS_AND_BACK_TO_BASE
  {
    name: "Example 3: Between Customers + Return",
    description: "Premium service, charges between customers and return to base",
    businessType: 'removalist',
    services: [{ serviceKey: 'removalistExample3', quantity: 3 }],
    addresses: [
      { type: AddressType.BUSINESS, addressKey: 'removalistBase', sequence_order: 0 },
      { type: AddressType.PICKUP, addressKey: 'brightonPickup', sequence_order: 1 },
      { type: AddressType.PICKUP, addressKey: 'hawthornPickup', sequence_order: 2 },
      { type: AddressType.DROPOFF, addressKey: 'toorakDropoff', sequence_order: 3 },
      { type: AddressType.BUSINESS, addressKey: 'removalistBase', sequence_order: 4 }
    ]
  },

  // Example 4: FULL_ROUTE
  {
    name: "Example 4: Full Route Charging",
    description: "Express service, charges entire route including return",
    businessType: 'removalist',
    services: [{ serviceKey: 'removalistExample4', quantity: 2 }],
    addresses: [
      { type: AddressType.BUSINESS, addressKey: 'removalistBase', sequence_order: 0 },
      { type: AddressType.PICKUP, addressKey: 'melbournePickup', sequence_order: 1 },
      { type: AddressType.DROPOFF, addressKey: 'camberweelDropoff', sequence_order: 2 },
      { type: AddressType.BUSINESS, addressKey: 'removalistBase', sequence_order: 3 }
    ]
  }
];

// ===================================================================
// EXAMPLE 5-8: MANICURIST SCENARIOS
// ===================================================================

export const manicuristScenarios: BookingScenario[] = [
  // Example 5: Multiple services, one component each
  {
    name: "Example 5: Multiple Simple Services",
    description: "Basic + Gel manicure, separate fixed pricing",
    businessType: 'manicurist',
    services: [
      { serviceKey: 'manicuristExample5Service1', quantity: 1 },
      { serviceKey: 'manicuristExample5Service2', quantity: 1 }
    ],
    addresses: [
      { type: AddressType.BUSINESS, addressKey: 'manicuristBase', sequence_order: 0 },
      { type: AddressType.CUSTOMER, addressKey: 'northMelbourneHome', sequence_order: 1 },
      { type: AddressType.BUSINESS, addressKey: 'manicuristBase', sequence_order: 2 }
    ]
  },

  // Example 6: One service, multiple components
  {
    name: "Example 6: Service with Separate Travel",
    description: "Premium service with separate travel component",
    businessType: 'manicurist',
    services: [{ serviceKey: 'manicuristExample6', quantity: 1 }],
    addresses: [
      { type: AddressType.BUSINESS, addressKey: 'manicuristBase', sequence_order: 0 },
      { type: AddressType.CUSTOMER, addressKey: 'southYarraApartment', sequence_order: 1 },
      { type: AddressType.BUSINESS, addressKey: 'manicuristBase', sequence_order: 2 }
    ]
  },

  // Example 7: Multiple services, multiple components
  {
    name: "Example 7: Services with Callout Fees",
    description: "Manicure + Pedicure, each with callout fees",
    businessType: 'manicurist',
    services: [
      { serviceKey: 'manicuristExample7Service1', quantity: 1 },
      { serviceKey: 'manicuristExample7Service2', quantity: 1 }
    ],
    addresses: [
      { type: AddressType.BUSINESS, addressKey: 'manicuristBase', sequence_order: 0 },
      { type: AddressType.CUSTOMER, addressKey: 'fitzroyOffice', sequence_order: 1 },
      { type: AddressType.BUSINESS, addressKey: 'manicuristBase', sequence_order: 2 }
    ]
  },

  // Example 8: Mixed mobile/non-mobile services
  {
    name: "Example 8: Mixed Service Types",
    description: "In-salon + mobile service with travel",
    businessType: 'manicurist',
    services: [
      { serviceKey: 'manicuristExample8Service1', quantity: 1 }, // In-salon
      { serviceKey: 'manicuristExample8Service2', quantity: 1 }  // Mobile
    ],
    addresses: [
      { type: AddressType.BUSINESS, addressKey: 'manicuristBase', sequence_order: 0 },
      { type: AddressType.CUSTOMER, addressKey: 'carltonHome', sequence_order: 1 },
      { type: AddressType.BUSINESS, addressKey: 'manicuristBase', sequence_order: 2 }
    ]
  }
];

// ===================================================================
// EXAMPLE 9: SPA/MASSAGE SCENARIOS
// ===================================================================

export const spaScenarios: BookingScenario[] = [
  // Example 9: Non-mobile services at business location
  {
    name: "Example 9: In-Spa Services",
    description: "Multiple massage services at spa location",
    businessType: 'spa',
    services: [
      { serviceKey: 'massageExample9Service1', quantity: 1 },
      { serviceKey: 'massageExample9Service2', quantity: 1 }
    ],
    addresses: [
      { type: AddressType.BUSINESS, addressKey: 'spaBase', sequence_order: 0 }
    ]
  }
];

// ===================================================================
// COMPLEX MULTI-SCENARIO BOOKINGS
// ===================================================================

export const complexScenarios: BookingScenario[] = [
  // Multi-customer manicurist route
  {
    name: "Multi-Customer Route",
    description: "Manicurist visiting multiple customers in one trip",
    businessType: 'manicurist',
    services: [
      { serviceKey: 'manicuristExample5Service1', quantity: 1 },
      { serviceKey: 'manicuristExample5Service1', quantity: 1 },
      { serviceKey: 'manicuristExample5Service2', quantity: 1 }
    ],
    addresses: [
      { type: AddressType.BUSINESS, addressKey: 'manicuristBase', sequence_order: 0 },
      { type: AddressType.CUSTOMER, addressKey: 'northMelbourneHome', sequence_order: 1 },
      { type: AddressType.CUSTOMER, addressKey: 'southYarraApartment', sequence_order: 2 },
      { type: AddressType.CUSTOMER, addressKey: 'carltonHome', sequence_order: 3 },
      { type: AddressType.BUSINESS, addressKey: 'manicuristBase', sequence_order: 4 }
    ]
  },

  // Multi-stop removalist move
  {
    name: "Multi-Stop Move",
    description: "Removalist with multiple pickup and dropoff locations",
    businessType: 'removalist',
    services: [{ serviceKey: 'removalistExample1', quantity: 3 }],
    addresses: [
      { type: AddressType.BUSINESS, addressKey: 'removalistBase', sequence_order: 0 },
      { type: AddressType.PICKUP, addressKey: 'melbournePickup', sequence_order: 1 },
      { type: AddressType.PICKUP, addressKey: 'hawthornPickup', sequence_order: 2 },
      { type: AddressType.DROPOFF, addressKey: 'richmondDropoff', sequence_order: 3 },
      { type: AddressType.DROPOFF, addressKey: 'toorakDropoff', sequence_order: 4 },
      { type: AddressType.BUSINESS, addressKey: 'removalistBase', sequence_order: 5 }
    ]
  }
];

// ===================================================================
// ALL SCENARIOS COMBINED
// ===================================================================

export const allBookingScenarios = [
  ...removalistScenarios,
  ...manicuristScenarios,
  ...spaScenarios,
  ...complexScenarios
];

// ===================================================================
// SCENARIO MAPPING FOR EASY ACCESS
// ===================================================================

export const scenariosByExample = {
  1: removalistScenarios[0],
  2: removalistScenarios[1],
  3: removalistScenarios[2],
  4: removalistScenarios[3],
  5: manicuristScenarios[0],
  6: manicuristScenarios[1],
  7: manicuristScenarios[2],
  8: manicuristScenarios[3],
  9: spaScenarios[0]
};

export const scenariosByName = {
  'between_customers_only': removalistScenarios[0],
  'base_and_between_customers': removalistScenarios[1],
  'between_customers_and_return': removalistScenarios[2],
  'full_route': removalistScenarios[3],
  'multiple_simple_services': manicuristScenarios[0],
  'service_with_travel': manicuristScenarios[1],
  'services_with_callout': manicuristScenarios[2],
  'mixed_service_types': manicuristScenarios[3],
  'in_spa_services': spaScenarios[0],
  'multi_customer_route': complexScenarios[0],
  'multi_stop_move': complexScenarios[1]
};

// ===================================================================
// HELPER FUNCTIONS FOR TESTING
// ===================================================================

export function getScenariosByBusinessType(businessType: 'removalist' | 'manicurist' | 'spa'): BookingScenario[] {
  return allBookingScenarios.filter(scenario => scenario.businessType === businessType);
}

export function getScenariosByExample(exampleNumber: number): BookingScenario | undefined {
  return scenariosByExample[exampleNumber as keyof typeof scenariosByExample];
}

export function getRemovalistScenarios(): BookingScenario[] {
  return removalistScenarios;
}

export function getManicuristScenarios(): BookingScenario[] {
  return manicuristScenarios;
}

export function getSpaScenarios(): BookingScenario[] {
  return spaScenarios;
}

export function getComplexScenarios(): BookingScenario[] {
  return complexScenarios;
}
