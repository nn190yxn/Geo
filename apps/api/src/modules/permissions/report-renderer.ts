import type {
  MultiBrandReportSnapshot,
  ReportDataGap,
  ReportInput,
  ReportType,
  SingleBrandReportSnapshot
} from '@geo-platform/shared-types';

const reportTypes: ReportType[] = ['weekly', 'monthly', 'multi_brand', 'customer_delivery'];

export function normalizeReportInput(input: ReportInput): ReportInput {
  return {
    type: reportTypes.includes(input.type) ? input.type : 'weekly',
    title: input.title?.trim(),
    periodStart: input.periodStart?.trim(),
    periodEnd: input.periodEnd?.trim()
  };
}

export function buildReportTitle(brandName: string, type: ReportType, periodEnd: string): string {
  const labels: Record<ReportType, string> = {
    weekly: '单品牌周报',
    monthly: '单品牌月报',
    multi_brand: '多品牌对比报告',
    customer_delivery: '客户交付报告'
  };
  return `${brandName} ${labels[type]} ${periodEnd}`;
}

export function buildSingleBrandDataGaps(snapshot: SingleBrandReportSnapshot): ReportDataGap[] {
  const gaps: ReportDataGap[] = [...snapshot.scope.dataGaps];
  if (snapshot.metrics.current.insufficientSample || snapshot.metrics.current.sampleCount === 0) gaps.push({ section: 'GEO 指数', reason: '报告周期内监测样本不足' });
  if (snapshot.competitor.mentionRate === 0) gaps.push({ section: '竞品表现', reason: '报告周期内暂未识别到竞品提及样本' });
  if (snapshot.citation.totalCitations === 0) gaps.push({ section: '引用来源', reason: '报告周期内暂未收集到引用来源' });
  if (snapshot.content.uncoveredKeywords.length > 0) gaps.push({ section: '内容缺口', reason: `仍有 ${snapshot.content.uncoveredKeywords.length} 个关键词未覆盖` });
  return deduplicateDataGaps(gaps);
}

export function buildMultiBrandDataGaps(snapshot: MultiBrandReportSnapshot): ReportDataGap[] {
  const gaps: ReportDataGap[] = snapshot.scopes.flatMap((scope) => scope.dataGaps);
  if (snapshot.ranking.length === 0) gaps.push({ section: '品牌排名', reason: '当前用户暂无可访问品牌数据' });
  if (snapshot.ranking.some((brand) => brand.insufficientSample)) gaps.push({ section: '多品牌对比', reason: '部分品牌监测样本不足' });
  if (snapshot.highPriorityIssues.length === 0) gaps.push({ section: '高优先级问题', reason: '当前周期暂无高优先级待处理任务' });
  return deduplicateDataGaps(gaps);
}

