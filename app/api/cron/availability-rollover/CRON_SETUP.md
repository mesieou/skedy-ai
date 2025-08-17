# Availability Rollover Cron Job Setup

This document explains how to set up and use the availability rollover cron job that runs every hour.

## Overview

The cron job checks for businesses where it's midnight in their timezone and performs availability rollover operations. This ensures that availability slots are properly maintained across different time zones.

## Files Created

1. **`/app/api/cron/availability-rollover/route.ts`** - The API endpoint that executes the rollover
2. **`/vercel.json`** - Vercel cron configuration
3. **`/scripts/test-cron.ts`** - Test script to verify the cron job works

## Configuration

### 1. Environment Variables

Add the following environment variable to your `.env.local` file for security:

```env
CRON_SECRET=your_secure_random_string_here
```

This secret helps ensure only authorized requests can trigger the cron job.

### 2. Vercel Cron Configuration

The `vercel.json` file configures Vercel to run the cron job every hour:

```json
{
  "crons": [
    {
      "path": "/api/cron/availability-rollover",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule Format**: `"0 * * * *"` means:
- `0` - At minute 0
- `*` - Every hour
- `*` - Every day
- `*` - Every month  
- `*` - Every day of week

## Usage

### Automatic Execution

Once deployed to Vercel, the cron job will automatically run every hour at the top of the hour (e.g., 1:00, 2:00, 3:00, etc.).

### Manual Testing

#### Option 1: Direct Method Test
```bash
npx ts-node scripts/test-cron.ts
```

#### Option 2: API Endpoint Test
With your Next.js server running (`npm run dev`):

```bash
curl -X GET http://localhost:3000/api/cron/availability-rollover \
  -H "Authorization: Bearer your_cron_secret_here"
```

#### Option 3: Production Test
```bash
curl -X GET https://your-app.vercel.app/api/cron/availability-rollover \
  -H "Authorization: Bearer your_cron_secret_here"
```

## API Response

### Success Response
```json
{
  "success": true,
  "message": "Availability rollover completed successfully",
  "executionTime": "1250ms",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Error Response
```json
{
  "error": "Internal server error",
  "message": "Error details here",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

## Monitoring

### Vercel Dashboard
- View cron job execution logs in your Vercel dashboard
- Monitor success/failure rates
- Check execution times

### Application Logs
The cron job includes detailed logging:
- Start/completion messages
- Execution time tracking
- Error details if failures occur

## Security

1. **CRON_SECRET**: Use a strong, random secret to prevent unauthorized access
2. **Authorization Header**: All requests must include `Bearer {CRON_SECRET}`
3. **Error Handling**: Detailed errors are logged but not exposed in responses

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that `CRON_SECRET` is set correctly
2. **500 Internal Server Error**: Check application logs for specific error details
3. **Cron not running**: Verify `vercel.json` is deployed and configured correctly

### Debugging

1. Check Vercel function logs in the dashboard
2. Test the endpoint manually using curl
3. Run the test script locally: `npx ts-node scripts/test-cron.ts`

## Deployment

1. Ensure all files are committed to your repository
2. Deploy to Vercel: `vercel --prod`
3. Set the `CRON_SECRET` environment variable in Vercel dashboard
4. Verify the cron job appears in Vercel's cron jobs section

The cron job will start running automatically after deployment!
