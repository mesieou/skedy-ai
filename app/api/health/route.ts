import { NextResponse } from 'next/server';
import { voiceRedisClient } from '@/features/agent/sessions/redisClient';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Health check endpoint for Docker container monitoring
 * Checks application status and critical dependencies
 */
export async function GET() {
  try {
    const startTime = Date.now();

    // Check Redis connection
    let redisStatus = 'unknown';
    try {
      await voiceRedisClient.ping();
      redisStatus = 'connected';

      // Log successful health check to Sentry (breadcrumb)
      sentry.addBreadcrumb('Health check - Redis connection successful', 'health-check', {
        redisStatus: 'connected',
        responseTime: `${Date.now() - startTime}ms`
      });
    } catch (error) {
      redisStatus = 'disconnected';
      console.warn('[Health] Redis connection failed:', error);

      // Track Redis connection failure in Sentry
      sentry.trackError(error as Error, {
        sessionId: 'health-check',
        businessId: 'system',
        operation: 'health_check_redis_connection',
        metadata: {
          redisStatus: 'disconnected',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    const responseTime = Date.now() - startTime;

    // Determine overall health
    const isHealthy = redisStatus === 'connected';
    const status = isHealthy ? 'healthy' : 'degraded';

    const memoryUsage = process.memoryUsage();
    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      services: {
        redis: redisStatus,
        nodejs: 'running',
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      },
      environment: process.env.NODE_ENV || 'development'
    };

    // Log health check results to Sentry
    if (!isHealthy) {
      // Track degraded health status
      sentry.addBreadcrumb('Health check - System degraded', 'health-check', {
        status: 'degraded',
        redisStatus,
        responseTime: `${responseTime}ms`,
        memoryUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
      });
    } else {
      // Periodic healthy status logging (only log every 10th healthy check to avoid spam)
      const shouldLogHealthy = Math.random() < 0.1; // 10% chance
      if (shouldLogHealthy) {
        sentry.addBreadcrumb('Health check - System healthy', 'health-check', {
          status: 'healthy',
          uptime: `${Math.round(process.uptime())}s`,
          responseTime: `${responseTime}ms`,
          memoryUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
        });
      }
    }

    return NextResponse.json(healthData, {
      status: isHealthy ? 200 : 503
    });

  } catch (error) {
    console.error('[Health] Health check failed:', error);

    // Track critical health check failure in Sentry
    sentry.trackError(error as Error, {
      sessionId: 'health-check',
      businessId: 'system',
      operation: 'health_check_critical_failure',
      metadata: {
        status: 'unhealthy',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 503
    });
  }
}