export function renderSingleBrandReport(
  title: string,
  periodStart: string,
  periodEnd: string,
  snapshot: SingleBrandReportSnapshot,
  dataGaps: ReportDataGap[],
  customerDelivery: boolean
): string {
  return [
    `# ${title}`,
    '',
    '```yaml',
    `reportType: ${customerDelivery ? 'customer_delivery' : 'single_brand'}`,
    `brandId: ${snapshot.brand.brandId}`,
    `brandName: ${snapshot.brand.name}`,
    `periodStart: ${periodStart}`,
    `periodEnd: ${periodEnd}`,
    `dataGapCount: ${dataGaps.length}`,
    `methodologyVersion: ${snapshot.methodologyVersion}`,
    '```',
    '',
    `统计周期：${periodStart} 至 ${periodEnd}`,
    `报告对象：${snapshot.brand.name}`,
    customerDelivery ? '报告版本：客户交付版' : '报告版本：运营内部版',
    '',
    '## 统计范围与有效样本',
    `- 监测运行：${snapshot.scope.monitoringRunCount}`,
    `- 有效样本：${snapshot.scope.validSampleCount}`,
    `- 内容资产：${snapshot.scope.contentAssetCount}`,
    `- 发布记录：${snapshot.scope.publishingRecordCount}`,
    `- 任务变化：${snapshot.scope.taskChangeCount}`,
    `- 已完成再次监测：${snapshot.scope.completedRetestCount}`,
    `- 样本时间：${snapshot.scope.sampleSummary.firstSampleAt ?? '待补充'} 至 ${snapshot.scope.sampleSummary.lastSampleAt ?? '待补充'}`,
    '',
    '## GEO 总指数',
    `- 总分：${snapshot.metrics.current.totalScore}/100`,
    `- 提及分：${snapshot.metrics.current.mentionScore}`,
    `- 推荐排序分：${snapshot.metrics.current.rankingScore}`,
    `- 情绪表达分：${snapshot.metrics.current.sentimentScore}`,
    `- 样本数：${snapshot.metrics.current.sampleCount}`,
    '',
    '## 指标解释',
    '- GEO 总指数综合衡量品牌被 AI 提及、推荐排序、引用可信度、竞品压制和知识完整度。',
    '- 样本数用于判断本周期结论稳定性，样本不足时报告结论用于运营诊断。',
    '- 引用和情绪指标用于判断品牌事实被采纳后的表达质量。',
    '',
    '## 平台与优化单元表现',
    ...withFallback(snapshot.metrics.breakdown.platform.map((item) => `- ${item.platformCode ?? 'unknown'}：${item.totalScore}/100，样本 ${item.sampleCount}`), '- 暂无平台维度样本'),
    ...withFallback(snapshot.metrics.breakdown.optimizationUnit.map((item) => `- 优化单元 ${item.optimizationUnitId ?? 'unknown'}：${item.totalScore}/100`), '- 暂无优化单元样本'),
    '',
    '## 竞品与引用',
    `- 竞品提及率：${snapshot.competitor.mentionRate}%`,
    `- 竞品压制率：${snapshot.competitor.suppressionRate}%`,
    `- 官网引用率：${snapshot.citation.officialCitationRate}%`,
    `- 权威来源占比：${snapshot.citation.authoritySourceRate}%`,
    '',
    '## 评价分析与内容缺口',
    `- 正向表达率：${snapshot.evaluation.positiveRate}%`,
    `- 准确表达率：${snapshot.evaluation.accurateRate}%`,
    `- 内容关键词覆盖率：${snapshot.content.keywordCoverageRate}%`,
    `- 未覆盖关键词：${snapshot.content.uncoveredKeywords.join('、') || '无'}`,
    '',
    '## 问题归因',
    ...buildSingleBrandCauseLines(snapshot, dataGaps),
    '',
    '## 行动建议',
    ...buildSingleBrandActionLines(snapshot, customerDelivery),
    '',
    '## 任务进度',
    ...Object.entries(snapshot.taskProgress).map(([status, count]) => `- ${status}：${count}`),
    '',
    '## 效果证据',
    ...renderEffectEvidenceLines(snapshot.effectEvidence),
    '',
    '## 数据缺口',
    ...(dataGaps.length ? dataGaps.map((gap) => `- ${gap.section}：${gap.reason}`) : ['- 暂无关键数据缺口'])
  ].join('\n');
}

export function renderMultiBrandReport(
  title: string,
  periodStart: string,
  periodEnd: string,
  snapshot: MultiBrandReportSnapshot,
  dataGaps: ReportDataGap[]
): string {
  return [
    `# ${title}`,
    '',
    '```yaml',
    'reportType: multi_brand',
    `brandCount: ${snapshot.ranking.length}`,
    `periodStart: ${periodStart}`,
    `periodEnd: ${periodEnd}`,
    `dataGapCount: ${dataGaps.length}`,
    `methodologyVersion: ${snapshot.methodologyVersion}`,
    '```',
    '',
    `统计周期：${periodStart} 至 ${periodEnd}`,
    '',
    '## 统计范围与有效样本',
    ...withFallback(snapshot.scopes.map((scope) => `- ${scope.brandId}：监测 ${scope.monitoringRunCount}，有效样本 ${scope.validSampleCount}，内容 ${scope.contentAssetCount}，发布 ${scope.publishingRecordCount}，任务变化 ${scope.taskChangeCount}，已完成再次监测 ${scope.completedRetestCount}`), '- 暂无品牌统计范围'),
    '',
    '## 品牌排名',
    ...withFallback(snapshot.ranking.map((brand, index) => `${index + 1}. ${brand.name}：${brand.totalScore}/100，环比 ${brand.periodChange}`), '- 暂无品牌排名数据'),
    '',
    '## 品牌对比',
    ...buildMultiBrandComparisonLines(snapshot),
    '',
    '## 强势平台',
    ...(snapshot.strongestPlatforms.length ? snapshot.strongestPlatforms.map((item) => `- ${item.brandId} · ${item.platformCode}：${item.totalScore}/100`) : ['- 暂无平台样本']),
    '',
    '## 薄弱场景',
    ...(snapshot.weakScenarios.length ? snapshot.weakScenarios.map((item) => `- ${item.name}：${item.reason}`) : ['- 暂无明显薄弱场景']),
    '',
    '## 风险提示',
    ...buildMultiBrandRiskLines(snapshot, dataGaps),
    '',
    '## 交付进度',
    `- 高优先级待处理问题：${snapshot.highPriorityIssues.length} 项`,
    `- 样本不足品牌：${snapshot.ranking.filter((brand) => brand.insufficientSample).length} 个`,
    `- 当前可交付品牌：${snapshot.ranking.filter((brand) => !brand.insufficientSample).length} 个`,
    '',
    '## 下一步动作',
    ...buildMultiBrandActionLines(snapshot),
    '',
    '## 高优先级问题',
    ...(snapshot.highPriorityIssues.length ? snapshot.highPriorityIssues.map((item) => `- ${item.brandId}：${item.title}（${item.source}）`) : ['- 暂无高优先级问题']),
    '',
    '## 效果证据',
    ...renderEffectEvidenceLines(snapshot.effectEvidence),
    '',
    '## 数据缺口',
    ...(dataGaps.length ? dataGaps.map((gap) => `- ${gap.section}：${gap.reason}`) : ['- 暂无关键数据缺口'])
  ].join('\n');
}

