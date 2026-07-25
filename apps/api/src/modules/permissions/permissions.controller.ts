import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, AuditLog, AuditLogFilter, DeniedAccessLog, UserSummary } from '@geo-platform/shared-types';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('me')
  async getCurrentUser(@Req() request: Request): Promise<ApiResponse<UserSummary | null>> {
    return {
      success: true,
      data: await this.permissionsService.getCurrentUser(request.context.userId)
    };
  }

  @Get('denied-access')
  async listDeniedAccessLogs(@Req() request: Request): Promise<ApiResponse<DeniedAccessLog[]>> {
    return {
      success: true,
      data: await this.permissionsService.listDeniedAccessLogs(request.context.userId)
    };
  }

  @Get('audit-logs')
  async listAuditLogs(
    @Req() request: Request,
    @Query() query: AuditLogFilter
  ): Promise<ApiResponse<AuditLog[]>> {
    return {
      success: true,
      data: await this.permissionsService.listAuditLogs(request.context.userId, query)
    };
  }
}
