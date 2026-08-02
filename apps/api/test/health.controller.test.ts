import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../src/common/prisma/prisma.service';
import { HealthController } from '../src/modules/health/health.controller';

const originalRepositoryDriver = process.env.GEO_REPOSITORY_DRIVER;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalRepositoryDriver === undefined) delete process.env.GEO_REPOSITORY_DRIVER;
  else process.env.GEO_REPOSITORY_DRIVER = originalRepositoryDriver;
});

describe('HealthController readiness', () => {
  it('reports readiness without querying a database for the memory repository', async () => {
    process.env.GEO_REPOSITORY_DRIVER = 'memory';
    const query = vi.fn();
    const controller = new HealthController({ $queryRawUnsafe: query } as unknown as PrismaService);

    await expect(controller.getReadiness()).resolves.toEqual({
      success: true,
      data: { status: 'ready', database: 'not_required' }
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('queries PostgreSQL before reporting the Prisma repository as ready', async () => {
    process.env.GEO_REPOSITORY_DRIVER = 'prisma';
    const query = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    const controller = new HealthController({ $queryRawUnsafe: query } as unknown as PrismaService);

    await expect(controller.getReadiness()).resolves.toEqual({
      success: true,
      data: { status: 'ready', database: 'ready' }
    });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('rejects readiness when PostgreSQL cannot be reached', async () => {
    process.env.GEO_REPOSITORY_DRIVER = 'prisma';
    const query = vi.fn().mockRejectedValue(new Error('connection failed'));
    const controller = new HealthController({ $queryRawUnsafe: query } as unknown as PrismaService);

    await expect(controller.getReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
