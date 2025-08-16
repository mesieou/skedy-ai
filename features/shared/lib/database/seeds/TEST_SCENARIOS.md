# Comprehensive Test Scenarios for Booking Calculator

This document outlines all 9 test examples implemented in the seed data, covering various business types, travel charging models, and pricing combinations.

## Business Categories Covered

1. **Transport (Removalists)** - Examples 1-4
2. **Beauty (Mobile Manicurist)** - Examples 5-8  
3. **Beauty (Spa/Massage)** - Example 9

## Example 1: Removalist - Between Customer Locations Only

**Business:** Tiga Removals  
**Service:** Local Removals - Between Customers  
**Location Type:** pickup_and_dropoff  
**Travel Model:** BETWEEN_CUSTOMER_LOCATIONS  

**Pricing Components:**
- Labor: `labor_per_hour_per_person`
  - 1 person: $95/hour (120 min estimate)
  - 2 people: $145/hour (90 min estimate)  
  - 3 people: $185/hour (60 min estimate)
- Travel: `travel_per_minute_per_person`
  - 1 person: $1.00/minute
  - 2 people: $1.50/minute
  - 3 people: $2.00/minute

**Test Scenario:** Only charges for travel between pickup and dropoff locations, not from business base.

---

## Example 2: Removalist - From Base + Between Customers

**Business:** Tiga Removals  
**Service:** Interstate Removals - Base + Between  
**Location Type:** pickup_and_dropoff  
**Travel Model:** FROM_BASE_AND_BETWEEN_CUSTOMERS  

**Pricing Components:**
- Labor: `labour_per_hour`
  - Single tier: $145/hour (180 min estimate)
- Travel: `travel_per_km`
  - Single tier: $2.50/km

**Test Scenario:** Charges from business base to first customer plus between customer locations, but not return to base.

---

## Example 3: Removalist - Between Customers + Return to Base

**Business:** Tiga Removals  
**Service:** Premium Removals - Between + Return  
**Location Type:** pickup_and_dropoff  
**Travel Model:** BETWEEN_CUSTOMERS_AND_BACK_TO_BASE  

**Pricing Components:**
- Labor: `labor_per_hour_per_person`
  - 1 person: $120/hour (150 min estimate)
  - 2 people: $140/hour (100 min estimate)
  - 3 people: $200/hour (80 min estimate)

**Test Scenario:** Charges between customer locations and return to base, but not initial trip from base.

---

## Example 4: Removalist - Full Route

**Business:** Tiga Removals  
**Service:** Express Removals - Full Route  
**Location Type:** pickup_and_dropoff  
**Travel Model:** FULL_ROUTE  

**Pricing Components:**
- Hourly Labor: `labor_per_hour_per_person`
  - 1 person: $110/hour (120 min estimate)
  - 2 people: $160/hour (90 min estimate)
  - 3 people: $210/hour (60 min estimate)
- Per-Minute Labor: `labor_per_minute_per_person`
  - 1 person: $2.00/minute
  - 2 people: $3.00/minute
  - 3 people: $4.00/minute

**Test Scenario:** Charges for entire route including base to customer, between customers, and return to base.

---

## Example 5: Mobile Manicurist - Multiple Services, Single Component

**Business:** Nails on the Go  
**Travel Model:** FROM_BASE_TO_CUSTOMERS  

**Service 1:** Basic Manicure  
**Location Type:** customer  
**Pricing Components:**
- Service: `service_fixed_per_service`
  - Single tier: $45 (45 min estimate)

**Service 2:** Gel Manicure  
**Location Type:** customer  
**Pricing Components:**
- Service: `service_fixed_per_service`
  - Single tier: $65 (60 min estimate)

**Test Scenario:** Multiple services with fixed pricing, shared travel charging from base to customers.

---

## Example 6: Mobile Manicurist - Single Service, Multiple Components

**Business:** Nails on the Go  
**Service:** Premium Manicure with Travel  
**Location Type:** customer  
**Travel Model:** FROM_BASE_TO_CUSTOMERS  

**Pricing Components:**
- Service: `service_fixed_per_service`
  - Single tier: $80 (75 min estimate)
- Travel: `travel_per_minute`
  - Single tier: $1.20/minute

**Test Scenario:** Service with separate travel component charging per minute.

---

## Example 7: Mobile Manicurist - Multiple Services, Multiple Components

