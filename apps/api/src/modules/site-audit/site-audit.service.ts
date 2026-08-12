import { Inject, Injectable } from '@nestjs/common';
import type {
  SiteAuditAcceptanceRecord,
  SiteAuditAcceptanceResult,
  SiteAuditAssessment,
  SiteAuditCheck,
  SiteAuditCheckerRule,
  SiteAuditFinding,
  SiteAuditImpactLevel
} from '@geo-platform/shared-types';
import { randomUUID } from 'node:crypto';
import { SITE_AUDIT_ADAPTER, type SiteAuditAdapter } from './site-audit.adapter';

type FindingPolicy = {
  impactLevel: SiteAuditImpactLevel;
  impactDescription: string;
  remediation: string;
  title: string;
  checkerType: SiteAuditCheckerRule['checkerType'];
};

const findingPolicies: Record<SiteAuditCheck['key'], FindingPolicy> = {
  robots_txt: {
    impactLevel: 'medium',
    impactDescription: '爬虫缺少统一访问说明，搜索与 AI 抓取行为难以核验。',
    remediation: '在站点根路径提供 robots.txt，并明确允许的公开内容范围。',
    title: '补充 robots.txt 访问规则',
    checkerType: 'text'
  },
  sitemap_xml: {
    impactLevel: 'medium',
    impactDescription: '站点页面发现效率和更新识别能力可能降低。',
    remediation: '生成有效 sitemap.xml，并覆盖需要公开发现的规范页面。',
    title: '补充 sitemap.xml 页面清单',
    checkerType: 'link'
  },
  llms_txt: {
    impactLevel: 'low',
    impactDescription: 'AI 系统缺少面向模型读取的站点内容导航。',
    remediation: '在站点根路径发布 llms.txt，列出品牌事实和主要公开页面。',
    title: '生成并部署 llms.txt',
    checkerType: 'text'
  },
  noindex: {
    impactLevel: 'high',
    impactDescription: '首页禁止索引会阻断公开内容进入搜索和 AI 发现链路。',
    remediation: '移除首页响应头或 meta robots 中的 noindex，并重新部署。',
    title: '解除首页 noindex 限制',
    checkerType: 'response_header'
  },
  ai_bot_access: {
    impactLevel: 'high',
    impactDescription: 'AI Bot 全站禁止规则会限制公开内容被模型系统获取。',
    remediation: '复核 robots.txt 中的 AI Bot 规则，为允许公开的页面开放访问。',
    title: '调整 AI Bot 访问规则',
    checkerType: 'text'
  },
  structured_data: {
    impactLevel: 'medium',
    impactDescription: '机器缺少结构化品牌实体和页面语义。',
    remediation: '部署语法有效且内容与页面一致的 JSON-LD。',
    title: '补充首页 JSON-LD',
    checkerType: 'structure'
  },
  extractable_content: {
    impactLevel: 'high',
    impactDescription: '正文结构较弱会降低品牌事实和产品信息的稳定抽取率。',
    remediation: '使用标题、正文段落、main 或 article 组织可见核心内容。',
    title: '增强首页可抽取内容结构',
    checkerType: 'structure'
  }
};

@Injectable()
export class SiteAuditService {
  constructor(@Inject(SITE_AUDIT_ADAPTER) private readonly adapter: SiteAuditAdapter) {}

  async audit(websiteUrl: string): Promise<SiteAuditAssessment> {
    const result = await this.adapter.audit(websiteUrl);
    const findings = result.checks.map((check) => mapFinding(check, result.websiteUrl));
    return {
      ...result,
      findings,
      recommendedTasks: findings.filter(({ check }) => check.status !== 'pass').map(({ taskTemplate }) => taskTemplate)
    };
  }
}

@Injectable()
export class AcceptanceRuleService {
  constructor(@Inject(SITE_AUDIT_ADAPTER) private readonly adapter: SiteAuditAdapter) {}

  async execute(
    websiteUrl: string,
    rule: SiteAuditCheckerRule,
    history: SiteAuditAcceptanceRecord[] = []
  ): Promise<SiteAuditAcceptanceResult> {
    const result = await this.adapter.audit(websiteUrl);
    const check = result.checks.find(({ key }) => key === rule.checkKey);
    const targetMatches = check ? sameTarget(check.evidence.targetUrl, rule.targetUrl) : false;
    const status = !targetMatches || check?.status === 'unavailable' || !check
      ? 'unavailable'
      : check.status === 'pass' ? 'passed' : 'failed';
    const checkedAt = check?.evidence.checkedAt ?? result.auditedAt;
    const evidence = !check ? {
      targetUrl: rule.targetUrl,
      checkedAt,
      errorCode: 'SITE_AUDIT_CHECK_MISSING'
    } : !targetMatches ? {
      targetUrl: rule.targetUrl,
      checkedAt,
      errorCode: 'SITE_AUDIT_TARGET_MISMATCH'
    } : check.evidence;
    const record: SiteAuditAcceptanceRecord = {
      id: `site_acceptance_${randomUUID()}`,
      ruleId: rule.id,
      status,
      checkedAt,
      evidence
    };
    return { rule, status, checkedAt, evidence, history: [...history, record] };
  }
}

function mapFinding(check: SiteAuditCheck, websiteUrl: string): SiteAuditFinding {
  const policy = findingPolicies[check.key];
  const targetUrl = check.evidence.targetUrl || checkerTargetUrl(websiteUrl, check.key);
  return {
    check,
    impactLevel: check.status === 'unavailable' ? 'high' : policy.impactLevel,
    impactDescription: policy.impactDescription,
    remediation: policy.remediation,
    taskTemplate: {
      title: policy.title,
      type: 'manual',
      priority: toTaskPriority(check.status === 'unavailable' ? 'high' : policy.impactLevel)
    },
    acceptanceRule: {
      id: `site_checker_${check.key}`,
      checkKey: check.key,
      checkerType: policy.checkerType,
      targetUrl,
      expectedStatus: 'pass',
      description: `重新访问真实目标并确认${policy.title}对应检查已通过。`
    }
  };
}

function checkerTargetUrl(websiteUrl: string, key: SiteAuditCheck['key']): string {
  const paths: Partial<Record<SiteAuditCheck['key'], string>> = {
    robots_txt: '/robots.txt',
    sitemap_xml: '/sitemap.xml',
    llms_txt: '/llms.txt'
  };
  return new URL(paths[key] ?? new URL(websiteUrl).pathname, new URL(websiteUrl).origin).toString();
}

function sameTarget(actual: string, expected: string): boolean {
  try {
    const actualUrl = new URL(actual);
    const expectedUrl = new URL(expected);
    actualUrl.hash = '';
    expectedUrl.hash = '';
    return actualUrl.toString() === expectedUrl.toString();
  } catch {
    return false;
  }
}

function toTaskPriority(impact: SiteAuditImpactLevel): 'low' | 'medium' | 'high' {
  if (impact === 'critical' || impact === 'high') return 'high';
  return impact;
}
