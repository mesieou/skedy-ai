import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/connecteam/smart-group-segments
 * Fetches smart group segments from Connecteam API
 *
 * Query Parameters:
 * - segmentIds: array of integers - Smart group segment IDs to filter by
 * - names: array of strings - Smart group segment names to filter by
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const segmentIds = searchParams.getAll('segmentIds');
    const names = searchParams.getAll('names');

    // Build query string
    const queryParams = new URLSearchParams();
    segmentIds.forEach(id => queryParams.append('segmentIds', id));
    names.forEach(name => queryParams.append('names', name));

    const url = `https://api.connecteam.com/users/v1/smart-group-segments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

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
    console.error('Error fetching smart group segments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
