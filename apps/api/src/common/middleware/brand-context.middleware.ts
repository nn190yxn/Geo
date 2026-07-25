import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { BrandId } from '@geo-platform/shared-types';

@Injectable()
export class BrandContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const rawBrandId = req.header('x-brand-id');

    req.context = {
      brandId: rawBrandId ? (rawBrandId as BrandId) : null,
      userId: req.header('x-user-id') ?? 'user_demo',
      requestId: req.header('x-request-id') ?? randomUUID()
    };

    next();
  }
}
