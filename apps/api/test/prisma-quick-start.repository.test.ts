import { describe, expect, it, vi } from 'vitest';
import { PrismaQuickStartRepository } from '../src/modules/quick-start/prisma-quick-start.repository';
import { QuickStartVersionConflictError } from '../src/modules/quick-start/quick-start.repository.port';

const timestamp = new Date('2026-08-03T09:00:00.000Z');

function row(version = 1) {
  return {
    id: 'session_1',
    brandId: 'brand_1',
    currentStep: 'website',
    status: 'in_progress',
    draft: {},
    version,
    startedAt: timestamp,
    completedAt: null,
    updatedAt: timestamp
  };
}

describe('PrismaQuickStartRepository', () => {
  it('maps persisted JSON and performs an atomic version increment', async () => {
    const prisma = {
      quickStartSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ ...row(2), currentStep: 'facts', draft: { website: { brandName: 'Example' } } })
      }
    };
    const repository = new PrismaQuickStartRepository(prisma as any);
    const updated = await repository.update('brand_1', 1, {
      currentStep: 'facts',
      status: 'in_progress',
      draft: {}
    });

    expect(prisma.quickStartSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { brandId: 'brand_1', version: 1 },
      data: expect.objectContaining({ version: { increment: 1 } })
    }));
    expect(updated).toMatchObject({ version: 2, currentStep: 'facts', startedAt: timestamp.toISOString() });
  });

  it('distinguishes missing sessions from stale versions', async () => {
    const existingPrisma = {
      quickStartSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn().mockResolvedValue({ id: 'session_1' })
      }
    };
    const repository = new PrismaQuickStartRepository(existingPrisma as any);

    await expect(repository.update('brand_1', 1, {
      currentStep: 'facts',
      status: 'in_progress',
      draft: {}
    })).rejects.toBeInstanceOf(QuickStartVersionConflictError);
  });
});
