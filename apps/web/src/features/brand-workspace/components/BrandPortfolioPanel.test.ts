import { describe, expect, it } from 'vitest';
import type { BeginnerHomeDashboard } from '@geo-platform/shared-types';
import { getBrandFirstMonitoringState, getBrandStatusState } from './BrandPortfolioPanel';

describe('BrandPortfolioPanel helpers', () => {
  it('将品牌状态转换为运营文案', () => {
    expect(getBrandStatusState('active')).toEqual({ label: '启用', color: 'green' });
    expect(getBrandStatusState('inactive')).toEqual({ label: '停用', color: 'default' });
    expect(getBrandStatusState('archived')).toEqual({ label: '已归档', color: 'default' });
  });

  it('按真实回复进度显示首轮监测状态', () => {
    expect(getBrandFirstMonitoringState(null)).toEqual({ label: '待开始', color: 'default' });
    expect(getBrandFirstMonitoringState(createDashboard({ total: 2, collected: 0 }))).toEqual({ label: '进行中', color: 'blue' });
    expect(getBrandFirstMonitoringState(createDashboard({ total: 2, collected: 1 }))).toEqual({ label: '已完成', color: 'green' });
  });
});

function createDashboard(realResponseStatus: { total: number; collected: number }): BeginnerHomeDashboard {
  return {
    realResponseStatus: {
      ...realResponseStatus,
      pending: realResponseStatus.total - realResponseStatus.collected,
      reviewRequired: 0,
      failed: 0
    }
  } as BeginnerHomeDashboard;
}
