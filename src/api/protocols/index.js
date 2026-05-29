export const PROTOCOL_OPENAI = "openai";
export const PROTOCOL_OPENAI_RESPONSE = "openai-response";
export const PROTOCOL_GEMINI = "gemini";
export const PROTOCOL_MODELSCOPE = "modelscope";
export const PROTOCOL_ANTHROPIC = "anthropic";

export const PROTOCOL_OPTIONS = Object.freeze([
  { value: PROTOCOL_OPENAI, label: "OpenAI Compatible" },
  { value: PROTOCOL_OPENAI_RESPONSE, label: "OpenAI Responses" },
  { value: PROTOCOL_GEMINI, label: "Gemini" },
  { value: PROTOCOL_MODELSCOPE, label: "ModelScope" },
  { value: PROTOCOL_ANTHROPIC, label: "Anthropic" },
]);

const PROTOCOL_VALUES = new Set(PROTOCOL_OPTIONS.map((option) => option.value));

export const normalizeProtocolType = (value, fallback = PROTOCOL_OPENAI) => {
  const aliases = {
    "openai-responses": PROTOCOL_OPENAI_RESPONSE,
    "openai-response-api": PROTOCOL_OPENAI_RESPONSE,
    responses: PROTOCOL_OPENAI_RESPONSE,
    response: PROTOCOL_OPENAI_RESPONSE,
    google: PROTOCOL_GEMINI,
    claude: PROTOCOL_ANTHROPIC,
    "models-scope": PROTOCOL_MODELSCOPE,
  };
  const normalize = (input) =>
    String(input || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");
  const resolved = aliases[normalize(value)] || normalize(value);
  if (PROTOCOL_VALUES.has(resolved)) return resolved;
  const fallbackResolved = aliases[normalize(fallback)] || normalize(fallback);
  return PROTOCOL_VALUES.has(fallbackResolved) ? fallbackResolved : PROTOCOL_OPENAI;
};

export const normalizeGeminiBaseUrl = (baseUrl, defaultBaseUrl = "") => {
  const trimmed = String(baseUrl || defaultBaseUrl)
    .trim()
    .replace(/\/+$/, "");
  return trimmed.replace(/\/(v1|v1beta)$/i, "");
};

export const buildModelListRequest = ({ apiType, baseUrl, apiKey, defaultBaseUrl = "" }) => {
  const protocol = normalizeProtocolType(apiType);
  const cleanBaseUrl = String(baseUrl || defaultBaseUrl).replace(/\/+$/, "");
  if (protocol === PROTOCOL_GEMINI) {
    const geminiBaseUrl = normalizeGeminiBaseUrl(cleanBaseUrl, defaultBaseUrl);
    return {
      url: `${geminiBaseUrl}/v1beta/models?key=${encodeURIComponent(apiKey || "")}`,
      headers: {},
    };
  }
  if (protocol === PROTOCOL_ANTHROPIC) {
    return {
      url: `${cleanBaseUrl}/v1/models`,
      headers: {
        "x-api-key": apiKey || "",
        "anthropic-version": "2023-06-01",
      },
    };
  }
  return {
    url: `${cleanBaseUrl}/v1/models`,
    headers: { Authorization: `Bearer ${apiKey || ""}` },
  };
};
