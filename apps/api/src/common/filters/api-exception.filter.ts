import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiResponse } from '@geo-platform/shared-types';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof Error ? exception.message : 'Internal server error';

    const body: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
        message,
        requestId: request.context?.requestId ?? null
      }
    };

    response.status(status).json(body);
  }
}
