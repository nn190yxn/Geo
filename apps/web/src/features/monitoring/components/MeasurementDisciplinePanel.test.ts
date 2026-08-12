import { describe, expect, it } from 'vitest';
import { parseExternalEvents, toAttributionInput } from './MeasurementDisciplinePanel';

describe('MeasurementDisciplinePanel attribution input', () => {
  it('parses control questions and supported external event categories', () => {
    expect(toAttributionInput({
      baselineWindowStart: '2026-07-01', baselineWindowEnd: '2026-07-31',
      observationWindowStart: '2026-08-01', observationWindowEnd: '2026-08-31',
      controlQuestionsText: '问题一\n\n问题二',
      externalEventsText: '2026-08-03|model_update|模型升级\n2026-08-04|unexpected|其他事件',
      conclusion: '指标改善'
    })).toMatchObject({
      controlQuestions: ['问题一', '问题二'],
      externalEvents: [
        { date: '2026-08-03', category: 'model_update', title: '模型升级' },
        { date: '2026-08-04', category: 'other', title: '其他事件' }
      ]
    });
  });

  it('drops incomplete external event lines', () => {
    expect(parseExternalEvents('2026-08-03|campaign|\n|other|缺少日期')).toEqual([]);
  });
});
