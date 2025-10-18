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
        mobile_number: {
          type: 'string',
          description: 'Customer mobile number (e.g., 0412345678)'
        }
      },
      required: ['first_name', 'mobile_number'],
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
  dynamic_parameters: true,  // Dynamic - enum generated per business
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
          description: 'Tool needed'
          // NO ENUM - will be generated dynamically per business in dynamic_schema
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
// MWAV INTEGRATION TOOLS
// ============================================================================

export const collectLocationDetailsTool: CreateToolData = {
  name: 'collect_location_details',
  description: 'Store pickup or dropoff location with access details (parking, stairs, lift)',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'collect_location_details',
    description: 'Collect and store location details with access information',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        location_type: {
          type: 'string',
          enum: ['pickup', 'dropoff'],
          description: 'Type of location'
        },
        address: {
          type: 'string',
          description: 'Full address with street number, street name, and suburb'
        },
        parking_distance: {
          type: 'string',
          enum: [
            'at_the_door',        // < 10m
            'on_the_street',      // 10-25m
            'down_the_street',    // 25-50m
            'a_bit_of_a_walk',    // 50-100m
            'a_bit_of_a_hike',    // 100m+
            'its_complicated'     // Special cases
          ],
          description: 'How close can we park? Options: at_the_door (<10m), on_the_street (10-25m), down_the_street (25-50m), a_bit_of_a_walk (50-100m), a_bit_of_a_hike (100m+), its_complicated'
        },
        stairs_count: {
          type: 'string',
          enum: ['none', '1', '2', '3', '4', '5+'],
          description: 'Number of flights of stairs. Options: none, 1, 2, 3, 4, 5+'
        },
        has_lift: {
          type: 'boolean',
          description: 'Is there a lift available?'
        }
      },
      required: ['location_type', 'address', 'parking_distance', 'stairs_count', 'has_lift'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: '{location_type} location #{index} added: {address}',
    error_message: 'Failed to add location details',
    data_structure: {
      location_type: 'string',
      index: 'number',
      address: 'string',
      total_pickups: 'number',
      total_dropoffs: 'number'
    }
  }
};

export const searchMovingItemsTool: CreateToolData = {
  name: 'search_moving_items',
  description: 'Search MWAV catalog for items using fuzzy matching',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'search_moving_items',
    description: 'Search for moving items in catalog based on customer description',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        items_description: {
          type: 'string',
          description: 'Customer description of items (e.g., "queen bed, dining table, 20 boxes")'
        }
      },
      required: ['items_description'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Found {exact_match_count} matches, {ambiguous_count} need clarification',
    error_message: 'Failed to search items',
    data_structure: {
      exact_matches: 'array',
      ambiguous_items: 'array',
      not_found: 'array'
    }
  }
};

export const addMovingItemsTool: CreateToolData = {
  name: 'add_moving_items',
  description: 'Add confirmed moving items with pickup/dropoff linking',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'add_moving_items',
    description: 'Add confirmed items to the move with location linking',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        items: {
          type: 'array',
          description: 'Items to add to the move',
          items: {
            type: 'object',
            properties: {
              item_name: {
                type: 'string',
                description: 'Exact item name from catalog'
              },
              quantity: {
                type: 'number',
                description: 'How many of this item'
              },
              pickup_index: {
                type: 'number',
                description: 'Which pickup location (0-based index)'
              },
              dropoff_index: {
                type: 'number',
                description: 'Which dropoff location (0-based index)'
              },
              notes: {
                type: 'string',
                description: 'Optional special notes about this item'
              }
            },
            required: ['item_name', 'quantity', 'pickup_index', 'dropoff_index'],
            additionalProperties: false
          }
        }
      },
      required: ['items'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Added {items_added} items. Total: {total_items}',
    error_message: 'Failed to add items',
    data_structure: {
      items_added: 'array',
      total_items: 'number',
      message: 'string'
    }
  }
};

export const collectCustomerDetailsTool: CreateToolData = {
  name: 'collect_customer_details',
  description: 'Collect customer details for MWAV enquiry (session only, not Skedy DB)',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'collect_customer_details',
    description: 'Collect customer contact information',
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
        phone: {
          type: 'string',
          description: 'Customer phone number (e.g., 0412345678 or +61412345678)'
        },
        email: {
          type: 'string',
          description: 'Customer email address'
        }
      },
      required: ['first_name', 'last_name', 'phone', 'email'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Customer details saved: {customer_name}',
    error_message: 'Failed to save customer details',
    data_structure: {
      customer_name: 'string',
      phone: 'string',
      email: 'string'
    }
  }
};

export const collectDateTimeTool: CreateToolData = {
  name: 'collect_date_time',
  description: 'Collect preferred date and time for the move',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'collect_date_time',
    description: 'Collect move date and time preference',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        preferred_date: {
          type: 'string',
          description: 'Preferred move date in YYYY-MM-DD format'
        },
        time_preference: {
          type: 'string',
          enum: ['morning', 'afternoon'],
          description: 'Time preference: morning or afternoon'
        }
      },
      required: ['preferred_date', 'time_preference'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Move scheduled for {preferred_date} ({time_preference})',
    error_message: 'Failed to collect date/time',
    data_structure: {
      preferred_date: 'string',
      time_preference: 'string',
      display: 'string'
    }
  }
};

