import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { FirstVersionRoutePath } from './routePaths';

export type AppRoute = {
  path: FirstVersionRoutePath;
  Component: LazyExoticComponent<ComponentType>;
};

const BrandWorkspacePage = lazy(() => import('../features/brand-workspace/pages/BrandWorkspacePage').then((module) => ({ default: module.BrandWorkspacePage })));
const GeoCanvasPage = lazy(() => import('../features/canvas/pages/GeoCanvasPage').then((module) => ({ default: module.GeoCanvasPage })));
const MonitoringPage = lazy(() => import('../features/monitoring/pages/MonitoringPage').then((module) => ({ default: module.MonitoringPage })));
const GrowthOptimizationPage = lazy(() => import('../features/growth-optimization/pages/GrowthOptimizationPage').then((module) => ({ default: module.GrowthOptimizationPage })));
const CompetitorAnalysisPage = lazy(() => import('../features/competitors/pages/CompetitorAnalysisPage').then((module) => ({ default: module.CompetitorAnalysisPage })));
const CitationAnalysisPage = lazy(() => import('../features/citations/pages/CitationAnalysisPage').then((module) => ({ default: module.CitationAnalysisPage })));
const EvaluationAnalysisPage = lazy(() => import('../features/evaluations/pages/EvaluationAnalysisPage').then((module) => ({ default: module.EvaluationAnalysisPage })));
const ContentCenterPage = lazy(() => import('../features/content/pages/ContentCenterPage').then((module) => ({ default: module.ContentCenterPage })));
const ContentGenerationPage = lazy(() => import('../features/content-generation/pages/ContentGenerationPage').then((module) => ({ default: module.ContentGenerationPage })));
const PublishingCenterPage = lazy(() => import('../features/publishing/pages/PublishingCenterPage').then((module) => ({ default: module.PublishingCenterPage })));
const ModelSettingsPage = lazy(() => import('../features/model-settings/pages/ModelSettingsPage').then((module) => ({ default: module.ModelSettingsPage })));
const TaskRetestPage = lazy(() => import('../features/tasks/pages/TaskRetestPage').then((module) => ({ default: module.TaskRetestPage })));
const InnerTestFeedbackPage = lazy(() => import('../features/feedback/pages/InnerTestFeedbackPage').then((module) => ({ default: module.InnerTestFeedbackPage })));
const ReportCenterPage = lazy(() => import('../features/reports/pages/ReportCenterPage').then((module) => ({ default: module.ReportCenterPage })));
const AdvisorWorkspacePage = lazy(() => import('../features/advisor/pages/AdvisorWorkspacePage').then((module) => ({ default: module.AdvisorWorkspacePage })));
const SiteAuditWorkbench = lazy(() => import('../features/site-audit/pages/SiteAuditWorkbench').then((module) => ({ default: module.SiteAuditWorkbench })));

export const firstVersionRoutes: AppRoute[] = [
  { path: '/brands', Component: BrandWorkspacePage },
  { path: '/brand-profile', Component: BrandWorkspacePage },
  { path: '/canvas', Component: GeoCanvasPage },
  { path: '/monitoring', Component: MonitoringPage },
  { path: '/growth-optimization', Component: GrowthOptimizationPage },
  { path: '/user-intents', Component: BrandWorkspacePage },
  { path: '/optimization-units', Component: BrandWorkspacePage },
  { path: '/competitor-profile', Component: CompetitorAnalysisPage },
  { path: '/competitors', Component: CompetitorAnalysisPage },
  { path: '/citations', Component: CitationAnalysisPage },
  { path: '/evaluations', Component: EvaluationAnalysisPage },
  { path: '/facts', Component: EvaluationAnalysisPage },
  { path: '/content', Component: ContentCenterPage },
  { path: '/content-assets', Component: ContentCenterPage },
  { path: '/content-generation', Component: ContentGenerationPage },
  { path: '/content-optimization', Component: ContentGenerationPage },
  { path: '/publishing', Component: PublishingCenterPage },
  { path: '/owned-media', Component: PublishingCenterPage },
  { path: '/media-platforms', Component: PublishingCenterPage },
  { path: '/site-audit', Component: SiteAuditWorkbench },
  { path: '/model-settings', Component: ModelSettingsPage },
  { path: '/tasks', Component: TaskRetestPage },
  { path: '/feedback', Component: InnerTestFeedbackPage },
  { path: '/reports', Component: ReportCenterPage },
  { path: '/advisor', Component: AdvisorWorkspacePage }
];
