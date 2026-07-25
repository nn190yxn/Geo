import type {
  AIResponse,
  AnalysisResult,
  AnalysisSentiment,
  BrandDetail,
  BrandId,
  BrandProfile,
  CompetitorMention,
  MonitoringRun
} from '@geo-platform/shared-types';

export type AnalysisResultFields = Omit<AnalysisResult, 'id' | 'updatedAt'>;

export function buildAnalysisResultFields(
  brand: BrandDetail,
  profile: BrandProfile,
  run: Pick<MonitoringRun, 'id' | 'brandId'>,
  response: Pick<AIResponse, 'id' | 'rawText' | 'citations'>
): AnalysisResultFields {
  const text = response.rawText;
  const identities = uniqueStrings([brand.name, ...brand.aliases]);
  const competitors = uniqueStrings(profile.competitors.filter((competitor) => !matchesAny(competitor, identities)));
  const brandMentioned = identities.some((identity) => includesSignal(text, identity));
  const competitorMentions = buildCompetitorMentions(text, competitors, identities);
  const brandRank = brandMentioned ? calculateMentionRank(text, identities, competitors) : null;
  const sentiment = detectSentiment(text, identities);
  const { score: accuracyScore, matched, missing } = calculateAccuracy(text, profile);
  const citationScore = Math.min(100, response.citations.length * 25);
  const deviation = buildExpressionDeviation(text, profile.blockedExpressions);
  const reviewRequired = !brandMentioned || brandRank === null || sentiment === 'negative' || sentiment === 'unknown' || accuracyScore < 60 || deviation !== '暂未识别到表达偏差';

  return {
    responseId: response.id,
    runId: run.id,
    brandId: run.brandId as BrandId,
    brandMentioned,
    brandRank,
    sentiment,
    accuracyScore,
    citationScore,
    platformEvaluation: buildPlatformEvaluation(brandMentioned, brandRank, sentiment, citationScore, accuracyScore, deviation),
    recommendationReason: buildRecommendationReason(text, identities),
    rankingReason: buildRankingReason(brandRank, competitorMentions, missing),
    expressionCompleteness: buildExpressionCompleteness(accuracyScore, matched, missing),
    expressionDeviation: deviation,
    competitorMentions,
    reviewRequired
  };
}

function buildCompetitorMentions(text: string, competitors: string[], brandIdentities: string[]): CompetitorMention[] {
  return competitors
    .filter((competitor) => includesSignal(text, competitor))
    .map((name) => ({
      name,
      rank: calculateMentionRank(text, [name], [...brandIdentities, ...competitors.filter((competitor) => competitor !== name)]),
      sentiment: detectSentiment(text, [name])
    }));
}

