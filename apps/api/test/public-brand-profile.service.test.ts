import { describe, expect, it } from 'vitest';
import { PublicBrandProfileService } from '../src/modules/brands/public-brand-profile.service';

describe('PublicBrandProfileService', () => {
  it('P27: exposes only approved confirmed fields', () => { const service = new PublicBrandProfileService(); service.saveConfirmed('brand-a', { name: 'Geo', website: 'https://geo.example', credentialRef: 'secret' }); const page = service.publish('brand-a'); expect(page.fields).toEqual({ name: 'Geo', website: 'https://geo.example' }); });
  it('binds previews to a valid profile and returns noindex', () => { const service = new PublicBrandProfileService(); service.saveConfirmed('brand-a', { name: 'Geo' }); const token = service.createPreview('brand-a'); expect(service.preview(token)).toMatchObject({ robots: 'noindex' }); });
  it('blocks access and view count updates after withdrawal', () => { const service = new PublicBrandProfileService(); service.saveConfirmed('brand-a', { name: 'Geo' }); service.publish('brand-a'); service.view('brand-a'); service.withdraw('brand-a'); expect(() => service.view('brand-a')).toThrow('public_brand_profile_unavailable'); });
});
