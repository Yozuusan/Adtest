import { AnalyticsEvent } from '../types';
import { supabaseService } from './supabase';

export class AnalyticsService {
  /**
   * Sauvegarder un événement analytics
   */
  async saveEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Convertir le type AnalyticsEvent vers SupabaseAnalyticsEvent
      const supabaseEvent = {
        shop: event.metadata?.shop || 'unknown', // Changé de shop_domain à shop
        event_type: event.event_type,
        variant_handle: event.variant_handle,
        product_gid: event.product_gid,
        campaign_ref: event.campaign_ref,
        user_agent: event.user_agent,
        timestamp: event.timestamp,
        metadata: event.metadata || {}
      };

      await supabaseService.saveAnalyticsEvent(supabaseEvent);
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
      
      const data = await supabaseService.getAnalyticsStats(shop, startDate.toISOString());

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
      // Pour l'instant, on utilise getAnalyticsStats avec une période large
      // TODO: Implémenter une vraie pagination dans SupabaseService
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 jours
      const data = await supabaseService.getAnalyticsStats(shop, startDate.toISOString());

      // Simuler la pagination côté application
      const total = data?.length || 0;
      const paginatedData = data?.slice(offset, offset + limit) || [];
      
      return {
        shop,
        events: paginatedData,
        pagination: {
          limit,
          offset,
          total,
          has_more: total > offset + limit
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
      
      // Récupérer tous les événements et filtrer par variant
      const data = await supabaseService.getAnalyticsStats(shop, startDate.toISOString());
      const variantEvents = data?.filter((event: any) => event.variant_handle === variantHandle) || [];

      const performance = this.calculateVariantPerformance(variantEvents, period);
      
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