**Business:** Nails on the Go  
**Travel Model:** FROM_BASE_TO_CUSTOMERS  

**Service 1:** Manicure + Callout  
**Location Type:** customer  
**Pricing Components:**
- Manicure: `service_fixed_per_service`
  - Single tier: $50 (45 min estimate)
- Callout: `service_fixed_per_service`
  - Single tier: $25 (15 min estimate)

**Service 2:** Pedicure + Callout  
**Location Type:** customer  
**Pricing Components:**
- Pedicure: `service_fixed_per_service`
  - Single tier: $60 (60 min estimate)
- Callout: `service_fixed_per_service`
  - Single tier: $25 (15 min estimate)

**Test Scenario:** Multiple services each with service fee plus separate callout fee.

---

## Example 8: Mixed Mobile/Non-Mobile Manicurist

**Business:** Nails on the Go  

**Service 1:** In-Salon Manicure  
**Location Type:** business  
**Pricing Components:**
- Service: `service_fixed_per_service`
  - Single tier: $40 (45 min estimate)

**Service 2:** Mobile Manicure with Hourly Travel  
**Location Type:** customer  
**Travel Model:** FROM_BASE_TO_CUSTOMERS  
**Pricing Components:**
- Service: `service_fixed_per_service`
  - Single tier: $55 (45 min estimate)
- Travel: `travel_per_minute`
  - Single tier: $0.80/minute

**Test Scenario:** Business offering both in-salon (no travel) and mobile services (with travel).

---

## Example 9: Non-Mobile Massage Business

**Business:** Serenity Spa & Massage  

**Service 1:** 60-Minute Relaxation Massage  
**Location Type:** business  
**Pricing Components:**
- Service: `service_fixed_per_service`
  - Single tier: $120 (60 min estimate)

**Service 2:** 90-Minute Deep Tissue Massage  
**Location Type:** business  
**Pricing Components:**
- Service: `service_fixed_per_service`
  - Single tier: $160 (90 min estimate)

**Test Scenario:** Traditional spa business with customers coming to business location only.

---

## Key Test Coverage

### Travel Charging Models Covered:
- ✅ BETWEEN_CUSTOMER_LOCATIONS
- ✅ FROM_BASE_AND_BETWEEN_CUSTOMERS  
- ✅ BETWEEN_CUSTOMERS_AND_BACK_TO_BASE
- ✅ FULL_ROUTE
- ✅ FROM_BASE_TO_CUSTOMERS
- ❌ CUSTOMERS_AND_BACK_TO_BASE (missing)

### Pricing Combinations Covered:
- ✅ `labor_per_hour_per_person` (Examples 1, 3, 4)
- ✅ `labour_per_hour` (Example 2) 
- ✅ `labor_per_minute_per_person` (Example 4)
- ✅ `travel_per_minute_per_person` (Example 1)
- ✅ `travel_per_km` (Example 2)
- ✅ `travel_per_minute` (Examples 6, 8)
- ✅ `service_fixed_per_service` (Examples 5-9)

### Location Types Covered:
- ✅ `pickup_and_dropoff` (Examples 1-4)
- ✅ `customer` (Examples 5-8)
- ✅ `business` (Examples 8-9)

### Business Configurations:
- ✅ Mobile-only business (Removalists)
- ✅ Mobile + Location business (Manicurist)
- ✅ Location-only business (Spa)

## Missing Test Case Identified:

**CUSTOMERS_AND_BACK_TO_BASE Travel Model** - Should add an example that:
- Charges between customer locations  
- Charges return to base
- Does NOT charge initial trip from base

This could be Example 10: A cleaning service that doesn't charge for the initial trip to the first customer but charges between customers and the return trip.

## Additional Testing Recommendations:

1. **Edge Cases:**
   - Single customer location (no travel between customers)
   - Maximum quantity tiers
   - Zero travel distance scenarios

2. **Complex Booking Scenarios:**
   - Multiple services with different travel models on same booking
   - Mixed mobile/non-mobile services in single booking
   - Services with conflicting travel charging models

3. **Business Fee Testing:**
   - GST vs non-GST businesses
   - Different deposit types (fixed vs percentage)
   - Various payment processing fees

4. **Error Handling:**
   - Services without pricing config
   - Invalid quantity ranges
   - Missing travel components for mobile services
