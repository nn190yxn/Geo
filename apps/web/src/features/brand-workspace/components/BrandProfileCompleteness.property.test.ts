import type { BrandProfile } from '@geo-platform/shared-types';
import { describe, expect, it } from 'vitest';

import {
  brandProfileLibraryGroups,
  getBrandProfileGroupMissingLabels,
  getBrandProfileGroupProgress,
  type BrandProfileLibraryFieldKey
} from './brandProfileLibrary';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

const libraryFields = brandProfileLibraryGroups.flatMap((group) => group.fields);

describe(`Property P1: profile group completeness stays within bounds ${validatesCriteria(['2.6'])}`, () => {
  it('keeps every generated group progress between 0 and 100', () => {
    expect(getBrandProfileGroupProgress(brandProfileLibraryGroups[0], null)).toBe(0);

    for (let fieldMask = 0; fieldMask < 2 ** libraryFields.length; fieldMask += 1) {
      const profile = createGeneratedProfile(fieldMask);

      for (const group of brandProfileLibraryGroups) {
        const progress = getBrandProfileGroupProgress(group, profile);
        expect(Number.isInteger(progress)).toBe(true);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe(`Property P2: every missing profile field has a supplement path or impact ${validatesCriteria(['2.6'])}`, () => {
  it('maps every generated missing label to its editable group', () => {
    for (let fieldMask = 0; fieldMask < 2 ** libraryFields.length; fieldMask += 1) {
      const profile = createGeneratedProfile(fieldMask);

      for (const group of brandProfileLibraryGroups) {
        const supplementLabels = new Set(group.fields.map((field) => field.label));
        if (group.fallbackMissingLabel) supplementLabels.add(group.fallbackMissingLabel);

        for (const missingLabel of getBrandProfileGroupMissingLabels(group, profile)) {
          expect(group.key).toBeTruthy();
          expect(supplementLabels.has(missingLabel)).toBe(true);
        }
      }
    }
  });

  it('keeps every API completeness prompt linked to a missing label and impact statement', () => {
    const completeProfile = createGeneratedProfile(2 ** libraryFields.length - 1);

    for (const group of brandProfileLibraryGroups) {
      for (const field of group.fields) {
        const profile: BrandProfile = {
          ...completeProfile,
          missingFields: [field.label],
          completenessPrompts: [{
            field: field.importFieldKey,
            label: field.label,
            impact: `${field.label}会影响下游结果`,
            prompt: `请补充${field.label}`
          }]
        };
        const [prompt] = profile.completenessPrompts;

        expect(getBrandProfileGroupMissingLabels(group, profile)).toContain(field.label);
        expect(prompt.impact.trim()).not.toBe('');
        expect(prompt.prompt.trim()).not.toBe('');
      }
    }

    const mediaGroup = brandProfileLibraryGroups.find((group) => group.key === 'media-assets')!;
    expect(getBrandProfileGroupMissingLabels(mediaGroup, completeProfile)).toEqual(['媒体素材']);
    expect(mediaGroup.key).toBe('media-assets');
  });
});

function createGeneratedProfile(fieldMask: number): BrandProfile {
  const profile: BrandProfile = {
    brandId: 'brand_property',
    intro: '',
    valueProps: [],
    offerings: [],
    proofPoints: [],
    targetCustomers: [],
    recommendedExpressions: [],
    blockedExpressions: [],
    contentRules: [],
    competitors: [],
    faqs: [],
    completenessScore: 0,
    missingFields: [],
    completenessPrompts: [],
    updatedAt: '2026-07-18T00:00:00.000Z'
  };

  libraryFields.forEach((field, index) => {
    if ((fieldMask & (1 << index)) === 0) return;
    profile[field.key] = createFilledValue(field.key) as never;
  });

  return profile;
}

function createFilledValue(field: BrandProfileLibraryFieldKey): BrandProfile[BrandProfileLibraryFieldKey] {
  if (field === 'intro') return '完整品牌介绍';
  if (field === 'faqs') return [{ question: '常见问题', answer: '标准回答' }];
  return [`已填写${field}`];
}
