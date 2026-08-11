import { dateTime } from '@grafana/data';

import { parseReportTimeRange, convertTimeRangeToUtc } from './time';

describe('parseReportTimeRange', () => {
  it('should handle relative time ranges', () => {
    const timeRange = {
      from: 'now-6h',
      to: 'now',
    };

    const result = parseReportTimeRange(timeRange);

    expect(result).toEqual({
      from: 'now-6h',
      to: 'now',
      raw: {
        from: 'now-6h',
        to: 'now',
      },
    });
  });

  it('should handle absolute time ranges with epoch time format', () => {
    const timeRange = {
      from: '1715846400000', // 2024-05-16T08:00:00.000Z
      to: '1715932800000', // 2024-05-17T08:00:00.000Z
    };

    const result = parseReportTimeRange(timeRange);

    expect(result).toEqual({
      from: '2024-05-16T08:00:00.000Z',
      to: '2024-05-17T08:00:00.000Z',
      raw: {
        from: '1715846400000',
        to: '1715932800000',
      },
    });
  });

  it('should handle absolute time ranges with ISO format', () => {
    const timeRange = {
      from: '2025-05-16T02:59:59.000Z',
      to: '2025-05-17T02:59:59.000Z',
    };

    const result = parseReportTimeRange(timeRange);

    expect(result).toEqual({
      from: '2025-05-16T02:59:59.000Z',
      to: '2025-05-17T02:59:59.000Z',
      raw: {
        from: '2025-05-16T02:59:59.000Z',
        to: '2025-05-17T02:59:59.000Z',
      },
    });
  });

  it('should handle empty string time ranges', () => {
    const timeRange = {
      from: '',
      to: '',
    };

    const result = parseReportTimeRange(timeRange);

    expect(result).toEqual({
      from: '',
      to: '',
      raw: {
        from: '',
        to: '',
      },
    });
  });
});

describe('parseToEpoch', () => {
  it('should handle relative time ranges', () => {
    const timeRange = {
      from: 'now-6h',
      to: 'now',
    };
    const result = convertTimeRangeToUtc(timeRange);
    expect(result).toEqual({
      from: 'now-6h',
      to: 'now',
      raw: {
        from: 'now-6h',
        to: 'now',
      },
    });
  });

  it('should handle absolute time ranges with ISO format', () => {
    const timeRange = {
      from: '2025-05-16T02:59:59.000Z',
      to: '2025-05-17T02:59:59.000Z',
    };
    const result = convertTimeRangeToUtc(timeRange);
    expect(result.from.toString()).toEqual('Fri May 16 2025 02:59:59 GMT+0000');
    expect(result.to.toString()).toEqual('Sat May 17 2025 02:59:59 GMT+0000');
    expect(result.raw.from.toString()).toEqual('Fri May 16 2025 02:59:59 GMT+0000');
    expect(result.raw.to.toString()).toEqual('Sat May 17 2025 02:59:59 GMT+0000');
  });

  it('should handle absolute time ranges with epoch time format', () => {
    const timeRange = {
      from: '1747364399000',
      to: '1747450799000',
    };
    const result = convertTimeRangeToUtc(timeRange);
    expect(result.from.toString()).toEqual('Fri May 16 2025 02:59:59 GMT+0000');
    expect(result.to.toString()).toEqual('Sat May 17 2025 02:59:59 GMT+0000');
    expect(result.raw.from.toString()).toEqual('Fri May 16 2025 02:59:59 GMT+0000');
    expect(result.raw.to.toString()).toEqual('Sat May 17 2025 02:59:59 GMT+0000');
  });

  it('should handle absolute time ranges as moment object', () => {
    const timeRange = {
      from: dateTime('2025-05-16T02:59:59.000Z'),
      to: dateTime('2025-05-17T02:59:59.000Z'),
    };
    const result = convertTimeRangeToUtc(timeRange);
    expect(result.from.toString()).toEqual('Fri May 16 2025 02:59:59 GMT+0000');
    expect(result.to.toString()).toEqual('Sat May 17 2025 02:59:59 GMT+0000');
    expect(result.raw.from.toString()).toEqual('Fri May 16 2025 02:59:59 GMT+0000');
    expect(result.raw.to.toString()).toEqual('Sat May 17 2025 02:59:59 GMT+0000');
  });

  it('should handle empty string time ranges', () => {
    const timeRange = {
      from: '',
      to: '',
    };
    const result = convertTimeRangeToUtc(timeRange);
    expect(result).toEqual({
      from: '',
      to: '',
      raw: {
        from: '',
        to: '',
      },
    });
  });
});
