export const TAPNOW_MCP_TOOL_VERSION = "1.0.0";

export const TOOL_RISK = {
  READ: "read",
  WRITE: "write",
  GENERATE: "generate",
  EXTERNAL: "external",
};

export const TAPNOW_CORE_TOOLS = [
  {
    name: "list_models",
    title: "列出可用模型",
    risk: TOOL_RISK.READ,
    description:
      "列出 Tapnow Studio 当前配置中可用的 Chat、Image、Video 模型。",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["Chat", "ChatImage", "Image", "Video", "all"],
          description: "按模型类型过滤；默认 all。",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_history",
    title: "列出生成历史",
    risk: TOOL_RISK.READ,
    description: "列出最近的图片/视频生成历史，便于 Chat 引用或继续操作。",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          minimum: 1,
          maximum: 50,
          description: "返回数量，默认 10。",
        },
        type: {
          type: "string",
          enum: ["image", "video", "all"],
          description: "按历史类型过滤。",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_text_node",
    title: "创建文本节点",
    risk: TOOL_RISK.WRITE,
    description: "在画布中创建一个文本节点。",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "文本节点内容。" },
        x: { type: "number", description: "画布世界坐标 X。" },
        y: { type: "number", description: "画布世界坐标 Y。" },
      },
      required: ["text"],
      additionalProperties: false,
    },
  },
  {
    name: "create_image_node",
    title: "创建图片输入节点",
    risk: TOOL_RISK.WRITE,
    description: "在画布中创建一个图片输入节点，可使用 URL 或 data URL。",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "图片 URL 或 data URL。" },
        x: { type: "number", description: "画布世界坐标 X。" },
        y: { type: "number", description: "画布世界坐标 Y。" },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
  {
    name: "send_asset_to_chat",
    title: "发送历史素材到聊天",
    risk: TOOL_RISK.WRITE,
    description: "把指定历史记录中的图片或视频加入当前 Chat 附件。",
    inputSchema: {
      type: "object",
      properties: {
        historyId: { type: "string", description: "历史记录 ID。" },
      },
      required: ["historyId"],
      additionalProperties: false,
    },
  },
  {
    name: "start_image_generation",
    title: "发起图片生成",
    risk: TOOL_RISK.GENERATE,
    description: "调用当前 Tapnow 图片生成链路发起图片生成任务。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "图片提示词。" },
        model: {
          type: "string",
          description: "可选模型 key，不传则使用默认图片模型。",
        },
        ratio: { type: "string", description: "比例，例如 1:1、16:9、Auto。" },
        resolution: {
          type: "string",
          description: "分辨率，例如 1K、2K、4K。",
        },
        referenceImages: {
          type: "array",
          items: { type: "string" },
          description: "参考图 URL 列表。",
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "batch_image_generation",
    title: "批量发起图片生成",
    risk: TOOL_RISK.GENERATE,
    description: "使用同一提示词和参考图连续发起多张图片生成任务。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "图片提示词。" },
        count: {
          type: "number",
          minimum: 1,
          maximum: 10,
          description: "生成张数，默认 3，最大 10。",
        },
        model: {
          type: "string",
          description: "可选模型 key，不传则使用默认图片模型。",
        },
        ratio: { type: "string", description: "比例，例如 1:1、16:9、Auto。" },
        resolution: {
          type: "string",
          description: "分辨率，例如 1K、2K、4K。",
        },
        referenceImages: {
          type: "array",
          items: { type: "string" },
          description: "参考图 URL 列表。",
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "compare_image_generation",
    title: "多模型图片生成对比",
    risk: TOOL_RISK.GENERATE,
    description: "对同一提示词和参考图使用多个图片模型发起生成任务，用于结果对比。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "图片提示词。" },
        models: {
          type: "array",
          items: { type: "string" },
          description: "模型 key 列表，建议 2 个，最多 4 个。",
        },
        ratio: { type: "string", description: "比例，例如 1:1、16:9、Auto。" },
        resolution: {
          type: "string",
          description: "分辨率，例如 1K、2K、4K。",
        },
        referenceImages: {
          type: "array",
          items: { type: "string" },
          description: "参考图 URL 列表。",
        },
      },
      required: ["prompt", "models"],
      additionalProperties: false,
    },
  },
  {
    name: "start_video_generation",
    title: "发起视频生成",
    risk: TOOL_RISK.GENERATE,
    description: "调用当前 Tapnow 视频生成链路发起视频生成任务。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "视频提示词。" },
        model: {
          type: "string",
          description: "可选模型 key，不传则使用默认视频模型。",
        },
        ratio: { type: "string", description: "比例，例如 16:9、9:16、Auto。" },
        resolution: {
          type: "string",
          description: "视频分辨率，例如 720p、1080p。",
        },
        duration: { type: "string", description: "时长，例如 5s、10s、15s。" },
        referenceImages: {
          type: "array",
          items: { type: "string" },
          description: "参考图 URL 列表。",
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "run_storyboard_split",
    title: "运行分镜拆分",
    risk: TOOL_RISK.GENERATE,
    description: "对指定分镜节点运行 LLM 脚本/小说/自定义拆分，生成镜头列表。",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "分镜节点 ID。" },
        mode: {
          type: "string",
          enum: ["script", "novel", "custom"],
          default: "script",
          description: "拆分模式；默认 script。",
        },
      },
      required: ["nodeId"],
      additionalProperties: false,
    },
  },
  {
    name: "run_storyboard_table_prompt_merge",
    title: "汇总分镜表提示词",
    risk: TOOL_RISK.GENERATE,
    description: "对指定分镜节点的表格内容运行提示词汇总，并回填到镜头卡片。",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "分镜节点 ID。" },
      },
      required: ["nodeId"],
      additionalProperties: false,
    },
  },
  {
    name: "generate_storyboard_shot",
    title: "生成分镜单镜头",
    risk: TOOL_RISK.GENERATE,
    description: "对指定分镜节点中的单个镜头发起图片或视频生成任务。",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "分镜节点 ID。" },
        shotId: { type: "string", description: "镜头 ID。" },
        mode: {
          type: "string",
          enum: ["image", "video", "auto"],
          default: "auto",
          description: "生成类型；auto 会使用分镜节点当前模式。",
        },
      },
      required: ["nodeId", "shotId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_task_status",
    title: "查询任务状态",
    risk: TOOL_RISK.READ,
    description: "按历史记录或任务 ID 查询生成任务状态。",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "历史记录 ID 或任务 ID。" },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
];

