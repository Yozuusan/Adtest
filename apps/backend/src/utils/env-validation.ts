/**
 * Validation des variables d'environnement au démarrage
 */

interface RequiredEnvVars {
  // Server
  PORT: string;
  APP_URL: string;
  
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SUPABASE_SECRET: string;
  
  // Shopify
  SHOPIFY_API_KEY: string;
  SHOPIFY_API_SECRET: string;
  
  // OpenAI
  OPENAI_API_KEY: string;
  
  // Redis
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  
  // Security
  ENCRYPTION_KEY: string;
  
  // Optional
  SENTRY_DSN?: string;
  FRONTEND_URL?: string;
}

export function validateEnvironment(): RequiredEnvVars {
  const requiredVars: (keyof RequiredEnvVars)[] = [
    'PORT',
    'APP_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SUPABASE_SECRET',
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'OPENAI_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'ENCRYPTION_KEY'
  ];

  const missingVars: string[] = [];
  const env: Partial<RequiredEnvVars> = {};

  // Vérifier les variables requises
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
    } else {
      env[varName] = value;
    }
  }

  // Vérifier les variables optionnelles
  if (process.env.SENTRY_DSN) {
    env.SENTRY_DSN = process.env.SENTRY_DSN;
  }

  if (process.env.FRONTEND_URL) {
    env.FRONTEND_URL = process.env.FRONTEND_URL;
  }

  // Valider les formats
  const validationErrors: string[] = [];

  // Valider PORT
  if (env.PORT && isNaN(Number(env.PORT))) {
    validationErrors.push('PORT must be a valid number');
  }

  // Valider APP_URL
  if (env.APP_URL && !env.APP_URL.startsWith('http')) {
    validationErrors.push('APP_URL must be a valid URL starting with http/https');
  }

  // Valider ENCRYPTION_KEY
  if (env.ENCRYPTION_KEY && env.ENCRYPTION_KEY.length < 32) {
    validationErrors.push('ENCRYPTION_KEY must be at least 32 characters long');
  }

  // Valider Supabase URL
  if (env.SUPABASE_URL && !env.SUPABASE_URL.includes('supabase.co')) {
    validationErrors.push('SUPABASE_URL must be a valid Supabase URL');
  }

  // Valider Shopify API
  if (env.SHOPIFY_API_KEY && env.SHOPIFY_API_KEY.length < 10) {
    validationErrors.push('SHOPIFY_API_KEY seems invalid (too short)');
  }

  if (env.SHOPIFY_API_SECRET && env.SHOPIFY_API_SECRET.length < 10) {
    validationErrors.push('SHOPIFY_API_SECRET seems invalid (too short)');
  }

  // Afficher les erreurs
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  if (validationErrors.length > 0) {
    throw new Error(`Environment validation errors: ${validationErrors.join('; ')}`);
  }

  console.log('✅ Environment variables validated successfully');
  
  return env as RequiredEnvVars;
}

export function getEnvVar(name: keyof RequiredEnvVars): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

export function getEnvVarOptional(name: keyof RequiredEnvVars): string | undefined {
  return process.env[name];
}
