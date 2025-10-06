import { NextRequest, NextResponse } from 'next/server';
import { BusinessRepository } from '@/features/shared/lib/database/repositories/business-repository';
import { BusinessCategory } from '@/features/shared/lib/database/types/business';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessType = searchParams.get('businessType') as BusinessCategory;

    if (!businessType) {
      return NextResponse.json({ error: 'Business type required' }, { status: 400 });
    }

    // Validate business type
    if (!Object.values(BusinessCategory).includes(businessType)) {
      return NextResponse.json({ error: 'Invalid business type' }, { status: 400 });
    }

    // Find a business of this type that has a Twilio number
    const businessRepository = new BusinessRepository();
    const businesses = await businessRepository.findAll({}, {
      business_category: businessType,
    });

    // Find the first business with a Twilio number
    const businessWithPhone = businesses.find(b => b.twilio_number);

    if (!businessWithPhone || !businessWithPhone.twilio_number) {
      console.error(`No business found with Twilio number for type: ${businessType}`);
      return NextResponse.json({
        error: 'No phone number available for this business type'
      }, { status: 404 });
    }

    console.log(`📞 [BusinessPhone] Found phone number for ${businessType}: ${businessWithPhone.twilio_number}`);

    return NextResponse.json({
      twilio_number: businessWithPhone.twilio_number,
      businessName: businessWithPhone.name,
      businessId: businessWithPhone.id
    });

  } catch (error) {
    console.error('Error getting business phone number:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
