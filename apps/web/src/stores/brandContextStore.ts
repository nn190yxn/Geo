import { create } from 'zustand';
import type { BrandId } from '@geo-platform/shared-types';

type BrandContextState = {
  activeBrandId: BrandId;
  setActiveBrandId: (brandId: BrandId) => void;
};

export const useBrandContextStore = create<BrandContextState>((set) => ({
  activeBrandId: 'brand_demo',
  setActiveBrandId: (brandId) => set({ activeBrandId: brandId })
}));
