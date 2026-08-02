import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionsService } from '../src/modules/permissions/permissions.service';

const session = {
  id: 'session_1',
  brandId: 'brand_1',
  platformCode: 'doubao',
  status: 'ready',
  loginDetected: true,
  authorizedScope: { brandId: 'brand_1', testPlanIds: ['plan_1'], platformCodes: ['doubao'] },
  createdAt: '2026-07-18T00:00:00.000Z',
  updatedAt: '2026-07-18T00:00:00.000Z'
};

const run = {
  id: 'run_1',
  brandId: 'brand_1',
  platformCode: 'doubao',
  status: 'review_required'
};

function createRepository() {
  return {
    listBrowserConnectionSessions: vi.fn().mockReturnValue([session]),
    getMonitoringRun: vi.fn().mockReturnValue(run),
    listTestPlans: vi.fn().mockReturnValue([{ id: 'plan_1', monitoringRunIds: ['run_1'] }]),
    addManualResponse: vi.fn().mockReturnValue({ ...run, status: 'completed' }),
    parseAnalysisResult: vi.fn().mockReturnValue({ id: 'analysis_1', runId: 'run_1' }),
    updateBrowserConnectionSession: vi.fn().mockReturnValue({ ...session, lastOperation: 'answer_captured' })
  };
}

describe('browser response capture service', () => {
  let repository: ReturnType<typeof createRepository>;
  let service: PermissionsService;

  beforeEach(() => {
    repository = createRepository();
    service = new PermissionsService(repository as never);
  });

  it('saves and analyzes an answer authorized by session, plan, platform and run', async () => {
    await expect(service.captureBrowserResponse('user_1', 'brand_1', 'session_1', {
      runId: 'run_1',
      rawText: '真实平台回答'
    })).resolves.toMatchObject({
      session: { id: 'session_1', lastOperation: 'answer_captured' },
      run: { id: 'run_1' }
    });

    expect(repository.addManualResponse).toHaveBeenCalledWith('user_1', 'brand_1', 'run_1', expect.objectContaining({
      rawText: '真实平台回答',
      modelName: 'doubao-browser'
    }));
    expect(repository.parseAnalysisResult).toHaveBeenCalledWith('user_1', 'brand_1', 'run_1');
  });

  it('rejects a run from another platform', async () => {
    repository.getMonitoringRun.mockReturnValue({ ...run, platformCode: 'kimi' });

    await expect(service.captureBrowserResponse('user_1', 'brand_1', 'session_1', {
      runId: 'run_1',
      rawText: '跨平台回答'
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.addManualResponse).not.toHaveBeenCalled();
  });

  it('rejects a run outside the session-authorized test plan', async () => {
    repository.listTestPlans.mockReturnValue([{ id: 'plan_2', monitoringRunIds: ['run_1'] }]);

    await expect(service.captureBrowserResponse('user_1', 'brand_1', 'session_1', {
      runId: 'run_1',
      rawText: '未授权回答'
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.addManualResponse).not.toHaveBeenCalled();
  });

  it('requires a confirmed login before accepting an answer', async () => {
    repository.listBrowserConnectionSessions.mockReturnValue([{ ...session, status: 'login_required', loginDetected: false }]);

    await expect(service.captureBrowserResponse('user_1', 'brand_1', 'session_1', {
      runId: 'run_1',
      rawText: '提前回填回答'
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.getMonitoringRun).not.toHaveBeenCalled();
  });

  it('prevents a completed run from being overwritten', async () => {
    repository.getMonitoringRun.mockReturnValue({ ...run, status: 'completed' });

    await expect(service.captureBrowserResponse('user_1', 'brand_1', 'session_1', {
      runId: 'run_1',
      rawText: '重复回填回答'
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.addManualResponse).not.toHaveBeenCalled();
  });
});
