import { useEffect, useReducer, useRef, useState } from 'react';
import { Alert, Button, Drawer, Layout, Menu, Select, Spin, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Outlet, useLocation, useNavigate } from 'react-router';
import type { AccessibleBrand } from '@geo-platform/shared-types';
import { apiGet } from '../api/http';
import { readWorkflowRouteContext } from '../app/routePaths';
import { getApiErrorMessage } from '../components/PageState';
import { ReleaseUpdateNotice } from '../components/ReleaseUpdateNotice';
import { BrandCapabilityProvider } from '../access-control/BrandCapabilityContext';
import { useBrandContextStore } from '../stores/brandContextStore';
import { getBrandRoleDisplay } from '../utils/displayLabels';
import { initialAppShellInteractionState, reduceAppShellInteraction, useAppShellMode } from './AppShellState';
import { getContextualWorkflowSteps, getLatestNavigationOpenKeys, getNavigationGroup, getNavigationItem, navigationGroups } from './navigation';
import { UserGuideDrawer } from './UserGuideDrawer';

const items = navigationGroups.map((group) => ({
  key: group.label,
  label: group.label,
  children: group.items.map((item) => ({ key: item.key, label: item.label }))
}));

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const shellMode = useAppShellMode();
  const isMobile = shellMode === 'mobile';
  const currentGroup = getNavigationGroup(location.pathname);
  const [shellInteraction, dispatchShellInteraction] = useReducer(
    reduceAppShellInteraction,
    initialAppShellInteractionState
  );
  const { isSiderCollapsed, isMobileNavigationOpen } = shellInteraction;
  const [openDomainKeys, setOpenDomainKeys] = useState<string[]>(currentGroup ? [currentGroup.label] : [navigationGroups[0].label]);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const mobileNavigationTriggerRef = useRef<HTMLButtonElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const restoreNavigationFocusRef = useRef(true);
  const { activeBrandId, setActiveBrandId } = useBrandContextStore();
  const brandsQuery = useQuery({
    queryKey: ['accessible-brands'],
    queryFn: () => apiGet<AccessibleBrand[]>('/brands')
  });
  const brands = brandsQuery.data?.success ? brandsQuery.data.data : [];
  const activeBrand = brands.find((brand) => brand.brandId === activeBrandId);
  const currentItem = getNavigationItem(location.pathname);
  const contextualWorkflowSteps = getContextualWorkflowSteps(
    location.pathname,
    readWorkflowRouteContext(location.search)
  );
  const brandOptions = brands.map((brand) => ({
    value: brand.brandId,
    label: `${brand.name}（${getBrandRoleDisplay(brand.role)}）`
  }));

  useEffect(() => {
    if (brands.length > 0 && !brands.some((brand) => brand.brandId === activeBrandId)) {
      setActiveBrandId(brands[0].brandId);
    }
  }, [activeBrandId, brands, setActiveBrandId]);

  useEffect(() => {
    if (currentGroup) setOpenDomainKeys([currentGroup.label]);
  }, [currentGroup]);

  useEffect(() => {
    dispatchShellInteraction({ type: 'route-changed' });
    const focusFrame = window.requestAnimationFrame(() => mainContentRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(focusFrame);
  }, [location.key]);

  const navigateFromMenu = (path: string) => {
    restoreNavigationFocusRef.current = false;
    navigate(path);
    if (isMobile) dispatchShellInteraction({ type: 'close-mobile-navigation' });
  };

  const updateOpenDomainKeys = (keys: string[]) => {
    setOpenDomainKeys((currentKeys) => getLatestNavigationOpenKeys(currentKeys, keys));
  };

  return (
    <Layout className="app-shell">
      <a className="skip-to-content" href="#app-main-content">跳到主内容</a>
      {isMobile ? null : (
        <Layout.Sider
          className="app-sider"
          collapsed={isSiderCollapsed}
          collapsedWidth={72}
          trigger={null}
          width={248}
        >
          <AppBrand compact={isSiderCollapsed} />
          <Menu
            className="app-navigation-menu"
            theme="dark"
            mode="inline"
            openKeys={isSiderCollapsed ? [] : openDomainKeys}
            selectedKeys={[location.pathname]}
            items={items}
            onOpenChange={updateOpenDomainKeys}
            onClick={(item) => navigateFromMenu(item.key)}
          />
        </Layout.Sider>
      )}
      <Layout>
        <Layout.Header className="app-header">
          <div className="app-header-navigation">
            <Button
              aria-controls={isMobile ? 'mobile-app-navigation' : undefined}
              aria-expanded={isMobile ? isMobileNavigationOpen : !isSiderCollapsed}
              aria-label={isMobile ? '打开导航' : isSiderCollapsed ? '展开导航' : '收起导航'}
              className="app-sider-toggle"
              onClick={() => {
                if (isMobile) {
                  restoreNavigationFocusRef.current = true;
                  dispatchShellInteraction({ type: 'open-mobile-navigation' });
                } else {
                  dispatchShellInteraction({ type: 'toggle-desktop-navigation' });
                }
              }}
              ref={mobileNavigationTriggerRef}
              type="text"
            >
              {isMobile ? '导航' : isSiderCollapsed ? '展开导航' : '收起导航'}
            </Button>
            <div className="app-header-context">
              <Typography.Text type="secondary">当前任务域</Typography.Text>
              <Typography.Text strong>{currentGroup?.label ?? '开始'}</Typography.Text>
            </div>
          </div>
          <div className="app-header-brand-context">
            <Button aria-label="打开平台使用教程" onClick={() => setIsUserGuideOpen(true)}>
              {isMobile ? '教程' : '使用教程'}
            </Button>
            <Typography.Text type="secondary">当前品牌</Typography.Text>
            {brandsQuery.isLoading ? (
              <Spin size="small" />
            ) : (
              <Select
                aria-label="切换当前品牌"
                value={activeBrandId}
                onChange={setActiveBrandId}
                options={brandOptions}
                className="brand-select"
                status={brandOptions.length === 0 ? 'error' : undefined}
                placeholder={activeBrand?.name ?? '选择品牌'}
              />
            )}
          </div>
        </Layout.Header>
        <Layout.Content className="app-content" id="app-main-content" ref={mainContentRef} tabIndex={-1}>
          <ReleaseUpdateNotice />
          {brandsQuery.data && !brandsQuery.data.success ? (
            <Alert type="error" message={getApiErrorMessage(brandsQuery.data, '品牌列表暂时无法加载，请重新进入页面。')} showIcon className="page-alert" />
          ) : null}
          {brandsQuery.data?.success && brands.length === 0 ? (
            <Alert type="warning" message="暂无可访问品牌，请先在多品牌总览中创建品牌。" showIcon className="page-alert" />
          ) : null}
          {currentItem?.requiresBrand && !activeBrandId ? (
            <Alert type="info" message="当前页面需要品牌上下文，请先选择品牌。" showIcon className="page-alert" />
          ) : null}
          {contextualWorkflowSteps.length > 0 ? (
            <nav className="contextual-workflow" aria-label="当前任务流程">
              {contextualWorkflowSteps.map((step) => (
                step.position === 'current' ? (
                  <div className="contextual-workflow-step contextual-workflow-current" aria-current="step" key={step.key}>
                    <span className="contextual-workflow-position">当前阶段</span>
                    <strong>{step.label}</strong>
                  </div>
                ) : (
                  <button
                    className={`contextual-workflow-step contextual-workflow-${step.position}`}
                    key={step.key}
                    onClick={() => navigate(step.href)}
                    type="button"
                  >
                    <span className="contextual-workflow-position">
                      {step.position === 'previous' ? '上一阶段' : '下一阶段'}
                    </span>
                    <strong>{step.label}</strong>
                  </button>
                )
              ))}
            </nav>
          ) : null}
          <BrandCapabilityProvider capabilities={activeBrand?.capabilities ?? null}>
            <Outlet />
          </BrandCapabilityProvider>
        </Layout.Content>
      </Layout>
      {isMobile ? (
        <Drawer
          afterOpenChange={(open) => {
            if (!open) {
              const focusTarget = restoreNavigationFocusRef.current ? mobileNavigationTriggerRef.current : mainContentRef.current;
              focusTarget?.focus({ preventScroll: true });
            }
          }}
          className="app-navigation-drawer"
          closeIcon={false}
          id="mobile-app-navigation"
          onClose={() => {
            restoreNavigationFocusRef.current = true;
            dispatchShellInteraction({ type: 'close-mobile-navigation' });
          }}
          open={isMobileNavigationOpen}
          placement="left"
          title={<AppBrand />}
          width={320}
        >
          <Menu
            className="app-navigation-menu"
            theme="dark"
            mode="inline"
            openKeys={openDomainKeys}
            selectedKeys={[location.pathname]}
            items={items}
            onOpenChange={updateOpenDomainKeys}
            onClick={(item) => navigateFromMenu(item.key)}
          />
        </Drawer>
      ) : null}
      <UserGuideDrawer
        currentPath={location.pathname}
        mobile={isMobile}
        onClose={() => setIsUserGuideOpen(false)}
        onNavigate={(path) => {
          setIsUserGuideOpen(false);
          navigate(path);
        }}
        open={isUserGuideOpen}
      />
    </Layout>
  );
}

function AppBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="app-brand" aria-label="AI 推荐管理平台">
      <span className="app-brand-mark" aria-hidden="true">G</span>
      {compact ? null : <Typography.Text strong className="app-title">AI 推荐管理平台</Typography.Text>}
    </div>
  );
}
