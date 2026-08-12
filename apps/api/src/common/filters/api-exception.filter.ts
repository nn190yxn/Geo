import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiResponse, BrandAuthorizationError } from '@geo-platform/shared-types';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const responseBody = typeof exceptionResponse === 'object' && exceptionResponse !== null ? exceptionResponse : null;
    const responseMessage = responseBody && 'message' in responseBody ? responseBody.message : exceptionResponse;
    const message = Array.isArray(responseMessage)
      ? responseMessage.join('; ')
      : typeof responseMessage === 'string'
        ? responseMessage
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';
    const responseCode = responseBody && 'code' in responseBody && typeof responseBody.code === 'string' ? responseBody.code : null;
    const authorization = responseBody && 'authorization' in responseBody && typeof responseBody.authorization === 'object'
      ? responseBody.authorization as BrandAuthorizationError
      : undefined;

    const body: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: responseCode ?? (status === HttpStatus.INTERNAL_SERVER_ERROR ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
        message,
        requestId: request.context?.requestId ?? null,
        authorization
      }
    };

    response.status(status).json(body);
  }
}
