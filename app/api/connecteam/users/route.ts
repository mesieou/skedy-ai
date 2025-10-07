import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/connecteam/users
 * Fetches users from Connecteam API
 *
 * This endpoint can be extended with query parameters as needed based on Connecteam's users API documentation
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.CONNECTEAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'CONNECTEAM_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Parse query parameters (can be extended based on API requirements)
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const url = `https://api.connecteam.com/users/v1/users${queryString ? `?${queryString}` : ''}`;

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
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
