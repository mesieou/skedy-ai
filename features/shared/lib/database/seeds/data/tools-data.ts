import type { CreateToolData } from '../../types/tools';

export const getServiceDetailsTool: CreateToolData = {
  name: 'get_service_details',
  description: 'Get service details when customer asks for more info',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    function: {
      name: 'get_service_details',
      description: 'Get service details',
      parameters: {
        type: 'object',
        properties: {
          service_name: {
            type: 'string',
            description: 'Service name'
          }
        },
        required: ['service_name'],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Here are the details for {service_name}',
    error_message: 'I couldn\'t find that service. Let me show you what\'s available instead.',
    data_structure: {
      service_id: 'string',
      name: 'string',
      description: 'string',
      location_type: 'string',
      pricing_config: 'object',
      travel_charging_model: 'string',
      how_it_works: 'string'
    }
  }
};

export const getQuoteTool: CreateToolData = {
  name: 'get_quote',
  description: 'Get price quote',
  version: '1.0.0',
  dynamic_parameters: true,
  business_specific: true,
  function_schema: {
    type: 'function',
    function: {
      name: 'get_quote',
      description: 'Get quote',
      parameters: {
        type: 'object',
        properties: {
          service_id: {
            type: 'string',
            description: 'Service id from get_service_details'
          }
        },
        required: ['service_id'],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Here\'s your quote - total cost is ${total_estimate_amount}',
    error_message: 'I couldn\'t generate a quote for that request. Please check the service details and try again.',
    data_structure: {
      quote_id: 'string',
      total_estimate_amount: 'number',
      total_estimate_time_minutes: 'number',
      price_breakdown: 'object',
      deposit_amount: 'number'
    }
  }
};

export const checkDayAvailabilityTool: CreateToolData = {
  name: 'check_day_availability',
  description: 'Check date availability for a specific date',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    function: {
      name: 'check_day_availability',
      description: 'Check availability for a specific date',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format'
          },
          quote_total_estimate_time_minutes: {
            type: 'string',
            description: 'Quote total estimate time minutes from get_quote'
          }
        },
        required: ['date', 'quote_total_estimate_time_minutes'],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Available {date}',
    error_message: 'Sorry, system issue',
    data_structure: {
      date: 'string',
      available_times: 'array'
    }
  }
};


export const createUserTool: CreateToolData = {
  name: 'create_user',
  description: 'Create new customer',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    function: {
      name: 'create_user',
      description: 'Create customer',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Customer name'
          }
        },
        required: ['name'],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Profile created',
    error_message: 'Sorry, system issue',
    data_structure: {
      user_id: 'string',
      customer_name: 'string',
      created: 'boolean'
    }
  }
};

export const createBookingTool: CreateToolData = {
  name: 'create_booking',
  description: 'Create booking after quote, user, availability check',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    function: {
      name: 'create_booking',
      description: 'Create booking after quote, user, availability check',
      parameters: {
        type: 'object',
        properties: {
          preferred_date: {
            type: 'string',
            description: 'Date YYYY-MM-DD'
          },
          preferred_time: {
            type: 'string',
            description: 'Time HH:MM (24-hour)'
          },
          user_id: {
            type: 'string',
            description: 'User ID from create_user'
          },
          quote_id: {
            type: 'string',
            description: 'Quote ID from selected quote'
          },
          confirmation_message: {
            type: 'string',
            description: 'Optional message/instructions'
          }
        },
        required: ['preferred_date', 'preferred_time', 'user_id', 'quote_id'],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Booking confirmed {preferred_date} at {preferred_time}',
    error_message: 'Sorry, system issue',
    data_structure: {
      booking_id: 'string',
      confirmation_number: 'string',
      scheduled_date: 'string',
      scheduled_time: 'string',
      total_price: 'number',
      deposit_required: 'boolean',
      deposit_amount: 'number'
    }
  }
};

// ============================================================================
// TOOL COLLECTIONS
// ============================================================================

/**
 * All removalist tools (business-specific collection)
 */
export const removalistTools: CreateToolData[] = [
  getServiceDetailsTool,
  getQuoteTool,
  checkDayAvailabilityTool,
  createUserTool,
  createBookingTool
];

/**
 * All available tools in the system (for seeding tools table)
 * This will grow as we add more business types and tool categories
 */
export const allAvailableTools: CreateToolData[] = [
  // Removalist tools
  getServiceDetailsTool,
  getQuoteTool,
  checkDayAvailabilityTool,
  createUserTool,
  createBookingTool

  // Future tools will be added here:
  // - Cleaning service tools
  // - Plumbing tools
  // - General business tools
  // - etc.
];
