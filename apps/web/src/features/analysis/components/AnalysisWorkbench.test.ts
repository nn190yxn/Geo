import { describe, expect, it } from 'vitest';
import { getAnalysisRiskLevel } from './AnalysisWorkbench';

describe('AnalysisWorkbench helpers', () => {
  it('marks empty findings as observation work', () => {
    expect(getAnalysisRiskLevel([])).toEqual({ label: '持续观察', color: 'blue', alertType: 'info' });
  });

  it('marks high-risk findings as work to handle', () => {
    expect(getAnalysisRiskLevel(['竞品连续压制 3 次', '存在内容缺口'])).toEqual({ label: '需要处理', color: 'orange', alertType: 'warning' });
  });

  it('marks regular findings as actionable', () => {
    expect(getAnalysisRiskLevel(['内容引用率 42%', '权威来源占比 18%'])).toEqual({ label: '可执行', color: 'green', alertType: 'info' });
  });
});
