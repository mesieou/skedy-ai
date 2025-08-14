# Bookings Repository Test Suite

This comprehensive test suite implements all the requested test scenarios for the BookingsRepository. The test files are organized by functionality and business type.

## Test Files Overview

### 1. `core-crud.test.ts` - Core Repository Tests
- **Basic CRUD Operations**
  - Create booking with minimal data
  - Create booking with all optional fields
  - Handle invalid input data
  - Handle missing required fields
- **Data Validation**
  - Validate business_id exists
  - Validate user_id exists
  - Validate start_at timestamp format
  - Validate past timestamps
- **Service Validation**
  - Validate service belongs to business
  - Validate service quantities are positive

### 2. `error-handling.test.ts` - Error Handling Tests
- **Database Connection Failures**
  - Repository initialization errors
  - Database timeout scenarios
- **Invalid Business ID**
  - Non-existent business_id
  - Malformed business_id
  - Null business_id
- **Invalid User ID**
  - Non-existent user_id
  - Malformed user_id
  - Null user_id
- **Invalid Start-At Timestamps**
  - Invalid ISO string formats
  - Null/undefined timestamps
- **BookingCalculator Failures**
  - Missing pricing configuration
  - Invalid service quantity configurations
  - Missing business minimum charge
- **Address Creation Failures**
  - Invalid address data
  - Missing address data
  - Duplicate address sequence orders
- **Service Creation Failures**
  - Service-business mismatch
  - Non-existent service IDs
  - Malformed service IDs

### 3. `transport-business.test.ts` - Transport/Removals Business Tests
- **Single Person Moves**
  - Basic pricing ($95/hour for 1 person)
  - Travel cost calculations
- **Team Moves**
  - 2-person team moves ($145/hour)
  - 3-person large moves ($185/hour)
- **Different Move Types**
  - Small item moves
  - Long distance moves with increased travel costs
- **Pricing Model Validation**
  - Hourly rate per person scaling
  - Travel costs per minute per person
  - Minimum charge enforcement
- **Business Configuration**
  - Fixed deposit ($100)
  - GST application (10%)
  - Platform and payment processing fees
- **Travel Charging Models**
  - BETWEEN_CUSTOMER_LOCATIONS only
- **Volume-Based Pricing**
  - Room-based estimates
  - Apartment vs house pricing differences
- **Multiple Vehicle Types**
  - Team size as vehicle capacity representation

### 4. `cleaning-business.test.ts` - Cleaning Services Tests
- **Residential Cleaning - Per Hour Per Person**
  - Single cleaner ($45/hour)
  - Team cleaning ($80/hour for 2 people)
  - Travel costs included
- **Commercial Cleaning - Per Square Meter**
  - Small office (1-100 sqm): $3.50/sqm
  - Medium office (101-500 sqm): $2.80/sqm
  - Large office (501+ sqm): $2.20/sqm
- **Different Service Levels**
  - Basic house cleaning
  - Premium team cleaning
- **Recurring Service Scenarios**
  - One-time deep cleaning
  - Regular cleaning rates
- **Property Size Variations**
  - Studio apartment cleaning
  - Large house cleaning with teams
- **Business Configuration**
  - Percentage deposit (20%)
  - GST and business fees
  - Minimum charge enforcement
- **Travel and Distance Calculations**
  - Per kilometer travel costs ($2.50/km)
  - Different location variations
- **Commercial vs Residential Pricing**
  - Different pricing models comparison

### 5. `handyman-business.test.ts` - Handyman Services Tests
- **Fixed Service Pricing**
  - Plumbing repairs with call-out fee ($80 + $95/hour labor)
  - Electrical work with fixed pricing ($120)
  - Emergency repairs with standard rates
- **Call-Out Fees and Labor Charges**
  - Call-out fee application
  - Hourly labor calculations
  - Extended job handling
- **Material Costs and Complex Jobs**
  - Simple repairs with standard pricing
  - Complex installations with higher rates
  - Multiple small jobs in one booking
- **Emergency Call-Outs and Surge Pricing**
  - Emergency repairs
  - After-hours scenarios
  - Weekend emergency rates
- **Business Configuration**
  - Fixed deposit ($75)
  - GST and premium business fees
  - Minimum charge enforcement
- **Service Complexity Tiers**
  - Basic repairs (1 hour)
  - Complex installations (1.5 hours)
- **Payment Methods and Premium Service**
  - Multiple payment options support
  - Premium subscription benefits
- **Travel Costs and Service Areas**
  - FROM_BASE_TO_CUSTOMERS model
  - FULL_ROUTE for electrical work

### 6. `pricing-logic.test.ts` - Comprehensive Pricing Logic Tests
- **LABOR_PER_HOUR_PER_PERSON Pricing**
  - Single person calculations
  - Multiple people scaling
  - Team scaling for different services
