# 修复多供应商协议配置 Review 问题

## Context

用户已完成“多供应商模型协议配置”任务，但 review 发现协议继承/覆盖语义不清：模型库 `apiType` 会固化并覆盖 Provider，选择模型库时空协议会被静默转成 `openai`，`openai-response` 暴露为协议但未真正实现 Responses API，Gemini 默认与 URL 拼接存在误导风险，测试状态在配置变化后可能显示旧结果。本计划用于修复这些问题，使行为更接近 Cherry Studio 的“供应商协议 + 模型可覆盖”配置模型。

## Analysis

- **Affected files**:
  - `src/App.jsx`: 协议常量、默认 Provider、默认模型库生成、模型库归一化、API 配置解析、连接测试、Gemini URL 拼接、设置页 Provider/模型/模型库 UI 都集中在此文件。
  - `.snow/plan/multi-provider-model-protocol-config.md`: 更新原任务完成说明，记录二次修复结果。
  - `.snow/plan/fix-provider-protocol-review-issues.md`: 本次修复计划与执行记录。
- **New files**: 无业务新文件；仅新增本计划文件。
- **Dependencies**: 不新增 npm 依赖；继续使用现有 React、本地存储、`fetch` 与模型库配置结构。
- **Complexity**: medium。
- **Risk areas**:
  - 旧本地存储中已有模型库 `apiType`，需要保留用户显式设置但避免默认值继续误导继承。
  - 引用模型库后，模型名称/能力仍应来自模型库，但模型级显式协议应可覆盖。
  - Gemini Base URL 规范化必须兼容官方根地址、用户已填 `/v1beta`、代理地址等场景。
  - `openai-response` 如果不实现原生 `/v1/responses`，必须在 UI 中明确显示当前仍沿用 OpenAI Compatible 请求模板，避免用户误解。

## Phases

### Phase 1: 修正协议继承语义

- **Goal**: 让空协议真正表示“跟随 Provider”，避免模型库默认值覆盖 Provider。
- **Files**: `src/App.jsx`
- **Steps**:
  - [ ] 新增可空协议归一化辅助函数，例如 `normalizeOptionalApiType`。
  - [ ] 默认模型库生成时不再固化 Provider `apiType`，默认保存为 `null`。
  - [ ] 更新 `resolveApiConfig` 与 `getApiCredentials`，明确模型显式协议优先于模型库显式协议，再回退 Provider。
  - [ ] 修复选择模型库时空协议被 `normalizeApiType` 强制转成 `openai` 的问题。
- **Done when**: Provider 协议切换能影响未显式设置协议的模型；模型库空协议不会变成 `openai`；`src/App.jsx` 无诊断错误。

### Phase 2: 完善设置页交互

- **Goal**: UI 能清楚表达“跟随 Provider”和协议覆盖，并避免旧测试状态误导。
- **Files**: `src/App.jsx`
- **Steps**:
  - [ ] 模型库协议下拉增加“跟随 Provider/未设置”空选项，空值保存为 `null`。
  - [ ] 引用模型库的 API 模型仍允许设置模型级协议覆盖，或至少不被模型库空协议锁死。
  - [ ] Provider、模型 Provider、模型协议、Key、Base URL 变更时清理相关连接测试状态。
  - [ ] 对 `openai-response` 在设置页显示兼容说明，注明当前未启用原生 Responses API 请求链。
- **Done when**: 设置页显示与实际协议解析一致；切换配置后不会继续显示旧连接成功；无诊断错误。

### Phase 3: 修复 Gemini 与连接测试

- **Goal**: Gemini 默认配置和 URL 拼接更安全，连接测试更符合协议类型。
- **Files**: `src/App.jsx`
- **Steps**:
  - [ ] 将 Google/Gemini 默认 Provider 调整为 Gemini 协议与官方根地址。
  - [ ] 增加 Gemini Base URL 规范化，避免用户填入 `/v1` 或 `/v1beta` 后重复拼接。
  - [ ] 更新 Gemini 连接测试与图片生成调用使用规范化后的 base URL。
  - [ ] 保持 OpenAI Compatible、ModelScope、OpenAI Responses 当前测试行为不回退。
