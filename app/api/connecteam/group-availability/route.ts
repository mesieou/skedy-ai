import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/connecteam/group-availability
 * Fetches all available users in a specific smart group for a given time period
 *
 * Query Parameters:
 * - groupId: integer (required) - The smart group ID to check
 * - startTime: integer (required) - The start time to filter by in Unix format (in seconds)
 * - endTime: integer (required) - The end time to filter by in Unix format (in seconds)
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
    const groupId = searchParams.get('groupId');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    // Validate required parameters
    if (!groupId) {
      return NextResponse.json(
        { error: 'groupId parameter is required' },
        { status: 400 }
      );
    }

    if (!startTime) {
      return NextResponse.json(
        { error: 'startTime parameter is required' },
        { status: 400 }
      );
    }

    if (!endTime) {
      return NextResponse.json(
        { error: 'endTime parameter is required' },
        { status: 400 }
      );
    }

    // Validate numeric parameters
    const groupIdNum = parseInt(groupId);
    const startTimeNum = parseInt(startTime);
    const endTimeNum = parseInt(endTime);

    if (isNaN(groupIdNum) || groupIdNum < 1) {
      return NextResponse.json(
        { error: 'groupId must be a positive integer' },
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

    // Step 1: Get all users
    const usersResponse = await fetch('https://api.connecteam.com/users/v1/users', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-KEY': apiKey
      }
    });

    if (!usersResponse.ok) {
      throw new Error(`Failed to fetch users: ${usersResponse.status} ${usersResponse.statusText}`);
    }

    const usersData = await usersResponse.json();

    // Step 2: Filter users who belong to the specified smart group
    const groupUsers = usersData.data.users.filter((user: { smartGroupsIds?: number[] }) =>
      user.smartGroupsIds && user.smartGroupsIds.includes(groupIdNum)
    );

    if (groupUsers.length === 0) {
      return NextResponse.json({
        requestId: `group-availability-${Date.now()}`,
        data: {
          groupId: groupIdNum,
          timeRange: {
            startTime: startTimeNum,
            endTime: endTimeNum
          },
          totalUsersInGroup: 0,
          availableUsers: [],
          unavailableUsers: [],
          message: 'No users found in this smart group'
        }
      });
    }

    // Step 3: Check unavailabilities for all users in the group
    const unavailabilityPromises = groupUsers.map(async (user: { userId: number; firstName: string; lastName: string; email: string; phoneNumber: string; userType: string }) => {
      try {
        const queryParams = new URLSearchParams({
          userId: user.userId.toString(),
          startTime: startTime,
          endTime: endTime
        });

        const url = `https://api.connecteam.com/scheduler/v1/schedulers/user-unavailability?${queryParams.toString()}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'X-API-KEY': apiKey
          }
        });

        if (!response.ok) {
          throw new Error(`API error for user ${user.userId}: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        return {
          user: {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            userType: user.userType
          },
          unavailabilities: data.data.userUnavailabilities,
          isAvailable: data.data.userUnavailabilities.length === 0,
          error: null
        };
      } catch (error) {
        return {
          user: {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            userType: user.userType
          },
          unavailabilities: [],
          isAvailable: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    });

    // Wait for all requests to complete
    const results = await Promise.all(unavailabilityPromises);

    // Separate available and unavailable users
    const availableUsers = results.filter(result => result.isAvailable && !result.error);
    const unavailableUsers = results.filter(result => !result.isAvailable || result.error);

    // Get group name for context
    let groupName = `Group ${groupIdNum}`;
    try {
      const groupsResponse = await fetch('https://api.connecteam.com/users/v1/smart-groups', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'X-API-KEY': apiKey
        }
      });

      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        const group = groupsData.data.groups.find((g: { id: number; name: string }) => g.id === groupIdNum);
        if (group) {
          groupName = group.name;
        }
      }
    } catch {
      // Ignore error, use default group name
    }

    return NextResponse.json({
      requestId: `group-availability-${Date.now()}`,
      data: {
        groupId: groupIdNum,
        groupName: groupName,
        timeRange: {
          startTime: startTimeNum,
          endTime: endTimeNum,
          startTimeFormatted: new Date(startTimeNum * 1000).toISOString(),
          endTimeFormatted: new Date(endTimeNum * 1000).toISOString()
        },
        totalUsersInGroup: groupUsers.length,
        availableUsersCount: availableUsers.length,
        unavailableUsersCount: unavailableUsers.length,
        availableUsers: availableUsers.map(result => result.user),
        unavailableUsers: unavailableUsers.map(result => ({
          user: result.user,
          unavailabilities: result.unavailabilities,
          error: result.error
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching group availability:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
