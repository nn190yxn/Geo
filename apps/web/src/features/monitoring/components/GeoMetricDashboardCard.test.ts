import { describe, expect, it } from 'vitest';
import { getMetricDimensionLabel } from './GeoMetricDashboardCard';

describe('GeoMetricDashboardCard helpers', () => {
  it('shows user-facing metric dimension labels', () => {
    expect(getMetricDimensionLabel({ platformCode: 'doubao' })).toBe('豆包');
    expect(getMetricDimensionLabel({ category: 'local_decision' })).toBe('本地决策');
    expect(getMetricDimensionLabel({ optimizationUnitId: 'unit_demo' })).toBe('监测主题');
    expect(getMetricDimensionLabel({ intentId: 'intent_demo' })).toBe('监测问题');
    expect(getMetricDimensionLabel({})).toBe('整体');
  });
});
