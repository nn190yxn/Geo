import { describe, expect, it } from 'vitest';
import type { ContentAssetPageInput } from '@geo-platform/shared-types';
import { normalizeContentAssetPageInput } from '../src/modules/content/content.controller';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

describe(`Property P5: saved content assets require business context ${validatesCriteria(['5.5'])}`, () => {
  it('accepts exactly the combinations containing a source, optimization unit, or user intent', () => {
    const optimizationUnitValues = [undefined, '', '   ', ' unit-1 '] as const;
    const userIntentValues = [undefined, '', '   ', ' 家长选课 '] as const;
    const sourceReferenceValues = [
      undefined,
      [],
      [{ type: 'knowledge' as const, title: '   ' }],
      [{ type: 'knowledge' as const, title: ' 课程手册 ', url: ' https://example.com/guide ' }]
    ] as const;

    for (const optimizationUnitId of optimizationUnitValues) {
      for (const userIntent of userIntentValues) {
        for (const sourceReferences of sourceReferenceValues) {
          const input: ContentAssetPageInput = {
            title: '儿童体能 FAQ',
            type: 'website_faq',
            platform: 'official_site',
            url: 'https://example.com/faq',
            targetKeywords: ['儿童体能'],
            optimizationUnitId,
            userIntent,
            sourceReferences: sourceReferences ? [...sourceReferences] : undefined
          };
          const hasRequiredContext = Boolean(
            optimizationUnitId?.trim()
            || userIntent?.trim()
            || sourceReferences?.some((source) => source.title.trim())
          );

          if (!hasRequiredContext) {
            expect(
              () => normalizeContentAssetPageInput(input),
              `P5 should reject context combination ${JSON.stringify({ optimizationUnitId, userIntent, sourceReferences })}`
            ).toThrow('内容资产需要关联来源资料、优化单元或用户意图');
            continue;
          }

          const normalized = normalizeContentAssetPageInput(input);
          expect(
            Boolean(normalized.optimizationUnitId || normalized.userIntent || normalized.sourceReferences?.length),
            `P5 should preserve context combination ${JSON.stringify({ optimizationUnitId, userIntent, sourceReferences })}`
          ).toBe(true);
          expect(normalized.optimizationUnitId).toBe(optimizationUnitId?.trim());
          expect(normalized.userIntent).toBe(userIntent?.trim());
          expect(normalized.sourceReferences).toEqual(
            sourceReferences
              ?.filter((source) => source.title.trim())
              .map((source) => ({
                type: source.type,
                title: source.title.trim(),
                url: 'url' in source ? source.url?.trim() : undefined
              }))
          );
        }
      }
    }
  });
});
