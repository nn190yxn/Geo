import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from 'antd';
import { describe, expect, it } from 'vitest';
import { AccessibleDropdown } from './AccessibleDropdown';

describe('AccessibleDropdown', () => {
  it('exposes the menu purpose and collapsed state on its trigger', () => {
    const markup = renderToStaticMarkup(
      <AccessibleDropdown label="品牌“测试品牌”的更多操作" menu={{ items: [{ key: 'edit', label: '编辑' }] }}>
        <Button>更多</Button>
      </AccessibleDropdown>
    );

    expect(markup).toContain('aria-haspopup="menu"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-label="品牌“测试品牌”的更多操作"');
  });
});
