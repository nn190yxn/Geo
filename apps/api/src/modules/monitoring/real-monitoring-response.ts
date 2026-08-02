import type { MonitoringRunDetail } from '@geo-platform/shared-types';

export function hasRealMonitoringResponse(run: MonitoringRunDetail): boolean {
  return run.platformCode !== 'mock_ai' && Boolean(run.response?.rawText.trim());
}
