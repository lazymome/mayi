# 基本功能 MCP 化落地计划

## Context

用户希望把 Tapnow Studio 的基本功能 MCP 化，使聊天入口可以像调用工具一样调用软件能力。当前项目主体是 Vite + React 单页应用，核心业务大量集中在 `src/App.jsx`；本地 Python 服务 `localserver/tapnow-server-full.py` 已承担本地缓存、跨域代理、配置、ComfyUI 中间件等服务器能力。最可落地的路径不是一次性把所有 UI 逻辑迁到 MCP，而是先建立“工具注册表 + MCP 网关 + Chat 工具调用循环”，再逐步把高价值功能从 `App.jsx` 抽成可复用 Action/Service。

## Analysis

- **Affected files**:
  - `src/App.jsx`: 聊天入口 `sendChatMessage`、请求模板执行、节点/历史/分镜/生成等基本功能都在这里；需要接入 tool-calling 循环，并把可调用能力整理成工具注册表。
  - `localserver/tapnow-server-full.py`: 现有本地服务适合新增 MCP/工具网关，负责给外部 Chat/MCP 客户端暴露工具、转发本地动作、保护文件系统与网络调用。
  - `localserver/tapnow-local-config.json`: 需要新增 MCP 开关、监听地址、允许工具、允许根目录、鉴权 token 等配置。
  - `localserver/LocalServer_README.md`: 需要补充 MCP 启动方式、Chat 调用方式、安全配置与示例。
  - `README.md`: 需要说明 MCP 化定位、能力边界和推荐启用方式。
- **New files**:
  - `src/mcp/toolRegistry.js`: 前端工具定义、参数 schema、权限元数据、工具执行入口。
  - `src/mcp/appActions.js`: 从 `App.jsx` 中抽出的基础动作适配层，例如创建节点、读取历史、发送素材到 Chat、启动生成、分镜拆分等。
  - `localserver/mcp_gateway.py`: Python 侧 MCP/工具网关模块，提供工具清单、工具调用、鉴权、输入校验与审计日志。
  - `localserver/mcp_manifest.json`: 声明可暴露工具、参数 schema、风险等级与默认启用状态。
  - `scripts/mcp_gateway_smoke.cjs` 或 `localserver/mcp_gateway_smoke.py`: 本地烟测工具清单、参数校验、拒绝危险调用、基础调用闭环。
- **Dependencies**:
  - 现有 React/Vite、Python 标准库、本地 HTTP 服务能力。
  - MCP 协议建议优先采用 HTTP/SSE 风格的本地网关；若后续需要原生 stdio MCP server，再增加独立启动脚本。
- **Complexity**: complex
- **Risk areas**:
  - `src/App.jsx` 单文件过大，直接硬改容易引入回归；应优先抽薄工具适配层，再迁移具体功能。
  - Chat tool-calling 需要模型支持 `tools/tool_choice`，现有能力 schema 已有 `supportsTools`，但调用循环还没有真正消费工具调用。
  - MCP 暴露本地能力涉及文件读写、网络代理、任务生成，必须默认关闭高风险工具并加入鉴权、白名单和审计。
  - 图片/视频生成是异步任务，MCP 工具返回值需要区分“已提交任务”和“任务完成结果”。

## Phases

### Phase 1: 能力盘点与工具边界

- **Goal**: 定义第一批可 MCP 化的基础功能与安全边界。
- **Files**: `src/App.jsx`, `localserver/tapnow-server-full.py`, `localserver/tapnow-local-config.json`, `.snow/plan/mcp-ize-core-features.md`
- **Steps**:
  - [ ] 梳理基础工具分层：只读查询、画布编辑、生成任务、本地文件/缓存、项目导入导出。
  - [ ] 定义首批工具 schema：`list_models`、`list_history`、`create_text_node`、`create_image_node`、`send_asset_to_chat`、`start_image_generation`、`start_video_generation`、`run_storyboard_split`、`save_project`。
  - [ ] 标注每个工具的风险等级、是否需要用户确认、是否允许外部 MCP 客户端调用。
  - [ ] 明确异步工具返回协议：`taskId`、`status`、`historyItemId`、`pollUrl` 或前端内存状态。
