# 多供应商模型协议配置

## Context

当前 API 设置已经有 Provider 与模型配置两层：Provider 保存 Key/Base URL/接口类型，模型通过 `provider` 字段归属到某个供应商；同名模型也已通过 `_uid` 支持共存。用户希望参考 Cherry Studio，让一个 API 供应商来源可以添加多个模型，也允许为单个模型指定或覆盖供应商，并能设置供应商/模型使用的主流协议类型，例如 `openai`、`openai-response`、`gemini` 等。

## Analysis

- **Affected files**:
  - `src/App.jsx`: 默认 Provider、模型归一化、Provider 分组、API 凭据解析、设置页 Provider/模型编辑 UI、聊天/生图/视频请求路由都集中在该文件；需要扩展协议类型、明确模型级供应商覆盖与兼容迁移。
  - `src/i18n/locales/en.json`: 设置页新增/调整中文文案时需要补充英文翻译，避免英文界面缺失。
  - `src/i18n/locales/en.extracted.json`: 如项目抽取文件跟随更新，需要补充新增文案占位。
  - `README.md` / `changelog.md`: 如现有文档记录 API 设置能力，需要补充多供应商、多模型和协议类型说明。
- **New files**: 无业务新文件；本计划文件位于 `.snow/plan/multi-provider-model-protocol-config.md`。
- **Dependencies**: 不新增 npm 依赖；继续使用现有 React 状态、本地存储、`fetch`、模型库与请求模板能力。
- **Complexity**: medium。
- **Risk areas**:
  - 已有本地存储中的 `tapnow_providers`、`tapnow_api_configs` 需要兼容，不能丢失用户 Key、Base URL 或模型绑定。
  - 模型级 `apiType` 目前已有“跟随 Provider”能力，但协议枚举不完整；新增 `openai-response` 需要避免被旧逻辑当成普通 OpenAI 兼容接口误路由。
  - UI 已按 Provider 分组模型；如果允许单个模型改 Provider，需要确保 `_uid`、分组、默认模型选择和历史配置不会混淆同名模型。
  - 聊天、生图、视频、分析等调用链对 `apiType` 的使用不一致，协议扩展要先集中常量与解析，再逐步接入，避免运行时崩溃。

## Phases

### Phase 1: 协议类型基础设施

- **Goal**: 统一 API 协议类型定义，并保持旧配置兼容。
- **Files**: `src/App.jsx`
- **Steps**:
  - [ ] 新增统一协议类型常量/选项，例如 `openai`、`openai-response`、`gemini`、`modelscope`，并提供显示名。
  - [ ] 增加协议类型归一化函数，用于 Provider、模型库、API 模型和导入配置。
  - [ ] 更新 `DEFAULT_PROVIDERS`、`normalizeProviderConfig`、`normalizeModelLibraryEntry`、`resolveApiConfig`、`getApiCredentials` 使用统一归一化结果。
  - [ ] 确认旧值为空或未知时安全回退到 `openai`，不会破坏既有本地存储。
- **Done when**: 旧配置可加载，新协议值可保存并回读，`src/App.jsx` 无 IDE 诊断错误，构建通过。

### Phase 2: Provider 与模型编辑能力

- **Goal**: 让一个 Provider 下可清晰维护多个模型，并允许单个模型指定 Provider 与协议覆盖。
- **Files**: `src/App.jsx`, `src/i18n/locales/en.json`, `src/i18n/locales/en.extracted.json`
- **Steps**:
  - [ ] 在 Provider 设置的协议下拉中使用统一协议选项，新增 `OpenAI Responses` 等主流协议类型。
  - [ ] 在模型编辑行增加可编辑的 Provider 下拉，支持将单个模型移动到其他供应商或指定 `provider`。
  - [ ] 保留模型级协议下拉的“跟随 Provider”，并使用同一组选项；模型引用模型库时仍按现有锁定规则处理。
  - [ ] 更新新增文案翻译，确保中文/英文界面不出现空键。
- **Done when**: 设置页可以在同一 Provider 下新增多个模型，也可以把单个模型切换到其他 Provider；分组立即更新，构建通过，无诊断错误。

### Phase 3: 协议路由与调用兼容

- **Goal**: 让不同协议类型在调用链中有明确行为，新增协议不导致请求异常。
- **Files**: `src/App.jsx`
- **Steps**:
  - [ ] 审查聊天、生图、视频、分析调用中的 `apiType` 分支，确认新增协议默认行为。
  - [ ] 为 `openai-response` 明确接入策略：若当前功能尚未完整支持 Responses API，先安全降级到 OpenAI Chat/Image 兼容路径或显示明确提示；如实现则新增 `/v1/responses` 请求构造与响应解析。
  - [ ] 确认 `gemini`、`modelscope` 的现有分支继续按归一化后的协议值工作。
  - [ ] 更新 API 测试连接逻辑，避免所有协议都固定请求 `/v1/models` 导致误判。
