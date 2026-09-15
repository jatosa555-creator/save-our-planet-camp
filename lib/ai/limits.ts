let activeGenerations = 0;
const sessionGenerations = new Map<string, number>();

export function getGenerationLimit() {
  return Number(process.env.MAX_GENERATIONS_PER_SESSION || 5);
}

export function acquireGenerationSlot(sessionKey: string) {
  const maxConcurrent = Number(process.env.MAX_CONCURRENT_GENERATIONS || 4);
  const maxPerSession = getGenerationLimit();
  const currentSession = sessionGenerations.get(sessionKey) || 0;
  if (activeGenerations >= maxConcurrent) throw new Error("GENERATION_QUEUE_FULL");
  if (currentSession >= maxPerSession) throw new Error("SESSION_QUOTA_REACHED");
  activeGenerations += 1;
  sessionGenerations.set(sessionKey, currentSession + 1);
  return () => { activeGenerations = Math.max(0, activeGenerations - 1); };
}
