import { describe, expect, it } from 'vitest';
import { getFeedbackStatusLabel, getFeedbackTypeLabel } from './InnerTestFeedbackPage';

describe('InnerTestFeedbackPage helpers', () => {
  it('shows beginner-facing feedback type labels', () => {
    expect(getFeedbackTypeLabel('usability')).toBe('不好用');
    expect(getFeedbackTypeLabel('configuration')).toBe('配置问题');
    expect(getFeedbackTypeLabel('unknown')).toBe('其他问题');
  });

  it('shows feedback status labels', () => {
    expect(getFeedbackStatusLabel('open')).toBe('待处理');
    expect(getFeedbackStatusLabel('in_progress')).toBe('处理中');
    expect(getFeedbackStatusLabel('resolved')).toBe('已解决');
  });
});
