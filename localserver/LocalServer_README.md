# Tapnow Studio 本地接收器配置

## 目录结构（必读）

```
localserver/
  tapnow-server-full.py            # 本地接收器主程序（全功能）
  tapnow-local-config.json         # 本地接收器配置
  LocalServer_README.md            # 本说明
  Docker_README.md                 # Docker 部署说明
  Middleware_README-ComfyUI.md     # ComfyUI 中间件说明
  comfy-middleware/                # ComfyUI 代理/中间件代码
  workflows/                       # ComfyUI 模板目录（template.json / meta.json）
```

本地接收器（LocalServer）是 Tapnow Studio 的核心基础设施，负责 **本地缓存/保存**、**跨域代理 (CORS)**、以及 **ComfyUI 中间件接入**。  
并发优化：内部采用线程化 HTTP Server 处理请求，避免流式/上传阻塞其它请求；ComfyUI 任务另有队列管理，避免并发卡死。

---

## 0. 启动方式（必读）

### 环境要求

- Python 3.8+

### 启动

推荐运行全功能版本：

```bash
python tapnow-server-full.py
```

默认监听端口：**9527**

若使用仓库内置即梦一键包，请使用当前版本：

- `JimengAPI_Release_Green_260211_v1.9.1.7z`（Windows）

### Docker 启动

若希望通过容器运行本地接收器，请参考：

- `localserver/Docker_README.md`

> 当前 compose 方案可同时启动前端（`http://127.0.0.1:8080`）和本地接收器（`http://127.0.0.1:9527`）。

### 配置文件作用（tapnow-local-config.json）

该配置文件决定本地接收器的核心行为：

- **allowed_roots**：允许读写/保存的根目录白名单。
- **save_path**：资源保存目录（必须落在 allowed_roots 内）。
- **proxy_allowed_hosts**：代理白名单（决定哪些域名允许走 `/proxy`）。
- **proxy_timeout**：代理超时（秒）。
- **max_json_body_bytes**：普通 JSON 请求体上限，默认 `10485760`（10 MB）。
- **max_proxy_body_bytes**：`/proxy` 请求体上限，默认 `52428800`（50 MB）。
- **max_http_workers**：HTTP 并发请求上限，默认 `32`。
- **max_comfy_queue_size**：ComfyUI 等待队列上限，默认 `32`。
- **comfy_task_timeout**：单个 ComfyUI 任务等待输出的超时秒数，默认 `600`。
- **job_ttl_seconds** / **max_job_status_items**：任务状态保留 TTL 与最大条目数，用于限制长期运行内存占用。

修改配置后需重启本地接收器生效。

### 资源边界建议

个人电脑或小型工作室机器建议先使用默认值。若机器内存较小或多人共用同一台本地接收器，可降低 `max_http_workers` 与 `max_comfy_queue_size`；若经常上传大图/视频，可只在可信内网环境下适当提高 `max_proxy_body_bytes`。

示例：

```json
{
  "max_json_body_bytes": 10485760,
  "max_proxy_body_bytes": 52428800,
  "max_http_workers": 16,
  "max_comfy_queue_size": 8,
  "comfy_task_timeout": 600,
  "job_ttl_seconds": 86400,
  "max_job_status_items": 500
}
```

约束原则：

- 不建议将请求体上限设为无限大。
- 不建议将 `max_http_workers` 设得高于本机可承受的并发 I/O 能力。
- ComfyUI 通常是 GPU/显存瓶颈，队列上限应小于真实可承受排队数量。
- 长时间运行时依赖 TTL 清理历史任务状态，避免内存无限增长。

---

## 1. 缓存功能（主动缓存 + 保存节点）

### 1.1 功能说明

LocalServer 会在后台主动缓存所有被访问的图片/视频资源：

- **主动缓存**：每次加载资源都会写入本地 `save_path` 并做 hash 去重。
- **缓存优先级**：资源加载顺序为 `本地缓存 → 代理 → 直连`，确保带宽稳定与 CORS 安全。
- **保存节点联动**：在画布启用“保存节点”后，可将输出自动落盘到本地目录，支持批量导出与复用。

### 1.2 如何在画布启用

- 在 Tapnow Studio 的 **设置面板** 启用本地缓存与保存节点。
- 若有“本地连接器 / 本地缓存”开关，请确保已打开。

### 1.3 更换保存目录 / 刷新缓存

修改同目录的 `tapnow-local-config.json`：

```json
{
  "allowed_roots": [
    "C:\\Users\\YourName\\Downloads",
    "D:\\TapnowData",
    "E:\\TapnowData"
  ],
  "save_path": "D:\\TapnowData"
}
```

说明：

- `save_path` 必须位于 `allowed_roots` 内，否则服务拒绝启动。
- 修改后 **重启本地接收器**。
- 若需要刷新缓存，可删除旧目录或更换目录后再刷新页面。

---

## 2. 代理功能（解决 CORS）

### 2.1 什么是 CORS

浏览器出于安全限制，**禁止前端直接访问非同源 API**。  
本地接收器通过 `/proxy` 中转，绕过浏览器跨域限制。

### 2.2 代理用于谁

- 需要浏览器跨域访问的第三方 API（如 OpenAI / Gemini / ModelScope / SiliconFlow / BizyAir）。
- 上传/下载需要稳定 CORS 支持的图片与视频资源。
- 需要流式响应（SSE）或大体积上传的接口调用。

### 2.3 如何开启

在 `tapnow-local-config.json` 中配置白名单并重启服务：

