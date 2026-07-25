import { useEffect } from 'react';
import { Alert, Layout, Menu, Select, Spin, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { AccessibleBrand } from '@geo-platform/shared-types';
import { apiGet } from '../api/http';
import { useBrandContextStore } from '../stores/brandContextStore';
import { getNavigationItem, getWorkflowIndex, navigationGroups, operationWorkflow } from './navigation';

const items = navigationGroups.map((group) => ({
  key: group.label,
  label: group.label,
  type: 'group' as const,
  children: group.items.map((item) => ({ key: item.key, label: item.label }))
}));

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeBrandId, setActiveBrandId } = useBrandContextStore();
  const brandsQuery = useQuery({
    queryKey: ['accessible-brands'],
    queryFn: () => apiGet<AccessibleBrand[]>('/brands')
  });
  const brands = brandsQuery.data?.success ? brandsQuery.data.data : [];
  const activeBrand = brands.find((brand) => brand.brandId === activeBrandId);
  const currentItem = getNavigationItem(location.pathname);
  const workflowIndex = getWorkflowIndex(location.pathname);
  const brandOptions = brands.map((brand) => ({
    value: brand.brandId,
    label: `${brand.name}（${brand.role}）`
  }));

  useEffect(() => {
    if (brands.length > 0 && !brands.some((brand) => brand.brandId === activeBrandId)) {
      setActiveBrandId(brands[0].brandId);
    }
  }, [activeBrandId, brands, setActiveBrandId]);

  return (
    <Layout className="app-shell">
      <Layout.Sider width={232} className="app-sider">
        <Typography.Title level={4} className="app-title">AI 推荐管理平台</Typography.Title>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={(item) => navigate(item.key)}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="app-header">
          <div className="app-header-context">
            <Typography.Text strong>{currentItem?.label ?? '运营后台'}</Typography.Text>
            <Typography.Text type="secondary">{activeBrand?.name ?? '未选择品牌'}</Typography.Text>
          </div>
          {brandsQuery.isLoading ? (
            <Spin size="small" />
          ) : (
            <Select
              value={activeBrandId}
              onChange={setActiveBrandId}
              options={brandOptions}
              className="brand-select"
              status={brandOptions.length === 0 ? 'error' : undefined}
              placeholder="选择品牌"
            />
          )}
        </Layout.Header>
        <Layout.Content className="app-content">
          {brandsQuery.data && !brandsQuery.data.success ? (
            <Alert type="error" message={brandsQuery.data.error.message} showIcon className="page-alert" />
          ) : null}
          {brandsQuery.data?.success && brands.length === 0 ? (
            <Alert type="warning" message="暂无可访问品牌，请先在多品牌总览中创建品牌。" showIcon className="page-alert" />
          ) : null}
          {currentItem?.requiresBrand && !activeBrandId ? (
            <Alert type="info" message="当前页面需要品牌上下文，请先选择品牌。" showIcon className="page-alert" />
          ) : null}
          <div className="workflow-strip">
            {operationWorkflow.map((step, index) => (
              <button
                key={step.key}
                className={index === workflowIndex ? 'workflow-step workflow-step-active' : 'workflow-step'}
                type="button"
                onClick={() => navigate(step.key)}
              >
                <span>{index + 1}</span>{step.label}
              </button>
            ))}
          </div>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
