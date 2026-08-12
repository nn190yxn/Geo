import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  ApiResponse,
  DiagnosticScoreSnapshot,
  GenerateTechnicalAssetsInput,
  SiteAuditAcceptanceRecord,
  SiteAuditAcceptanceResult,
  SiteAuditScoredAssessment,
  SiteAuditCheckerRule,
  SiteAuditCheckKey,
  TechnicalAssetRecord
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { AcceptanceRuleService, SiteAuditService } from './site-audit.service';
import { TechnicalAssetService } from './technical-asset.service';
import { DiagnosticScorePolicyService } from './diagnostic-score-policy.service';
import { AcceptanceHistoryService } from '../tasks/acceptance-history.service';

@Controller('brands/:brandId/site-audit')
export class SiteAuditController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly siteAuditService: SiteAuditService,
    private readonly acceptanceRuleService: AcceptanceRuleService,
    private readonly technicalAssetService: TechnicalAssetService,
    private readonly diagnosticScorePolicyService: DiagnosticScorePolicyService,
    private readonly acceptanceHistoryService: AcceptanceHistoryService
  ) {}

  @Post()
  async audit(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() input: { websiteUrl?: string }
  ): Promise<ApiResponse<SiteAuditScoredAssessment>> {
    this.assertBrandAccess(request.context.userId, brandId);
    if (!input.websiteUrl?.trim()) throw new BadRequestException('官网地址不能为空');
    const assessment = await this.siteAuditService.audit(input.websiteUrl.trim());
    const diagnosticScore = await this.diagnosticScorePolicyService.scoreAndSave(brandId, assessment);
    return { success: true, data: { ...assessment, diagnosticScore } };
  }

  @Get('diagnoses/:diagnosisId')
  async reproduceDiagnosis(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('diagnosisId') diagnosisId: string
  ): Promise<ApiResponse<DiagnosticScoreSnapshot>> {
    this.assertBrandAccess(request.context.userId, brandId);
    return { success: true, data: await this.diagnosticScorePolicyService.reproduce(brandId, diagnosisId) };
  }

  @Post('technical-assets')
  async generateTechnicalAssets(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() input: GenerateTechnicalAssetsInput
  ): Promise<ApiResponse<TechnicalAssetRecord[]>> {
    return { success: true, data: await this.technicalAssetService.generate(request.context.userId, brandId, input) };
  }

  @Post('checks/:checkKey/recheck')
  async recheck(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('checkKey') checkKey: SiteAuditCheckKey,
    @Body() input: { websiteUrl?: string; rule?: SiteAuditCheckerRule; history?: SiteAuditAcceptanceRecord[]; taskId?: string }
  ): Promise<ApiResponse<SiteAuditAcceptanceResult>> {
    this.assertBrandAccess(request.context.userId, brandId);
    if (!input.websiteUrl?.trim() || !input.rule || input.rule.checkKey !== checkKey) {
      throw new BadRequestException('站点检查规则与目标无效');
    }
    const result = await this.acceptanceRuleService.execute(input.websiteUrl.trim(), input.rule, input.history ?? []);
    if (input.taskId?.trim()) {
      const recorded = await this.acceptanceHistoryService.recordSiteAudit(
        request.context.userId,
        brandId,
        input.taskId.trim(),
        result
      );
      if (!recorded) throw new NotFoundException('关联修复任务不存在或当前用户无权访问');
      result.taskAcceptance = recorded.history;
    }
    return { success: true, data: result };
  }

  private assertBrandAccess(userId: string, brandId: string): void {
    if (!this.permissionsService.listAccessibleBrands(userId).some((brand) => brand.brandId === brandId)) {
      throw new NotFoundException('品牌不存在或无权访问');
    }
  }
}
