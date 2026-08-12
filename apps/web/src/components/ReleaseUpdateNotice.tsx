import { useQuery } from '@tanstack/react-query';
import { Alert, Button } from 'antd';
import { getReleaseUpdate } from '../app/releaseUpdate';

const currentVersion = import.meta.env.VITE_APP_VERSION ?? '0.1.0';

export function ReleaseUpdateNotice() {
  const updateQuery = useQuery({
    queryKey: ['release-update', currentVersion],
    queryFn: () => getReleaseUpdate(currentVersion),
    staleTime: 1000 * 60 * 60 * 6,
    retry: false
  });
  const update = updateQuery.data;

  if (!update) return null;

  return (
    <Alert
      action={<Button onClick={() => window.open(update.url, '_blank', 'noopener,noreferrer')}>查看并下载更新</Button>}
      className="page-alert"
      description={update.notes || '新版本已发布，打开 GitHub Release 下载最新安装包。'}
      message={`发现新版本 ${update.version}`}
      showIcon
      type="info"
    />
  );
}
