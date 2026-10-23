// src/services/__tests__/scanPipeline.test.ts
//
// The four scan stages and the review screen's lines, shared by the mobile and
// web scans (packages/shared/src/utils/scanPipeline.ts).
import {
  PipelineError,
  RecognitionError,
  formatMintMark,
  runScanStages,
  scanCoinFields,
  scanReviewFields,
  scanReviewHeader,
  type CoinRecognitionResult,
  type StageUpdate,
} from '@coin-collecting/shared';

const recognition: CoinRecognitionResult = {
  denomination: 'Quarter',
  year: 1964,
  country: 'United States',
  currency: 'USD',
  faceValue: 0.25,
  mintMark: 'd',
  design: null,
  category: 'circulating',
  composition: '90% Silver',
  confidence: 'high',
  grade: 'VF-30',
  gradeConfidence: 'medium',
  notes: 'Even wear on the high points',
  history: 'The last year of silver quarters.',
};

function run(over: Partial<Parameters<typeof runScanStages>[0]> = {}) {
  const updates: StageUpdate[] = [];
  const saved: unknown[] = [];
  const promise = runScanStages({
    recognize: async () => recognition,
    save: async fields => {
      saved.push(fields);
      return { id: 'c1', ...fields } as never;
    },
    onProgress: u => updates.push(u),
    dwellMs: 0,
    ...over,
  });
  return { promise, updates, saved };
}

describe('scan stages', () => {
  it('runs all four stages and saves the scan with its notes and metal', async () => {
    const { promise, updates, saved } = run();
    const result = await promise;
    expect(result.coin.id).toBe('c1');
    expect(updates.filter(u => u.state === 'done').map(u => u.stage)).toEqual([1, 2, 3, 4]);
    expect(saved[0]).toMatchObject({
      source: 'scan',
      mintMark: 'D',
      composition: '90% Silver',
      conditionNotes: 'Even wear on the high points',
      historicalNotes: 'The last year of silver quarters.',
      category: 'circulating',
    });
  });

  it('warns, not fails, when grade and story are missing', async () => {
    const { promise, updates } = run({ recognize: async () => ({ ...recognition, grade: null, history: null }) });
    await promise;
    expect(updates.find(u => u.stage === 2 && u.state !== 'active')?.state).toBe('warn');
    expect(updates.find(u => u.stage === 3 && u.state !== 'active')?.state).toBe('warn');
  });

  it('stops at identify when the coin is unrecognized, keeping the recognition', async () => {
    const { promise, saved } = run({ recognize: async () => ({ ...recognition, confidence: 'unrecognized' }) });
    const err = await promise.catch(e => e);
    expect(err).toBeInstanceOf(PipelineError);
    expect(err.type).toBe('unrecognized');
    expect(err.partial?.recognition).toBeDefined();
    expect(saved).toHaveLength(0);
  });

  it('maps recognizer errors to the screen error types', async () => {
    const cases: [RecognitionError['code'], string][] = [
      ['quota_exceeded', 'quota'],
      ['rate_limit', 'rate_limit'],
      ['auth', 'auth'],
      ['service_unavailable', 'network'],
    ];
    for (const [code, type] of cases) {
      const { promise } = run({ recognize: async () => { throw new RecognitionError('x', code); } });
      expect((await promise.catch(e => e)).type).toBe(type);
    }
  });

  it('reports a failed save at stage 4 with the recognition', async () => {
    const { promise } = run({ save: async () => { throw new Error('Unable to save your coin.'); } });
    const err = await promise.catch(e => e);
    expect(err.type).toBe('save_failed');
    expect(err.stage).toBe(4);
    expect(err.partial?.recognition?.year).toBe(1964);
  });

  it('fills in the required fields when the recognizer leaves them blank', () => {
    const fields = scanCoinFields({ ...recognition, year: null, denomination: null, mintMark: null });
    expect(fields.year).toBe(0);
    expect(fields.denomination).toBe('Unknown');
    expect(fields.mintMark).toBeUndefined();
  });
});

describe('scan review lines', () => {
  it('builds the header from the overall confidence', () => {
    expect(scanReviewHeader(recognition, 'x')).toEqual({
      title: 'United States · Quarter',
      subtitle: '1964 · 90% SILVER · VF-30',
      eyebrow: '✓ IDENTIFIED · 90%',
      level: 'h',
    });
  });

  it('badges only the grade, and marks blanks', () => {
    const fields = scanReviewFields({ ...recognition, country: null }, formatMintMark, c => c.toUpperCase());
    expect(fields.filter(f => f.level).map(f => f.label)).toEqual(['ESTIMATED GRADE']);
    expect(fields.find(f => f.label === 'COUNTRY')).toMatchObject({ value: '—', placeholder: true });
    expect(fields.find(f => f.label === 'FACE VALUE')?.value).toBe('$0.25');
  });
});

describe('scan allowance', () => {
  const { parseScanAllowance, scanAllowanceLine } = require('@coin-collecting/shared');
  const ok = { success: true, result: { used: 7, limit: 25, remaining: 18, resetsAt: '2026-11-01T00:00:00.000Z' } };

  it('reads the function response and rejects anything else', () => {
    expect(parseScanAllowance(ok)).toEqual(ok.result);
    expect(parseScanAllowance({ success: false, error: 'x' })).toBeNull();
    expect(parseScanAllowance({ success: true, result: { used: '7' } })).toBeNull();
    expect(parseScanAllowance(null)).toBeNull();
  });

  it('says how many are left, or when more arrive', () => {
    expect(scanAllowanceLine(ok.result)).toBe('18 of 25 free scans left this month');
    expect(scanAllowanceLine({ ...ok.result, remaining: 1 })).toBe('1 of 25 free scan left this month');
    expect(scanAllowanceLine({ ...ok.result, used: 25, remaining: 0 })).toBe('No free scans left this month · more on November 1');
  });
});