- **Done when**: 工具清单、参数、权限、异步返回格式固定；`src/App.jsx` 无诊断错误；项目可继续构建。

### Phase 2: 前端工具注册表与 Chat 调用循环

- **Goal**: 让内置 Chat 能识别并执行本应用工具。
- **Files**: `src/App.jsx`, `src/mcp/toolRegistry.js`, `src/mcp/appActions.js`
- **Steps**:
  - [ ] 新增工具注册表，统一输出 OpenAI-compatible `tools` schema 与内部执行函数。
  - [ ] 在 `sendChatMessage` 中按模型能力注入工具定义，解析 `tool_calls` 或兼容 JSON tool-call 输出。
  - [ ] 执行工具后把 tool result 回填到对话上下文，并进行第二轮模型总结。
  - [ ] 将第一批低风险动作接入工具：查询模型、查询历史、创建文本/图片输入节点、发送历史素材到 Chat。
- **Done when**: Chat 能调用至少 3 个本地工具并返回自然语言结果；无死循环；失败时返回可读错误；构建通过且无诊断错误。

### Phase 3: 本地 MCP 网关

- **Goal**: 让外部 MCP/Chat 客户端能通过本地端口调用 Tapnow 能力。
- **Files**: `localserver/tapnow-server-full.py`, `localserver/mcp_gateway.py`, `localserver/mcp_manifest.json`, `localserver/tapnow-local-config.json`, `localserver/LocalServer_README.md`
- **Steps**:
  - [x] 在本地服务新增 `/mcp/tools`、`/mcp/call`、`/mcp/status` 或标准 MCP HTTP 入口。
  - [x] 实现 manifest 驱动的工具列表、参数校验、鉴权 token、CORS 限制和审计日志。
  - [x] 将本地已有能力优先包装为工具：`ping`、`save-cache`、`list-files`、`proxy` 安全转发、ComfyUI workflow 提交/查询。
  - [x] 为前端预留回调/桥接机制，让 UI 内存态能力后续能被本地网关调用或同步。
- **Done when**: 本地服务启动后可列出工具、拒绝未授权调用、执行安全工具；构建/烟测通过；无运行崩溃。
- **Phase 3 Result**: 已新增本地 MCP HTTP 网关、manifest、安全配置与文档；`mcp_gateway.py` 无 IDE 诊断错误。当前环境未提供 `python` 命令，`py_compile` 需在安装 Python 后补跑。

### Phase 4: 生成与分镜工具化

- **Goal**: 把最有价值的 AI 工作流能力以工具方式稳定暴露。
- **Files**: `src/App.jsx`, `src/mcp/toolRegistry.js`, `src/mcp/appActions.js`, `localserver/mcp_manifest.json`
- **Steps**:
  - [x] 将 `startGeneration` 的文生图、图生图、视频生成包装为工具，入参复用模型、prompt、ratio、resolution、duration、referenceImages。
  - [x] 将 `runStoryboardLlmSplit`、`runStoryboardTablePromptMerge`、单镜头生成包装为异步工具。
  - [x] 给所有生成工具增加并发/队列保护、取消策略和错误归一化。
  - [x] 在历史记录中标记 tool-triggered 任务，方便审计和回放。
- **Done when**: Chat 可发起图片/视频/分镜任务，历史记录正确更新，异步状态可查询，构建通过且无诊断错误。
- **Phase 4 Result**: 已在 Chat tools 注册 `run_storyboard_split`、`run_storyboard_table_prompt_merge`、`generate_storyboard_shot`，并在前端工具执行器中接入分镜节点校验、异步提交返回和可读错误；生成类工具统一返回 `accepted/status/toolTriggered`。并发/队列保护与取消策略沿用现有生成链路，未做大范围重构。

### Phase 5: 文档、迁移与验收

