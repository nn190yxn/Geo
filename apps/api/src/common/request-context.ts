import type { BrandId } from '@geo-platform/shared-types';

export type RequestContext = {
  brandId: BrandId | null;
  userId: string;
  requestId: string;
};

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}