- **Done when**: Gemini 官方根地址和带 `/v1beta` 的 Base URL 都能构造正确请求；构建通过，无诊断错误。

### Phase 4: 验证与文档记录

- **Goal**: 完成回归验证，并把实际修复写入计划记录。
- **Files**: `src/App.jsx`, `.snow/plan/multi-provider-model-protocol-config.md`, `.snow/plan/fix-provider-protocol-review-issues.md`
- **Steps**:
  - [ ] 运行 `npm run build`，记录 Vite 构建与后置脚本结果。
  - [ ] 检查 `src/App.jsx` IDE 诊断。
  - [ ] 代码级回归 Provider 协议、模型协议、模型库空协议、Gemini URL、测试状态清理。
  - [ ] 更新两个计划文件的完成摘要。
- **Done when**: Vite 构建通过，IDE 无新增错误，计划文件记录实际结果和遗留事项。

## Risks & Mitigations

| Risk                               | Impact                                     | Mitigation                                                           |
| ---------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| 旧模型库已保存 `apiType: openai`   | 用户原本期望跟随 Provider 的旧条目仍会覆盖 | 默认新条目改为空；UI 明确可切回“跟随 Provider”；不破坏用户显式保存值 |
| 改协议优先级影响已有模型库覆盖行为 | 少数依赖模型库协议的配置可能改变           | 仅当模型级未显式设置时才考虑模型库显式协议；保留模型库显式值能力     |
| Gemini URL 规范化误处理代理地址    | 请求目标错误                               | 只剥离末尾标准版本段 `/v1`、`/v1beta`，不改 host 与其他路径          |
| `openai-response` 未原生实现       | 用户误以为已走 `/v1/responses`             | UI 增加说明，后续可单独实现原生 Responses API                        |
| 测试状态清理过度                   | 用户需要重新测试                           | 配置变更后重新测试是更安全行为，避免误报成功                         |

## Rollback Strategy

如果修复引发问题，可回滚 `src/App.jsx` 中 `normalizeOptionalApiType`、默认 Provider/模型库协议、`resolveApiConfig`/`getApiCredentials` 优先级、设置页下拉与测试状态清理、Gemini URL 规范化相关改动。计划文件只记录执行过程，不影响业务。若仅 Gemini 规范化异常，可临时恢复直接拼接 `${baseUrl}/v1beta/...` 的旧逻辑。

## Completion Summary

**Status**: Completed with validation note
**Phases**: 4 / 4 completed

### Results

- 已在 `src/App.jsx` 新增 `normalizeOptionalApiType`，空协议保持 `null`；默认模型库不再固化 Provider 协议，模型库归一化保留空协议。
- 已调整协议优先级为 API 模型显式协议 > 模型库显式协议 > Provider 协议 > `openai`，并修复选择模型库时空协议被强制写成 `openai` 的问题。
- 已让模型库协议下拉支持“跟随 Provider/未设置”，API 模型引用模型库时仍可编辑模型级协议覆盖。
- 已增加 Provider/模型关键配置变更后的连接测试状态清理，并在 `openai-response` 设置处提示当前仍沿用 OpenAI Compatible 请求链。
- 已将 Google 默认 Provider 改为 Gemini 官方根地址与 `gemini` 协议；Gemini 连接测试和图片生成调用均通过 `normalizeGeminiBaseUrl` 去除末尾 `/v1` 或 `/v1beta` 后拼接。

### Verification

- [x] `src/App.jsx` IDE 诊断无错误。
- [x] `npm run build` 中 Vite production build 成功：1497 modules transformed，`dist/index.html` 已生成。
- [ ] `npm run build` 后置脚本未完成：缺少 `scripts/copy-versioned-build.cjs`，Node 报 `MODULE_NOT_FOUND`；这是计划中已知的后置脚本问题。

### Follow-up

- 如需完整 OpenAI Responses API 原生支持，后续仍需新增 `/v1/responses` 请求体构造与响应解析；本次仅补充兼容说明。
