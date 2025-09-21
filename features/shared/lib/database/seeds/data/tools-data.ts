import type { CreateToolData } from '../../types/tools';

export const getServiceDetailsTool: CreateToolData = {
  name: 'get_service_details',
  description: 'Get service details when customer asks for more info',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'get_service_details',
    description: 'Get service details',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        service_name: {
          type: 'string',
          description: 'Service name'
        }
      },
      required: ['service_name'],
      additionalProperties: false
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
    name: 'get_quote',
    description: 'Get quote',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        service_id: {
          type: 'string',
          description: 'Service id from get_service_details'
        }
      },
      required: ['service_id'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Here\'s your quote - total estimate cost is ${total_estimate_amount}. Remember the price is an estimate and may vary.',
    error_message: 'I couldn\'t generate a quote for that request. Please check the service details and try again.',
    data_structure: {
      quote_id: 'string',
      total_estimate_amount: 'number',
      total_estimate_time_in_minutes: 'number',
      minimum_charge_applied: 'boolean',
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
    name: 'check_day_availability',
    description: 'Check availability for a specific date',
    parameters: {
      type: 'object',
      strict: true,
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
    name: 'create_user',
    description: 'Create customer',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        first_name: {
          type: 'string',
          description: 'Customer name'
        },
        last_name: {
          type: 'string',
          description: 'Customer last name'
        },
        email: {
          type: 'string',
          description: 'Customer email'
        }
      },
      required: ['first_name'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Profile created',
    error_message: 'Sorry, system issue',
    data_structure: {
      user_id: 'string',
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
    name: 'create_booking',
    description: 'Create booking after quote, user, availability check',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        preferred_date: {
          type: 'string',
          description: 'Date YYYY-MM-DD'
        },
        preferred_time: {
          type: 'string',
          description: 'Time HH:MM (24-hour)'
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
      required: ['preferred_date', 'preferred_time', 'quote_id'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Booking confirmed {preferred_date} at {preferred_time}. Remember the price is an estimate and may vary.',
    error_message: 'Sorry, system issue',
    data_structure: {
      booking_id: 'string',
      start_at: 'string',
      end_at: 'string',
      scheduled_time: 'string',
      total_estimate_amount: 'number',
      total_estimate_time_in_minutes: 'number',
      remaining_balance_amount: 'number',
      deposit_amount: 'number'
    }
  }
};

export const requestToolTool: CreateToolData = {
  name: 'request_tool',
  description: 'Request access to a tool when customer changes conversation direction',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: false,
  function_schema: {
    type: 'function',
    name: 'request_tool',
    description: 'Request tool access for conversation flow changes',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        tool_name: {
          type: 'string',
          description: 'Tool needed',
          enum: ['get_service_details', 'get_quote', 'check_day_availability', 'create_user', 'create_booking']
        },
        service_name: {
          type: 'string',
          description: 'Service name (required when requesting get_quote tool)'
        },
        reason: {
          type: 'string',
          description: 'Why needed'
        }
      },
      required: ['tool_name'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: '{tool_name} ready. Continue with your request.',
    error_message: 'Tool unavailable.',
    data_structure: {
      tool_name: 'string',
      available: 'boolean'
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
  createBookingTool,
  requestToolTool
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
  createBookingTool,
  requestToolTool

  // Future tools will be added here:
  // - Cleaning service tools
  // - Plumbing tools
  // - General business tools
  // - etc.
];
