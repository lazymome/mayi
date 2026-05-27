import {
  createTapnowActionResult,
  normalizeToolArray,
  normalizeToolNumber,
  normalizeToolString,
} from "./appActions";

const getViewportFallback = (value, fallback) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const createReadToolHandlers = (context) => {
  const {
    apiConfigs = [],
    history = [],
    resolveApiConfig = (item) => item,
    resolveHistoryUrl = () => "",
  } = context;

  return {
    list_models: async (args) => {
      const type = normalizeToolString(args.type, "all");
      const models = apiConfigs
        .map((item) => resolveApiConfig(item))
        .filter(Boolean)
        .filter((item) => type === "all" || item.type === type)
        .filter((item) => !item.disabled)
        .slice(0, 80)
        .map((item) => ({
          key: item._uid || item.id,
          id: item.id,
          modelName: item.modelName,
          displayName: item.displayName,
          provider: item.provider,
          type: item.type,
          apiType: item.apiType,
        }));
      return createTapnowActionResult(true, { models, count: models.length });
    },
    list_history: async (args) => {
      const limit = Math.max(1, Math.min(50, normalizeToolNumber(args.limit, 10)));
      const type = normalizeToolString(args.type, "all");
      const items = history
        .filter((item) => type === "all" || item.type === type)
        .slice(0, limit)
        .map((item) => ({
          id: item.id,
          type: item.type,
          status: item.status,
          prompt: item.prompt,
          modelName: item.modelName,
          provider: item.provider || item.apiConfig?.provider,
          time: item.time,
          url: resolveHistoryUrl(item),
        }));
      return createTapnowActionResult(true, { items, count: items.length });
    },
  };
};

const createCanvasToolHandlers = (context) => {
  const {
    addNode,
    history = [],
    resolveHistoryUrl = () => "",
    setChatFiles,
    setIsChatOpen,
    viewportWidth,
    viewportHeight,
  } = context;
  const fallbackX = getViewportFallback(viewportWidth, 0) / 2;
  const fallbackY = getViewportFallback(viewportHeight, 0) / 2;

  return {
    create_text_node: async (args) => {
      const text = normalizeToolString(args.text);
      if (!text) throw new Error("text 不能为空");
      const node = addNode(
        "text-node",
        normalizeToolNumber(args.x, fallbackX),
        normalizeToolNumber(args.y, fallbackY),
        null,
        text
      );
      return createTapnowActionResult(true, {
        nodeId: node?.id,
        type: node?.type,
      });
    },
    create_image_node: async (args) => {
      const url = normalizeToolString(args.url);
      if (!url) throw new Error("url 不能为空");
      const node = addNode(
        "input-image",
        normalizeToolNumber(args.x, fallbackX),
        normalizeToolNumber(args.y, fallbackY),
        null,
        url
      );
      return createTapnowActionResult(true, {
        nodeId: node?.id,
        type: node?.type,
        url,
      });
    },
    send_asset_to_chat: async (args) => {
      const historyId = normalizeToolString(args.historyId);
      const item = history.find((entry) => entry.id === historyId);
      const resolvedUrl = resolveHistoryUrl(item);
      if (!item || !resolvedUrl) throw new Error("未找到可发送的历史素材");
      const isImage = item.type === "image";
      const isVideo = item.type === "video";
      const fileExt = isImage ? "png" : isVideo ? "mp4" : "file";
      setChatFiles((prev) => [
        ...prev,
        {
          name: `ToolAsset-${item.id}.${fileExt}`,
          type: isImage
            ? "image/png"
            : isVideo
            ? "video/mp4"
            : "application/octet-stream",
          content: resolvedUrl,
          isImage,
          isVideo,
          isAudio: false,
          fromHistory: true,
          fileExt,
        },
      ]);
      setIsChatOpen(true);
      return createTapnowActionResult(true, {
        attached: true,
        historyId,
        url: resolvedUrl,
      });
    },
  };
};

