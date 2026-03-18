const inMemory = new Map<string, { count: number; expiresAt: number }>();

export function rateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const existing = inMemory.get(key);

  if (!existing || existing.expiresAt <= now) {
    inMemory.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  inMemory.set(key, existing);
  return { allowed: true, remaining: limit - existing.count };
}
