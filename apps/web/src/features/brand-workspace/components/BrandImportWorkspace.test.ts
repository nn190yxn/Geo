import { describe, expect, it } from 'vitest';
import type { BrandImportField } from '@geo-platform/shared-types';
import { getProfileSaveFeedbackCopy } from './BrandKnowledgeCard';
import { createImportFieldEditorValues, parseImportFieldEditorValue } from './BrandImportWorkspace';

describe('BrandImportWorkspace field conversion', () => {
  it('formats scalar, list, and FAQ fields for confirmation', () => {
    const fields: BrandImportField[] = [
      createField('intro', '品牌简介', '专注 AI 可见性'),
      createField('targetCities', '目标城市', ['贵阳', '成都']),
      createField('faqs', 'FAQ', [{ question: '适合谁？', answer: '适合品牌运营团队。' }])
    ];

    expect(createImportFieldEditorValues(fields)).toEqual({
      intro: '专注 AI 可见性',
      targetCities: '贵阳\n成都',
      faqs: '适合谁？\n适合品牌运营团队。'
    });
  });

  it('parses list and FAQ edits into the import API contract', () => {
    expect(parseImportFieldEditorValue(createField('targetCities', '目标城市', null), '贵阳、成都\n重庆')).toEqual(['贵阳', '成都', '重庆']);
    expect(parseImportFieldEditorValue(
      createField('faqs', 'FAQ', [{ question: '', answer: '' }]),
      '适合谁？\n品牌运营团队\n\n如何开始？\n先导入资料'
    )).toEqual([
      { question: '适合谁？', answer: '品牌运营团队' },
      { question: '如何开始？', answer: '先导入资料' }
    ]);
  });
});

describe('brand profile save feedback', () => {
  it('reports completeness change and downstream impact', () => {
    expect(getProfileSaveFeedbackCopy({ before: 45, after: 70 })).toEqual({
      message: '品牌资料已保存，完整度 45% → 70%',
      description: '本次完整度提升 25 分。最新资料会用于后续监测问题、标准答案和内容生成。'
    });
  });
});

function createField(key: BrandImportField['key'], label: string, value: BrandImportField['value']): BrandImportField {
  return { key, label, value, confidence: 'high', confirmationRequired: false };
}
