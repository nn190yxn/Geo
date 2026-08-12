import { describe, expect, it, vi } from 'vitest';
import { PrismaAcceptanceHistoryRepository } from '../src/modules/tasks/prisma-acceptance-history.repository';

describe('PrismaAcceptanceHistoryRepository', () => {
  it('writes checker evidence and reads brand-scoped history in chronological order', async () => {
    const checkedAt = new Date('2026-08-03T01:00:00.000Z');
    const createdAt = new Date('2026-08-03T01:00:01.000Z');
    const row = {
      id: 'acceptance-1', brandId: 'brand-1', taskId: 'task-1', checkerId: 'checker-1', status: 'passed',
      progressValue: 90, targetValue: 80, evidence: { runId: 'run-1' }, checkedAt, createdAt
    };
    const prisma = {
      taskAcceptanceSnapshot: {
        create: vi.fn().mockResolvedValue(row),
        findMany: vi.fn().mockResolvedValue([row])
      }
    };
    const repository = new PrismaAcceptanceHistoryRepository(prisma as never);
    const input = {
      checkerId: row.checkerId,
      status: 'passed' as const,
      progressValue: row.progressValue,
      targetValue: row.targetValue,
      evidence: row.evidence,
      checkedAt: checkedAt.toISOString()
    };

    const created = await repository.create('brand-1', 'task-1', input);
    const history = await repository.list('brand-1', 'task-1');

    expect(prisma.taskAcceptanceSnapshot.create).toHaveBeenCalledWith({ data: {
      brandId: 'brand-1', taskId: 'task-1', checkerId: 'checker-1', status: 'passed',
      progressValue: 90, targetValue: 80, evidence: { runId: 'run-1' }, checkedAt
    } });
    expect(prisma.taskAcceptanceSnapshot.findMany).toHaveBeenCalledWith({
      where: { brandId: 'brand-1', taskId: 'task-1' },
      orderBy: [{ checkedAt: 'asc' }, { createdAt: 'asc' }]
    });
    expect(created).toEqual(history[0]);
    expect(created.createdAt).toBe(createdAt.toISOString());
  });
});
