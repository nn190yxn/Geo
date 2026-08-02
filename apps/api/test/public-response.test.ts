import { describe, expect, it } from 'vitest';
import { sanitizePublicResponse } from '../src/common/public-response';

describe('sanitizePublicResponse', () => {
  it('removes sensitive fields recursively while preserving masked state and usage summaries', () => {
    const response = sanitizePublicResponse({
      id: 'resource_1',
      hasCredential: true,
      credentialRefMasked: '***',
      inputTokenCount: 12,
      credentialRef: 'credential://private',
      nested: {
        apiKey: 'private-key',
        providerPayload: { requestId: 'provider_request_1' },
        items: [
          {
            cookies: ['session=private'],
            storage_state: { origins: [] },
            storageStatePath: '/private/browser/state.json',
            browserProfilePath: '/private/browser/profile',
            browserProfileDir: '/private/browser',
            access_token: 'private-token',
            message: '需要重新登录'
          }
        ]
      }
    });

    expect(response).toEqual({
      id: 'resource_1',
      hasCredential: true,
      credentialRefMasked: '***',
      inputTokenCount: 12,
      nested: {
        items: [{ message: '需要重新登录' }]
      }
    });
  });

  it('does not mutate repository objects before they reach the public boundary', () => {
    const stored = { id: 'config_1', credentialRef: 'credential://private', nested: { token: 'private' } };

    const response = sanitizePublicResponse(stored);

    expect(response).toEqual({ id: 'config_1', nested: {} });
    expect(stored).toEqual({ id: 'config_1', credentialRef: 'credential://private', nested: { token: 'private' } });
  });
});
