import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/connecteam/create-shift-simple
 * Creates a shift with a list of user IDs
 *
 * Body Parameters:
 * - schedulerId: integer (required) - The scheduler ID to create shifts in
 * - startTime: integer (required) - The start time of the shift in Unix format (in seconds)
 * - endTime: integer (required) - The end time of the shift in Unix format (in seconds)
 * - userIds: array of integers (required) - User IDs to assign to the shift
 * - title: string (optional) - The title of the shift
 * - notifyUsers: boolean (optional, defaults to true) - Whether to notify assigned users
 * - timezone: string (optional) - The timezone of the shift (defaults to Australia/Melbourne)
 * - isPublished: boolean (optional, defaults to true) - Whether to publish the shift
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
    const {
      schedulerId,
      startTime,
      endTime,
      userIds,
      title = 'Shift',
      notifyUsers = true,
      timezone = 'Australia/Melbourne',
      isPublished = true
    } = body;

    // Validate required parameters
    if (!schedulerId) {
      return NextResponse.json(
        { error: 'schedulerId is required' },
        { status: 400 }
      );
    }

    if (!startTime) {
      return NextResponse.json(
        { error: 'startTime is required' },
        { status: 400 }
      );
    }

    if (!endTime) {
      return NextResponse.json(
        { error: 'endTime is required' },
        { status: 400 }
      );
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds must be a non-empty array of user IDs' },
        { status: 400 }
      );
    }

    if (userIds.length > 1) {
      return NextResponse.json(
        { error: 'Only one user ID is supported until account is upgraded. Please provide a single user ID.' },
        { status: 400 }
      );
    }

    // Validate numeric parameters
    const schedulerIdNum = parseInt(schedulerId);
    const startTimeNum = parseInt(startTime);
    const endTimeNum = parseInt(endTime);

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

    // Validate and convert user IDs
    const assignedUserIds = userIds.map(id => {
      const userId = parseInt(id);
      if (isNaN(userId) || userId < 1) {
        throw new Error(`Invalid user ID: ${id}`);
      }
      return userId;
    });

    // Create shift data - API expects an array of shifts
    const shiftData = [{
      isOpenShift: false,
      isPublished: isPublished,
      locationData: { isReferencedToJob: false },
      assignedUserIds: assignedUserIds,
      startTime: startTimeNum,
      endTime: endTimeNum,
      title: title,
      timezone: timezone
    }];

    // Create shift via Connecteam API
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

    const shiftResult = await response.json();

    return NextResponse.json({
      success: true,
      message: `Successfully created shift for ${assignedUserIds.length} users`,
      data: {
        shift: shiftResult,
        assignedUserIds: assignedUserIds,
        shiftDetails: {
          startTime: startTimeNum,
          endTime: endTimeNum,
          startTimeFormatted: new Date(startTimeNum * 1000).toISOString(),
          endTimeFormatted: new Date(endTimeNum * 1000).toISOString(),
          duration: `${Math.round((endTimeNum - startTimeNum) / 3600)} hours`,
          timezone: timezone,
          title: title,
          isPublished: isPublished,
          notificationsSent: notifyUsers
        }
      }
    });

  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
