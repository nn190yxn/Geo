import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

type Profile = { brandId: string; status: 'draft' | 'published' | 'withdrawn'; data: Record<string, string>; viewCount: number };
const allowedFields = new Set(['name', 'description', 'website', 'industry']);

@Injectable()
export class PublicBrandProfileService {
  private readonly profiles = new Map<string, Profile>();
  private readonly previews = new Map<string, { brandId: string; expiresAt: Date }>();
  saveConfirmed(brandId: string, input: Record<string, string>) { const data = Object.fromEntries(Object.entries(input).filter(([key, value]) => allowedFields.has(key) && value.trim())); const current = this.profiles.get(brandId); const profile: Profile = { brandId, status: current?.status === 'published' ? 'published' : 'draft', data, viewCount: current?.viewCount ?? 0 }; this.profiles.set(brandId, profile); return profile; }
  createPreview(brandId: string, ttlMs = 60_000) { if (!this.profiles.has(brandId)) throw new NotFoundException('public_brand_profile_missing'); const token = randomUUID(); this.previews.set(token, { brandId, expiresAt: new Date(Date.now() + ttlMs) }); return token; }
  preview(token: string) { const preview = this.previews.get(token); if (!preview || preview.expiresAt <= new Date()) throw new ForbiddenException('public_brand_preview_expired'); return this.render(this.profiles.get(preview.brandId)!, true); }
  publish(brandId: string) { const profile = this.profiles.get(brandId); if (!profile) throw new NotFoundException('public_brand_profile_missing'); profile.status = 'published'; return this.render(profile, false); }
  withdraw(brandId: string) { const profile = this.profiles.get(brandId); if (!profile) throw new NotFoundException('public_brand_profile_missing'); profile.status = 'withdrawn'; }
  view(brandId: string) { const profile = this.profiles.get(brandId); if (!profile || profile.status !== 'published') throw new NotFoundException('public_brand_profile_unavailable'); profile.viewCount += 1; return this.render(profile, false); }
  private render(profile: Profile, noindex: boolean) { return { ...profile, robots: noindex ? 'noindex' : 'index,follow', canonical: `https://geo.example/brands/${profile.brandId}`, jsonLd: { '@context': 'https://schema.org', '@type': 'Organization', name: profile.data.name, url: profile.data.website }, fields: profile.data }; }
}
