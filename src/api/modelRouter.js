import {
  ROUTE_STRATEGY_COST_FIRST,
  ROUTE_STRATEGY_LATENCY_FIRST,
  ROUTE_STRATEGY_PRIORITY,
  normalizeModelRoute,
} from "./schemas";

const getChannelKey = (candidate) =>
  candidate?.channelId || candidate?.providerId || candidate?.provider || "";

const getChannel = (providers = {}, candidate = {}) => {
  const key = getChannelKey(candidate);
  return key ? providers[key] || null : null;
};

const getPriceWeight = (providers, candidate) => {
  const channel = getChannel(providers, candidate);
  const channelWeight = Number(channel?.pricing?.costWeight);
  const candidateWeight = Number(candidate?.costWeight);
  const normalizedChannel = Number.isFinite(channelWeight) ? channelWeight : 1;
  const normalizedCandidate = Number.isFinite(candidateWeight)
    ? candidateWeight
    : 1;
  return normalizedChannel * normalizedCandidate;
};

const getLatencyWeight = (providers, candidate) => {
  const channel = getChannel(providers, candidate);
  const latency = Number(channel?.stats?.avgLatencyMs || channel?.avgLatencyMs);
  return Number.isFinite(latency) && latency > 0 ? latency : Number.MAX_SAFE_INTEGER;
};

const sortCandidates = (candidates, providers, strategy) => {
  const list = [...candidates];
  if (strategy === ROUTE_STRATEGY_COST_FIRST) {
    return list.sort(
      (a, b) =>
        getPriceWeight(providers, a) - getPriceWeight(providers, b) ||
        Number(b.priority || 0) - Number(a.priority || 0)
    );
  }
  if (strategy === ROUTE_STRATEGY_LATENCY_FIRST) {
    return list.sort(
      (a, b) =>
        getLatencyWeight(providers, a) - getLatencyWeight(providers, b) ||
        Number(b.priority || 0) - Number(a.priority || 0)
    );
  }
  return list.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
};

export const buildFallbackRouteForConfig = (config = {}) =>
  normalizeModelRoute({
    id: config.id || config.modelName,
    logicalModelId: config.id || config.modelName,
    strategy: config.routeStrategy || ROUTE_STRATEGY_PRIORITY,
    fallbackEnabled: true,
    candidates: [
      {
        channelId: config.provider,
        providerId: config.provider,
        modelId: config.modelName || config.id,
        priority: config.priority ?? 50,
        costWeight: config.pricing?.costWeight ?? 1,
      },
    ],
  });

export const resolveModelRoute = ({
  config,
  providers = {},
  strategy,
  excludeChannelIds = [],
} = {}) => {
  if (!config) return null;
  const route = normalizeModelRoute(config.route || buildFallbackRouteForConfig(config));
  const excluded = new Set((excludeChannelIds || []).filter(Boolean));
  const candidates = route.candidates
    .filter((candidate) => candidate.enabled !== false)
    .filter((candidate) => !excluded.has(candidate.channelId))
    .filter((candidate) => {
      const channel = getChannel(providers, candidate);
      return channel ? channel.enabled !== false : true;
    });
  const ordered = sortCandidates(
    candidates,
    providers,
    strategy || route.strategy || ROUTE_STRATEGY_PRIORITY
  );
  const selected = ordered[0] || null;
  if (!selected) return null;
  const channelId = selected.channelId || selected.providerId;
  const channel = providers[channelId] || null;
  return {
    route,
    selected,
    candidates: ordered,
    channelId,
    providerId: selected.providerId || channelId,
    modelId: selected.modelId || config.modelName || config.id,
    channel,
  };
};
