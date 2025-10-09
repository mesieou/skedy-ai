import type { Business } from '../../../shared/lib/database/types/business';
import type { DetailedQuoteResult } from '../../../scheduling/lib/types/booking-calculations';
/**
 * Clean, simple, scalable tool response builder
 * No templates, no complex logic - just consistent responses
 */
export function buildToolResponse(
  data: Record<string, unknown> | null,
  message: string,
  isSuccess: boolean = true
): Record<string, unknown> {
  return {
    success: isSuccess,
    message: message,
    ...(data || {})
  };
}

//quote tool response depending on the business
export function buildQuoteToolResponse(
  detailedResult: DetailedQuoteResult,
  business: Business,
  serviceName: string,
  isSuccess: boolean = true
): Record<string, unknown> {

  // Tiga business - show travel breakdown using real route segments
  if (business.name.toLowerCase().includes('tiga')) {
    return formatTigaQuoteResponse(detailedResult, business, serviceName, isSuccess);
  }

  // Default formatting for other businesses
  return formatDefaultQuoteResponse(detailedResult, business, serviceName, isSuccess);
}

/**
 * Tiga-specific quote formatting with real back-to-base calculation
 */
function formatTigaQuoteResponse(
  detailedResult: DetailedQuoteResult,
  business: Business,
  serviceName: string,
  isSuccess: boolean
): Record<string, unknown> {
  const travelBreakdown = detailedResult.price_breakdown.travel_breakdown;

  // Calculate real back-to-base time from route segments
  let backToBaseTime = 0;

  if (travelBreakdown.route_segments) {
    // Find segments that go back to base/depot
    const backToBaseSegments = travelBreakdown.route_segments.filter(segment =>
      segment.is_chargeable &&
      (segment.to_address.toLowerCase().includes('base') ||
       segment.to_address.toLowerCase().includes('depot') ||
       segment.segment_type === 'customer_to_base')
    );

    if (backToBaseSegments.length > 0) {
      backToBaseTime = backToBaseSegments.reduce((sum, s) => sum + s.duration_mins, 0);
    }
  }

  const roundedworkEstimateTimeHours = Math.ceil(detailedResult.total_estimate_time_in_minutes / 30) * 0.5;
  const roundedBackToBaseTimeHours = Math.ceil(backToBaseTime / 15) * 0.25;

  // Calculate hourly rate from travel breakdown
  const hourlyRate = travelBreakdown.total_travel_time_mins > 0
    ? travelBreakdown.total_travel_cost / (travelBreakdown.total_travel_time_mins / 60)
    : 0;

  // Calculate back-to-base cost based on rounded time and hourly rate
  const roundedBackToBaseCost = Math.round(roundedBackToBaseTimeHours * hourlyRate);
  const workEstimateCost = detailedResult.total_estimate_amount - roundedBackToBaseCost;

  const message = `Work estimate $${workEstimateCost} (${roundedworkEstimateTimeHours}h) + back to base $${roundedBackToBaseCost} (${roundedBackToBaseTimeHours}h) + GST = $${detailedResult.total_estimate_amount} total. Deposit $${detailedResult.deposit_amount}. THIS IS ONLY AN ESTIMATE, THE FINAL COST MAY VARY.`;

  // Return simplified data structure for Tiga business to AI
  return {
    success: isSuccess,
    message: message,
    quote_id: detailedResult.quote_id,
    service_name: serviceName,
    deposit_amount: detailedResult.deposit_amount,
    currency: business.currency_code,
    work_estimate: workEstimateCost,
    work_estimate_time: roundedworkEstimateTimeHours,
    back_to_base_cost: roundedBackToBaseCost,
    back_to_base_time: roundedBackToBaseTimeHours,
    gst_amount: detailedResult.price_breakdown.business_fees.gst_amount,
    gst_included: business.prices_include_gst
  };
}

/**
 * Default quote formatting for other businesses
 */
function formatDefaultQuoteResponse(
  detailedResult: DetailedQuoteResult,
  business: Business,
  serviceName: string,
  isSuccess: boolean
): Record<string, unknown> {
  const message = `Here's your quote - total estimate cost is $${detailedResult.total_estimate_amount}. Deposit required: $${detailedResult.deposit_amount}. Remember this is an estimate and the final cost may vary.`;

  return {
    success: isSuccess,
    message: message,
    quote_id: detailedResult.quote_id,
    service_name: serviceName,
    total_estimate_amount: detailedResult.total_estimate_amount,
    total_estimate_time_in_minutes: detailedResult.total_estimate_time_in_minutes,
    deposit_amount: detailedResult.deposit_amount,
    currency: business.currency_code,
    labor_cost: detailedResult.price_breakdown.service_breakdowns[0]?.total_cost || 0,
    travel_cost: detailedResult.price_breakdown.travel_breakdown.total_travel_cost,
    gst_amount: detailedResult.price_breakdown.business_fees.gst_amount,
    gst_included: business.prices_include_gst
  };
}