- **Goal**: 完成可交付的 MCP 化基础版本并降低后续维护成本。
- **Files**: `README.md`, `localserver/LocalServer_README.md`, `package.json`, `scripts/mcp_gateway_smoke.cjs` 或 `localserver/mcp_gateway_smoke.py`, `.snow/plan/mcp-ize-core-features.md`
- **Steps**:
  - [x] 补充内置 Chat 工具调用说明、外部 MCP 客户端连接说明、安全配置示例。
  - [x] 增加 smoke test，覆盖工具列表、鉴权失败、参数校验、至少一个安全工具调用。
  - [x] 运行 `npm run build`，必要时运行本地服务 smoke test。
  - [x] 更新计划文件完成总结、偏差、验收结果与后续建议。
- **Done when**: 文档可指导用户启用 MCP；build passes；no diagnostic errors；smoke test passes；基础工具无 runtime crash。
- **Phase 5 Result**: 已补充 README 与本地服务说明，新增 `scripts/mcp_gateway_smoke.cjs` 与 `test:mcp-gateway`，补齐 `scripts/copy-versioned-build.cjs` 使构建后置步骤可执行；`npm run test:mcp-gateway` 与 `npm run build` 均通过。

## Risks & Mitigations

| Risk                                   | Impact                       | Mitigation                                                                             |
| -------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| `src/App.jsx` 过大导致工具化改动牵连广 | 回归聊天、画布、生成流程     | 先新增 `src/mcp/*` 适配层，逐步迁移，避免一次性大拆分                                  |
| 模型不支持标准 `tool_calls`            | Chat 无法稳定调用工具        | 支持标准 `tool_calls` 与 JSON 指令 fallback，并在 UI 显示模型工具能力                  |
| 外部 MCP 调用本地高危能力              | 文件泄露、任意代理、误删数据 | 默认关闭 MCP；token 鉴权；工具 allowlist；路径白名单；危险工具二次确认或仅前端内置可用 |
| 异步生成无法立即返回结果               | Chat 误以为任务失败          | 工具统一返回 `taskId/status/historyItemId`，另设 `get_task_status` 查询工具            |
| 前端内存态与本地服务状态割裂           | 外部 MCP 无法操作当前画布    | 第一版外部 MCP 先覆盖本地服务能力；前端 Chat 覆盖 UI 内存态能力；后续再做状态同步桥    |
| 协议实现过重                           | 交付周期过长                 | 第一版优先实现 HTTP 工具网关与 OpenAI tools 兼容；原生 MCP stdio 作为第二阶段增强      |

## Rollback Strategy

如果 MCP 化引发问题，优先关闭 `tapnow-local-config.json` 中 MCP 开关并在 Chat 中禁用 tools 注入；回滚 `src/mcp/*` 新文件和 `src/App.jsx` 中 `sendChatMessage` 的 tool-calling 接入即可恢复原聊天行为。本地服务侧可移除 `/mcp/*` 路由与 `mcp_gateway.py`，不会影响现有 `/proxy`、`/save-cache`、`/config`、ComfyUI 中间件。文档和 smoke test 文件可单独保留或回滚，不影响业务运行。

## 推荐落地策略

- **第一阶段建议做 MVP**：只做内置 Chat 调用前端工具 + 本地服务安全工具列表，先证明“chat 端口能调软件功能”。
- **第二阶段再做外部 MCP**：将本地服务能力按 MCP 标准暴露给 Cursor/Claude Desktop/其他 Chat 客户端。
- **第三阶段做架构重构**：逐步把 `App.jsx` 中生成、分镜、历史、项目管理拆成 service/action，避免后续继续在巨型组件里堆逻辑。
- **不建议一开始全量重构**：当前功能面广且很多状态在 React 内存中，先建立工具边界更安全。

## 继续重构计划

### 当前评估

