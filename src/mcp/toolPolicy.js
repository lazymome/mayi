import { TAPNOW_CORE_TOOLS, TOOL_RISK } from "./toolRegistry";

const TOOL_BY_NAME = new Map(TAPNOW_CORE_TOOLS.map((tool) => [tool.name, tool]));

const DEFAULT_LIMITS = {
  batch_image_generation: { count: 4 },
  compare_image_generation: { models: 3 },
  start_video_generation: { referenceImages: 4 },
  start_image_generation: { referenceImages: 4 },
};

export const getTapnowToolDefinition = (toolName) => TOOL_BY_NAME.get(toolName) || null;

export const getTapnowToolRisk = (toolName) =>
  getTapnowToolDefinition(toolName)?.risk || TOOL_RISK.EXTERNAL;

export const shouldAutoRunTapnowTool = (toolName) =>
  getTapnowToolRisk(toolName) === TOOL_RISK.READ;

export const requiresTapnowToolConfirmation = (toolName) =>
  !shouldAutoRunTapnowTool(toolName);

export const validateTapnowToolPolicy = (toolName, args = {}) => {
  const limits = DEFAULT_LIMITS[toolName];
  if (!limits) return { ok: true };
  if (limits.count && Number(args.count || 1) > limits.count) {
    return {
      ok: false,
      reason: `批量生成数量超过安全上限 ${limits.count}`,
    };
  }
  if (limits.models && Array.isArray(args.models) && args.models.length > limits.models) {
    return {
      ok: false,
      reason: `模型对比数量超过安全上限 ${limits.models}`,
    };
  }
  if (
    limits.referenceImages &&
    Array.isArray(args.referenceImages) &&
    args.referenceImages.length > limits.referenceImages
  ) {
    return {
      ok: false,
      reason: `参考图数量超过安全上限 ${limits.referenceImages}`,
    };
  }
  return { ok: true };
};

const summarizeValue = (value) => {
  if (Array.isArray(value)) return `${value.length} 项`;
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 80)}...` : value;
  if (value && typeof value === "object") return JSON.stringify(value).slice(0, 120);
  return String(value ?? "");
};

export const describeTapnowToolCall = (toolName, args = {}) => {
  const tool = getTapnowToolDefinition(toolName);
  const risk = getTapnowToolRisk(toolName);
  const details = Object.entries(args || {})
    .slice(0, 8)
    .map(([key, value]) => `${key}: ${summarizeValue(value)}`)
    .join("\n");
  return [
    `工具：${tool?.title || toolName}`,
    `风险：${risk}`,
    tool?.description ? `说明：${tool.description}` : "",
    details ? `关键参数：\n${details}` : "关键参数：无",
  ]
    .filter(Boolean)
    .join("\n");
};

export const createTapnowToolPolicyResult = (toolName, args = {}) => {
  const validation = validateTapnowToolPolicy(toolName, args);
  return {
    toolName,
    risk: getTapnowToolRisk(toolName),
    requiresConfirmation: requiresTapnowToolConfirmation(toolName),
    description: describeTapnowToolCall(toolName, args),
    ...validation,
  };
};
