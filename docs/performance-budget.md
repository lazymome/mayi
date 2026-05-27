# Tapnow 性能预算与资源边界

本文档用于约束画布、媒体、本地接收器与发布包的资源使用，目标是个人电脑和小型工作室机器在长时间运行下仍保持可用。

## 前端交互预算

- 高频交互路径（pointermove、wheel、RAF、ResizeObserver 回调）不得执行大体积同步序列化。
- 禁止在逐帧循环中调用 `canvas.toDataURL()`、全量 `JSON.stringify(history)`、完整媒体 Base64 转换等重操作。
- 需要刷新预览时优先使用异步 `canvas.toBlob()`、Blob URL、节流或结束交互后一次性提交。
- React 状态更新应优先提交摘要、ID 或 patch；避免在拖拽过程中持续提交完整大对象。

## 画布与媒体预算

- 图片和视频节点只在视口附近或用户明确查看时挂载大媒体元素。
- 大图、视频、全景纹理应具备卸载清理逻辑：`URL.revokeObjectURL`、dispose texture/geometry/material、取消 RAF。
- 历史记录、节点列表和批量生成结果必须支持分页、limit 或虚拟化，不应一次性渲染无限列表。
- 工具调用返回媒体信息时只返回 URL、尺寸、类型、状态等摘要，禁止返回完整 Base64 媒体内容。

## Panorama / WebGL 预算

- WebGL renderer、texture、geometry、material 必须在组件卸载时释放。
- 相机变化回调应通过 RAF 或节流合并，不得在 pointermove 中同步触发大量父组件 setState。
- 默认预览几何精度应以交互流畅优先；只有导出或高质量预览需要更高细分。

## 本地接收器资源边界

默认边界：

| 配置 | 默认值 | 说明 |
| --- | ---: | --- |
| `max_json_body_bytes` | 10 MB | 普通 JSON 请求体上限 |
| `max_proxy_body_bytes` | 50 MB | `/proxy` 上传/转发体积上限 |
| `max_http_workers` | 32 | HTTP 并发请求上限 |
| `max_comfy_queue_size` | 32 | ComfyUI 排队任务上限 |
| `comfy_task_timeout` | 600 秒 | 单任务等待输出超时 |
| `job_ttl_seconds` | 86400 秒 | 任务状态保留时间 |
| `max_job_status_items` | 500 | 任务状态最大条目数 |

调整建议：

- 普通个人电脑优先降低 `max_http_workers` 到 8-16。
- 单 GPU ComfyUI 队列建议设置为 4-8，避免显存排队过长。
- 只有可信内网或本机使用时才提高 proxy/body 上限。
- 任何新增本地端点都必须具备大小上限、路径白名单、超时或明确错误返回。

## 回归检查

涉及性能敏感路径的改动至少完成：

1. 大画布拖拽/缩放手测。
2. 多历史素材滚动手测。
3. `npm run test:release:gates`。
4. 如改动本地服务，执行 `python -m py_compile localserver/tapnow-server-full.py localserver/mcp_gateway.py`。

