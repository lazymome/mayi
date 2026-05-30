# Tapnow MCP 架构与确认策略

本文档约束 Tapnow Studio 内置 Chat 工具调用与本地接收器 MCP 网关的设计边界，面向个人与小型工作室场景。

## 目标

- 让 AI 可以先读取项目上下文，再提出或执行可审计的操作。
- 默认保护用户资产、磁盘文件、API Key 与生成额度。
- 对写入、生成、外部调用等高风险动作强制二次确认。
- 保持本地优先：MCP 网关默认关闭，启用后也优先绑定本机端口与 token。

## 前端 MCP 工具层

前端工具入口位于：

- `src/mcp/toolRegistry.js`：工具清单、风险级别、OpenAI tools schema。
- `src/mcp/toolPolicy.js`：自动执行/确认策略与参数上限。
- `src/mcp/toolExecutor.js`：工具实际执行逻辑。
- `src/App.jsx`：Chat 返回工具调用后的策略检查、确认与结果回填。

### 风险级别

| 风险 | 行为 | 默认策略 |
| --- | --- | --- |
| `read` | 读取模型、历史、画布摘要、选中节点等 | 自动执行 |
| `write` | 创建节点、发送素材、写入缓存等 | 用户确认 |
| `generate` | 图片/视频/分镜生成，可能消耗额度 | 用户确认 |
| `external` | 外部网络或未知工具 | 用户确认或拒绝 |

当前前端工具按用途分为：

- 只读上下文：`list_models`、`list_history`、`list_nodes`、`get_canvas_summary`、`get_selected_nodes`、`find_nodes_by_type`、`get_project_status`、`get_task_status`。
- 画布/聊天写入：`create_text_node`、`create_image_node`、`send_asset_to_chat`。
- 额度消耗与批量任务：`start_image_generation`、`batch_image_generation`、`compare_image_generation`、`start_video_generation`、`run_storyboard_split`、`run_storyboard_table_prompt_merge`、`generate_storyboard_shot`。

前端 tools schema 与 `toolPolicy.js` 必须保持同一安全上限：批量图片生成最多 4 张、图片对比最多 3 个模型、图片/视频生成参考图最多 4 张。提示词/文本、URL、节点 ID 等字符串参数必须声明 `maxLength`，避免模型或外部客户端注入超大上下文。

新增工具时必须：

1. 在 `toolRegistry.js` 声明 `risk`。
2. 在 `toolExecutor.js` 只返回必要字段，禁止返回完整大体积媒体内容。
3. 对可能消耗资源的参数设置上限，并在 `toolPolicy.js` 中补充校验。
4. 写入/生成类工具不得绕过确认流程。
5. 工具结果回填给 Chat 前必须经过摘要化/截断：禁止原样回传 data URL、Base64、API Key、完整本地绝对路径或超长数组。

## 本地 MCP 网关

本地接收器端点：

- `GET /mcp/status`
- `GET /mcp/tools`
- `POST /mcp/call`

配置位于 `localserver/tapnow-local-config.json` 的 `mcp` 字段。默认配置应保持：

```json
{
  "mcp": {
    "enabled": false,
    "auth_token": "",
    "allowed_origins": ["http://127.0.0.1", "http://localhost"],
    "allowed_tools": [],
    "audit_log": ".tapnow_mcp_audit.log"
  }
}
```

安全要求：

- 对外部客户端开放前必须显式启用 `enabled`。
- 建议始终设置 `auth_token` 或环境变量 `TAPNOW_MCP_AUTH_TOKEN`。
- `allowed_tools` 为空时只开放 manifest 中默认启用的只读/低风险工具。
- 写入工具如 `save_cache` 必须显式加入 allowlist。
- 审计日志只记录工具名、参数键和参数 hash，不记录大体积内容或密钥。
- `save_cache` 必须净化 `id`、`category`、扩展名和自定义路径，文件名仅保留安全字符或使用安全替代名。
- 默认不得返回本地绝对路径；只有显式设置 `mcp.expose_absolute_paths=true` 时，`list_files`、`save_cache`、`comfy_apps` 等工具才允许返回绝对路径字段。

本地 manifest 风险等级与前端风险等级的映射：

| 本地 manifest | 前端等价风险 | 说明 |
| --- | --- | --- |
| `low` | `read` | 健康检查、无资源读取的轻量状态 |
| `readonly` / `read_only` | `read` | 文件列表、代理状态、Comfy 状态等只读摘要 |
| `write` | `write` | 写入本地缓存或磁盘，必须显式 allowlist |

`/mcp/call` 支持以下请求体格式：

```json
{ "name": "ping", "arguments": {} }
```

兼容格式：

```json
{ "tool": "list_files", "args": { "limit": 20 } }
```

启用 token 后调用必须携带：

```text
Authorization: Bearer <token>
```

或：

```text
X-Tapnow-MCP-Token: <token>
```

## 二次确认规范

需要确认的典型动作：

- 新增、修改、删除画布节点或本地文件。
- 启动图片、视频、分镜等生成任务。
- 批量任务、模型对比、多参考图生成。
- 本地文件写入、缓存保存、任何跨工具链外部动作。

确认内容至少包含：

- 工具名称与用途。
- 风险等级。
- 关键参数摘要（数量、模型、目标节点、文件类型）。
- 是否可能消耗额度或写入磁盘。

## 读工具优先原则

AI 应先调用只读工具理解上下文，再提出写入或生成动作。例如：

1. `get_project_status`
2. `get_canvas_summary`
3. `list_nodes` / `get_selected_nodes`
4. 再请求用户确认生成或写入动作

这能降低误操作，并为用户确认提供充分上下文。