export const getMWAVQuoteTool: CreateToolData = {
  name: 'get_mwav_quote',
  description: 'Get price quote from Man With A Van API (requires all previous data collected)',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'get_mwav_quote',
    description: 'Request quote from MWAV with all collected details',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        confirm_locations_collected: {
          type: 'string',
          description: 'Confirmation that pickup and dropoff locations were collected (e.g., "locations_collected")'
        },
        confirm_items_collected: {
          type: 'string',
          description: 'Confirmation that items were collected (e.g., "items_collected")'
        },
        confirm_customer_details: {
          type: 'string',
          description: 'Confirmation from collect_customer_details (e.g., "customer_details_saved")'
        },
        confirm_date_time: {
          type: 'string',
          description: 'Confirmation from collect_date_time (e.g., "date_time_saved")'
        }
      },
      required: ['confirm_locations_collected', 'confirm_items_collected', 'confirm_customer_details', 'confirm_date_time'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Estimated total: ${total_amount} AUD. {message}',
    error_message: 'Failed to get quote from MWAV',
    data_structure: {
      quote_id: 'string',
      total_amount: 'number',
      currency: 'string',
      breakdown: 'object',
      estimated_duration_hours: 'number',
      message: 'string'
    }
  }
};

export const sendEnquiryConfirmationTool: CreateToolData = {
  name: 'send_enquiry_confirmation',
  description: 'Send booking details to customer for confirmation via SMS/Email',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'send_enquiry_confirmation',
    description: 'Send complete booking summary to customer for review and confirmation',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        send_via: {
          type: 'string',
          enum: ['sms', 'email', 'both'],
          description: 'How to send confirmation: sms, email, or both'
        }
      },
      required: ['send_via'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Confirmation sent via {send_via}. Waiting for customer reply.',
    error_message: 'Failed to send confirmation',
    data_structure: {
      confirmation_sent: 'boolean',
      confirmation_id: 'string',
      sent_via: 'string',
      customer_phone: 'string',
      customer_email: 'string'
    }
  }
};

export const getAdditionalInfoTool: CreateToolData = {
  name: 'get_additional_info',
  description: 'Search business knowledge base for additional information (NOT for services or pricing)',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'get_additional_info',
    description: 'Query business knowledge base for questions about: business hours, insurance, coverage areas, policies, procedures. NOT for service details or pricing.',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        question: {
          type: 'string',
          description: 'Customer question about business information (e.g., "What are your business hours?", "Do you provide packing materials?")'
        }
      },
      required: ['question'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: '{answer}',
    error_message: 'I couldn\'t find information about that.',
    data_structure: {
      answer: 'string',
      sources_found: 'number'
    }
  }
};

export const sendMWAVEnquiryTool: CreateToolData = {
  name: 'send_mwav_enquiry',
  description: 'Submit complete enquiry to Man With A Van (requires customer confirmation first)',
  version: '1.0.0',
  dynamic_parameters: false,
  business_specific: true,
  function_schema: {
    type: 'function',
    name: 'send_mwav_enquiry',
    description: 'Send complete enquiry with all details to MWAV after customer confirms',
    parameters: {
      type: 'object',
      strict: true,
      properties: {
        customer_confirmation: {
          type: 'string',
          description: 'Customer confirmation response (e.g., "YES", "confirmed", etc.) from send_enquiry_confirmation'
        },
        confirmation_message: {
          type: 'string',
          description: 'Optional confirmation message or special requirements'
        }
      },
      required: ['customer_confirmation'],
      additionalProperties: false
    }
  },
  output_template: {
    success_message: 'Enquiry submitted! Reference: {enquiry_id}',
    error_message: 'Failed to submit enquiry',
    data_structure: {
      success: 'boolean',
      enquiry_id: 'string',
      message: 'string'
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
 * MWAV-specific removalist tools (partnership model - data collection only)
 */
export const mwavTools: CreateToolData[] = [
  getServiceDetailsTool,              // Show MWAV services
  collectLocationDetailsTool,         // Pickup/dropoff with access details
  searchMovingItemsTool,              // Search item catalog
  addMovingItemsTool,                 // Add items with location linking
  collectCustomerDetailsTool,         // Customer info (session only, not Skedy DB)
  collectDateTimeTool,                // Date/time preference
  sendEnquiryConfirmationTool,        // SMS/Email confirmation to customer
  getMWAVQuoteTool,                   // Get quote from MWAV API
  sendMWAVEnquiryTool,                // Submit enquiry to MWAV API
  requestToolTool                     // Tool management
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
  requestToolTool,

  // Knowledge base tools (universal - all businesses)
  getAdditionalInfoTool,

  // MWAV Integration tools
  collectLocationDetailsTool,
  searchMovingItemsTool,
  addMovingItemsTool,
  collectCustomerDetailsTool,
  collectDateTimeTool,
  sendEnquiryConfirmationTool,
  getMWAVQuoteTool,
  sendMWAVEnquiryTool

  // Future tools will be added here:
  // - Cleaning service tools
  // - Plumbing tools
  // - General business tools
  // - etc.
];
