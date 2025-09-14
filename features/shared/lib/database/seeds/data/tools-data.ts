/**
 * Tools Data
 *
 * Base tool definitions that can be configured per business.
 * These correspond to the schemas generated in schema-generator.ts
 */

import type { CreateToolData } from '../../types/tools';

// ============================================================================
// SCHEDULING TOOLS
// ============================================================================

export const selectServiceTool: CreateToolData = {
  name: 'select_service',
  description: 'Select a service for quote calculation. Available services dynamically generated per business.',
  version: '1.0.0',
  dynamic_parameters: true,  // Schema generated per business based on their services
  business_specific: true,
  function_schema: {
    type: 'function',
    function: {
      name: 'select_service',
      description: 'Select a service for quote calculation',
      parameters: {
        type: 'object',
        properties: {
          service_name: {
            type: 'string',
            description: 'The service to select for quote calculation',
            enum: [] // Will be populated dynamically per business
          }
        },
        required: ['service_name'],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Perfect! I\'ve got "{service_name}" selected for you. Now I\'ll get you a proper quote with all the details.',
    error_message: 'I\'m having trouble selecting that service. Let me help you choose from our available options.',
    data_structure: {
      selected_service: 'string',
      service_id: 'string',
      requirements_preview: 'array',
      job_scope_options: 'array',
      description: 'string',
      how_it_works: 'string'
    }
  }
};

export const getQuoteTool: CreateToolData = {
  name: 'get_quote',
  description: 'Get a price quote for services. Schema dynamically generated based on selected service requirements.',
  version: '1.0.0',
  dynamic_parameters: true,  // Schema changes based on selected service
  business_specific: true,
  function_schema: {
    type: 'function',
    function: {
      name: 'get_quote',
      description: 'Get a price quote for selected service',
      parameters: {
        type: 'object',
        properties: {}, // Will be populated dynamically based on service requirements
        required: [], // Will be populated dynamically
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Here\'s your quote for {service_name}',
    error_message: 'I couldn\'t generate a quote right now. Let me get some additional details.',
    data_structure: {
      quote_id: 'string',
      service_name: 'string',
      total_price: 'number',
      breakdown: 'object',
      valid_until: 'string'
    }
  }
};

export const selectQuoteTool: CreateToolData = {
  name: 'select_quote',
  description: 'Handle quote selection when multiple quotes are available.',
  version: '1.0.0',
  dynamic_parameters: false,  // Static schema
  business_specific: false,   // Same logic for all businesses
  function_schema: {
    type: 'function',
    function: {
      name: 'select_quote',
      description: 'Handle quote selection. Call without quote_choice to get all quotes for comparison, or with quote_choice to select a specific quote.',
      parameters: {
        type: 'object',
        properties: {
          quote_choice: {
            type: 'string',
            description: 'Optional. Customer\'s choice description (e.g., \'the cheaper option\', \'first option\'). If not provided, returns all quotes for comparison.'
          }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Great choice! I\'ve selected {selected_quote} for you.',
    error_message: 'Let me show you the available quotes to help you choose.',
    data_structure: {
      selected_quote_id: 'string',
      quote_details: 'object',
      all_quotes: 'array'
    }
  }
};

export const checkDayAvailabilityTool: CreateToolData = {
  name: 'check_day_availability',
  description: 'Check availability for a specific date.',
  version: '1.0.0',
  dynamic_parameters: false,  // Static schema
  business_specific: true,    // Availability is business-specific
  function_schema: {
    type: 'function',
    function: {
      name: 'check_day_availability',
      description: 'Check availability for a specific date. Use this when customer asks about availability or wants to book a specific date.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The date to check availability for in YYYY-MM-DD format (e.g., 2025-01-15)'
          }
        },
        required: ['date'],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Good news! We have availability on {date}.',
    error_message: 'I\'m checking our availability for {date}...',
    data_structure: {
      date: 'string',
      available: 'boolean',
      available_times: 'array',
      next_available_date: 'string'
    }
  }
};

// ============================================================================
// USER MANAGEMENT TOOLS
// ============================================================================

export const checkUserExistsTool: CreateToolData = {
  name: 'check_user_exists',
  description: 'Check if a customer already exists in the system by phone number.',
  version: '1.0.0',
  dynamic_parameters: false,  // Static schema
  business_specific: true,    // Users are business-specific
  function_schema: {
    type: 'function',
    function: {
      name: 'check_user_exists',
      description: 'Check if a customer already exists in our system by phone number. Call this first before asking for their name.',
      parameters: {
        type: 'object',
        properties: {
          phone_number: {
            type: 'string',
            description: 'The caller\'s phone number (from call context)'
          }
        },
        required: ['phone_number'],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Welcome back, {customer_name}! I have your details on file.',
    error_message: 'I don\'t see you in our system yet. Let me get your name to create your profile.',
    data_structure: {
      exists: 'boolean',
      user_id: 'string',
      customer_name: 'string',
      phone_number: 'string'
    }
  }
};

export const createUserTool: CreateToolData = {
  name: 'create_user',
  description: 'Create a new customer record with name and phone number.',
  version: '1.0.0',
  dynamic_parameters: false,  // Static schema
  business_specific: true,    // Users are business-specific
  function_schema: {
    type: 'function',
    function: {
      name: 'create_user',
      description: 'Create a new customer record with their name and phone number. ONLY call this AFTER asking for and receiving the customer\'s name. Use the caller\'s phone number from the call.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The customer\'s name (first name or full name)'
          },
          phone_number: {
            type: 'string',
            description: 'The caller\'s phone number (provided in the call context, NOT the business phone number)'
          }
        },
        required: ['name', 'phone_number'],
        additionalProperties: false
      }
    }
  },
  output_template: {
    success_message: 'Perfect! I\'ve created your profile, {customer_name}. Now let\'s get you booked.',
    error_message: 'I had trouble creating your profile. Let me try again.',
    data_structure: {
      user_id: 'string',
      customer_name: 'string',
      phone_number: 'string',
      created: 'boolean'
    }
  }
};

// ============================================================================
// BOOKING TOOLS
// ============================================================================

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
