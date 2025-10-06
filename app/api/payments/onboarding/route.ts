import { NextRequest, NextResponse } from 'next/server';
import { StripePaymentService } from '@/features/payments/stripe-utils';

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json();

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Create onboarding link for the business
    const result = await StripePaymentService.createOnboardingLink(businessId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      onboardingUrl: result.url
    });

  } catch (error) {
    console.error('Error creating onboarding link:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
