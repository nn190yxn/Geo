import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('knowledge source repository', () => {
  it('creates file source records under the selected brand', () => {
    const repository = new PermissionsRepository();
    const source = repository.createKnowledgeSource('user_demo', 'brand_demo', {
      name: '品牌介绍 PDF',
      sourceType: 'file',
      fileRef: 'uploads/brand-intro.pdf'
    });

    expect(source?.brandId).toBe('brand_demo');
    expect(source?.status).toBe('pending');
    expect(repository.listKnowledgeSources('user_demo', 'brand_demo')).toContainEqual(source);
  });

  it('keeps uploaded brand files in processing status for later parsing', () => {
    const repository = new PermissionsRepository();
    const source = repository.createKnowledgeSource('user_demo', 'brand_demo', {
      name: '追光小牛品牌资料.md',
      sourceType: 'file',
      fileRef: 'uploads/brand-imports/brand_demo-doc.md',
      status: 'processing'
    });

    expect(source?.status).toBe('processing');
    expect(source?.fileRef).toBe('uploads/brand-imports/brand_demo-doc.md');
  });

  it('updates source status after import confirmation', () => {
    const repository = new PermissionsRepository();
    const source = repository.createKnowledgeSource('user_demo', 'brand_demo', {
      name: '追光小牛品牌资料.md',
      sourceType: 'file',
      fileRef: 'uploads/brand-imports/brand_demo-doc.md',
      status: 'processing'
    });

    const updated = repository.updateKnowledgeSourceStatus('user_demo', 'brand_demo', source?.id ?? '', 'completed');

    expect(updated?.status).toBe('completed');
    expect(updated?.updatedAt).toBeTruthy();
  });

  it('creates web source records with normalized metadata', () => {
    const repository = new PermissionsRepository();
    const source = repository.createKnowledgeSource('user_demo', 'brand_demo', {
      name: ' 官网介绍 ',
      sourceType: 'webpage',
      sourceUrl: ' https://example.com/about '
    });

    expect(source?.name).toBe('官网介绍');
    expect(source?.sourceUrl).toBe('https://example.com/about');
  });

  it('keeps sources isolated by brand access', () => {
    const repository = new PermissionsRepository();

    expect(repository.createKnowledgeSource('other_user', 'brand_demo', {
      name: '未授权素材',
      sourceType: 'webpage',
      sourceUrl: 'https://example.com'
    })).toBeNull();

    const source = repository.createKnowledgeSource('user_demo', 'brand_demo', {
      name: '追光小牛品牌资料.md',
      sourceType: 'file',
      fileRef: 'uploads/brand-imports/brand_demo-doc.md',
      status: 'processing'
    });

    expect(repository.updateKnowledgeSourceStatus('other_user', 'brand_demo', source?.id ?? '', 'completed')).toBeNull();
  });
});
