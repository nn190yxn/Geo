import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { firstVersionRoutes } from './routes';
import { WorkspaceRouteRedirect } from './WorkspaceRouteRedirect';

function RouteLoadingFallback() {
  return <div className="route-loading" aria-label="页面加载中">页面加载中...</div>;
}

export function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/brands" replace />} />
            <Route path="/brands/:brandId/*" element={<WorkspaceRouteRedirect />} />
            {firstVersionRoutes.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Suspense fallback={<RouteLoadingFallback />}><Component /></Suspense>} />
            ))}
            <Route path="*" element={<Navigate to="/brands" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
