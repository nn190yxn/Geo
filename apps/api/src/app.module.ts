import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { BrandAccessMiddleware } from './common/middleware/brand-access.middleware';
import { BrandContextMiddleware } from './common/middleware/brand-context.middleware';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { BrandsModule } from './modules/brands/brands.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PlatformsModule } from './modules/platforms/platforms.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { CanvasModule } from './modules/canvas/canvas.module';
import { CompetitorsModule } from './modules/competitors/competitors.module';
import { CitationsModule } from './modules/citations/citations.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { ContentModule } from './modules/content/content.module';
import { PublishingModule } from './modules/publishing/publishing.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdvisorModule } from './modules/advisor/advisor.module';
import { LLMModule } from './modules/llm/llm.module';
import { AutomationModule } from './modules/automation/automation.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { SprintsModule } from './modules/sprints/sprints.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';

@Module({
  imports: [PrismaModule, HealthModule, BrandsModule, PermissionsModule, PlatformsModule, MonitoringModule, MetricsModule, CanvasModule, CompetitorsModule, CitationsModule, EvaluationsModule, ContentModule, PublishingModule, TasksModule, ReportsModule, AdvisorModule, LLMModule, AutomationModule, FeedbackModule, SprintsModule, AnalysisModule, DashboardsModule],
  providers: [BrandContextMiddleware, BrandAccessMiddleware]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BrandContextMiddleware, BrandAccessMiddleware).forRoutes('{*splat}');
  }
}