```json
{
  "allowed_roots": ["C:\\Users\\YourName\\Downloads", "D:\\TapnowData"],
  "proxy_allowed_hosts": [
    "api.openai.com",
    "generativelanguage.googleapis.com",
    "api-inference.modelscope.cn",
    "api.bizyair.cn",
    "googlecdn.datas.systems",
    "*.openai.azure.com"
  ],
  "proxy_timeout": 300
}
```

前端操作：

- 在 Tapnow Studio 设置面板打开 **本地代理**（或 Proxy 开关）。
- 如果配置了 Provider 的 Base URL，可使用 `http://127.0.0.1:9527/proxy` 作为转发入口。

### 2.4 达成效果

- 浏览器跨域限制被绕过（CORS 允许）。
- 支持流式响应（SSE）与上传。
- 减少前端直连失败概率。

使用示例：

```javascript
const target = "https://api.openai.com/v1/chat/completions";
const url = `http://127.0.0.1:9527/proxy?url=${encodeURIComponent(target)}`;
const resp = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
```

### 2.5 地址写法（Query / Header）

**Query 方式（推荐）**

```javascript
const target = "https://api.openai.com/v1/chat/completions";
const url = `http://127.0.0.1:9527/proxy?url=${encodeURIComponent(target)}`;
```

**Header 方式（避免过长 URL）**

```javascript
const resp = await fetch("http://127.0.0.1:9527/proxy", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-Proxy-Target": "https://api.openai.com/v1/chat/completions",
  },
  body: JSON.stringify(payload),
});
```

**上传文件（multipart）**

```javascript
const form = new FormData();
form.append("file", file);
const url = `http://127.0.0.1:9527/proxy?url=${encodeURIComponent(uploadUrl)}`;
await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: form,
});
```

注意：不要手动设置 `Content-Type`，浏览器会自动添加 boundary。

说明：

- `proxy_allowed_hosts` 为空则代理被禁用。
- 如需临时允许任意域名，可设置为 `["*"]`（不建议）。
- `proxy_timeout` 为代理超时秒数，设置为 `0` 表示不超时。

---

## 3. 本地 ComfyUI 接入（中间件）

本地 ComfyUI 中间件用于将 `127.0.0.1:8188` 封装成统一的 BizyAir 风格接口：

- **目标**：让前端不用理解 ComfyUI 节点图，只传 prompt/seed/steps 等参数即可。
- **收益**：统一异步轮询、统一输出解析、支持 batch 多图输出。

具体配置与模板生成流程请见：

- `localserver/Middleware_README-ComfyUI.md`

---

## 4. 本地 MCP 网关

本地 MCP 网关提供 `/mcp/status`、`/mcp/tools`、`/mcp/call` 三个端点，让外部 MCP/Chat 客户端通过本地端口调用 Tapnow 的安全工具能力。

### 4.1 安全配置

在 `tapnow-local-config.json` 中配置：

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

说明：

- `enabled` 默认为 `false`，需要对外部客户端开放时再改为 `true`。
- 如果 `enabled=true` 但没有配置 token，`/mcp/status` 会返回安全警告；仅建议在完全本机使用时这样配置。
- `auth_token` 非空时，`/mcp/call` 必须携带 `Authorization: Bearer <token>` 或 `X-Tapnow-MCP-Token`。
- 也可用环境变量 `TAPNOW_MCP_AUTH_TOKEN` 设置 token，优先级高于配置文件。
- `allowed_tools` 为空时，仅开放 manifest 中默认启用的只读/低风险工具；写入工具如 `save_cache` 需显式加入 allowlist。
- 审计日志默认写入 `localserver/.tapnow_mcp_audit.log`，只记录时间、工具名、参数键与参数 hash，不记录大体积内容。
- `save_cache` 会校验文件类型、大小上限与保存路径；默认最大缓存写入体积为 25 MB，可通过 `mcp.max_save_cache_bytes` 调整。

### 4.2 可用工具

默认只读/低风险工具：

- `ping`：检查网关可用性。
- `list_files`：按 `save_path` 和媒体过滤逻辑列出图片/视频，支持 `limit` 与 `offset`。
- `proxy_status`：返回代理状态，不开放任意代理转发。
- `comfy_apps`：列出 ComfyUI 工作流应用；中间件关闭时返回可读错误。
- `comfy_status`：查看 ComfyUI 队列或指定任务状态；中间件关闭时返回可读错误。

写入工具：

- `save_cache`：复用本地缓存保存规则，默认不启用，需配置 `"allowed_tools": ["save_cache"]` 或 `"*"`。

### 4.3 MCP 调用确认边界

本地网关本身只负责鉴权、参数校验、工具 allowlist 与审计。真正面向用户的二次确认由前端 Chat 工具策略负责：

- 只读工具可自动运行。
- 写入、生成、外部调用、批量资源消耗类工具必须先向用户展示风险、参数摘要与影响范围。
- 外部 MCP 客户端直接调用 `/mcp/call` 时，也应在客户端侧实现等价确认流程，不能假设本地服务会弹出确认框。

### 4.4 curl 示例

```bash
curl http://127.0.0.1:9527/mcp/status
curl http://127.0.0.1:9527/mcp/tools
curl -X POST http://127.0.0.1:9527/mcp/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"name":"ping","arguments":{}}'
```

兼容 body 写法：

```json
{ "tool": "list_files", "args": { "limit": 20 } }
```

---

## 关联参考

- 模型库设置请参考 `model-template-readme.md` 的第 4 章（含参数调节）与第 5 章（异步任务）。
- ComfyUI 模板与 meta 映射流程详见 `localserver/Middleware_README-ComfyUI.md`。
