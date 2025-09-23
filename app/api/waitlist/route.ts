import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/features/shared/lib/supabase/admin-client';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone_number, address } = await request.json();

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get admin client for database operations
    const supabase = createAdminClient();

    // Check if email already exists
    const { data: existingContact } = await supabase
      .from('wait_list_contacts')
      .select('id')
      .eq('email', email)
      .single();

    if (existingContact) {
      return NextResponse.json(
        { error: 'Email already registered in waitlist' },
        { status: 409 }
      );
    }

    // Insert new waitlist contact
    const { data, error } = await supabase
      .from('wait_list_contacts')
      .insert([
        {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone_number: phone_number?.trim() || null,
          address: address?.trim() || null,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully joined waitlist',
        id: data.id
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
