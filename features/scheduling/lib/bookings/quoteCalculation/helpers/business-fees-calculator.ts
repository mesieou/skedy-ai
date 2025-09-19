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
    const gst_rate = business.charges_gst ? business.gst_rate || 0 : 0;
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

    // Calculate payment processing fee only if deposit is required
    const payment_processing_fee_percentage =
      business.payment_processing_fee_percentage || 0;
    const payment_processing_fee = business.charges_deposit
      ? amount * (business.payment_processing_fee_percentage / 100)
      : 0;

    // Calculate platform fee using business configuration
    const platform_fee_percentage =
      business.booking_platform_fee_percentage || 0;
    const platform_fee =
      amount * (business.booking_platform_fee_percentage / 100);

    return {
      gst_amount,
      gst_rate,
      platform_fee,
      platform_fee_amount: platform_fee, // Alias for amount
      platform_fee_percentage,
      payment_processing_fee,
      payment_processing_fee_amount: payment_processing_fee, // Alias for amount
      payment_processing_fee_percentage,
      other_fees: [],
    };
  }

  /**
   * Calculate deposit amount based on business configuration
   */
  calculateDeposit(total_amount: number, business: Business): number {
    console.log('🔍 [Deposit Debug] Business deposit config:', {
      charges_deposit: business.charges_deposit,
      deposit_type: business.deposit_type,
      deposit_fixed_amount: business.deposit_fixed_amount,
      deposit_percentage: business.deposit_percentage
    });

    if (!business.charges_deposit) {
      console.log('❌ [Deposit] Business does not charge deposits');
      return 0;
    }

    if (
      business.deposit_type === DepositType.FIXED &&
      business.deposit_fixed_amount
    ) {
      console.log(`✅ [Deposit] Fixed deposit: $${business.deposit_fixed_amount}`);
      return business.deposit_fixed_amount;
    }

    if (
      business.deposit_type === DepositType.PERCENTAGE &&
      business.deposit_percentage
    ) {
      const deposit = total_amount * (business.deposit_percentage / 100);
      console.log(`✅ [Deposit] Percentage deposit: ${business.deposit_percentage}% of $${total_amount} = $${deposit}`);
      return deposit;
    }

    console.log('❌ [Deposit] No valid deposit configuration found');
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
      const gst_amount = amount * (business.gst_rate / 100);
      console.log(`💰 Adding GST: $${Math.round(gst_amount)} (prices are GST-exclusive)`);
      return amount + gst_amount;
    }
    return amount;
  }
}
