import { Card, Col, Empty, List, Row, Space, Tag, Typography } from 'antd';
import type { ChannelRoadmap, ChannelRoadmapItem, ChannelRoadmapWindow } from '@geo-platform/shared-types';

const windowMeta: Array<{ value: ChannelRoadmapWindow; title: string; description: string }> = [
  { value: '0_30_days', title: '0-30 天', description: '优先补齐真实样本已验证的高价值渠道' },
  { value: '30_60_days', title: '30-60 天', description: '扩展中优先级渠道并形成稳定发布节奏' },
  { value: '60_90_days', title: '60-90 天', description: '验证行业参考渠道并沉淀长期内容资产' }
];

const priorityLabels = { high: '高优先级', medium: '中优先级', low: '待验证' } as const;
const priorityColors = { high: 'red', medium: 'gold', low: 'default' } as const;

export function ChannelRoadmapBoard({ roadmap, loading = false }: { roadmap?: ChannelRoadmap | null; loading?: boolean }) {
  if (loading) return <Card title="渠道建设蓝图与 30/60/90 路线图" loading />;
  if (!roadmap) {
    return (
      <Card title="渠道建设蓝图与 30/60/90 路线图">
        <Empty description="渠道路线图暂时无法加载" />
      </Card>
    );
  }

  return (
    <Card title="渠道建设蓝图与 30/60/90 路线图">
      <Row gutter={[16, 16]}>
        {windowMeta.map((window) => {
          const items = roadmap.items.filter((item) => item.window === window.value);
          return (
            <Col xs={24} xl={8} key={window.value}>
              <Card size="small" title={window.title} extra={<Tag>{items.length} 项动作</Tag>}>
                <Typography.Paragraph type="secondary">{window.description}</Typography.Paragraph>
                <List
                  dataSource={items}
                  locale={{ emptyText: '当前窗口暂无渠道动作' }}
                  renderItem={(item) => <RoadmapItem item={item} />}
                />
              </Card>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}

function RoadmapItem({ item }: { item: ChannelRoadmapItem }) {
  return (
    <List.Item>
      <Space direction="vertical" size={6} className="page-stack">
        <Space wrap>
          <Typography.Text strong>{item.channelName}</Typography.Text>
          <Tag color={priorityColors[item.priority]}>{priorityLabels[item.priority]}</Tag>
          <Tag color={item.coverageStatus === 'sample_covered' ? 'green' : 'default'}>
            {item.coverageStatus === 'sample_covered' ? '真实样本已覆盖' : '计划验证'}
          </Tag>
        </Space>
        {item.domain ? <Typography.Text type="secondary">目标域名：{item.domain}</Typography.Text> : null}
        <Typography.Text>内容形态：{item.contentFormats.join('、')}</Typography.Text>
        <Typography.Text>建议数量：{item.recommendedQuantity} 项</Typography.Text>
        <Typography.Text>发布节奏：{item.cadence}</Typography.Text>
        <Typography.Text>负责角色：{item.ownerRole}</Typography.Text>
        <Typography.Text type="secondary">推荐依据：{item.evidence.join('；')}</Typography.Text>
      </Space>
    </List.Item>
  );
}
