import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { QuestionRadarService } from './question-radar.service';
import { SprintContentGapService } from './sprint-content-gap.service';
import { SprintMetricsService } from './sprint-metrics.service';
import { SprintPublishingService } from './sprint-publishing.service';
import { SprintRetestService } from './sprint-retest.service';
import { SprintStageService } from './sprint-stage.service';
import { StandardAnswerAlignmentService } from './standard-answer-alignment.service';
import { StandardAnswerService } from './standard-answer.service';
import { SprintsController } from './sprints.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [SprintsController],
  providers: [QuestionRadarService, StandardAnswerService, StandardAnswerAlignmentService, SprintContentGapService, SprintMetricsService, SprintPublishingService, SprintRetestService, SprintStageService],
  exports: [QuestionRadarService, StandardAnswerService, StandardAnswerAlignmentService, SprintContentGapService, SprintMetricsService, SprintPublishingService, SprintRetestService, SprintStageService]
})
export class SprintsModule {}
