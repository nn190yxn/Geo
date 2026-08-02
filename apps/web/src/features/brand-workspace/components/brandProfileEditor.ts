import type { BrandFaq, BrandMediaAsset, BrandMediaAssetReviewStatus, BrandProfile, KnowledgeSource } from '@geo-platform/shared-types';

export type ProductServiceFormItem = {
  description?: string;
};

export type AudienceProfileFormItem = {
  name?: string;
  decisionStage?: string;
  concerns?: string;
  expressions?: string;
  linkedIntent?: string;
};

export type FactKnowledgeGroupKey = 'recommended' | 'blocked' | 'rules' | 'competitors' | 'sources';
export type AssetReviewFilter = 'all' | BrandMediaAssetReviewStatus;

export type LibraryAssetListItem = {
  id: string;
  group?: FactKnowledgeGroupKey;
  title: string;
  description: string;
  source: string;
  reviewStatus: BrandMediaAssetReviewStatus;
  updatedAt: string;
  tags: string[];
};

const audienceProfileLabels = {
  decisionStage: '决策阶段：',
  concerns: '关注问题：',
  expressions: '常见表达：',
  linkedIntent: '高价值意图：'
} as const;

export function toProductServiceFormItems(offerings: string[]): ProductServiceFormItem[] {
  return offerings.map((description) => ({ description }));
}

export function toProductServiceStrings(items?: ProductServiceFormItem[]): string[] {
  return (items ?? []).map((item) => item.description?.trim() ?? '').filter(Boolean);
}

export function getProductServiceStatus(item?: ProductServiceFormItem): 'ready' | 'draft' {
  return item?.description?.trim() ? 'ready' : 'draft';
}

export function toAudienceProfileFormItems(targetCustomers: string[]): AudienceProfileFormItem[] {
  return targetCustomers.map(parseAudienceProfile);
}

export function toAudienceProfileStrings(items?: AudienceProfileFormItem[]): string[] {
  return (items ?? []).map((item) => {
    const name = item.name?.trim() ?? '';
    const details = (Object.keys(audienceProfileLabels) as Array<keyof typeof audienceProfileLabels>)
      .map((key) => {
        const value = item[key]?.trim();
        return value ? `${audienceProfileLabels[key]}${value}` : '';
      })
      .filter(Boolean);
    return [name, ...details].filter(Boolean).join('｜');
  }).filter(Boolean);
}

export function getFaqSummary(value?: string): { count: number; questions: string[] } {
  const faqs = splitFaqs(value);
  return {
    count: faqs.length,
    questions: faqs.slice(0, 3).map((faq) => faq.question || '未填写问题')
  };
}

export function buildFactKnowledgeAssets(profile: BrandProfile, sources: KnowledgeSource[]): LibraryAssetListItem[] {
  const manualAssets = [
    ...buildManualFactGroup('recommended', profile.recommendedExpressions, '推荐表达', profile.updatedAt),
    ...buildManualFactGroup('blocked', profile.blockedExpressions, '禁用表达', profile.updatedAt),
    ...buildManualFactGroup('rules', profile.contentRules, '内容规则', profile.updatedAt),
    ...buildManualFactGroup('competitors', profile.competitors, '竞品信息', profile.updatedAt)
  ];
  const sourceAssets = sources.map((source): LibraryAssetListItem => ({
    id: source.id,
    group: 'sources',
    title: source.name,
    description: source.sourceUrl ?? (source.fileRef ? '已上传文件' : '资料来源待补充'),
    source: '导入资料',
    reviewStatus: knowledgeSourceReviewStatusMap[source.status],
    updatedAt: source.updatedAt,
    tags: [source.sourceType]
  }));
  return [...manualAssets, ...sourceAssets];
}

export function buildMediaAssetListItems(mediaAssets: BrandMediaAsset[]): LibraryAssetListItem[] {
  return mediaAssets.map((asset) => ({
    id: asset.id,
    title: asset.title,
    description: asset.contentUsage,
    source: asset.source,
    reviewStatus: asset.reviewStatus,
    updatedAt: asset.updatedAt,
    tags: [asset.assetType, ...asset.applicablePlatforms, ...(asset.relatedContentTaskId ? [`关联内容 ${asset.relatedContentTaskId}`] : [])]
  }));
}

export function filterLibraryAssets<T extends LibraryAssetListItem>(items: T[], query: string, reviewStatus: AssetReviewFilter): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return items.filter((item) => {
    const matchesStatus = reviewStatus === 'all' || item.reviewStatus === reviewStatus;
    const searchableTags = item.tags.flatMap((tag) => [tag, assetTagSearchAliases[tag] ?? '']);
    const searchableText = [item.title, item.description, item.source, ...searchableTags].join(' ').toLocaleLowerCase();
    return matchesStatus && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
}

export function splitFaqs(value?: string): BrandFaq[] {
  return splitLines(value).map((line) => {
    const [question = '', ...answerParts] = line.split('|');
    return {
      question: question.trim(),
      answer: answerParts.join('|').trim()
    };
  });
}

function parseAudienceProfile(value: string): AudienceProfileFormItem {
  const [name = '', ...details] = value.split('｜');
  const profile: AudienceProfileFormItem = { name: name.trim() };

  for (const detail of details) {
    for (const [key, label] of Object.entries(audienceProfileLabels) as Array<[keyof typeof audienceProfileLabels, string]>) {
      if (detail.startsWith(label)) {
        profile[key] = detail.slice(label.length).trim();
        break;
      }
    }
  }

  return profile;
}

function buildManualFactGroup(group: FactKnowledgeGroupKey, values: string[], label: string, updatedAt: string): LibraryAssetListItem[] {
  return values.map((value, index) => ({
    id: `${group}-${index}`,
    group,
    title: value,
    description: `${label}，由品牌资料手动维护`,
    source: '手动维护',
    reviewStatus: 'approved',
    updatedAt,
    tags: [label]
  }));
}

const knowledgeSourceReviewStatusMap: Record<KnowledgeSource['status'], BrandMediaAssetReviewStatus> = {
  pending: 'pending',
  processing: 'needs_review',
  completed: 'approved',
  failed: 'rejected'
};

const assetTagSearchAliases: Record<string, string> = {
  image: '图片素材',
  document: '文档素材',
  webpage: '网页素材',
  content_asset: '内容资产',
  doubao: '豆包',
  kimi: 'Kimi',
  deepseek: 'DeepSeek',
  qianwen: '通义千问',
  stepfun: '阶跃星辰',
  wechat_official: '公众号',
  xiaohongshu: '小红书',
  zhihu: '知乎',
  baijiahao: '百家号',
  official_site: '官网',
  official_site_faq: '官网 FAQ',
  douyin: '短视频平台'
};

function splitLines(value?: string): string[] {
  return (value ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
}
