import { describe, expect, it, vi } from 'vitest';
import { CitationAbsorptionService, matchCitationAbsorption, splitAuditableSentences, splitSourceFragments } from '../src/modules/citations/citation-absorption.service';

describe('CitationAbsorptionService evidence helpers', () => {
  it('splits answers and source content with stable offsets', () => {
    expect(splitAuditableSentences('品牌提供儿童体能课。课程适合 6 岁以上儿童。')).toEqual([
      { text: '品牌提供儿童体能课。', startOffset: 0, endOffset: 10 },
      { text: '课程适合 6 岁以上儿童。', startOffset: 10, endOffset: 23 }
    ]);
    expect(splitSourceFragments('课程适合 6 岁以上儿童，并提供体能训练。')[0]).toMatchObject({ startOffset: 0, endOffset: 21 });
  });

  it('returns auditable support and review states for matching evidence', () => {
    const evidence = matchCitationAbsorption(
      { id: 'citation-1', responseId: 'response-1' },
      '课程适合 6 岁以上儿童，并提供专业体能训练。',
      '课程适合 6 岁以上儿童。品牌价格最低。'
    );
    expect(evidence[0]).toMatchObject({ outcome: 'supports', reviewStatus: 'not_required', sourceStartOffset: 0 });
    expect(evidence[1]).toMatchObject({ outcome: 'conflicts', reviewStatus: 'pending_review' });
  });

  it.each([
    ['supports', 'course supports children training evidence.', 'course supports children training evidence.'],
    ['partial', 'course supports children training evidence.', 'course unrelated claim.'],
    ['conflicts', 'course supports children training evidence.', 'unrelated claim only.']
  ])('P24 keeps answer, source fragment and review state for %s conclusions', (_outcome, sourceText, answerText) => {
    const evidence = matchCitationAbsorption({ id: 'citation-p24', responseId: 'response-p24' }, sourceText, answerText);

    expect(evidence).not.toEqual([]);
    for (const item of evidence) {
      expect(item.answerSentence).not.toBe('');
      expect(item.sourceFragment).not.toBe('');
      expect(item.reviewStatus).toMatch(/^(not_required|pending_review)$/);
      expect(item.id).toContain('citation-p24:');
    }
  });

  it('persists pending review evidence when the citation page is unavailable', async () => {
    const saveCitationAbsorptionEvidence = vi.fn(async (_userId, _brandId, _citationId, evidence) => ({ id: 'citation-1', absorptionEvidence: evidence }));
    const service = new CitationAbsorptionService({
      getCitationDashboard: vi.fn(async () => ({ sources: [{ id: 'citation-1', runId: 'run-1', responseId: 'response-1', url: 'https://example.com/source' }] })),
      getMonitoringRun: vi.fn(async () => ({ response: { rawText: '课程适合儿童。' } })),
      saveCitationAbsorptionEvidence
    } as never, { fetchText: vi.fn(async () => { throw new Error('unavailable'); }) });

    const result = await service.analyze('user-1', 'brand-1', 'citation-1');

    expect(result).toMatchObject({ absorptionEvidence: [expect.objectContaining({ outcome: 'unavailable', reviewStatus: 'pending_review' })] });
    expect(saveCitationAbsorptionEvidence).toHaveBeenCalledWith('user-1', 'brand-1', 'citation-1', [expect.objectContaining({ outcome: 'unavailable' })]);
  });
});
