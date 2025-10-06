import type { Business } from '../../../../../shared/lib/database/types/business';
import { DepositType } from '../../../../../shared/lib/database/types/business';
import type { BusinessFeeBreakdown } from '../../../types/booking-calculations';

export class BusinessFeesCalculator {

  /**
   * Calculate business fees (GST, platform fees, processing fees)
   */
  calculateBusinessFees(
    amount: number,
    business: Business
  ): BusinessFeeBreakdown {
    // Calculate GST for reporting (always calculate the GST component even if included in prices)
    let gst_amount = 0;

    if (business.charges_gst && business.gst_rate) {
      if (business.prices_include_gst) {
        // Extract GST from GST-inclusive amount: GST = amount - (amount / (1 + rate/100))
        gst_amount = amount - (amount / (1 + business.gst_rate / 100));
      } else {
        // Calculate GST to add on top: GST = amount * (rate/100)
        gst_amount = amount * (business.gst_rate / 100);
      }
    }


    const payment_processing_fee = business.charges_deposit
      ? amount * (business.payment_processing_fee_percentage / 100)
      : 0;

    // Calculate platform fee using business configuration
    const platform_fee =
      amount * (business.booking_platform_fee_percentage / 100);

    return {
      gst_amount: Math.ceil(gst_amount),
      platform_fee: Math.ceil(platform_fee),
      payment_processing_fee: Math.ceil(payment_processing_fee),
      other_fees: [],
    };
  }

  /**
   * Calculate deposit amount based on business configuration
   */
  calculateDeposit(total_amount: number, business: Business): number {
    if (!business.charges_deposit) {
      return 0;
    }

    if (
      business.deposit_type === DepositType.FIXED &&
      business.deposit_fixed_amount
    ) {
      return business.deposit_fixed_amount;
    }

    if (
      business.deposit_type === DepositType.PERCENTAGE &&
      business.deposit_percentage
    ) {
      return total_amount * (business.deposit_percentage / 100);
    }

    return 0;
  }

  /**
   * Apply minimum charge if total is below business minimum
   */
  applyMinimumCharge(amount: number, business: Business): {
    final_amount: number;
    minimum_charge_applied: boolean;
  } {
    const minimum_charge_applied = amount < business.minimum_charge;
    const final_amount = minimum_charge_applied ? business.minimum_charge : amount;

    return {
      final_amount,
      minimum_charge_applied
    };
  }

  /**
   * Add GST to amount if prices don't include GST
   */
  addGSTIfRequired(amount: number, business: Business): number {
    if (business.charges_gst && !business.prices_include_gst && business.gst_rate) {
      const gst_amount = Math.round(amount * (business.gst_rate / 100));
      console.log(`💰 Adding GST: $${gst_amount} (prices are GST-exclusive)`);
      return amount + gst_amount;
    }
    return amount;
  }
}