function buildSingleBrandCauseLines(snapshot: SingleBrandReportSnapshot, dataGaps: ReportDataGap[]): string[] {
  const causes = dataGaps.map((gap) => `- ${gap.section}：${gap.reason}`);
  if (snapshot.competitor.suppressionRate > 0) causes.push(`- 竞品压制率 ${snapshot.competitor.suppressionRate}% 说明部分决策场景被竞品表达占位。`);
  if (snapshot.citation.officialCitationRate < 50) causes.push('- 官网引用率偏低，AI 回答更多依赖第三方来源。');
  if (snapshot.evaluation.accurateRate < 80) causes.push('- 准确表达率低于目标线，需要补充可验证事实和标准表述。');
  return causes.length ? causes : ['- 当前周期未识别到主要归因风险。'];
}

function buildSingleBrandActionLines(snapshot: SingleBrandReportSnapshot, customerDelivery: boolean): string[] {
  const lines = [
    '- 优先补齐未覆盖关键词对应的 FAQ、案例和权威来源材料。',
    '- 将低分平台与低分优化单元纳入下一轮监测和复测。'
  ];
  if (snapshot.competitor.highRiskIntents.length > 0) lines.push(`- 针对 ${snapshot.competitor.highRiskIntents.join('、')} 建立竞品对比话术。`);
  if (customerDelivery) lines.push('- 客户交付时同步数据缺口和下一周期补样计划，确保结论边界清晰。');
  return lines;
}

function buildMultiBrandComparisonLines(snapshot: MultiBrandReportSnapshot): string[] {
  const top = snapshot.ranking[0];
  const bottom = snapshot.ranking[snapshot.ranking.length - 1];
  if (!top || !bottom) return ['- 暂无可对比品牌数据'];
  return [
    `- 领先品牌：${top.name}，GEO 总分 ${top.totalScore}/100。`,
    `- 待提升品牌：${bottom.name}，GEO 总分 ${bottom.totalScore}/100。`,
    `- 分差：${Math.max(0, top.totalScore - bottom.totalScore)} 分。`
  ];
}

function buildMultiBrandRiskLines(snapshot: MultiBrandReportSnapshot, dataGaps: ReportDataGap[]): string[] {
  const risks = dataGaps.map((gap) => `- ${gap.section}：${gap.reason}`);
  if (snapshot.weakScenarios.length > 0) risks.push(`- 薄弱场景覆盖 ${snapshot.weakScenarios.length} 个品牌，需要优先补齐高意图内容。`);
  if (snapshot.highPriorityIssues.length > 0) risks.push(`- 仍有 ${snapshot.highPriorityIssues.length} 项高优先级问题影响交付确定性。`);
  return risks.length ? risks : ['- 当前周期未识别到跨品牌交付风险。'];
}

function buildMultiBrandActionLines(snapshot: MultiBrandReportSnapshot): string[] {
  const actions = ['- 复用领先品牌的强势平台策略，形成跨品牌内容补位清单。'];
  if (snapshot.weakScenarios.length > 0) actions.push('- 对薄弱场景追加监测样本，并安排内容资产补齐。');
  if (snapshot.highPriorityIssues.length > 0) actions.push('- 按高优先级问题清单推进责任人、截止日期和再次监测计划。');
  return actions;
}

function withFallback(lines: string[], fallback: string): string[] {
  return lines.length ? lines : [fallback];
}

function renderEffectEvidenceLines(evidence: SingleBrandReportSnapshot['effectEvidence']): string[] {
  return withFallback(evidence.flatMap((item) => [
    `- ${item.taskTitle}：${item.evidenceStatus === 'complete' ? '证据完整' : '证据待补充'}`,
    `  - 基线提及率 ${item.baselineMetrics?.mentionRate ?? '待补充'}%，再次监测提及率 ${item.afterMetrics?.mentionRate ?? '待补充'}%`,
    `  - 内容资产 ${item.contentAssetIds.length} 项，发布记录 ${item.publishingRecords.length} 项`,
    ...item.publishingRecords.map((record) => `  - ${record.platform}：${record.publishedUrl ?? '真实链接待补充'}`)
  ]), '- 当前周期暂无已完成的再次监测证据');
}

function deduplicateDataGaps(gaps: ReportDataGap[]): ReportDataGap[] {
  return gaps.filter((gap, index) => gaps.findIndex((candidate) => candidate.section === gap.section && candidate.reason === gap.reason) === index);
}
