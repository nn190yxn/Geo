import { Alert, Button, Card, Col, Row, Space, Tag, Typography } from 'antd';
import type { MonitoringRunDetail, PlatformConfig, TestPlan } from '@geo-platform/shared-types';

export type MonitoringRecoveryTarget = 'questions' | 'execution' | 'responses' | 'tools';

export type MonitoringRecoveryItem = {
  key: 'sample_missing' | 'browser_confirmation' | 'manual_required' | 'platform_configuration' | 'run_failed';
  title: string;
  description: string;
  impact: string;
  actionLabel: string;
  target: MonitoringRecoveryTarget;
  tone: 'info' | 'warning' | 'error';
};

type RecoveryPlan = Pick<TestPlan, 'status' | 'connectionSummary'>;
type RecoveryRun = Pick<MonitoringRunDetail, 'status' | 'response' | 'retryStatus'>;
type RecoveryPlatform = Pick<PlatformConfig, 'platformCode' | 'enabled' | 'connectionStatus' | 'availableMethods'>;

export function buildMonitoringRecoveryItems({
  plans,
  runs,
  platforms,
  realSampleCount,
  platformScope
}: {
  plans: RecoveryPlan[];
  runs: RecoveryRun[];
  platforms: RecoveryPlatform[];
  realSampleCount: number;
  platformScope: string;
}): MonitoringRecoveryItem[] {
  const items: MonitoringRecoveryItem[] = [];
  const browserConfirmationCount = new Set([
    ...plans.flatMap((plan) => plan.connectionSummary)
      .filter((connection) => connection.status === 'needs_confirmation' && connection.methods.includes('browser'))
      .map((connection) => connection.platformCode),
    ...platforms
      .filter((platform) => platform.enabled && platform.connectionStatus === 'needs_confirmation' && platform.availableMethods.includes('browser'))
      .map((platform) => platform.platformCode)
  ]).size;
  const manualRequiredCount = runs.filter((run) => !run.response && run.status === 'review_required').length
    + plans.flatMap((plan) => plan.connectionSummary).filter((connection) => connection.status === 'manual_available').length;
  const failedCount = runs.filter((run) => !run.response && run.status === 'failed').length
    + plans.filter((plan) => plan.status === 'failed').length;
  const retryPendingCount = runs.filter((run) => !run.response && run.retryStatus === 'retry_pending').length;
  const configurationCount = platforms.filter((platform) => platform.enabled && platform.connectionStatus === 'needs_configuration').length;

  if (realSampleCount === 0) {
    items.push({
      key: 'sample_missing',
      title: '当前分析范围缺少真实回复',
      description: `样本范围：${platformScope}；有效真实回复 0 条。`,
      impact: '品牌提及率、Top 3 推荐率、引用命中率和平台分布暂时无法形成可靠判断。',
      actionLabel: '开始监测',
      target: 'questions',
      tone: 'info'
    });
  }

  if (browserConfirmationCount > 0) {
    items.push({
      key: 'browser_confirmation',
      title: `${browserConfirmationCount} 个平台等待浏览器确认`,
      description: '平台登录、验证码、风控或页面状态需要用户确认后才能继续采集。',
      impact: '对应平台的回复尚未进入真实样本，当前跨平台结论覆盖不完整。',
      actionLabel: '处理浏览器连接',
      target: 'tools',
      tone: 'warning'
    });
  }

  if (manualRequiredCount > 0) {
    items.push({
      key: 'manual_required',
      title: `${manualRequiredCount} 项回复等待手动录入`,
      description: '监测问题已经准备完成，需要从对应 AI 平台复制原始回复并保存。',
      impact: '录入前这些问题不会计入推荐、排名、引用和表达准确性指标。',
      actionLabel: '去手动录入',
      target: 'execution',
      tone: 'warning'
    });
  }

  if (configurationCount > 0) {
    items.push({
      key: 'platform_configuration',
      title: `${configurationCount} 个平台需要完成配置`,
      description: '平台缺少自动监测所需配置，或最近一次连接检查未通过。',
      impact: '当前监测计划只能使用已就绪平台、浏览器辅助或手动录入路径。',
      actionLabel: '配置 AI 平台',
      target: 'tools',
      tone: 'warning'
    });
  }

  if (failedCount > 0) {
    items.push({
      key: 'run_failed',
      title: `${failedCount} 项监测执行未成功`,
      description: retryPendingCount > 0
        ? `其中 ${retryPendingCount} 条正在等待自动重试，其余记录可改用浏览器辅助或手动录入。`
        : '可查看失败原因，并改用浏览器辅助监测或手动录入真实回复。',
      impact: '失败运行不计入真实回复指标，相关平台和问题的分析范围会缩小。',
      actionLabel: '查看失败记录',
      target: 'responses',
      tone: 'error'
    });
  }

  return items;
}

export function MonitoringRecoverySummary({
  items,
  platforms,
  onAction
}: {
  items: MonitoringRecoveryItem[];
  platforms: RecoveryPlatform[];
  onAction: (target: MonitoringRecoveryTarget) => void;
}) {
  const paths = getMonitoringCollectionPaths(platforms);

  return (
    <Card title="监测状态与恢复路径">
      <Space direction="vertical" size={12} className="page-stack">
        {items.length === 0 ? (
          <Alert type="success" showIcon message="当前真实回复状态正常" description="已获取的真实回复可以继续用于平台对比、问题诊断和优化任务。" />
        ) : items.map((item) => (
          <Alert
            key={item.key}
            type={item.tone}
            showIcon
            message={item.title}
            description={<Space direction="vertical" size={2}><span>{item.description}</span><Typography.Text type="secondary">影响：{item.impact}</Typography.Text></Space>}
            action={<Button size="small" onClick={() => onAction(item.target)}>{item.actionLabel}</Button>}
          />
        ))}
        <Row gutter={[12, 12]} aria-label="真实回复采集路径">
          {paths.map((path) => (
            <Col key={path.key} xs={24} md={8}>
              <div className="geo-diagnostic-card">
                <Space direction="vertical" size={4} className="page-stack">
                  <Space wrap><Typography.Text strong>{path.title}</Typography.Text><Tag color={path.available ? 'green' : 'default'}>{path.status}</Tag></Space>
                  <Typography.Text type="secondary">{path.description}</Typography.Text>
                </Space>
              </div>
            </Col>
          ))}
        </Row>
      </Space>
    </Card>
  );
}

export function getMonitoringCollectionPaths(platforms: RecoveryPlatform[]) {
  const enabledPlatforms = platforms.filter((platform) => platform.enabled);
  const automaticAvailable = enabledPlatforms.some((platform) => platform.connectionStatus === 'ready' && platform.availableMethods.includes('api'));
  const browserAvailable = enabledPlatforms.some((platform) => platform.availableMethods.includes('browser'));

  return [
    {
      key: 'automatic',
      title: '自动监测',
      status: automaticAvailable ? '已有可用平台' : '等待平台配置',
      available: automaticAvailable,
      description: '通过已配置 API 自动发送问题并保存真实 AI 回复。'
    },
    {
      key: 'browser',
      title: '浏览器辅助监测',
      status: browserAvailable ? '可用' : '等待平台支持',
      available: browserAvailable,
      description: '在平台登录和确认后采集回答，异常时保留人工恢复入口。'
    },
    {
      key: 'manual',
      title: '手动录入',
      status: '始终可用',
      available: true,
      description: '复制 AI 平台原始回复并粘贴保存，继续进入同一解读和指标链路。'
    }
  ];
}
