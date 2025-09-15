import type { CreateToolData } from '../../types/tools';

export const getServiceInfoTool: CreateToolData = {
  name: 'get_service_info',
  description: 'Get information about available services',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    function: {
      name: 'get_service_info',
      description: 'Get service information',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Here are our services',
    error_message: 'Service info unavailable',
    data_structure: {
      services: 'array'
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
        properties: {},
        required: [],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Quote ready',
    error_message: 'Quote failed',
    data_structure: {
      quote_id: 'string',
      total_price: 'number'
    }
  }
};

export const checkDayAvailabilityTool: CreateToolData = {
  name: 'check_day_availability',
  description: 'Check date availability',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    function: {
      name: 'check_day_availability',
      description: 'Check availability',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format'
          }
        },
        required: ['date'],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Available on {date}',
    error_message: 'Checking availability',
    data_structure: {
      date: 'string',
      available: 'boolean',
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
    error_message: 'Profile failed',
    data_structure: {
      user_id: 'string',
      customer_name: 'string',
      created: 'boolean'
    }
  }
};

export const createBookingTool: CreateToolData = {
  name: 'create_booking',
  description: 'Create a booking after quote, user creation, and availability check.',
  version: '1.0.0',
  dynamic_parameters: false,  // Static schema
  business_specific: true,    // Bookings are business-specific
  function_schema: {
    type: 'function',
    function: {
      name: 'create_booking',
      description: 'Create a booking. Use this only after getting a quote, creating a user, and checking availability. Quote data is automatically retrieved from context.',
      parameters: {
        type: 'object',
        properties: {
          preferred_date: {
            type: 'string',
            description: 'The customer\'s preferred date in YYYY-MM-DD format'
          },
          preferred_time: {
            type: 'string',
            description: 'The customer\'s preferred time in HH:MM format (24-hour)'
          },
          user_id: {
            type: 'string',
            description: 'The user ID from the create_user function'
          },
          confirmation_message: {
            type: 'string',
            description: 'Optional confirmation message or special instructions from the customer'
          }
        },
        required: ['preferred_date', 'preferred_time', 'user_id'],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Excellent! Your booking is confirmed for {preferred_date} at {preferred_time}.',
    error_message: 'I had trouble creating your booking. Let me check the details and try again.',
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
 * All base tools available in the system
 */
export const allBaseTools: CreateToolData[] = [
  selectServiceTool,
  getQuoteTool,
  selectQuoteTool,
  checkDayAvailabilityTool,
  checkUserExistsTool,
  createUserTool,
  createBookingTool
];

/**
 * Core scheduling flow tools (most common)
 */
export const coreSchedulingTools: CreateToolData[] = [
  selectServiceTool,
  getQuoteTool,
  checkDayAvailabilityTool,
  checkUserExistsTool,
  createUserTool,
  createBookingTool
];

/**
 * Tools that require dynamic schema generation
 */
export const dynamicTools: CreateToolData[] = [
  selectServiceTool,
  getQuoteTool
];

/**
 * Tools that are business-specific
 */
export const businessSpecificTools: CreateToolData[] = [
  selectServiceTool,
  getQuoteTool,
  checkDayAvailabilityTool,
  checkUserExistsTool,
  createUserTool,
  createBookingTool
];

/**
 * Tools with static schemas (no dynamic generation needed)
 */
export const staticTools: CreateToolData[] = [
  selectQuoteTool,
  checkDayAvailabilityTool,
  checkUserExistsTool,
  createUserTool,
  createBookingTool
];
