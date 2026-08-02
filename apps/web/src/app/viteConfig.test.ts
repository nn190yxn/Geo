import { describe, expect, it } from 'vitest';
import type { UserConfig } from 'vite';
import viteConfig from '../../vite.config';

const config = viteConfig as UserConfig;

describe('Vite development preview config', () => {
  it('allows the managed preview domain', () => {
    expect(config.server?.allowedHosts).toContain('.monkeycode-ai.online');
  });

  it('proxies API requests to the local backend', () => {
    expect(config.server?.proxy).toMatchObject({
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    });
  });
});
