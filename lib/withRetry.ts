export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 1500
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const isRetryable =
        e?.status === 503 || e?.message?.includes("503") || e?.message?.includes("overloaded");
      if (!isRetryable || attempt === retries) break;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}
