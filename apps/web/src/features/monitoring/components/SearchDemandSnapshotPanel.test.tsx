import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { SearchDemandSnapshot } from '@geo-platform/shared-types';
import { SearchDemandSnapshotContent } from './SearchDemandSnapshotPanel';

describe('SearchDemandSnapshotContent', () => {
  it('shows snapshot provenance, rising observations, and confirmed candidates', () => {
    const snapshot: SearchDemandSnapshot = {
      id: 'snapshot-2',
      brandId: 'brand-1',
      seedTerm: '儿童体能',
      source: 'baidu',
      market: '贵阳',
      capturedAt: '2026-08-03T10:00:00.000Z',
      previousSnapshotId: 'snapshot-1',
      createdAt: '2026-08-03T10:00:00.000Z',
      candidateQuestions: [
        {
          id: 'candidate-1',
          snapshotId: 'snapshot-2',
          brandId: 'brand-1',
          question: '贵阳儿童体能训练怎么选？',
          normalizedQuestion: '贵阳儿童体能训练怎么选',
          risingObservation: true,
          status: 'candidate',
          createdAt: '2026-08-03T10:00:00.000Z'
        },
        {
          id: 'candidate-2',
          snapshotId: 'snapshot-2',
          brandId: 'brand-1',
          question: '儿童体能课适合几岁？',
          normalizedQuestion: '儿童体能课适合几岁',
          risingObservation: false,
          status: 'confirmed',
          confirmedPoolItemId: 'pool-1',
          confirmedAt: '2026-08-03T11:00:00.000Z',
          createdAt: '2026-08-03T10:00:00.000Z'
        }
      ]
    };

    const html = renderToStaticMarkup(<SearchDemandSnapshotContent snapshots={[snapshot]} onConfirm={vi.fn()} />);

    expect(html).toContain('儿童体能');
    expect(html).toContain('百度补全');
    expect(html).toContain('贵阳');
    expect(html).toContain('需求上升观察');
    expect(html).toContain('确认入库');
    expect(html).toContain('已加入监测问题库');
  });
});
