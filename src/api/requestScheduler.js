const createBucket = () => ({ active: 0, starts: [], failures: [], suspendedUntil: 0 });

export class RequestScheduler {
  constructor() {
    this.buckets = new Map();
  }

  getBucket(key) {
    const normalized = String(key || "default");
    if (!this.buckets.has(normalized)) this.buckets.set(normalized, createBucket());
    return this.buckets.get(normalized);
  }

  async run(key, limitPolicy, fn) {
    const bucket = this.getBucket(key);
    const policy = limitPolicy || {};
    const maxConcurrency = Number(policy.maxConcurrency || 0);
    const rpm = Number(policy.rpm || 0);
    const timeoutMs = Number(policy.timeoutMs || 0);
    await this.acquireSlot(bucket, { maxConcurrency, rpm });
    try {
      const result = timeoutMs > 0 ? await this.withTimeout(fn(), timeoutMs) : await fn();
      bucket.failures = [];
      return result;
    } catch (error) {
      this.recordFailure(bucket, policy);
      throw error;
    } finally {
      bucket.active = Math.max(0, bucket.active - 1);
    }
  }

  async acquireSlot(bucket, policy) {
    while (true) {
      const now = Date.now();
      bucket.starts = bucket.starts.filter((ts) => now - ts < 60000);
      const suspendedWait = Math.max(0, bucket.suspendedUntil - now);
      const concurrencyWait = policy.maxConcurrency > 0 && bucket.active >= policy.maxConcurrency;
      const rpmWait = policy.rpm > 0 && bucket.starts.length >= policy.rpm;
      if (!suspendedWait && !concurrencyWait && !rpmWait) {
        bucket.active += 1;
        bucket.starts.push(now);
        return;
      }
      const waitMs = suspendedWait || (rpmWait ? 1000 : 100);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  async withTimeout(promise, timeoutMs) {
    let timer = null;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`请求超时 (${timeoutMs}ms)`)), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  recordFailure(bucket, policy = {}) {
    const breaker = policy.circuitBreaker || {};
    if (breaker.enabled === false) return;
    const threshold = Math.max(1, Number(breaker.failureThreshold || 5));
    const cooldownMs = Math.max(1000, Number(breaker.cooldownMs || 60000));
    const now = Date.now();
    bucket.failures = bucket.failures.filter((ts) => now - ts < cooldownMs);
    bucket.failures.push(now);
    if (bucket.failures.length >= threshold) {
      bucket.suspendedUntil = now + cooldownMs;
      bucket.failures = [];
    }
  }
}

export const requestScheduler = new RequestScheduler();
