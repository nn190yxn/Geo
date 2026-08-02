import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('inner test feedback repository', () => {
  it('stores explicit severity and defaults legacy input to medium', () => {
    const repository = new PermissionsRepository();
    const highSeverity = repository.createInnerTestFeedback('user_demo', 'brand_demo', {
      page: 'AI 回复监测',
      module: '监测记录',
      type: 'bug',
      severity: 'high',
      description: '监测记录无法展开。'
    });
    const legacyInput = repository.createInnerTestFeedback('user_demo', 'brand_demo', {
      page: '写内容',
      module: '标题',
      type: 'copy',
      description: '标题提示需要调整。'
    });

    expect(highSeverity?.severity).toBe('high');
    expect(legacyInput?.severity).toBe('medium');
  });

  it('updates severity together with handling status and note', () => {
    const repository = new PermissionsRepository();
    const feedback = repository.createInnerTestFeedback('user_demo', 'brand_demo', {
      page: '发布记录',
      module: '结果录入',
      type: 'workflow',
      severity: 'medium',
      description: '处理步骤不清晰。'
    });
    const updated = repository.updateInnerTestFeedback('user_demo', 'brand_demo', feedback?.id ?? '', {
      severity: 'high',
      status: 'in_progress',
      resolutionNote: '已进入修复流程。'
    });

    expect(updated).toMatchObject({ severity: 'high', status: 'in_progress', resolutionNote: '已进入修复流程。' });
  });
});
