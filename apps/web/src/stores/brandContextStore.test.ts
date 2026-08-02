import { afterEach, describe, expect, it } from 'vitest';
import { useBrandContextStore } from './brandContextStore';

const defaultBrandId = useBrandContextStore.getState().activeBrandId;

describe('brand context switching', () => {
  afterEach(() => {
    useBrandContextStore.setState({ activeBrandId: defaultBrandId });
  });

  it('updates the active brand selected by the application shell', () => {
    useBrandContextStore.getState().setActiveBrandId('brand_secondary');
    expect(useBrandContextStore.getState().activeBrandId).toBe('brand_secondary');

    useBrandContextStore.getState().setActiveBrandId('brand_primary');
    expect(useBrandContextStore.getState().activeBrandId).toBe('brand_primary');
  });
});