export const getTapnowToolSchemas = (tools = TAPNOW_CORE_TOOLS) =>
  tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: `${tool.description} 风险等级：${tool.risk}。`,
      parameters: tool.inputSchema,
    },
  }));

export const parseToolArguments = (rawArguments) => {
  if (!rawArguments) return {};
  if (typeof rawArguments === "object") return rawArguments;
  try {
    return JSON.parse(rawArguments);
  } catch {
    return {};
  }
};

const parseJsonToolCalls = (content) => {
  if (typeof content !== "string" || !content.trim()) return [];
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    const calls = Array.isArray(parsed)
      ? parsed
      : parsed.tool_calls || parsed.tools || parsed.calls || [parsed];
    return calls
      .map((item, index) => {
        const name = item?.name || item?.tool || item?.function?.name;
        if (!name) return null;
        return {
          id: item.id || `json-tool-${Date.now()}-${index}`,
          name,
          arguments: parseToolArguments(
            item.arguments ||
              item.args ||
              item.input ||
              item.function?.arguments
          ),
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const extractTapnowToolCalls = (payload) => {
  const message =
    payload?.choices?.[0]?.message || payload?.data?.choices?.[0]?.message;
  const nativeCalls = Array.isArray(message?.tool_calls)
    ? message.tool_calls
    : [];
  const normalizedNativeCalls = nativeCalls
    .map((call, index) => ({
      id: call.id || `tool-${Date.now()}-${index}`,
      name: call.function?.name || call.name,
      arguments: parseToolArguments(call.function?.arguments || call.arguments),
    }))
    .filter((call) => call.name);
  if (normalizedNativeCalls.length > 0) return normalizedNativeCalls;
  return parseJsonToolCalls(
    message?.content || payload?.content || payload?.text
  );
};

export const formatToolResultForChat = (result) => {
  try {
    return JSON.stringify(result ?? null, null, 2);
  } catch {
    return String(result);
  }
};
