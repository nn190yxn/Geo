import { useEffect } from 'react';
import { Card, Space, Typography } from 'antd';
import { useLocation } from 'react-router-dom';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { AutomationOperatorCard } from '../../automation/components/AutomationOperatorCard';
import { GeoMetricDashboardCard } from '../components/GeoMetricDashboardCard';
import { ManualTestEntryCard } from '../components/ManualTestEntryCard';
import { MonitoringRunsCard } from '../components/MonitoringRunsCard';
import { PlatformConfigCard } from '../components/PlatformConfigCard';
import { TestQuestionCandidateCard } from '../components/TestQuestionCandidateCard';

export function MonitoringPage() {
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const location = useLocation();
  const scrollToMonitoringRuns = () => {
    document.getElementById('monitoring-runs-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (location.hash === '#manual-test-entry') {
      requestAnimationFrame(() => {
        document.getElementById('manual-test-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <Card title="AI 回复监测">
        <Typography.Paragraph>
          用真实问题获取或录入 AI 平台原始回答，再解读品牌有没有出现、排第几、说得准不准和缺少哪些内容依据。
        </Typography.Paragraph>
      </Card>
      <AutomationOperatorCard brandId={activeBrandId} source="monitoring" title="AI 回复监测与运营" compact />
      <GeoMetricDashboardCard brandId={activeBrandId} onStartTest={scrollToMonitoringRuns} />
      <TestQuestionCandidateCard brandId={activeBrandId} />
      <ManualTestEntryCard brandId={activeBrandId} />
      <MonitoringRunsCard brandId={activeBrandId} />
      <PlatformConfigCard />
    </Space>
  );
}