- **Done when**: 各协议类型选择后不会出现运行时请求构造异常；至少 OpenAI 兼容、Gemini、ModelScope 原有路径不回退；构建通过，无诊断错误。

### Phase 4: 文档与最终验证

- **Goal**: 记录新配置方式并完成回归验证。
- **Files**: `README.md`, `changelog.md`, `src/App.jsx`
- **Steps**:
  - [ ] 补充 API 设置说明：Provider 可承载多个模型，模型可指定 Provider，协议类型可按 Provider 或模型覆盖。
  - [ ] 运行 `npm run build` 验证生产构建。
  - [ ] 检查 `src/App.jsx` IDE 诊断并修复新增错误。
  - [ ] 对设置页关键流程做代码级回归：新增 Provider、新增模型、切换模型 Provider、协议跟随/覆盖、导入导出。
- **Done when**: 构建成功，IDE 无新增错误，无运行时配置空引用风险，文档反映新增能力。

## Risks & Mitigations

| Risk                                     | Impact                     | Mitigation                                                                   |
| ---------------------------------------- | -------------------------- | ---------------------------------------------------------------------------- |
| 旧本地配置协议值不规范                   | Provider 或模型加载失败    | 所有入口使用归一化函数，未知值回退 `openai`                                  |
| 单模型切换 Provider 后分组或选择状态错乱 | UI 显示错误、请求拿错 Key  | 继续使用 `_uid` 作为模型选择主键，分组由 resolved config 动态计算            |
| `openai-response` 未完整实现却被用户选择 | 请求失败或响应解析为空     | 明确实现范围：优先安全降级或给出提示；若实现则同步 endpoint、payload、parser |
| API 测试接口对 Gemini/Responses 不兼容   | 设置页误报连接失败         | 按协议选择测试 endpoint，无法标准测试时使用轻量提示或跳过严格判断            |
| 模型库协议覆盖与 API 模型覆盖冲突        | 实际请求协议不符合用户预期 | 维持现有优先级：模型库 > API 模型 > Provider，并在 UI 显示最终协议           |

## Rollback Strategy

如果变更引发问题，可回滚 `src/App.jsx` 中协议选项常量、Provider/模型编辑 UI 调整、`getApiCredentials` 与请求路由改动；保留用户本地存储不做破坏性迁移。若仅 `openai-response` 路由异常，可先将该协议归一化降级到 `openai`，恢复旧 OpenAI 兼容调用链。

## Completion Summary

**Status**: Completed with validation note
**Phases**: 4 / 4 completed

### Results

- 已在 `src/App.jsx` 新增统一协议类型常量、协议选项、`normalizeApiType` 和 `normalizeOptionalApiType`，支持 `openai`、`openai-response`、`gemini`、`modelscope` 及常见别名归一化，且空协议保持为 `null`。
- 已让 Provider 设置页使用统一协议选项，并在 API 模型行新增 Provider 下拉；模型级协议支持“跟随 Provider”或显式覆盖，即使引用模型库也可编辑。
- 已完成 review 修复：默认模型库不再固化 Provider 协议，模型库空协议不再覆盖 Provider；协议优先级为 API 模型显式协议 > 模型库显式协议 > Provider 协议 > `openai`。
- 已更新 API 连接测试：Gemini 使用规范化后的 `${baseUrl}/v1beta/models?key=...`，OpenAI/OpenAI Responses/ModelScope 继续使用 `/v1/models`。
- 已将 Google 默认 Provider 改为 Gemini 官方根地址与 `gemini` 协议，并让 Gemini 图片生成调用使用 `normalizeGeminiBaseUrl` 防止重复 `/v1beta`。
- 已更新 `README.md` 和 `changelog.md` 记录多供应商、多模型和协议类型配置能力。

### Deviations

- `openai-response` 当前作为可配置协议类型和连接测试类型接入；实际聊天/分析链路仍沿用现有 OpenAI 兼容请求路径，未在本轮新增完整 `/v1/responses` 请求体和响应解析，设置页已补充兼容说明。
- 未修改 i18n 文件；新增可见英文标签为协议显示名常量，不通过 `t()` 翻译。

### Verification

- [x] `src/App.jsx` IDE 诊断无错误。
- [x] `git diff --check` 无空白错误。
- [x] QA/review 后续修复完成：协议继承、模型级覆盖、模型库空协议、Gemini URL、测试状态清理均已代码级回归。
- [x] `npm run build` 中 Vite production build 成功：1497 modules transformed，`dist/index.html` 已生成。
- [ ] `npm run build` 后置脚本未完成：缺少 `scripts/copy-versioned-build.cjs`，Node 报 `MODULE_NOT_FOUND`；Vite 构建本身成功。

### Follow-up

- 如需完整 OpenAI Responses API 原生支持，后续应新增 `/v1/responses` payload 构造和响应解析。
- 如需完整通过 `npm run build`，需补回或调整 `scripts/copy-versioned-build.cjs` 后置脚本。
