export type PublishingAdapterRequest = {
  idempotencyKey: string;
  brandId: string;
  accountId: string;
  accountName: string;
  platform: string;
  title: string;
  body: string;
};

export type PublishingAdapterResult = {
  externalPlatformId?: string;
  publishedUrl: string;
};

export interface PublishingAdapter {
  supports(platform: string): boolean;
  publish(request: PublishingAdapterRequest): Promise<PublishingAdapterResult>;
}
