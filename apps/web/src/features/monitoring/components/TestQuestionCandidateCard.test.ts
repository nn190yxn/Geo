import { describe, expect, it } from 'vitest';
import { getGenerationNotice } from './TestQuestionCandidateCard';

describe('TestQuestionCandidateCard generation notices', () => {
  it('keeps missing profile fields and generation notes visible after generation', () => {
    expect(getGenerationNotice('监测问题已生成', {
      items: [],
      missingProfileFields: ['竞品', '目标客户'],
      generationNotes: ['已按贵阳本地场景生成'],
      source: 'llm'
    })).toEqual({
      title: '监测问题已生成',
      type: 'warning',
      description: '当前使用大模型生成。 建议补充品牌资料：竞品、目标客户。 生成说明：已按贵阳本地场景生成。'
    });
  });

  it('explains fallback generation in business language', () => {
    expect(getGenerationNotice('监测主题已生成', {
      items: [],
      missingProfileFields: [],
      generationNotes: [],
      source: 'fallback'
    })).toEqual({
      title: '监测主题已生成',
      type: 'info',
      description: '当前先用基础模板生成，补齐平台密钥后可使用大模型生成。'
    });
  });
});
