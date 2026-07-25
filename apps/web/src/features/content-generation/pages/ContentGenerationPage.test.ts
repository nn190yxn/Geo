import { describe, expect, it } from 'vitest';
import { formatList, getContentGenerationTaskState, getContentTaskDisplayName, getContentTypeLabel, getDraftQualityCheck, getDraftReviewNotes } from './ContentGenerationPage';

describe('ContentGenerationPage status helpers', () => {
  it('shows failed content generation tasks as retryable work', () => {
    expect(getContentGenerationTaskState({ status: 'failed', errorMessage: 'Body generation failed' })).toEqual({
      label: '生成失败',
      color: 'red',
      alert: 'Body generation failed',
      alertType: 'error'
    });
  });

  it('shows generating tasks as in progress', () => {
    expect(getContentGenerationTaskState({ status: 'running' })).toEqual({
      label: '生成中',
      color: 'blue',
      alert: '正在生成内容草稿',
      alertType: 'info'
    });
  });

  it('labels the first version growth content types for operators', () => {
    expect(getContentTypeLabel('wechat_article')).toBe('公众号推文');
    expect(getContentTypeLabel('xiaohongshu_note')).toBe('小红书图文');
    expect(getContentTypeLabel('website_faq')).toBe('官网 FAQ');
    expect(getContentTypeLabel('short_video_script')).toBe('短视频脚本');
    expect(getContentTypeLabel('platform_profile_copy')).toBe('平台介绍文案');
    expect(getContentTypeLabel('image_creative_brief')).toBe('图片创意需求');
  });

  it('formats task keywords and references for compact display', () => {
    expect(formatList(['儿童运动', '贵阳体能'])).toBe('儿童运动、贵阳体能');
    expect(formatList([])).toBe('-');
  });

  it('uses business-facing task names instead of internal task ids', () => {
    expect(getContentTaskDisplayName({ contentTopic: '贵阳儿童运动选课指南', contentType: 'wechat_article', targetPlatform: 'wechat_official' })).toBe('贵阳儿童运动选课指南');
    expect(getContentTaskDisplayName({ contentType: 'wechat_article', targetPlatform: 'wechat_official' })).toBe('公众号推文');
  });

  it('extracts review notes from generated markdown drafts', () => {
    expect(getDraftReviewNotes('正文\n\n合规说明：\n- 避免承诺效果\n\n复测建议：\n- 发布后复测贵阳儿童运动\n\n需要你确认：包含风险表达')).toEqual({
      visible: true,
      reviewRequired: true,
      complianceNotes: ['避免承诺效果'],
      retestSuggestions: ['发布后复测贵阳儿童运动']
    });
  });

  it('hides review notes when generated draft has no guidance section', () => {
    expect(getDraftReviewNotes('普通正文')).toEqual({
      visible: false,
      reviewRequired: false,
      complianceNotes: [],
      retestSuggestions: []
    });
  });

  it('blocks short drafts from publish preparation', () => {
    expect(getDraftQualityCheck('短正文', 'wechat_article')).toMatchObject({
      publishable: false,
      missingSections: ['品牌事实', '家长行动建议', '合规说明', '复测建议']
    });
  });

  it('blocks drafts that miss required review sections', () => {
    const body = `${'完整正文内容'.repeat(40)}\n\n品牌事实：\n- 贵阳 5 家校区`;

    expect(getDraftQualityCheck(body, 'wechat_article')).toMatchObject({
      publishable: false,
      missingSections: ['家长行动建议', '合规说明', '复测建议']
    });
  });

  it('allows complete drafts to enter publish preparation', () => {
    const body = `${'追光小牛围绕儿童运动成长提供课程说明和家长选择建议，帮助贵阳家庭理解课程体系、教练反馈和长期训练价值。'.repeat(22)}\n\n品牌事实：\n- 贵阳 5 家校区\n\n家长行动建议：\n- 先预约体验课并查看体测反馈\n\n合规说明：\n- 避免承诺训练效果\n\n复测建议：\n- 发布后复测贵阳儿童运动推荐`;

    expect(getDraftQualityCheck(body, 'wechat_article')).toMatchObject({
      publishable: true,
      missingSections: []
    });
  });

  it('uses platform-level standards for Xiaohongshu drafts', () => {
    const body = `${'追光小牛面向贵阳家长说明儿童运动成长课的选课标准、课堂反馈和长期训练价值。'.repeat(16)}\n\n品牌事实：\n- 追光小牛服务贵阳 2-14 岁儿童家庭\n\n话题标签：\n#贵阳儿童体能 #儿童运动成长\n\n合规说明：\n- 避免绝对化承诺\n\n复测建议：\n- 发布后复测小红书相关搜索表达`;

    expect(getDraftQualityCheck(body, 'xiaohongshu_note')).toMatchObject({
      publishable: true,
      missingSections: []
    });
  });

  it('blocks drafts with high-risk growth promises', () => {
    const body = `${'追光小牛围绕儿童运动成长提供课程说明和家长选择建议，帮助贵阳家庭理解课程体系、教练反馈和长期训练价值。'.repeat(22)}\n\n品牌事实：\n- 贵阳 5 家校区\n\n家长行动建议：\n- 先预约体验课并查看体测反馈\n\n合规说明：\n- 避免承诺训练效果\n\n复测建议：\n- 发布后复测贵阳儿童运动推荐\n\n保证长高`;

    expect(getDraftQualityCheck(body, 'wechat_article')).toMatchObject({
      publishable: false,
      issues: expect.arrayContaining(['包含高风险表达 保证长高'])
    });
  });
});
