import { createClient } from '@supabase/supabase-js';
import { AnalyticsEvent } from '@adlign/types';

// Type local pour la base de données Supabase
interface SupabaseAnalyticsEvent {
  id: string;
  event_type: string;
  shop: string;
  variant_handle: string;
  product_gid: string;
  user_agent?: string;
  timestamp: string;
  created_at: string;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class AnalyticsService {
  /**
   * Sauvegarder un événement analytics
   */
  async saveEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Convertir le type AnalyticsEvent vers SupabaseAnalyticsEvent
      const supabaseEvent: SupabaseAnalyticsEvent = {
        id: event.id,
        event_type: event.event_type,
        shop: event.metadata?.shop || 'unknown',
        variant_handle: event.variant_id,
        product_gid: event.product_gid,
        user_agent: event.user_agent,
        timestamp: event.timestamp,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('analytics_events')
        .insert(supabaseEvent);

      if (error) {
        console.error('❌ Error saving analytics event:', error);
        throw new Error(`Failed to save analytics event: ${error.message}`);
      }

      console.log(`✅ Analytics event saved: ${event.event_type} for shop ${supabaseEvent.shop}`);
    } catch (error) {
      console.error('❌ Analytics service error:', error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques d'une boutique
   */
  async getStats(shop: string, period: string): Promise<any> {
    try {
      const startDate = this.getStartDate(period);
      
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('shop', shop)
        .gte('timestamp', startDate.toISOString());

      if (error) {
        console.error('❌ Error fetching analytics stats:', error);
        throw new Error(`Failed to fetch analytics stats: ${error.message}`);
      }

      // Calculer les statistiques
      const stats = this.calculateStats(data || [], period);
      
      return {
        shop,
        period,
        total_events: data?.length || 0,
        ...stats,
        retrieved_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Analytics stats error:', error);
      throw error;
    }
  }

  /**
   * Récupérer les événements d'une boutique
   */
  async getEvents(shop: string, limit: number, offset: number): Promise<any> {
    try {
      const { data, error, count } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact' })
        .eq('shop', shop)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Error fetching analytics events:', error);
        throw new Error(`Failed to fetch analytics events: ${error.message}`);
      }

      return {
        shop,
        events: data || [],
        pagination: {
          limit,
          offset,
          total: count || 0,
          has_more: (count || 0) > offset + limit
        },
        retrieved_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Analytics events error:', error);
      throw error;
    }
  }

  /**
   * Récupérer les performances d'un variant
   */
  async getVariantPerformance(shop: string, variantHandle: string, period: string): Promise<any> {
    try {
      const startDate = this.getStartDate(period);
      
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('shop', shop)
        .eq('variant_handle', variantHandle)
        .gte('timestamp', startDate.toISOString());

      if (error) {
        console.error('❌ Error fetching variant performance:', error);
        throw new Error(`Failed to fetch variant performance: ${error.message}`);
      }

      const performance = this.calculateVariantPerformance(data || [], period);
      
      return {
        shop,
        variant_handle: variantHandle,
        period,
        ...performance,
        retrieved_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Variant performance error:', error);
      throw error;
    }
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateStats(events: any[], period: string): any {
    const stats = {
      events_by_type: {
        variant_view: 0,
        variant_click: 0,
        variant_conversion: 0,
        page_view: 0
      },
      top_variants: [] as any[],
      conversion_rate: 0
    };

    // Compter par type d'événement
    events.forEach(event => {
      if (stats.events_by_type[event.event_type as keyof typeof stats.events_by_type] !== undefined) {
        stats.events_by_type[event.event_type as keyof typeof stats.events_by_type]++;
      }
    });

    // Calculer le taux de conversion
    const views = stats.events_by_type.variant_view;
    const conversions = stats.events_by_type.variant_conversion;
    stats.conversion_rate = views > 0 ? (conversions / views) * 100 : 0;

    return stats;
  }

  private calculateVariantPerformance(events: any[], period: string): any {
    const performance = {
      views: 0,
      clicks: 0,
      conversions: 0,
      conversion_rate: 0,
      revenue: 0
    };

    events.forEach(event => {
      switch (event.event_type) {
        case 'variant_view':
          performance.views++;
          break;
        case 'variant_click':
          performance.clicks++;
          break;
        case 'variant_conversion':
          performance.conversions++;
          break;
      }
    });

    performance.conversion_rate = performance.views > 0 ? (performance.conversions / performance.views) * 100 : 0;

    return performance;
  }
}

export const analyticsService = new AnalyticsService();
