// src/services/__tests__/crashReporting.test.ts
import { isExpectedOfflineFailure, scrubBreadcrumbUrl } from '../crashReporting';

const exception = (type: string, value: string) => ({
  exception: { values: [{ type, value }] },
});

describe('isExpectedOfflineFailure', () => {
  describe('drops expected offline noise', () => {
    it('drops React Native fetch failures', () => {
      expect(
        isExpectedOfflineFailure(exception('TypeError', 'Network request failed'))
      ).toBe(true);
    });

    it('drops Supabase edge function transport errors by type', () => {
      expect(
        isExpectedOfflineFailure(
          exception('FunctionsFetchError', 'Failed to send a request to the Edge Function')
        )
      ).toBe(true);
    });

    it('drops retryable auth fetch errors', () => {
      expect(
        isExpectedOfflineFailure(exception('AuthRetryableFetchError', 'fetch failed'))
      ).toBe(true);
    });

    it('drops message-only events from Logger.error with a non-Error payload', () => {
      expect(isExpectedOfflineFailure({ message: 'Network request failed' })).toBe(true);
    });
  });

  describe('keeps everything that is a real signal', () => {
    it('keeps ordinary runtime errors', () => {
      expect(
        isExpectedOfflineFailure(
          exception('TypeError', "Cannot read property 'id' of undefined")
        )
      ).toBe(false);
    });

    it('keeps server-side failures that did reach the server', () => {
      // FunctionsHttpError means we got a response — a 500 is a real defect.
      expect(
        isExpectedOfflineFailure(
          exception('FunctionsHttpError', 'Edge Function returned a non-2xx status code')
        )
      ).toBe(false);
    });

    it('keeps story errors that are not transport failures', () => {
      expect(
        isExpectedOfflineFailure(
          exception('StoryError', 'Add at least a year and denomination first.')
        )
      ).toBe(false);
    });

    it('keeps events with no exception and no message', () => {
      expect(isExpectedOfflineFailure({})).toBe(false);
    });

    it('does not let a message match rescue a real exception', () => {
      // Values present means we judge on the exception, not the message.
      expect(
        isExpectedOfflineFailure({
          ...exception('RangeError', 'Maximum call stack size exceeded'),
          message: 'Network request failed',
        })
      ).toBe(false);
    });
  });
});

describe('scrubBreadcrumbUrl', () => {
  const http = (url: string) => ({
    type: 'http',
    category: 'fetch',
    data: { method: 'GET', url, status_code: 200 },
  });

  it('drops the token from signed storage URLs', () => {
    const scrubbed = scrubBreadcrumbUrl(
      http('https://example.supabase.co/storage/v1/object/sign/coin-images/u/a.jpg?token=abc.def')
    );
    expect(scrubbed.data?.url).toBe(
      'https://example.supabase.co/storage/v1/object/sign/coin-images/u/a.jpg'
    );
  });

  it('drops PostgREST filters from database URLs', () => {
    const scrubbed = scrubBreadcrumbUrl(
      http('https://example.supabase.co/rest/v1/coins?select=*&name=ilike.*Lincoln*')
    );
    expect(scrubbed.data?.url).toBe('https://example.supabase.co/rest/v1/coins');
  });

  it('drops fragments', () => {
    expect(scrubBreadcrumbUrl(http('coin-odyssey://reset#access_token=abc')).data?.url).toBe(
      'coin-odyssey://reset'
    );
  });

  it('keeps the rest of the breadcrumb intact', () => {
    const scrubbed = scrubBreadcrumbUrl(http('https://example.supabase.co/rest/v1/coins?id=eq.1'));
    expect(scrubbed).toEqual({
      type: 'http',
      category: 'fetch',
      data: { method: 'GET', url: 'https://example.supabase.co/rest/v1/coins', status_code: 200 },
    });
  });

  it('returns URLs without a query string unchanged', () => {
    const crumb = http('https://example.supabase.co/functions/v1/recognize-coin');
    expect(scrubBreadcrumbUrl(crumb)).toBe(crumb);
  });

  it('leaves breadcrumbs without a URL alone', () => {
    const crumb = { category: 'console', message: 'hello', data: { arguments: ['hello'] } };
    expect(scrubBreadcrumbUrl(crumb)).toBe(crumb);
    const navigation = { category: 'navigation' };
    expect(scrubBreadcrumbUrl(navigation)).toBe(navigation);
  });
});
