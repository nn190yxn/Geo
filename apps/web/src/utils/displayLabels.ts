export function getPlatformDisplayName(value?: string): string {
  if (!value || value.trim().length === 0) return '未知平台';

  const labels: Record<string, string> = {
    doubao: '豆包',
    kimi: 'Kimi',
    deepseek: 'DeepSeek',
    qianwen: '通义千问',
    stepfun: '阶跃星辰',
    sensenova: 'SenseNova',
    manual_input: '人工录入',
    mock_ai: '示例回答',
    wechat_official: '公众号',
    xiaohongshu: '小红书',
    zhihu: '知乎',
    baijiahao: '百家号',
    official_site: '官网',
    official_site_faq: '官网 FAQ',
    douyin: '短视频平台'
  };

  return labels[value] ?? value;
}

export function getPlatformDisplay(value?: string): string {
  return getPlatformDisplayName(value);
}

export function getContentTypeDisplay(value?: string): string {
  if (!value || value.trim().length === 0) return '内容';

  const labels: Record<string, string> = {
    wechat_article: '公众号推文',
    wechat_official: '公众号推文',
    xiaohongshu_note: '小红书图文',
    xiaohongshu_post: '小红书图文',
    website_faq: '官网 FAQ',
    short_video_script: '短视频脚本',
    platform_profile_copy: '平台介绍文案',
    image_creative_brief: '图片创意需求',
    generated_content: '生成内容',
    article: '文章',
    post: '图文'
  };

  return labels[value] ?? value;
}

export function getStatusDisplay(value?: string): string {
  if (!value || value.trim().length === 0) return '未知状态';

  const labels: Record<string, string> = {
    draft: '草稿',
    pending: '待处理',
    published: '已发布',
    failed: '失败',
    active: '启用',
    inactive: '停用',
    completed: '已完成',
    processing: '处理中',
    uploaded: '已上传',
    parsed: '已解析',
    error: '异常'
  };

  return labels[value] ?? value;
}

export function getOwnerDisplayName(value?: string): string {
  if (!value || value.trim().length === 0) return '未分配';

  const labels: Record<string, string> = {
    user_demo: '内测负责人',
    advisor_demo: '服务顾问'
  };

  return labels[value] ?? value;
}
