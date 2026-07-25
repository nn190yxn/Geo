import type { BrandId } from '@geo-platform/shared-types';

export type RequestContext = {
  brandId: BrandId | null;
  userId: string;
  requestId: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    context: RequestContext;
  }
}
