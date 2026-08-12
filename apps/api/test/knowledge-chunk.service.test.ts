import { describe, expect, it, vi } from 'vitest';
import type { QuickStartService } from '../src/modules/quick-start/quick-start.service';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { KnowledgeChunkService, buildKnowledgeChunkInputs } from '../src/modules/brands/knowledge-chunk.service';

describe('KnowledgeChunkService', () => {
  it('creates deterministic hashes and bounded chunks', () => {
    const inputs = buildKnowledgeChunkInputs(
      { id: 'source_1', sourceUrl: 'https://brand.example.com/about' },
      [`品牌介绍\n\n${'长'.repeat(900)}`],
      'approved'
    );

    expect(inputs).toHaveLength(3);
    expect(inputs.every((input) => input.content.length <= 800)).toBe(true);
    expect(inputs[0]).toMatchObject({ sourceId: 'source_1', sourceUrl: 'https://brand.example.com/about', chunkIndex: 0, reviewStatus: 'approved' });
    expect(inputs[0]?.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('retains source versions and skips an unchanged source snapshot', async () => {
    const repository = new PermissionsRepository();
    const permissionsService = new PermissionsService(repository);
    const source = repository.createKnowledgeSource('user_demo', 'brand_demo', {
      name: `版本资料 ${Date.now()}_${Math.random()}`,
      sourceType: 'webpage',
      sourceUrl: 'https://brand.example.com/versioned',
      status: 'completed'
    });
    const service = new KnowledgeChunkService(permissionsService, { get: vi.fn() } as unknown as QuickStartService);

    const first = await service.ingestSource('user_demo', 'brand_demo', source!, ['品牌事实：第一版'], 'approved');
    const unchanged = await service.ingestSource('user_demo', 'brand_demo', source!, ['品牌事实：第一版'], 'approved');
    const second = await service.ingestSource('user_demo', 'brand_demo', source!, ['品牌事实：第二版'], 'approved');

    expect(first).toMatchObject({ created: true, chunks: [{ sourceVersion: 1 }] });
    expect(unchanged).toMatchObject({ created: false, chunks: [{ sourceVersion: 1 }] });
    expect(second).toMatchObject({ created: true, chunks: [{ sourceVersion: 2 }] });
    expect(await service.list('user_demo', 'brand_demo', source!.id)).toHaveLength(2);
  });

  it('synchronizes only confirmed or edited facts with their original source', async () => {
    const repository = new PermissionsRepository();
    const permissionsService = new PermissionsService(repository);
    const source = repository.createKnowledgeSource('user_demo', 'brand_demo', {
      name: `事实资料 ${Date.now()}_${Math.random()}`,
      sourceType: 'webpage',
      sourceUrl: 'https://brand.example.com/facts',
      status: 'completed'
    });
    const quickStartService = {
      get: vi.fn(async () => ({
        draft: {
          facts: {
            candidates: [
              { sourceId: source!.id, fieldKey: 'brandName', extractedValue: '旧名称', editedValue: '确认名称', status: 'edited' },
              { sourceId: source!.id, fieldKey: 'intro', extractedValue: '确认介绍', status: 'confirmed' },
              { sourceId: source!.id, fieldKey: 'claim', extractedValue: '待确认表达', status: 'pending' }
            ]
          }
        }
      }))
    } as unknown as QuickStartService;
    const service = new KnowledgeChunkService(permissionsService, quickStartService);

    const result = await service.syncConfirmedFacts('user_demo', 'brand_demo');

    expect(result).toMatchObject({ sourceCount: 1, createdVersionCount: 1, unchangedSourceCount: 0 });
    expect(result.chunks.map((chunk) => chunk.content)).toEqual(['brandName：确认名称', 'intro：确认介绍']);
    expect(result.chunks.every((chunk) => chunk.reviewStatus === 'approved')).toBe(true);
  });
});
