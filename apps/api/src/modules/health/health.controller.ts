import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { ApiResponse, HealthCheck } from '@geo-platform/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';

interface ReadinessCheck {
  status: 'ready';
  database: 'ready' | 'not_required';
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth(): ApiResponse<HealthCheck> {
    const missing = missingConfiguration();

    return {
      success: true,
      data: {
        status: missing.length > 0 ? 'degraded' : 'ok',
        service: 'geo-platform-api',
        repositoryDriver: repositoryDriver(),
        runtimeEnvironment: process.env.NODE_ENV ?? 'development',
        dependencies: dependencyReadiness(),
        missingConfiguration: missing
      }
    };
  }

  @Get('ready')
  async getReadiness(): Promise<ApiResponse<ReadinessCheck>> {
    if (repositoryDriver() !== 'prisma') {
      return { success: true, data: { status: 'ready', database: 'not_required' } };
    }

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { success: true, data: { status: 'ready', database: 'ready' } };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }
}

function repositoryDriver(): HealthCheck['repositoryDriver'] {
  return process.env.GEO_REPOSITORY_DRIVER === 'prisma' ? 'prisma' : 'memory';
}

function dependencyReadiness(): HealthCheck['dependencies'] {
  return {
    database: process.env.DATABASE_URL ? 'ready' : 'not_configured',
    queue: process.env.GEO_QUEUE_DRIVER && process.env.GEO_QUEUE_DRIVER !== 'memory' ? 'external_configured' : 'in_memory',
    aiPlatforms: aiPlatformReadiness(),
    mapProvider: mapProviderReadiness(),
    logging: process.env.GEO_LOGGING_DRIVER && process.env.GEO_LOGGING_DRIVER !== 'console' ? 'external_configured' : 'console'
  };
}

function aiPlatformReadiness(): HealthCheck['dependencies']['aiPlatforms'] {
  return hasConfiguredAiPlatform() ? 'configured' : 'not_configured';
}

function mapProviderReadiness(): HealthCheck['dependencies']['mapProvider'] {
  if (process.env.GEO_AMAP_POI_RATE_LIMITED === 'true') {
    return 'rate_limited';
  }
  if (process.env.GEO_AMAP_POI_DISABLED === 'true') {
    return 'disabled';
  }
  return process.env.GEO_AMAP_API_KEY || process.env.AMAP_API_KEY ? 'configured' : 'fallback';
}

function missingConfiguration(): string[] {
  const missing: string[] = [];

  if (repositoryDriver() === 'prisma' && !process.env.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  if (!hasConfiguredAiPlatform()) {
    missing.push('GEO_AI_PLATFORM_CONFIGURED');
  }

  return missing;
}

function hasConfiguredAiPlatform(): boolean {
  return process.env.GEO_AI_PLATFORM_CONFIGURED === 'true' || Boolean(process.env.STEPFUN_API_KEY);
}