- **已完成基础 MCP 化**：`src/mcp/toolRegistry.js` 已定义 OpenAI-compatible tools；`src/App.jsx` 已在 `sendChatMessage` 中注入 tools、解析 `tool_calls`、执行工具并二次请求总结；`localserver/mcp_gateway.py` 与 manifest 已提供本地 HTTP MCP 网关。
- **主要剩余问题**：`executeTapnowTool` 仍集中在 `src/App.jsx`，依赖大量 React 状态和业务函数；后续每新增工具都要继续修改巨型组件，风险较高。
- **推荐下一步**：不是重写 MCP 协议，而是做“前端工具执行器抽离 + 轻量测试 + 文档同步”，把后续 MCP 化的扩展点稳定下来。

### Phase 6: 前端工具执行器抽离

- **Goal**: 将 `executeTapnowTool` 从 `src/App.jsx` 抽到独立 MCP action executor，减少巨型组件耦合。
- **Files**: `src/App.jsx`, `src/mcp/appActions.js`, `src/mcp/toolExecutor.js`
- **Steps**:
  - [ ] 新增 `src/mcp/toolExecutor.js`，按工具类型拆分 `executeReadTool`、`executeCanvasTool`、`executeGenerationTool`、`executeStoryboardTool`。
  - [ ] 通过 dependency context 注入 `apiConfigs`、`history`、`addNode`、`startGeneration`、分镜函数等，避免 executor 直接依赖 React。
  - [ ] 将 `App.jsx` 中 `executeTapnowTool` 改为组装 context 并调用 `createTapnowToolExecutor(context)`。
  - [ ] 保持所有工具返回结构兼容 `createTapnowActionResult`，不改变现有 Chat tool-calling 行为。
- **Done when**: `App.jsx` 中不再包含工具分发表；Chat 仍可调用现有工具；`npm run build` 通过；`src/App.jsx` 与 `src/mcp/*` 无诊断错误。

### Phase 7: MCP 工具执行器回归验证

- **Goal**: 给工具参数归一化和工具调用解析补充低成本回归测试，防止后续扩展破坏 Chat 调用链。
- **Files**: `src/mcp/toolRegistry.js`, `src/mcp/appActions.js`, `src/mcp/toolExecutor.js`, `scripts/mcp_frontend_tools_smoke.cjs`, `package.json`
- **Steps**:
  - [ ] 新增 smoke test，覆盖标准 `tool_calls`、JSON fallback、非法参数默认值、未知工具报错。
  - [ ] 在 `package.json` 增加 `test:mcp-frontend`，并可选串入 release gates。
  - [ ] 运行 `npm run test:mcp-frontend`、`npm run test:mcp-gateway`、`npm run build`。
  - [ ] 更新计划文件的完成总结、偏差与验收结果。
- **Done when**: 前端 MCP smoke test、网关 smoke test、构建均通过；无新增诊断错误；工具执行器可作为后续新增工具的稳定入口。

## 继续执行风险与缓解

| Risk                                     | Impact                              | Mitigation                                                |
| ---------------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| 抽离 executor 时遗漏 `App.jsx` 闭包依赖  | 工具运行时报 undefined 或状态不同步 | 使用显式 context 注入，迁移后立即 build 与 smoke test     |
| 生成/分镜工具是异步 fire-and-forget      | 测试难以等待真实任务完成            | smoke test 只验证提交返回结构，真实生成仍走现有链路       |
| `App.jsx` 巨大导致 patch 冲突            | 改动难以 review                     | 只替换 `executeTapnowTool` 这一段，其他业务函数不改       |
| 测试脚本直接 import JSX 受 Vite 环境限制 | Node smoke test 无法加载 React 组件 | 测试只 import `src/mcp/*` 纯 JS 模块，不 import `App.jsx` |

## 继续执行回滚策略

如果 Phase 6/7 引发问题，删除 `src/mcp/toolExecutor.js` 与 `scripts/mcp_frontend_tools_smoke.cjs`，恢复 `src/App.jsx` 中原 `executeTapnowTool` 实现，并移除 `package.json` 的 `test:mcp-frontend` 脚本即可。由于重构只改变前端工具执行器组织方式，不改变本地 MCP 网关、manifest 和外部端口协议，回滚不会影响已完成的 `/mcp/*` 服务端能力。
