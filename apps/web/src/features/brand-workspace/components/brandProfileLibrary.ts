import type { BrandImportFieldKey, BrandProfile } from '@geo-platform/shared-types';

export type BrandProfileLibraryFieldKey = keyof Pick<
  BrandProfile,
  'intro' | 'valueProps' | 'offerings' | 'proofPoints' | 'targetCustomers' | 'recommendedExpressions' | 'blockedExpressions' | 'contentRules' | 'competitors' | 'faqs'
>;

export type BrandProfileLibraryGroup = {
  key: BrandProfileLibraryCategoryKey;
  title: string;
  description: string;
  fallbackMissingLabel?: string;
  fields: Array<{
    key: BrandProfileLibraryFieldKey;
    label: string;
    importFieldKey: BrandImportFieldKey;
  }>;
};

export type BrandProfileLibraryCategoryKey = 'basic-info' | 'products' | 'audiences' | 'facts' | 'media-assets';

export const brandProfileLibraryGroups: BrandProfileLibraryGroup[] = [
  {
    key: 'basic-info',
    title: '基础信息',
    description: '说明品牌是谁、解决什么问题、凭什么被推荐。',
    fields: [
      { key: 'intro', label: '品牌介绍', importFieldKey: 'intro' },
      { key: 'valueProps', label: '核心卖点', importFieldKey: 'valueProps' },
      { key: 'proofPoints', label: '权威背书', importFieldKey: 'proofPoints' }
    ]
  },
  {
    key: 'products',
    title: '产品服务',
    description: '沉淀课程、产品、服务范围、常见问题和适用场景。',
    fields: [
      { key: 'offerings', label: '产品服务', importFieldKey: 'offerings' },
      { key: 'faqs', label: 'FAQ', importFieldKey: 'faqs' }
    ]
  },
  {
    key: 'audiences',
    title: '目标用户',
    description: '记录目标人群、决策关注点、反对理由和常见搜索表达。',
    fields: [
      { key: 'targetCustomers', label: '目标用户', importFieldKey: 'targetCustomers' }
    ]
  },
  {
    key: 'facts',
    title: '事实知识',
    description: '维护标准表达、禁用表达、内容规则和竞品事实，用于监测判断与内容生成。',
    fields: [
      { key: 'recommendedExpressions', label: '推荐表达', importFieldKey: 'recommendedExpressions' },
      { key: 'blockedExpressions', label: '禁用表达', importFieldKey: 'blockedExpressions' },
      { key: 'contentRules', label: '内容规则', importFieldKey: 'contentRules' },
      { key: 'competitors', label: '竞品信息', importFieldKey: 'competitors' }
    ]
  },
  {
    key: 'media-assets',
    title: '媒体素材',
    description: '沉淀门店、产品、案例、证书、品牌视觉和自有媒体线索。',
    fallbackMissingLabel: '媒体素材',
    fields: []
  }
];

export function getBrandProfileGroupProgress(group: BrandProfileLibraryGroup, profile: BrandProfile | null): number {
  if (!profile) {
    return 0;
  }

  if (group.fields.length === 0) {
    return 0;
  }

  const filledCount = group.fields.filter((field) => isProfileFieldFilled(profile[field.key])).length;
  return Math.round((filledCount / group.fields.length) * 100);
}

export function getBrandProfileGroupMissingLabels(group: BrandProfileLibraryGroup, profile: BrandProfile | null): string[] {
  if (group.fields.length === 0) {
    return group.fallbackMissingLabel ? [group.fallbackMissingLabel] : [];
  }

  if (!profile) {
    return group.fields.map((field) => field.label);
  }

  const missingFieldKeys = new Set(profile.completenessPrompts.map((prompt) => prompt.field));

  return group.fields
    .filter((field) => !isProfileFieldFilled(profile[field.key])
      || missingFieldKeys.has(field.importFieldKey)
      || profile.missingFields.includes(field.importFieldKey))
    .map((field) => field.label);
}

function isProfileFieldFilled(value: BrandProfile[BrandProfileLibraryFieldKey]) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value.trim().length > 0;
}