function calculateMentionRank(text: string, identities: string[], competitors: string[]): number | null {
  const mentions = [...identities, ...competitors]
    .map((name) => ({ name, index: findSignalIndex(text, name) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);
  const rank = mentions.findIndex((item) => matchesAny(item.name, identities));

  return rank >= 0 ? rank + 1 : null;
}

function detectSentiment(text: string, identities: string[]): AnalysisSentiment {
  const targetSentence = pickSentence(text, identities) || text;
  const negativeKeywords = ['不推荐', '不足', '较弱', '缺少', '负面', '风险', '不可信', '不准确', '不适合'];
  const positiveKeywords = ['推荐', '适合', '优势', '领先', '完整', '可信', '优秀', '突出', '权威', '首选'];

  if (negativeKeywords.some((keyword) => includesSignal(targetSentence, keyword))) return 'negative';
  if (positiveKeywords.some((keyword) => includesSignal(targetSentence, keyword))) return 'positive';
  return targetSentence.trim() ? 'neutral' : 'unknown';
}

function calculateAccuracy(text: string, profile: BrandProfile): { score: number; matched: string[]; missing: string[] } {
  const signals = uniqueStrings([
    ...profile.valueProps,
    ...profile.offerings,
    ...profile.proofPoints,
    ...profile.recommendedExpressions,
    ...profile.targetCustomers
  ]);
  if (signals.length === 0) {
    return { score: text.trim() ? 60 : 0, matched: [], missing: [] };
  }

  const matched = signals.filter((signal) => includesSignal(text, signal));
  const missing = signals.filter((signal) => !matched.includes(signal));

  return {
    score: Math.min(100, 50 + Math.round((matched.length / signals.length) * 50)),
    matched,
    missing
  };
}

function buildPlatformEvaluation(
  brandMentioned: boolean,
  brandRank: number | null,
  sentiment: AnalysisSentiment,
  citationScore: number,
  accuracyScore: number,
  expressionDeviation: string
): string {
  if (!brandMentioned) return '有没有出现：未提及品牌。整体判断：需要你确认，系统需要补充品牌基础资料。';
  if (brandRank === null) return '有没有出现：已提及品牌。整体判断：需要你确认，系统暂时无法判断推荐顺序。';
  if (sentiment === 'unknown') return '有没有出现：已提及品牌。整体判断：需要你确认，系统暂时无法判断回答情绪。';
  if (sentiment === 'negative') return '有没有出现：已提及品牌。整体判断：需要你确认，回答里出现负向表达。';
  if (expressionDeviation !== '暂未识别到表达偏差') return '有没有出现：已提及品牌。整体判断：需要你确认，回答里出现高风险或禁用表达。';
  if (accuracyScore < 60) return '有没有出现：已提及品牌。整体判断：回答说到品牌，但核心卖点和背书覆盖不足。';
  if (citationScore === 0) return '有没有出现：已提及品牌。整体判断：回答缺少引用来源，可信度需要继续补强。';
  return '有没有出现：已提及品牌。整体判断：回答包含可追溯引用来源，适合进入下一步优化。';
}

function buildExpressionCompleteness(accuracyScore: number, matched: string[], missing: string[]): string {
  const matchedText = matched.length ? `已说到：${matched.join('、')}` : '已说到：暂无核心卖点命中';
  const missingText = missing.length ? `需要补什么内容：${missing.join('、')}` : '需要补什么内容：当前核心卖点覆盖完整';
  return `说得准不准：准确分 ${accuracyScore}。${matchedText}。${missingText}。`;
}

function buildRecommendationReason(text: string, identities: string[]): string {
  const reason = pickSentence(text, identities);
  return reason ? `推荐理由：${reason}` : '推荐理由：暂未识别到明确推荐理由。';
}

function buildRankingReason(brandRank: number | null, competitorMentions: CompetitorMention[], missing: string[]): string {
  if (!brandRank) {
    return '排第几：暂未识别到品牌推荐顺序。需要用户确认品牌是否被推荐。';
  }

  const competitorText = competitorMentions.length
    ? `竞品表现：回答中同时提到了 ${competitorMentions.map((item) => `${item.name}${item.rank ? `第 ${item.rank}` : '未识别排名'}`).join('、')}。`
    : '竞品表现：暂未识别到竞品被提及。';

  if (brandRank === 1) {
    return `排第几：品牌排第 1，当前推荐顺序表现较好。${competitorText}`;
  }

  const leadingCompetitors = competitorMentions.filter((item) => item.rank !== null && item.rank < brandRank).map((item) => item.name);
  const suppressionReason = leadingCompetitors.length
    ? `被压制原因候选项：${leadingCompetitors.join('、')}在回答中出现得更早。`
    : '被压制原因候选项：回答中有其他主体排序靠前，需要人工确认具体原因。';
  const suggestionSignals = missing.slice(0, 3);
  const suggestion = suggestionSignals.length
    ? `内容补强建议：优先补充 ${suggestionSignals.join('、')}。`
    : '内容补强建议：补充更明确的本地化证据、课程体系和权威背书。';

  return `排第几：品牌排第 ${brandRank}。${competitorText}${suppressionReason}${suggestion}`;
}

function buildExpressionDeviation(text: string, blockedExpressions: string[]): string {
  const blockedHits = blockedExpressions.filter((expression) => includesSignal(text, expression));
  const highRiskHits = highRiskExpressionSuggestions.filter((item) => includesSignal(text, item.expression));
  const hits = uniqueStrings([...blockedHits, ...highRiskHits.map((item) => item.expression)]);

  if (hits.length === 0) {
    return '暂未识别到表达偏差';
  }

  const suggestions = highRiskHits.map((item) => `${item.expression}建议改为“${item.suggestion}”`);
  const suggestionText = suggestions.length ? `。建议改法：${suggestions.join('；')}` : '';
  return `需要你确认：命中高风险或禁用表达：${hits.join('、')}${suggestionText}`;
}

const highRiskExpressionSuggestions = [
  { expression: '保证长高', suggestion: '在科学运动和规律训练基础上，帮助孩子改善体态、促进身体发育' },
  { expression: '治疗感统失调', suggestion: '通过运动训练促进感统发展，具体情况建议结合专业评估' },
  { expression: '包过中考体育', suggestion: '围绕中考体育项目进行系统训练，帮助孩子提升达标能力' },
  { expression: '替代医疗诊断', suggestion: '训练建议需结合孩子实际情况，专业诊断请咨询医疗机构' },
  { expression: '绝对有效', suggestion: '训练效果会因孩子基础、频次和配合度不同而变化' },
  { expression: '快速逆袭', suggestion: '通过阶段训练逐步提升体能、技能和运动习惯' }
];

export function pickSentence(text: string, identities: string[]): string {
  return text
    .split(/[。！？\n]/)
    .map((sentence) => sentence.trim())
    .find((sentence) => identities.some((identity) => includesSignal(sentence, identity))) ?? '';
}

function includesSignal(text: string, signal: string): boolean {
  if (!signal.trim()) return false;
  return normalizeForMatch(text).includes(normalizeForMatch(signal));
}

function findSignalIndex(text: string, signal: string): number {
  const exactIndex = text.indexOf(signal);
  if (exactIndex >= 0) return exactIndex;
  return normalizeForMatch(text).indexOf(normalizeForMatch(signal));
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[\s\-_/｜|,，.。:：;；()（）【】\[\]{}]/g, '');
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function matchesAny(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => normalizeForMatch(value) === normalizeForMatch(candidate));
}
