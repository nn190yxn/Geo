import { useState } from 'react';
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SearchDemandCandidateConfirmationResult, SearchDemandSnapshot, SearchDemandSnapshotInput, SearchDemandSource } from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { PageErrorAlert } from '../../../components/PageState';

type Props = { brandId: string };

const sourceLabels: Record<SearchDemandSource, string> = {
  baidu: '百度补全',
  google: 'Google 补全',
  manual: '人工录入'
};

export function SearchDemandSnapshotPanel({ brandId }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const [seedTerm, setSeedTerm] = useState('');
  const [market, setMarket] = useState('中国');
  const [source, setSource] = useState<SearchDemandSource>('baidu');
  const [manualQuestions, setManualQuestions] = useState('');
  const snapshotsQuery = useQuery({
    queryKey: ['demand-snapshots', brandId],
    queryFn: () => apiGet<SearchDemandSnapshot[]>(`/brands/${brandId}/demand-snapshots`)
  });
  const snapshots = snapshotsQuery.data?.success ? snapshotsQuery.data.data : [];
  const captureMutation = useMutation({
    mutationFn: () => apiPost<SearchDemandSnapshot>(`/brands/${brandId}/demand-snapshots`, {
      seedTerm,
      market,
      source,
      candidateQuestions: source === 'manual' ? splitQuestions(manualQuestions) : undefined
    } satisfies SearchDemandSnapshotInput),
    onSuccess: (response) => {
      if (!response.success) return void messageApi.error(response.error.message);
      setManualQuestions('');
      void queryClient.invalidateQueries({ queryKey: ['demand-snapshots', brandId] });
      void messageApi.success(`需求快照已保存，共 ${response.data.candidateQuestions.length} 个候选问句`);
    }
  });
  const confirmMutation = useMutation({
    mutationFn: ({ snapshotId, candidateId }: { snapshotId: string; candidateId: string }) => apiPost<SearchDemandCandidateConfirmationResult>(
      `/brands/${brandId}/demand-snapshots/${snapshotId}/candidates/${candidateId}/confirm`,
      {}
    ),
    onSuccess: (response) => {
      if (!response.success) return void messageApi.error(response.error.message);
      void queryClient.invalidateQueries({ queryKey: ['demand-snapshots', brandId] });
      void queryClient.invalidateQueries({ queryKey: ['test-themes', brandId] });
      void queryClient.invalidateQueries({ queryKey: ['test-question-candidates', brandId] });
      void messageApi.success('候选问句已加入稳定监测问题库');
    }
  });

  return (
    <Card size="small" title="搜索需求快照">
      {contextHolder}
      <Space direction="vertical" size={12} className="page-stack">
        <Alert type="info" showIcon message="用搜索补全发现正在出现的新问法" description="系统会保留词根、来源、市场和采集时间。第二次采集后，新出现的候选只标记为需求上升观察，历史快照保持原样。" />
        <Space wrap>
          <Input value={seedTerm} placeholder="搜索词根，例如儿童体能" aria-label="搜索需求词根" onChange={(event) => setSeedTerm(event.target.value)} />
          <Input value={market} placeholder="市场，例如中国或贵阳" aria-label="搜索需求市场" onChange={(event) => setMarket(event.target.value)} />
          <Select<SearchDemandSource>
            value={source}
            aria-label="搜索补全来源"
            options={Object.entries(sourceLabels).map(([value, label]) => ({ value: value as SearchDemandSource, label }))}
            onChange={setSource}
          />
          <Button type="primary" loading={captureMutation.isPending} disabled={!seedTerm.trim() || !market.trim() || (source === 'manual' && splitQuestions(manualQuestions).length === 0)} onClick={() => captureMutation.mutate()}>采集需求快照</Button>
        </Space>
        {source === 'manual' ? <Input.TextArea value={manualQuestions} rows={3} aria-label="人工候选问句" placeholder="每行填写一个候选问句" onChange={(event) => setManualQuestions(event.target.value)} /> : null}
        <PageErrorAlert response={snapshotsQuery.data} />
        <SearchDemandSnapshotContent
          snapshots={snapshots}
          confirmingId={confirmMutation.variables?.candidateId}
          onConfirm={(snapshotId, candidateId) => confirmMutation.mutate({ snapshotId, candidateId })}
        />
      </Space>
    </Card>
  );
}

export function SearchDemandSnapshotContent({
  snapshots,
  confirmingId,
  onConfirm
}: {
  snapshots: SearchDemandSnapshot[];
  confirmingId?: string;
  onConfirm: (snapshotId: string, candidateId: string) => void;
}) {
  const rows = snapshots.slice(0, 5).flatMap((snapshot) => snapshot.candidateQuestions.map((candidate) => ({ snapshot, candidate })));
  return (
    <Table
      rowKey={({ candidate }) => candidate.id}
      size="small"
      dataSource={rows}
      pagination={false}
      scroll={{ x: 960 }}
      locale={{ emptyText: '还没有需求快照，请填写词根并采集' }}
      columns={[
        { title: '词根', render: (_, row) => row.snapshot.seedTerm },
        { title: '来源', render: (_, row) => sourceLabels[row.snapshot.source] },
        { title: '市场', render: (_, row) => row.snapshot.market },
        { title: '采集时间', render: (_, row) => new Date(row.snapshot.capturedAt).toLocaleString('zh-CN') },
        { title: '候选问句', render: (_, row) => <Typography.Text>{row.candidate.question}</Typography.Text> },
        { title: '需求观察', render: (_, row) => row.candidate.risingObservation ? <Tag color="orange">需求上升观察</Tag> : <Tag>已有或首期候选</Tag> },
        {
          title: '入库状态',
          render: (_, row) => row.candidate.status === 'confirmed'
            ? <Tag color="green">已加入监测问题库</Tag>
            : <Button type="link" loading={confirmingId === row.candidate.id} onClick={() => onConfirm(row.snapshot.id, row.candidate.id)}>确认入库</Button>
        }
      ]}
    />
  );
}

function splitQuestions(value: string): string[] {
  return value.split(/[\n,，]+/).map((item) => item.trim()).filter(Boolean);
}
