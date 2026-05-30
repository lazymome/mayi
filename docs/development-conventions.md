# Tapnow 开发约束与一致性规范

本文档约束后续功能开发、MCP 工具扩展、本地服务变更与发布脚本维护，目标是让个人与小型工作室场景下的代码长期可维护。

## 架构原则

- 本地优先：默认能力应可在单 HTML + 可选本地接收器下运行。
- 小步可回滚：功能改动尽量拆成前端工具层、本地服务层、文档/测试层。
- 安全默认关闭：MCP 网关、写入工具、批量生成、外部调用默认应保守启用。
- 摘要优先：跨模块传递大媒体时优先传 ID、URL、尺寸、类型和状态，避免传完整 Base64。

## 前端开发

- React 高频交互代码必须优先使用 `useRef`、节流、RAF 合并，避免在 pointermove/wheel 中频繁 setState 大对象。
- 画布节点新增字段应保持向后兼容，导入旧项目时必须能降级或忽略未知字段。
- 本地缓存、历史记录、批量生成等列表必须考虑分页、limit 或虚拟化。
- 新增组件若创建 Blob URL、WebGL 资源、observer、timer、RAF，必须在卸载时清理。

## 模型与 Provider

- 新模型协议优先在模型库/Provider 配置层表达，不在业务流程里硬编码供应商分支。
- 请求模板必须能预览，关键参数必须可追溯到模型配置或节点设置。
- 异步任务应统一复用 asyncConfig、轮询和输出解析约定，避免每个供应商单独实现一套状态机。

## MCP 工具

- 新增工具必须同时修改 `toolRegistry.js`、`toolExecutor.js`，必要时修改 `toolPolicy.js`。
- 前端 tools schema 与 `toolPolicy.js` 的数量/长度上限必须一致；当前安全基线为批量图片最多 4 张、图片对比最多 3 个模型、参考图最多 4 张。
- 每个工具必须声明 `risk`，并遵守 read/write/generate/external 的确认策略。
- 生成、批量、外部调用、文件写入类工具必须有参数上限和用户确认。
- 工具结果不得包含 API Key、完整本地绝对路径、大体积 Base64 或不必要的隐私字段。
- 所有可由模型填写的长文本、URL、ID、数组参数必须在 schema 中声明 `maxLength`、`maxItems` 或业务等价限制。
- 回填给 Chat 的工具结果必须先摘要化/截断；data URL、Base64、长数组和深层对象不得原样进入模型上下文。
- 新增 MCP 行为应补充 smoke 测试或至少在 `test:mcp-frontend` / `test:mcp-gateway` 中覆盖关键路径。
- 新增本地 MCP 工具必须同步更新 `localserver/mcp_manifest.json`、`localserver/mcp_gateway.py`、`docs/mcp-architecture.md` 和 `localserver/LocalServer_README.md`。

## 本地服务

- 新增端点必须有路径白名单、请求大小上限、超时或明确错误返回。
- 文件写入必须校验扩展名、保存根目录和覆盖策略。
- 文件名、分类名和用户传入相对路径必须净化，禁止 `..`、路径分隔符穿透和不受控特殊字符；默认不得回传本地绝对路径。
- 长时间运行的状态表、队列、缓存必须有 TTL 或最大条目数。
- 对外部网络请求必须尊重 proxy allowlist，不新增任意转发入口。

## 测试与发布

提交发布前至少执行：

```bash
npm run test:release:gates
npm run build
```

若改动本地 Python 服务，还需执行：

```bash
python -m py_compile localserver/tapnow-server-full.py localserver/mcp_gateway.py
```

若改动 Windows 打包流程，还需执行：

```bash
npm run release:windows
```
