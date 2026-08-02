import { Alert, Button, Card, Collapse, Drawer, Space, Tabs, Tag, Typography } from 'antd';
import { navigationGroups, operationWorkflow } from './navigation';

const { Paragraph, Text, Title } = Typography;

export const guideStageDetails: Record<string, { goal: string; actions: string[]; done: string }> = {
  '/brand-profile': {
    goal: '建立可核对的品牌事实基础',
    actions: ['补充品牌介绍、产品服务和目标用户', '维护 FAQ、权威背书和品牌标准答案'],
    done: '核心事实足以判断 AI 回复是否准确'
  },
  '/optimization-units': {
    goal: '确定本轮希望 AI 推荐的业务主题',
    actions: ['创建一个产品、服务或业务主题', '设置关键词、优先级和启用状态'],
    done: '至少有一个已启用的优化单元'
  },
  '/user-intents': {
    goal: '整理客户会向 AI 提出的真实问题',
    actions: ['关联优化单元并创建用户意图', '生成并检查自然监测问法'],
    done: '至少有一个可用监测问题'
  },
  '/monitoring': {
    goal: '获取并解读真实 AI 回复',
    actions: ['选择问题并保存监测计划', '自动监测或手动回填完整回答', '解析分析并确认回复解读'],
    done: '至少一条真实回复已完成并确认'
  },
  '/growth-optimization': {
    goal: '把监测发现转化为执行计划',
    actions: ['从监测结果生成计划', '设置负责人、截止时间、渠道和复测时间'],
    done: '至少一条计划已确认并生成待办'
  },
  '/content-generation': {
    goal: '生成可发布并可验证的内容',
    actions: ['选择策略、意图、模板和目标平台', '生成草稿并人工核对事实、引用和合规表达'],
    done: '草稿已保存并进入发布准备'
  },
  '/publishing': {
    goal: '记录内容的真实发布结果',
    actions: ['选择已授权的自有媒体账号', '发布后填写真实链接和结果'],
    done: '发布记录状态为已发布'
  },
  '/tasks': {
    goal: '用同题复测判断优化效果',
    actions: ['关联原问题、原平台和发布记录', '执行复测并比较出现、排名、准确性和引用变化'],
    done: '任务明确标记为已改善或继续优化'
  }
};

const glossary = [
  ['GEO', '改善品牌在生成式 AI 回答中的理解、提及、推荐和引用表现。'],
  ['优化单元', '本轮希望 AI 理解或推荐的产品、服务或业务主题。'],
  ['用户意图', '客户可能向 AI 提出的真实需求场景。'],
  ['监测问题', '从用户意图拆出的具体自然问法。'],
  ['真实 AI 回复', '从自动监测、浏览器辅助或手动录入获得的平台原始回答。'],
  ['品牌标准答案', '经品牌方确认的正确事实和表达口径。'],
  ['再次监测', '内容发布后使用相同问题和平台重新测试。']
];

const troubleshootingItems = [
  {
    key: 'brand',
    label: '没有品牌或品牌选错了',
    children: <Paragraph>回到“数据总览”创建品牌，再通过页头右侧的“当前品牌”选择框切换。</Paragraph>
  },
  {
    key: 'platform',
    label: 'AI 平台还没有连接',
    children: <Paragraph>进入“AI 平台管理”检查连接。连接尚未就绪时，可在“AI 回复监测”使用浏览器辅助或手动录入。</Paragraph>
  },
  {
    key: 'offline',
    label: '开发环境已离线',
    children: <Paragraph>重新启动开发服务并重新获取预览地址。Web 服务使用 5173 端口，API 服务使用 3001 端口。</Paragraph>
  },
  {
    key: 'load',
    label: '页面区域加载失败',
    children: <Paragraph>点击页面中的“重新加载”。持续失败时，在“内测反馈”记录页面、模块、错误现象和业务影响。</Paragraph>
  }
];

type UserGuideDrawerProps = {
  currentPath: string;
  mobile?: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  open: boolean;
};

export function UserGuideDrawer({ currentPath, mobile = false, onClose, onNavigate, open }: UserGuideDrawerProps) {
  return (
    <Drawer
      className="user-guide-drawer"
      destroyOnHidden
      onClose={onClose}
      open={open}
      placement="right"
      title="平台使用教程"
      width={mobile ? '100%' : 720}
    >
      <UserGuideContent currentPath={currentPath} onNavigate={onNavigate} />
    </Drawer>
  );
}

export function UserGuideContent({ currentPath, onNavigate }: Pick<UserGuideDrawerProps, 'currentPath' | 'onNavigate'>) {
  const tabs = [
    {
      key: 'quick-start',
      label: '第一次怎么用',
      children: (
        <div className="user-guide-section-stack">
          <Alert
            message="第一次只跑一个小闭环"
            description="选择一个品牌、一个优化单元、一个用户意图、一个问题、一个 AI 平台、一篇内容和一次复测。"
            showIcon
            type="info"
          />
          <div className="user-guide-flow" aria-label="八阶段 GEO 运营闭环">
            {operationWorkflow.map((stage, index) => {
              const detail = guideStageDetails[stage.key];
              const isCurrent = currentPath === stage.key;
              return (
                <Card className={isCurrent ? 'user-guide-stage user-guide-stage-current' : 'user-guide-stage'} key={stage.key} size="small">
                  <div className="user-guide-stage-heading">
                    <span className="user-guide-stage-number" aria-hidden="true">{index + 1}</span>
                    <div>
                      <Space size={6} wrap>
                        <Title level={5}>{stage.label}</Title>
                        {isCurrent ? <Tag color="blue">当前页面</Tag> : null}
                      </Space>
                      <Text type="secondary">{detail.goal}</Text>
                    </div>
                  </div>
                  <ol className="user-guide-action-list">
                    {detail.actions.map((action) => <li key={action}>{action}</li>)}
                  </ol>
                  <div className="user-guide-stage-footer">
                    <Text type="secondary">完成标准：{detail.done}</Text>
                    <Button onClick={() => onNavigate(stage.key)} type={isCurrent ? 'default' : 'primary'}>
                      {isCurrent ? '回到当前页面' : '开始这一步'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )
    },
    {
      key: 'map',
      label: '功能地图',
      children: (
        <div className="user-guide-domain-grid">
          {navigationGroups.map((group) => (
            <Card key={group.label} size="small" title={group.label}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {group.items.map((item) => (
                  <button className="user-guide-map-item" key={item.key} onClick={() => onNavigate(item.key)} type="button">
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </Space>
            </Card>
          ))}
        </div>
      )
    },
    {
      key: 'help',
      label: '术语与排错',
      children: (
        <div className="user-guide-section-stack">
          <Card size="small" title="常用术语">
            <dl className="user-guide-glossary">
              {glossary.map(([term, description]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card size="small" title="遇到问题怎么处理">
            <Collapse ghost items={troubleshootingItems} />
          </Card>
        </div>
      )
    }
  ];

  return (
    <div className="user-guide-content">
      <Paragraph className="user-guide-introduction">
        按八个阶段完成一次“资料准备、监测、优化、发布、复测”闭环。每张阶段卡都可以直接进入对应页面。
      </Paragraph>
      <Tabs defaultActiveKey="quick-start" items={tabs} />
    </div>
  );
}
