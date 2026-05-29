export const API_CONFIG_SCHEMA_VERSION = 1;

export const ROUTE_STRATEGY_PRIORITY = "priority";
export const ROUTE_STRATEGY_COST_FIRST = "cost_first";
export const ROUTE_STRATEGY_LATENCY_FIRST = "latency_first";

export const DEFAULT_LIMIT_POLICY = Object.freeze({
  maxConcurrency: 0,
  rpm: 0,
  timeoutMs: 300000,
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    cooldownMs: 60000,
  },
});

export const DEFAULT_PRICING = Object.freeze({
  currency: "USD",
  inputPer1M: 0,
  outputPer1M: 0,
  imagePerUnit: 0,
  videoPerSecond: 0,
  costWeight: 1,
});

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampNonNegative = (value, fallback = 0) =>
  Math.max(0, toFiniteNumber(value, fallback));

export const normalizeLimitPolicy = (value = {}) => {
  const source = value && typeof value === "object" ? value : {};
  const circuitSource =
    source.circuitBreaker && typeof source.circuitBreaker === "object"
      ? source.circuitBreaker
      : {};
  return {
    maxConcurrency: Math.floor(
      clampNonNegative(source.maxConcurrency ?? source.concurrency, 0)
    ),
    rpm: Math.floor(clampNonNegative(source.rpm ?? source.requestsPerMinute, 0)),
    timeoutMs: Math.max(
      1000,
      Math.floor(clampNonNegative(source.timeoutMs, DEFAULT_LIMIT_POLICY.timeoutMs))
    ),
    circuitBreaker: {
      enabled: circuitSource.enabled !== false,
      failureThreshold: Math.max(
        1,
        Math.floor(
          clampNonNegative(
            circuitSource.failureThreshold,
            DEFAULT_LIMIT_POLICY.circuitBreaker.failureThreshold
          )
        )
      ),
      cooldownMs: Math.max(
        1000,
        Math.floor(
          clampNonNegative(
            circuitSource.cooldownMs,
            DEFAULT_LIMIT_POLICY.circuitBreaker.cooldownMs
          )
        )
      ),
    },
  };
};

export const normalizePricing = (value = {}) => {
  const source = value && typeof value === "object" ? value : {};
  return {
    currency: String(source.currency || DEFAULT_PRICING.currency).trim() || "USD",
    inputPer1M: clampNonNegative(source.inputPer1M ?? source.input, 0),
    outputPer1M: clampNonNegative(source.outputPer1M ?? source.output, 0),
    imagePerUnit: clampNonNegative(source.imagePerUnit ?? source.image, 0),
    videoPerSecond: clampNonNegative(source.videoPerSecond ?? source.video, 0),
    costWeight: Math.max(0.0001, toFiniteNumber(source.costWeight, 1)),
  };
};

export const normalizeProviderChannelFields = (providerId, value = {}) => {
  const source = value && typeof value === "object" ? value : {};
  const id = String(source.channelId || source.id || providerId || "").trim();
  const priority = Math.floor(toFiniteNumber(source.priority, 50));
  const limitPolicy = normalizeLimitPolicy({
    ...source.limitPolicy,
    maxConcurrency:
      source.limitPolicy?.maxConcurrency ??
      source.maxConcurrency ??
      source.concurrency,
    rpm: source.limitPolicy?.rpm ?? source.rpm ?? source.requestsPerMinute,
    timeoutMs: source.limitPolicy?.timeoutMs ?? source.timeoutMs,
  });
  return {
    channelId: id || String(providerId || "default"),
    enabled: source.enabled !== false,
    priority,
    routeStrategy: String(source.routeStrategy || ROUTE_STRATEGY_PRIORITY),
    limitPolicy,
    pricing: normalizePricing(source.pricing),
    tags: Array.isArray(source.tags)
      ? source.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
      : [],
  };
};

export const normalizeModelRouteCandidate = (candidate = {}) => {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    channelId: String(source.channelId || source.provider || "").trim(),
    providerId: String(source.providerId || source.provider || "").trim(),
    modelId: String(source.modelId || source.modelName || source.id || "").trim(),
    priority: Math.floor(toFiniteNumber(source.priority, 50)),
    costWeight: Math.max(0.0001, toFiniteNumber(source.costWeight, 1)),
    enabled: source.enabled !== false,
  };
};

export const normalizeModelRoute = (route = {}) => {
  const source = route && typeof route === "object" ? route : {};
  return {
    id: String(source.id || source.logicalModelId || "").trim(),
    logicalModelId: String(source.logicalModelId || source.id || "").trim(),
    strategy: String(source.strategy || ROUTE_STRATEGY_PRIORITY),
    fallbackEnabled: source.fallbackEnabled !== false,
    candidates: Array.isArray(source.candidates)
      ? source.candidates.map(normalizeModelRouteCandidate).filter((item) => item.channelId)
      : [],
  };
};

export const normalizeModelMetadata = (model = {}) => {
  const source = model && typeof model === "object" ? model : {};
  return {
    id: String(source.id || source.modelName || "").trim(),
    provider: String(source.provider || "").trim(),
    type: String(source.type || "Chat").trim(),
    capabilities: source.capabilities && typeof source.capabilities === "object"
      ? { ...source.capabilities }
      : {},
    pricing: normalizePricing(source.pricing),
    route: normalizeModelRoute(source.route || {
      id: source.id,
      logicalModelId: source.id,
      candidates: [
        {
          provider: source.provider,
          channelId: source.provider,
          modelId: source.modelName || source.id,
          priority: source.priority ?? 50,
        },
      ],
    }),
  };
};
