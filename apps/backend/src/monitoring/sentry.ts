import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialise Sentry avec la configuration
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.warn('⚠️ SENTRY_DSN non défini - Sentry désactivé');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        new ProfilingIntegration(),
      ],
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Capture des erreurs non gérées
      autoSessionTracking: true,
    });

    console.log('✅ Sentry initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Sentry:', error);
  }
}

/**
 * Handler Sentry pour capturer les requêtes
 */
export function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}

/**
 * Handler Sentry pour capturer les erreurs
 */
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}

/**
 * Capture une erreur dans Sentry
 */
export function captureError(error: Error, context?: Record<string, any>): void {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture un message dans Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Ajoute du contexte utilisateur à Sentry
 */
export function setUser(user: { id: string; email?: string; shop_id?: string }): void {
  Sentry.setUser(user);
}

/**
 * Ajoute des tags à Sentry
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Ajoute du contexte à Sentry
 */
export function setContext(name: string, context: Record<string, any>): void {
  Sentry.setContext(name, context);
}
