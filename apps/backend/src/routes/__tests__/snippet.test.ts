import { describe, it, expect, jest, afterEach } from '@jest/globals';

jest.mock('@upstash/redis', () => {
  return {
    Redis: class {
      get = jest.fn();
      set = jest.fn();
      ping = jest.fn();
    }
  };
});

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      from: () => ({
        select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ data: [] }) }) }) })
      })
    })
  };
});

import * as snippet from '../snippet';

describe('getThemeAdapterForShop', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves a theme adapter', async () => {
    jest.spyOn(snippet, 'getCachedThemeAdapter').mockResolvedValue(null);
    jest.spyOn(snippet, 'getThemeAdapterFromDatabase').mockResolvedValue(null);
    jest.spyOn(snippet, 'generateSmartAdapter').mockResolvedValue({ id: 'smart' } as any);
    jest.spyOn(snippet, 'saveThemeAdapterToDatabase').mockResolvedValue();
    jest.spyOn(snippet, 'cacheThemeAdapter').mockResolvedValue();

    const result = await snippet.getThemeAdapterForShop('shop.test');
    expect(result).toBeDefined();
  });
});
