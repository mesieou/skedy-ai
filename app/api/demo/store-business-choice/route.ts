import { NextRequest, NextResponse } from 'next/server';
import { voiceRedisClient } from '@/features/agent/sessions/redisClient';

export async function POST(request: NextRequest) {
  try {
    const { businessType, userIP } = await request.json();

    if (!businessType) {
      return NextResponse.json({ error: 'Business type required' }, { status: 400 });
    }

    // Store business choice for 60 seconds with user IP as key
    const key = `demo_choice:${userIP}`;
    await voiceRedisClient.set(key, businessType, 60);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing business choice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
