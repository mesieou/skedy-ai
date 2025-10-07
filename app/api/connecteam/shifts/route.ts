import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/connecteam/shifts
 * Creates a new shift in Connecteam API
 *
 * Path Parameters (in request body):
 * - schedulerId: integer (required) - The unique identifier of the schedule
 *
 * Query Parameters:
 * - notifyUsers: boolean (optional, defaults to true) - Whether to send notifications to assigned users
 *
 * Body Parameters:
 * - startTime: integer (required) - The start time of the shift in Unix format (in seconds)
 * - endTime: integer (required) - The end time of the shift in Unix format (in seconds)
 * - isOpenShift: boolean (optional, defaults to false) - Whether the shift is an open shift
 * - openSpots: integer (optional) - Number of open spots for the shift (only for open shifts)
 * - timezone: string (optional) - The timezone of the shift in Tz format
 * - title: string (optional) - The title of the shift
 * - isPublished: boolean (optional, defaults to false) - Whether the shift is published
 * - jobId: string (optional) - The ID of the associated job
 * - locationData: object (optional) - The location data for the shift
 * - isRequireAdminApproval: boolean (optional) - Whether admin approval is required for claiming
 * - assignedUserIds: array of integers (optional) - List of assigned user IDs
 * - notes: array of objects (optional) - Additional notes for the shift
 * - statuses: array of objects (optional) - List of statuses associated with the shift
 * - breaks: array of objects (optional) - List of breaks to create for the shift
 * - color: string (optional) - The color associated with the shift
 * - shiftDetails: object (optional) - Additional details on the shift
 * - shiftLayers: array of objects (optional) - Various layers of information associated with the shift
 * - shiftSource: string (optional) - The source of the shift
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.CONNECTEAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'CONNECTEAM_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { schedulerId, ...shiftData } = body;

    // Validate required parameters
    if (!schedulerId) {
      return NextResponse.json(
        { error: 'schedulerId is required in request body' },
        { status: 400 }
      );
    }

    if (!shiftData.startTime) {
      return NextResponse.json(
        { error: 'startTime is required' },
        { status: 400 }
      );
    }

    if (!shiftData.endTime) {
      return NextResponse.json(
        { error: 'endTime is required' },
        { status: 400 }
      );
    }

    // Validate numeric parameters
    const schedulerIdNum = parseInt(schedulerId);
    const startTimeNum = parseInt(shiftData.startTime);
    const endTimeNum = parseInt(shiftData.endTime);

    if (isNaN(schedulerIdNum) || schedulerIdNum < 1) {
      return NextResponse.json(
        { error: 'schedulerId must be a positive integer' },
        { status: 400 }
      );
    }

    if (isNaN(startTimeNum) || startTimeNum < 1) {
      return NextResponse.json(
        { error: 'startTime must be a positive integer (Unix timestamp)' },
        { status: 400 }
      );
    }

    if (isNaN(endTimeNum) || endTimeNum < 1) {
      return NextResponse.json(
        { error: 'endTime must be a positive integer (Unix timestamp)' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const notifyUsers = searchParams.get('notifyUsers') !== 'false'; // defaults to true

    // Build URL with path parameter and query parameter
    const url = `https://api.connecteam.com/scheduler/v1/schedulers/${schedulerIdNum}/shifts?notifyUsers=${notifyUsers}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify(shiftData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Connecteam API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
