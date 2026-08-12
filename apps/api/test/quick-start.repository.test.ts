import { describe, expect, it } from 'vitest';
import { QuickStartRepository } from '../src/modules/quick-start/quick-start.repository';
import { QuickStartVersionConflictError } from '../src/modules/quick-start/quick-start.repository.port';

describe('QuickStartRepository', () => {
  it('creates one resumable session per brand and saves versions independently', async () => {
    const repository = new QuickStartRepository();
    const created = await repository.create('brand_1');
    const resumed = await repository.create('brand_1', 'facts');
    const updated = await repository.update('brand_1', created.version, {
      currentStep: 'facts',
      status: 'in_progress',
      draft: {
        website: {
          brandName: 'Example',
          websiteUrl: 'https://example.com/',
          targetMarkets: ['Shanghai'],
          crawlStatus: 'pending',
          knowledgeSourceId: 'source_1'
        }
      }
    });

    expect(resumed.id).toBe(created.id);
    expect(updated).toMatchObject({ version: 2, currentStep: 'facts' });
    expect(await repository.findByBrandId('brand_1')).toEqual(updated);
  });

  it('rejects stale versions without changing the stored draft', async () => {
    const repository = new QuickStartRepository();
    const created = await repository.create('brand_1');
    await repository.update('brand_1', created.version, {
      currentStep: 'facts',
      status: 'in_progress',
      draft: {}
    });

    await expect(repository.update('brand_1', created.version, {
      currentStep: 'questions',
      status: 'in_progress',
      draft: {}
    })).rejects.toBeInstanceOf(QuickStartVersionConflictError);
    expect((await repository.findByBrandId('brand_1'))?.version).toBe(2);
  });
});