- **TRAVEL_PER_KM Pricing**
  - Per kilometer travel costs
- **TRAVEL_PER_MINUTE_PER_PERSON Pricing**
  - Travel costs scaled by team size
- **SERVICE_FIXED_PER_SERVICE Pricing**
  - Fixed pricing regardless of time
  - Different fixed rate services
- **SERVICE_PER_SQM Pricing**
  - Square meter calculations with tiers
- **LABOUR_PER_HOUR Pricing**
  - Hourly labor without per-person scaling
- **Tiered Pricing Systems**
  - Quantity-based tiers
  - Duration-based efficiency
  - Volume discounts
- **Multiple Component Pricing**
  - Combined pricing components
  - Labor + travel combinations
- **Edge Cases and Boundary Conditions**
  - Minimum/maximum quantity handling
  - Zero travel distance scenarios
- **Pricing Validation and Consistency**
  - Consistency across similar services
  - Component sum validation

### 7. `business-config.test.ts` - Business Configuration Tests
- **GST Fee Structures**
  - 10% GST application
  - 15% GST application
  - 20% GST application
  - No GST for exempt businesses
- **Platform and Payment Processing Fees**
  - 1% platform fee
  - 5% platform fee
  - Payment processing fees (2-4% range)
- **Deposit Types**
  - Fixed deposit amounts ($50, $100, $200)
  - Percentage deposits (10%, 25%, 50%)
  - No deposit requirement
- **Subscription Levels**
  - FREE tier limitations (higher fees)
  - BASIC tier features (mid-tier fees)
  - PREMIUM tier benefits (lower fees)
  - ENTERPRISE tier functionality (lowest fees)
- **Payment Methods**
  - Credit card only businesses
  - Multiple payment options
  - Cash-preferred businesses
  - Bank transfer requirements
- **Minimum Charge Scenarios**
  - Different minimum charge enforcement

### 8. `integration-edge-cases.test.ts` - Integration Tests and Edge Cases
- **Service Dependencies Integration**
  - BookingCalculator integration
  - AddressRepository integration
  - ServiceRepository integration
  - BookingServiceRepository integration
- **Data Consistency Tests**
  - Service quantity vs pricing consistency
  - Address sequence ordering
  - Time estimation vs duration consistency
- **Boundary Conditions**
  - Zero quantity services
  - Maximum quantity limits
  - Extreme distances
  - Invalid time ranges
- **Data Validation Edge Cases**
  - Negative pricing amounts
  - Invalid service combinations
  - Missing pricing configurations
  - Circular address routes
- **Performance Tests**
  - Large number of services in one booking
  - Complex multi-stop routes
  - High-frequency booking creation
  - Concurrent booking creation

## Key Features Tested

### Pricing Models
- ✅ Fixed rate per hour per person + travel per km
- ✅ Hourly rate with minimum charges
- ✅ Volume-based pricing (rooms/cubic meters)
- ✅ Per hour per person pricing
- ✅ Per room fixed pricing
- ✅ Per square meter pricing
- ✅ Fixed service pricing per task
- ✅ Tiered pricing based on complexity
- ✅ Call-out fees + service fees

### Travel Charging Models
- ✅ BETWEEN_CUSTOMER_LOCATIONS
- ✅ FROM_BASE_TO_CUSTOMERS
- ✅ CUSTOMERS_AND_BACK_TO_BASE
- ✅ FULL_ROUTE

### Business Categories Tested
- ✅ Transport/Removals
- ✅ Cleaning Services
- ✅ Handyman Services
- ✅ Beauty Services

### Fee Structures
- ✅ GST charging (0%, 10%, 15%, 20%)
- ✅ Platform fees (1-5% range)
- ✅ Payment processing fees (2-4% range)

### Deposit Types
- ✅ Fixed deposit amounts
- ✅ Percentage deposits
- ✅ No deposit scenarios

### Subscription Levels
- ✅ FREE, BASIC, PREMIUM, ENTERPRISE tiers

### Edge Cases
- ✅ Boundary conditions
- ✅ Data validation
- ✅ Performance scenarios
- ✅ Integration testing
- ✅ Error handling

## Running the Tests

```bash
# Run all booking repository tests
npm test -- features/shared/__tests__/lib/database/bookings-repository/

# Run specific test file
npm test -- features/shared/__tests__/lib/database/bookings-repository/core-crud.test.ts

# Run with coverage
npm test -- --coverage features/shared/__tests__/lib/database/bookings-repository/
```

## Test Data Setup

Each test file includes:
- Complete setup and teardown of test data
- Business creation with specific configurations
- User and service setup
- Address mappings for different scenarios
- Cleanup after each test suite

The tests are comprehensive and cover all the requested scenarios from the original specification, providing thorough validation of the BookingsRepository functionality across all business types and pricing models.
