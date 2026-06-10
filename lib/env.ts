/**
 * Environment and deployment configuration
 * Single source of truth for MongoDB vs local storage and deployment mode
 */

export function useMongoDB(): boolean {
  const uri = process.env.MONGODB_URI;
  const forceLocal = process.env.USE_LOCAL_STORAGE === 'true';
  if (forceLocal) return false;
  return Boolean(uri && uri.trim().length > 0);
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getMongoUri(): string | undefined {
  return process.env.MONGODB_URI?.trim() || undefined;
}
