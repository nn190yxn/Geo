import type { BrandImportDraft, BrandImportFieldConfidence, BrandImportFieldKey } from '@geo-platform/shared-types';

export const supportedBrandImportFormats = ['Markdown', 'Word', 'PDF'];

export type BrandImportDraftState = {
  label: string;
  color: string;
  message: string;
  alertType: 'success' | 'info' | 'warning' | 'error';
};

export function getBrandImportDraftState(draft: Pick<BrandImportDraft, 'status'>): BrandImportDraftState {
  if (draft.status === 'ready_for_confirmation') {
    return {
      label: '待确认',
      color: 'green',
      message: '资料已读取完成，下一步确认品牌档案。',
      alertType: 'success'
    };
  }

  if (draft.status === 'failed') {
    return {
      label: '读取失败',
      color: 'red',
      message: '资料已保存，请查看失败原因或改用手动填写。',
      alertType: 'warning'
    };
  }

  if (draft.status === 'confirmed') {
    return {
      label: '已确认',
      color: 'blue',
      message: '品牌档案已保存。',
      alertType: 'info'
    };
  }

  return {
      label: '读取中',
    color: 'processing',
    message: '系统正在读取品牌资料。',
    alertType: 'info'
  };
}

export function getBrandImportCompletenessScore(draft: Pick<BrandImportDraft, 'fields'>): number {
  if (draft.fields.length === 0) {
    return 0;
  }

  const filledFields = draft.fields.filter((field) => field.value !== null && String(field.value).trim() !== '').length;

  return Math.round((filledFields / draft.fields.length) * 100);
}

export function getImportFieldConfidenceState(confidence: BrandImportFieldConfidence): { label: string; color: string } {
  if (confidence === 'high') {
    return { label: '高置信', color: 'green' };
  }

  if (confidence === 'medium') {
    return { label: '建议确认', color: 'blue' };
  }

  if (confidence === 'low') {
    return { label: '低置信', color: 'orange' };
  }

  return { label: '需要确认', color: 'red' };
}

export function getMissingFieldImpact(field: BrandImportFieldKey): string {
  return missingFieldImpacts[field] ?? '补齐该信息后，首轮监测问题和结果分析会更准确。';
}

const missingFieldImpacts: Partial<Record<BrandImportFieldKey, string>> = {
  name: '缺少品牌名称会影响系统判断 AI 回答是否提到品牌。',
  industry: '缺少行业会影响监测主题和行业模板推荐。',
  targetCities: '缺少目标城市会影响本地推荐类监测问题。',
  businessScope: '缺少业务范围会影响系统生成课程或产品相关问法。',
  targetAudience: '缺少目标用户会影响年龄段、人群和购买决策问题。',
  valueProps: '缺少核心卖点会影响表达准确性判断和内容补强建议。',
  proofPoints: '缺少权威背书会影响 AI 回答中的可信信息判断。',
  competitors: '缺少竞品会影响竞品压制和排名对比分析。',
  faqs: '缺少 FAQ 会影响系统生成官网 FAQ 和高频问题监测。',
  blockedExpressions: '缺少禁用表达会影响风险表达识别。'
};
