import { describe, expect, it, vi } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';
import { PrismaPermissionsRepository } from '../src/modules/permissions/prisma-permissions.repository';

const now = new Date('2026-07-04T00:00:00.000Z');

const baseBrand = {
  id: 'brand_prisma_browser',
  name: 'Prisma Browser Brand',
  status: 'active',
  aliases: [],
  industry: '儿童运动',
  website: null,
  targetCities: ['贵阳'],
  businessScope: '儿童运动成长课程',
  targetAudience: '本地家庭',
  createdAt: now,
  updatedAt: now
};

function createBrowserSessionPrismaMock() {
  const sessions: any[] = [];

  return {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'user_demo', name: 'Demo User', email: 'demo@example.com', status: 'active', createdAt: now, updatedAt: now })
    },
    organizationMember: {
      findFirst: vi.fn().mockResolvedValue({ id: 'member_1', status: 'active' })
    },
    userBrandPermission: {
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(
        where.userId === 'user_demo' && where.brandId === 'brand_prisma_browser'
          ? { id: 'permission_1', userId: 'user_demo', brandId: 'brand_prisma_browser', role: 'owner', brand: baseBrand }
          : null
      ))
    },
    browserConnectionSession: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(sessions.filter((session) => session.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(sessions.find((session) => session.id === where.id && session.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const session = { id: `browser_session_${sessions.length + 1}`, ...data, lastIssueType: null, lastAvailableAt: null, createdAt: now, updatedAt: now };
        sessions.unshift(session);
        return Promise.resolve(session);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = sessions.findIndex((session) => session.id === where.id);
        sessions[index] = { ...sessions[index], ...data, updatedAt: now };
        return Promise.resolve(sessions[index]);
      })
    }
  };
}

describe('browser connection session repository', () => {
  it('stores browser session status without exposing sensitive browser data in memory repository', () => {
    const repository = new PermissionsRepository();
    const session = repository.startBrowserConnectionSession('user_demo', 'brand_demo', { platformCode: 'doubao', testPlanId: 'plan_demo' });

    expect(session).toMatchObject({
      brandId: 'brand_demo',
      platformCode: 'doubao',
      status: 'opening',
      loginDetected: false,
      authorizedScope: { brandId: 'brand_demo', testPlanIds: ['plan_demo'], platformCodes: ['doubao'] },
      lastOperation: 'open_login_page'
    });
    expect(session).not.toHaveProperty('credentialRef');
    expect(session).not.toHaveProperty('cookies');
    expect(session).not.toHaveProperty('storageState');

    const updated = repository.updateBrowserConnectionSession('user_demo', 'brand_demo', session?.id ?? '', {
      status: 'ready',
      loginDetected: true,
      lastOperation: 'detect_login',
      lastMessage: '已检测到登录状态。',
      lastAvailableAt: '2026-07-04T00:05:00.000Z'
    });

    expect(updated).toMatchObject({ status: 'ready', loginDetected: true, lastAvailableAt: '2026-07-04T00:05:00.000Z' });
    expect(repository.listBrowserConnectionSessions('user_demo', 'brand_demo')).toContainEqual(expect.objectContaining({ id: session?.id }));
    expect(repository.listBrowserConnectionSessions('other_user', 'brand_demo')).toBeNull();
  });

  it('stores browser session status in Prisma repository and keeps brand access isolation', async () => {
    const prisma = createBrowserSessionPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);
    const session = await repository.startBrowserConnectionSession('user_demo', 'brand_prisma_browser', { platformCode: 'kimi', testPlanId: 'plan_prisma' });

    expect(session).toMatchObject({
      brandId: 'brand_prisma_browser',
      platformCode: 'kimi',
      status: 'opening',
      loginDetected: false,
      authorizedScope: { brandId: 'brand_prisma_browser', testPlanIds: ['plan_prisma'], platformCodes: ['kimi'] }
    });
    expect(session).not.toHaveProperty('credentialRef');
    expect(session).not.toHaveProperty('cookies');
    expect(session).not.toHaveProperty('storageState');

    await expect(repository.updateBrowserConnectionSession('user_demo', 'brand_prisma_browser', session?.id ?? '', {
      status: 'needs_confirmation',
      loginDetected: false,
      lastIssueType: 'captcha',
      lastMessage: '页面出现验证码，需要用户确认。'
    })).resolves.toMatchObject({ status: 'needs_confirmation', lastIssueType: 'captcha' });

    await expect(repository.listBrowserConnectionSessions('user_demo', 'brand_prisma_browser')).resolves.toContainEqual(expect.objectContaining({ id: session?.id }));
    await expect(repository.startBrowserConnectionSession('other_user', 'brand_prisma_browser', { platformCode: 'kimi' })).resolves.toBeNull();
  });
});
