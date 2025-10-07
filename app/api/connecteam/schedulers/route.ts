import { NextResponse } from 'next/server';

/**
 * GET /api/connecteam/schedulers
 * Fetches schedulers from Connecteam API
 */
export async function GET() {
  try {
    const apiKey = process.env.CONNECTEAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'CONNECTEAM_API_KEY not configured' },
        { status: 500 }
      );
    }

    const url = 'https://api.connecteam.com/scheduler/v1/schedulers';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Connecteam API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching schedulers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
