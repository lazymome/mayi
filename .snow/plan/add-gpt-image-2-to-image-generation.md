# 补充 GPT Image 2 到生图功能

## Context

当前生图功能已有 OpenAI 兼容的 `gpt-4o-image` 配置与 `/v1/images/generations` 分支，但还没有针对 OpenAI `gpt-image-2` 的默认模型配置、参数默认值与图像编辑接口适配。此次变更目标是让用户在生图节点中可直接选择 GPT Image 2，并按 Image API 的 generations/edits 路由提交生成或参考图编辑请求。

## Analysis

- **Affected files**:
  - `src/App.jsx`: 默认 Provider/模型库、模型归一化、分辨率/比例选项、生图请求构造都集中在该文件；需要补充 `gpt-image-2` 模型配置与请求分支。
  - `changelog.md`: 如项目惯例需要记录新增模型与接口适配。
  - `README.md`: 如现有功能清单提及图像模型，可补充 GPT Image 2 支持说明。
- **New files**: 无业务新文件；本计划文件位于 `.snow/plan/add-gpt-image-2-to-image-generation.md`。
- **Dependencies**: 继续使用浏览器 `fetch`/`FormData` 与现有 OpenAI 兼容调用链，无新增 npm 依赖。
- **Complexity**: medium。
- **Risk areas**:
  - OpenAI Image API 的 `generations` 与 `edits` 请求体格式不同，参考图/蒙版必须走 multipart edits。
  - `gpt-image-2` 参数如 `quality`、`background`、`moderation`、`output_format`、`output_compression` 需要通过模型库自定义参数传入，且不能破坏旧 `gpt-4o-image`。
  - 现有 `sizeStr` 可能产生非 OpenAI 规格尺寸，需要对 GPT Image 2 做安全映射或通过可配置参数覆盖。
  - 返回结果解析需兼容现有 OpenAI 图片响应格式，避免历史区空图或多图丢失。

## Phases

### Phase 1: 默认模型与参数配置

- **Goal**: 让 GPT Image 2 出现在生图模型列表，并带有合理默认参数。
- **Files**: `src/App.jsx`
- **Steps**:
  - [ ] 在 `DEFAULT_API_CONFIGS` 的 Image Models 中新增 `gpt-image-2`。
  - [ ] 为 `gpt-image-2` 默认模型库条目补充比例、分辨率、默认张数与自定义参数。
  - [ ] 确认模型选择、节点默认值和模型库归一化不会覆盖新增配置。
- **Done when**: 生图节点可选择 `gpt-image-2`，构建通过，`src/App.jsx` 无 IDE 诊断错误。

### Phase 2: Image API 请求路由

- **Goal**: 按 GPT Image 2 的 Image API 规范构造 generations/edits 请求。
- **Files**: `src/App.jsx`
- **Steps**:
  - [ ] 增加 GPT Image 系列识别逻辑，区分旧 OpenAI 图片模型与 `gpt-image-2`。
  - [ ] 无参考图时提交 `/v1/images/generations` JSON 请求。
  - [ ] 有参考图或蒙版时提交 `/v1/images/edits` multipart 请求，并附带 `image`/`mask`。
  - [ ] 将自定义参数合并到 JSON/FormData，避免重复字段破坏默认请求。
- **Done when**: 文生图和带参考图生图都可构造正确 endpoint/payload，构建通过，无诊断错误，无运行时请求构造异常。

### Phase 3: 文档与回归验证

- **Goal**: 记录变更并验证没有破坏现有生图路径。
- **Files**: `README.md`, `changelog.md`, `src/App.jsx`
- **Steps**:
  - [ ] 补充文档/变更日志中的 GPT Image 2 支持说明。
  - [ ] 运行 `npm run build` 验证生产构建。
  - [ ] 检查 `src/App.jsx` IDE 诊断，必要时修复。
- **Done when**: 构建成功，IDE 无新增错误，文档反映新增能力。

## Risks & Mitigations

| Risk                                           | Impact                       | Mitigation                                                       |
| ---------------------------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| GPT Image 2 参数与旧 `gpt-4o-image` 不完全兼容 | 请求 400 或生成失败          | 单独识别 `gpt-image-2`，只在该分支使用新增参数与 edits multipart |
| 尺寸/比例映射不符合 OpenAI 支持范围            | 请求失败或结果比例不符合预期 | 优先使用模型库参数与安全映射，保留用户自定义参数覆盖能力         |
| 参考图使用 JSON base64 而非 edits multipart    | 图生图不可用                 | 有参考图/蒙版时强制走 `/v1/images/edits` 并上传 Blob             |
| 修改默认配置影响已有本地存储用户               | 新模型不出现在已有配置中     | 检查现有配置合并逻辑，必要时确保默认库可补齐缺失模型             |

## Rollback Strategy

如果变更引发问题，可回滚 `src/App.jsx` 中 `gpt-image-2` 模型条目、GPT Image 2 专用请求分支与文档/日志修改；本地存储中的用户自定义模型库不需要迁移。构建失败时优先恢复 OpenAI 图片请求分支到修改前逻辑。

## Completion Summary

- 已在 `src/App.jsx` 默认 Image Models 与默认模型库中新增 `gpt-image-2`，配置默认比例/尺寸、默认并发与可覆盖的 `quality/background/moderation/output_format/output_compression` 自定义参数。
- 已为 `gpt-image-2` 增加独立 Image API 路由：无参考图/蒙版走 `/v1/images/generations` JSON，有参考图或蒙版走 `/v1/images/edits` multipart，并保留 `applyCustomParamsToPayload` 对 JSON/FormData 的覆盖能力。
- 已更新 `changelog.md` 和 `README.md`，记录 GPT Image 2 生图与编辑支持。
- 验证：已执行 `npm run build`，当前环境缺少本地依赖导致 `vite` 命令不可用（`npm ls vite --depth=0` 显示 empty），未完成生产构建；`src/App.jsx` IDE 诊断检查无错误。