const createGenerationToolHandlers = (context) => {
  const {
    apiConfigs = [],
    lastUsedImageModel,
    lastUsedVideoModel,
    resolveModelKey = (value) => value,
    isImageModelType = (type) => type === "Image" || type === "ChatImage",
    startGeneration,
  } = context;

  return {
    start_image_generation: async (args) => submitGeneration("image", args),
    start_video_generation: async (args) => submitGeneration("video", args),
    batch_image_generation: async (args) => {
      const count = Math.max(1, Math.min(10, normalizeToolNumber(args.count, 3)));
      const taskGroupId = createTaskId("tool-batch");
      const results = Array.from({ length: count }, (_, index) =>
        submitGeneration("image", args, {
          taskGroupId,
          batchIndex: index + 1,
          batchCount: count,
        })
      );
      return createTapnowActionResult(true, {
        accepted: true,
        status: "submitted",
        toolTriggered: true,
        taskGroupId,
        count,
        tasks: results.map(formatSubmittedTask),
      });
    },
    compare_image_generation: async (args) => {
      const models = [
        ...new Set(
          normalizeToolArray(args.models)
            .map((model) => resolveModelKey(model))
            .filter(Boolean)
        ),
      ].slice(0, 4);
      if (models.length === 0) throw new Error("models 不能为空");
      const taskGroupId = createTaskId("tool-compare");
      const results = models.map((model, index) =>
        submitGeneration(
          "image",
          { ...args, model },
          {
            taskGroupId,
            compareIndex: index + 1,
            compareCount: models.length,
          }
        )
      );
      return createTapnowActionResult(true, {
        accepted: true,
        status: "submitted",
        toolTriggered: true,
        taskGroupId,
        count: results.length,
        models,
        tasks: results.map(formatSubmittedTask),
      });
    },
  };

  function createTaskId(prefix = "tool") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function submitGeneration(type, args, extraOptions = {}) {
    const prompt = normalizeToolString(args.prompt);
    if (!prompt) throw new Error("prompt 不能为空");
    const fallbackModel =
      type === "video"
        ? resolveModelKey(lastUsedVideoModel) ||
          resolveModelKey(apiConfigs.find((item) => item.type === "Video")?.id)
        : resolveModelKey(lastUsedImageModel) ||
          resolveModelKey(apiConfigs.find((item) => isImageModelType(item.type))?.id);
    const model = resolveModelKey(args.model || fallbackModel);
    const sourceImages = normalizeToolArray(args.referenceImages);
    const taskId = createTaskId();
    if (typeof startGeneration !== "function") {
      throw new Error("startGeneration 未注入");
    }
    startGeneration(prompt, type, sourceImages, taskId, {
      model,
      ratio: args.ratio,
      resolution: args.resolution,
      duration: args.duration,
      _toolTriggered: true,
      ...extraOptions,
    }).catch((error) => console.error("[MCP Tool] generation failed", error));
    return createTapnowActionResult(true, {
      accepted: true,
      status: "submitted",
      toolTriggered: true,
      taskId,
      taskGroupId: extraOptions.taskGroupId,
      type,
      model,
      prompt,
    });
  }

  function formatSubmittedTask(result) {
    return {
      taskId: result.taskId,
      taskGroupId: result.taskGroupId,
      type: result.type,
      model: result.model,
      prompt: result.prompt,
    };
  }
};

