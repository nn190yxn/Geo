import { Button, Card, Col, Progress, Row, Space, Tag, Typography } from 'antd';
import { AccessibleDropdown } from '../../../components/AccessibleDropdown';
import { useQuery } from '@tanstack/react-query';
import type { BeginnerHomeDashboard, BrandDetail } from '@geo-platform/shared-types';
import { apiGet } from '../../../api/http';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';

type BrandPortfolioPanelProps = {
  brands: BrandDetail[];
  activeBrandId: string;
  loading: boolean;
  onCreate: () => void;
  onEdit: (brand: BrandDetail) => void;
  onStatusChange: (brand: BrandDetail) => void;
  onSelect: (brand: BrandDetail) => void;
  onOpenActive: () => void;
};

export function BrandPortfolioPanel({
  brands,
  activeBrandId,
  loading,
  onCreate,
  onEdit,
  onStatusChange,
  onSelect,
  onOpenActive
}: BrandPortfolioPanelProps) {
  return (
    <Card
      title="品牌管理"
      extra={brands.length > 0 ? <Button type="primary" onClick={onCreate}>新建品牌</Button> : undefined}
      loading={loading}
    >
      {brands.length === 0 ? (
        <EmptyState
          title="还没有品牌工作区"
          description="品牌名称、资料完整度和首轮 AI 回复监测进度"
          reason="创建品牌后即可维护资料、设置优化单元并建立 AI 可见性基线。"
          nextStep="创建第一个品牌并填写基础信息。"
          actionLabel="新建品牌"
          onAction={onCreate}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {brands.map((brand) => (
            <Col key={brand.brandId} xs={24} md={12} xl={8}>
              <BrandAssetCard
                brand={brand}
                active={brand.brandId === activeBrandId}
                onEdit={() => onEdit(brand)}
                onStatusChange={() => onStatusChange(brand)}
                onPrimaryAction={() => brand.brandId === activeBrandId ? onOpenActive() : onSelect(brand)}
              />
            </Col>
          ))}
        </Row>
      )}
    </Card>
  );
}

function BrandAssetCard({
  brand,
  active,
  onEdit,
  onStatusChange,
  onPrimaryAction
}: {
  brand: BrandDetail;
  active: boolean;
  onEdit: () => void;
  onStatusChange: () => void;
  onPrimaryAction: () => void;
}) {
  const dashboardQuery = useQuery({
    queryKey: ['beginner-home-dashboard', brand.brandId],
    queryFn: () => apiGet<BeginnerHomeDashboard>(`/brands/${brand.brandId}/dashboards/home`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const monitoringState = getBrandFirstMonitoringState(dashboard);
  const statusState = getBrandStatusState(brand.status);

  return (
    <Card
      className="brand-asset-card"
      title={brand.name}
      extra={(
        <AccessibleDropdown
          label={`品牌“${brand.name}”的更多操作`}
          trigger={['click']}
          menu={{
            items: getBrandMoreActionItems(brand.status),
            onClick: ({ key }) => key === 'edit' ? onEdit() : onStatusChange()
          }}
        >
          <Button size="small">更多</Button>
        </AccessibleDropdown>
      )}
    >
      <Space direction="vertical" size={16} className="page-stack">
        <PageErrorAlert response={dashboardQuery.data} />
        <Space wrap>
          <Tag color={statusState.color}>{statusState.label}</Tag>
          {active ? <Tag color="blue">当前品牌</Tag> : null}
        </Space>
        <div>
          <Space className="page-heading" align="center">
            <Typography.Text type="secondary">资料完整度</Typography.Text>
            <Typography.Text strong>{dashboard?.profileCompleteness.completenessScore ?? 0}%</Typography.Text>
          </Space>
          <Progress
            percent={dashboard?.profileCompleteness.completenessScore ?? 0}
            size="small"
            status={dashboardQuery.isError ? 'exception' : 'normal'}
          />
        </div>
        <Space className="page-heading" align="center">
          <Typography.Text type="secondary">首轮监测</Typography.Text>
          <Tag color={monitoringState.color}>{dashboardQuery.isLoading ? '读取中' : monitoringState.label}</Tag>
        </Space>
        <Button type={active ? 'default' : 'primary'} block onClick={onPrimaryAction}>
          {active ? '查看品牌资料' : '切换到此品牌'}
        </Button>
      </Space>
    </Card>
  );
}

export function getBrandStatusState(status: BrandDetail['status']): { label: string; color: string } {
  if (status === 'active') return { label: '启用', color: 'green' };
  if (status === 'archived') return { label: '已归档', color: 'default' };
  return { label: '停用', color: 'default' };
}

export function getBrandMoreActionItems(status: BrandDetail['status']): Array<{ key: 'edit' | 'status'; label: string }> {
  return [
    { key: 'edit', label: '编辑品牌' },
    { key: 'status', label: status === 'active' ? '停用品牌' : '启用品牌' }
  ];
}

export function getBrandFirstMonitoringState(dashboard: BeginnerHomeDashboard | null): { label: string; color: string } {
  if ((dashboard?.realResponseStatus.collected ?? 0) > 0) return { label: '已完成', color: 'green' };
  if ((dashboard?.realResponseStatus.total ?? 0) > 0) return { label: '进行中', color: 'blue' };
  return { label: '待开始', color: 'default' };
}
