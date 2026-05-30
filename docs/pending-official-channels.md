# 官方绘画/视频渠道清单模板

本文档用于收集“画布常用绘画/视频模型新增全量官方渠道”所需的信息。当前阶段只维护清单模板，不新增代码实现，不修改模型路由配置。

## 暂缓原因

该需求依赖明确的官方模型和 API 渠道信息。如果缺少清单，直接实现容易出现模型 ID、渠道 ID、鉴权方式、能力范围或默认优先级错误。

## 与现有架构的关系

- 前端模型路由能力位于 [`src/api/modelRouter.js`](../src/api/modelRouter.js)。
- Provider/channel schema 位于 [`src/api/schemas.js`](../src/api/schemas.js)。
- API 渠道网关设计参考 [`docs/api-channel-gateway-plan.md`](./api-channel-gateway-plan.md)。
- 后续新增模型协议应优先在模型库或 Provider 配置层表达，不应在业务流程里硬编码供应商分支。

## 官方渠道信息模板

| 字段 | 必填 | 说明 | 示例 |
|---|---|---|---|
| channelId | 是 | 官方渠道唯一 ID，用于路由候选和配置引用 | `official-example-image` |
| providerName | 是 | 官方渠道显示名 | `Example Official` |
| providerType | 是 | 协议或供应商类型 | `openai-compatible` |
| modelId | 是 | 官方模型 ID，请使用 API 文档中的真实 ID | `example-image-v1` |
| displayName | 是 | UI 中展示的模型名称 | `Example Image V1` |
| type | 是 | 模型类型 | `Image` / `Video` |
| capabilities | 是 | 能力标签 | `text-to-image`, `image-to-image`, `video`, `upscale` |
| baseUrl | 是 | 官方 API 地址 | `https://api.example.com/v1` |
| auth | 是 | 鉴权方式 | `Bearer token` / `x-api-key` |
| endpoint | 否 | 非标准协议时的接口路径 | `/images/generations` |
| requestSchema | 否 | 关键请求字段 | `prompt`, `image`, `size`, `duration` |
| responseSchema | 否 | 关键返回字段 | `data[0].url` |
| priority | 否 | 默认路由优先级 | `80` |
| enabled | 否 | 默认是否启用 | `false` |
| pricing | 否 | 价格或成本权重 | `costWeight: 1` |
| limitPolicy | 否 | 并发、RPM、超时 | `maxConcurrency: 2, rpm: 60` |
| notes | 否 | 限制说明 | `4K only on paid tier` |

## 待补充清单

### 绘画模型

| channelId | providerName | providerType | modelId | displayName | capabilities | baseUrl | auth | priority | enabled | notes |
|---|---|---|---|---|---|---|---|---:|---|---|
| 待补充 | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 |

### 视频模型

| channelId | providerName | providerType | modelId | displayName | capabilities | baseUrl | auth | priority | enabled | notes |
|---|---|---|---|---|---|---|---|---:|---|---|
| 待补充 | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 |

## 后续实现前检查项

- 确认模型 ID 与官方文档一致。
- 确认每个模型支持的输入类型：文生图、图生图、参考图、视频、扩图、高清放大等。
- 确认分辨率和时长限制，避免 UI 可选项超过渠道能力。
- 确认鉴权方式不能硬编码密钥。
- 确认旧项目加载时，缺少新 route 字段也能向后兼容。
- 确认 MCP `list_models` 输出不会泄露密钥或内部配置。

## 后续建议实现颗粒度

1. 先补全本清单并由业务侧确认。
2. 再新增 Provider/channel 配置，不改生成流程。
3. 再把官方渠道加入常用模型列表。
4. 最后验证画布节点、MCP 工具和项目保存/加载兼容性。