const createStoryboardToolHandlers = (context) => {
  const {
    nodesMap = new Map(),
    storyboardLlmSplitModes = [],
    runStoryboardLlmSplit,
    runStoryboardTablePromptMerge,
    updateNodeSettings,
    isSameShotId,
    normalizeStoryboardMode,
    generateSingleImage,
    generateSingleShot,
    updateShot,
  } = context;

  return {
    run_storyboard_split: async (args) => {
      const nodeId = normalizeToolString(args.nodeId);
      const mode = storyboardLlmSplitModes.includes(args.mode) ? args.mode : "script";
      const node = nodesMap.get(nodeId);
      if (!node || node.type !== "storyboard-node") {
        return createTapnowActionResult(false, {
          error: "未找到分镜节点",
          nodeId,
        });
      }
      try {
        runStoryboardLlmSplit(nodeId, mode).catch((error) => {
          console.error("[MCP Tool] storyboard split failed", error);
          updateNodeSettings(nodeId, {
            isGenerating: false,
            errorMsg: error?.message || "分镜拆分失败",
          });
        });
        return createTapnowActionResult(true, {
          accepted: true,
          status: "submitted",
          toolTriggered: true,
          nodeId,
          mode,
        });
      } catch (error) {
        return createTapnowActionResult(false, {
          error: error?.message || "分镜拆分提交失败",
          nodeId,
          mode,
        });
      }
    },
    run_storyboard_table_prompt_merge: async (args) => {
      const nodeId = normalizeToolString(args.nodeId);
      const node = nodesMap.get(nodeId);
      if (!node || node.type !== "storyboard-node") {
        return createTapnowActionResult(false, {
          error: "未找到分镜节点",
          nodeId,
        });
      }
      try {
        runStoryboardTablePromptMerge(nodeId).catch((error) => {
          console.error("[MCP Tool] storyboard table prompt merge failed", error);
          updateNodeSettings(nodeId, {
            isGenerating: false,
            errorMsg: error?.message || "表格提示词汇总失败",
          });
        });
        return createTapnowActionResult(true, {
          accepted: true,
          status: "submitted",
          toolTriggered: true,
          nodeId,
        });
      } catch (error) {
        return createTapnowActionResult(false, {
          error: error?.message || "表格提示词汇总提交失败",
          nodeId,
        });
      }
    },
    generate_storyboard_shot: async (args) => {
      const nodeId = normalizeToolString(args.nodeId);
      const shotId = normalizeToolString(args.shotId);
      const requestedMode = ["image", "video", "auto"].includes(args.mode)
        ? args.mode
        : "auto";
      const node = nodesMap.get(nodeId);
      if (!node || node.type !== "storyboard-node") {
        return createTapnowActionResult(false, {
          error: "未找到分镜节点",
          nodeId,
        });
      }
      const shots = Array.isArray(node.settings?.shots) ? node.settings.shots : [];
      const shot = shots.find((item) => isSameShotId(item.id, shotId));
      if (!shot) {
        return createTapnowActionResult(false, {
          error: "未找到分镜镜头",
          nodeId,
          shotId,
        });
      }
      const mode =
        requestedMode === "auto"
          ? normalizeStoryboardMode(node.settings?.mode)
          : requestedMode;
      const prompt = String(shot.prompt || shot.description || "").trim();
      try {
        if (mode === "image") {
          generateSingleImage(nodeId, shot);
        } else {
          generateSingleShot(nodeId, shot);
        }
        return createTapnowActionResult(true, {
          accepted: true,
          status: "submitted",
          toolTriggered: true,
          nodeId,
          shotId,
          mode,
          prompt,
        });
      } catch (error) {
        updateShot(nodeId, shotId, {
          status: "failed",
          errorMsg: error?.message || "分镜镜头生成失败",
        });
        return createTapnowActionResult(false, {
          error: error?.message || "分镜镜头生成提交失败",
          nodeId,
          shotId,
          mode,
          prompt,
        });
      }
    },
  };
};

const createStatusToolHandlers = (context) => {
  const { history, resolveHistoryUrl } = context;

  return {
    get_task_status: async (args) => {
      const taskId = normalizeToolString(args.taskId);
      const item = history.find(
        (entry) => entry.id === taskId || entry.remoteTaskId === taskId
      );
      if (!item)
        return createTapnowActionResult(false, {
          error: "未找到任务",
          taskId,
        });
      return createTapnowActionResult(true, {
        id: item.id,
        remoteTaskId: item.remoteTaskId,
        status: item.status,
        progress: item.progress,
        type: item.type,
        url: resolveHistoryUrl(item),
        errorMsg: item.errorMsg,
      });
    },
  };
};

export const createTapnowToolExecutor = (context) => {
  const handlers = {
    ...createReadToolHandlers(context),
    ...createCanvasToolHandlers(context),
    ...createGenerationToolHandlers(context),
    ...createStoryboardToolHandlers(context),
    ...createStatusToolHandlers(context),
  };

  return async (toolName, rawArgs = {}) => {
    const args = rawArgs && typeof rawArgs === "object" ? rawArgs : {};
    const handler = handlers[toolName];
    if (!handler) throw new Error(`未知工具: ${toolName}`);
    return handler(args);
  };
};
