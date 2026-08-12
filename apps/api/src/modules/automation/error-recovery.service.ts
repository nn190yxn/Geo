import { Injectable } from '@nestjs/common';

@Injectable()
export class ErrorRecoveryService {
  resolve(code: string) { const category = code.includes('quota') ? '额度' : code.includes('provider') || code.includes('credential') ? '平台连接' : code.includes('crawl') ? '抓取' : code.includes('publish') ? '发布' : code.includes('report') ? '报告' : '执行'; return { category, steps: stepsFor(category) }; }
}
function stepsFor(category: string) { return ({ '平台连接': ['检查已配置的平台连接状态', '确认凭据引用仍有效', '执行最小连接检查后重试'], '额度': ['查看当前可用额度', '缩小任务范围或联系管理员调整额度', '保留输入后重新提交'], '抓取': ['确认目标页面可访问', '检查范围与 robots 规则', '对失败页面单项重试'], '发布': ['确认账号授权与内容版本', '保存渠道返回的真实链接', '在渠道后台确认草稿状态'], '报告': ['确认统计周期与数据缺口', '刷新冻结快照', '重新生成交付文件'], '执行': ['查看当前步骤的业务错误类别', '按步骤恢复操作', '持续失败时记录内测反馈'] } as Record<string, string[]>)[category]!; }
