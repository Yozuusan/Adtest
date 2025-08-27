import { loadThemeAdapter } from './snippet';
import { cacheService } from '../services/cache';
import { supabaseService } from '../services/supabase';

jest.mock('../services/cache', () => ({
  cacheService: {
    getThemeAdapter: jest.fn(),
    saveThemeAdapter: jest.fn()
  }
}));

jest.mock('../services/supabase', () => ({
  supabaseService: {
    getThemeAdapter: jest.fn()
  }
}));

describe('loadThemeAdapter', () => {
  const shop = 'demo-shop';
  const fp = 'fp123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns adapter from cache', async () => {
    (cacheService.getThemeAdapter as jest.Mock).mockResolvedValue({ selectors: {} });
    const adapter = await loadThemeAdapter(shop, fp);
    expect(adapter).toEqual({ selectors: {} });
    expect(cacheService.getThemeAdapter).toHaveBeenCalledWith(shop, fp);
    expect(supabaseService.getThemeAdapter).not.toHaveBeenCalled();
  });

  it('falls back to supabase when cache misses', async () => {
    (cacheService.getThemeAdapter as jest.Mock).mockResolvedValue(null);
    (supabaseService.getThemeAdapter as jest.Mock).mockResolvedValue({ selectors: { title: '.x' } });
    const adapter = await loadThemeAdapter(shop, fp);
    expect(adapter).toEqual({ selectors: { title: '.x' } });
    expect(cacheService.getThemeAdapter).toHaveBeenCalledWith(shop, fp);
    expect(supabaseService.getThemeAdapter).toHaveBeenCalledWith(fp);
    expect(cacheService.saveThemeAdapter).toHaveBeenCalled();
  });

  it('throws if adapter not found', async () => {
    (cacheService.getThemeAdapter as jest.Mock).mockResolvedValue(null);
    (supabaseService.getThemeAdapter as jest.Mock).mockResolvedValue(null);
    await expect(loadThemeAdapter(shop, fp)).rejects.toThrow('Theme adapter not found');
  });
});
