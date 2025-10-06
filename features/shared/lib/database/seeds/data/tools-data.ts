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
      service_name: 'string',
      total_estimate_amount: 'number',
      total_estimate_time_in_minutes: 'number',
      deposit_amount: 'number',
      currency: 'string',
      labor_cost: 'number',
      travel_cost: 'number',
      gst_included: 'number'
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
        },
        selected_quote_id: {
          type: 'string',
          description: 'Selected quote ID from select_quote'
        }
      },
      required: ['date', 'quote_total_estimate_time_minutes', 'selected_quote_id'],
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
  version: '1.0.1',
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
          description: 'Customer first name'
        },
        last_name: {
          type: 'string',
          description: 'Customer last name'
        },
        phone_number: {
          type: 'string',
          description: 'Customer mobile number (e.g., 0412345678)'
        }
      },
      required: ['first_name', 'phone_number'],
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
        },
        payment_confirmation: {
          type: 'string',
          description: 'Payment confirmation from check_payment_status'
        }
      },
      required: ['preferred_date', 'preferred_time', 'quote_id', 'payment_confirmation'],
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
          enum: ['get_service_details', 'get_quote', 'select_quote', 'check_day_availability', 'create_user', 'create_and_send_payment_link', 'check_payment_status', 'send_sms_booking_confirmation', 'create_booking']
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
    success_message: '{tool_name} ready. You can call it now.',
    error_message: 'Tool unavailable.',
    data_structure: {
      tool_name: 'string',
      available: 'boolean'
    }
  }
};

export const sendSMSBookingConfirmationTool: CreateToolData = {
  name: 'send_sms_booking_confirmation',
  description: 'Send SMS with all booking details for customer confirmation before creating the booking',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'send_sms_booking_confirmation',
    description: 'Send SMS with all booking details for customer confirmation before creating the booking',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        preferred_date: {
          type: 'string',
          description: 'Preferred booking date in YYYY-MM-DD format'
        },
        preferred_time: {
          type: 'string',
          description: 'Preferred booking time in HH:MM format (24-hour)'
        },
        confirmation_message: {
          type: 'string',
          description: 'Optional additional message to include with the confirmation'
        }
      },
      required: ['preferred_date', 'preferred_time'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Booking confirmation SMS sent to {customer_name} at {customer_phone}. Please wait for their confirmation before proceeding.',
    error_message: 'Failed to send booking confirmation SMS. You can proceed with the booking or try again.',
    data_structure: {
      sms_sent: 'boolean',
      customer_phone: 'string',
      message_type: 'string'
    }
  }
};

export const selectQuoteTool: CreateToolData = {
  name: 'select_quote',
  description: 'Select a quote to proceed with booking',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'select_quote',
    description: 'Select a quote to proceed with booking',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        quote_id: {
          type: 'string',
          description: 'Quote ID to select'
        }
      },
      required: ['quote_id'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Quote selected successfully. Ready to proceed with booking.',
    error_message: 'Could not select that quote.',
    data_structure: {
      quote_id: 'string',
      selected: 'boolean'
    }
  }
};

export const createAndSendPaymentLinkTool: CreateToolData = {
  name: 'create_and_send_payment_link',
  description: 'Create payment link for deposit and send to customer',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'create_and_send_payment_link',
    description: 'Create payment link for deposit and send to customer',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        user_id: {
          type: 'string',
          description: 'Customer user ID from create_user'
        },
        preferred_date: {
          type: 'string',
          description: 'Preferred booking date in YYYY-MM-DD format'
        },
        preferred_time: {
          type: 'string',
          description: 'Preferred booking time in HH:MM format (24-hour)'
        },
        selected_quote_id: {
          type: 'string',
          description: 'Selected quote ID from select_quote'
        }
      },
      required: ['user_id', 'preferred_date', 'preferred_time', 'selected_quote_id'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Payment link created and sent to customer.',
    error_message: 'Failed to create payment link.',
    data_structure: {
      paymentLink: 'string'
    }
  }
};

export const checkPaymentStatusTool: CreateToolData = {
  name: 'check_payment_status',
  description: 'Check if payment has been completed',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'check_payment_status',
    description: 'Check if payment has been completed',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        payment_confirmation: {
          type: 'string',
          description: 'User confirming they received the link and made the payment'
        }
      },
      required: ['payment_confirmation'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Payment status checked.',
    error_message: 'Could not check payment status.',
    data_structure: {
      payment_status: 'string',
      quote_id: 'string',
      amount: 'number'
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
  selectQuoteTool,
  checkDayAvailabilityTool,
  createUserTool,
  createAndSendPaymentLinkTool,
  checkPaymentStatusTool,
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
  selectQuoteTool,
  checkDayAvailabilityTool,
  createUserTool,
  createAndSendPaymentLinkTool,
  checkPaymentStatusTool,
  // sendSMSBookingConfirmationTool,
  createBookingTool,
  requestToolTool

  // Future tools will be added here:
  // - Cleaning service tools
  // - Plumbing tools
  // - General business tools
  // - etc.
];
