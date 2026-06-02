# 排除打包产物上传 GitHub

## Context

用户希望修改 Git ignore 配置，让桌面打包后生成的文件不会被提交上传到 GitHub。项目当前使用 Vite 与 Electron Builder：前端构建输出到 `dist/`，Electron Builder 输出目录配置为 `release/`，桌面侧车/本地服务打包可能生成 `dist-sidecar/`。当前 `.gitignore` 已忽略 `dist/`、`*.7z`、`*.zip`、`*.exe`，但没有明确忽略 `release/` 与 `dist-sidecar/`，导致打包目录中的生成文件仍可能进入 Git 状态。

## Analysis

- **Affected files**:
  - `.gitignore`: 需要补充 Electron Builder 输出目录与常见桌面安装包/元数据规则。
- **New files**:
  - 无，仅更新现有 ignore 文件。
- **Dependencies**:
  - `package.json` 中 `build.directories.output` 为 `release`。
  - `desktop:pack` / `desktop:build` 会生成 `dist/`、`release/`，侧车构建可能生成 `dist-sidecar/`。
- **Complexity**: simple
- **Risk areas**:
  - `.gitignore` 只影响未被 Git 跟踪的新文件；如果 `release/` 内文件已经被提交过，仍需要后续执行 `git rm --cached -r release` 才能从索引移除。
  - 现有 `.gitignore` 有白名单规则保留部分历史发布包，新增规则不能破坏这些白名单。

## Phases

### Phase 1: 补充打包忽略规则

- **Goal**: 让 Electron/Vite 打包产物默认不出现在待提交文件中。
- **Files**:
  - `.gitignore`
- **Steps**:
  - [x] 在构建输出相关位置补充 `release/`。
  - [x] 补充 `dist-sidecar/`，覆盖侧车构建产物。
  - [x] 补充常见 Electron Builder 元数据如 `*.blockmap`，避免安装包辅助文件被提交。
- **Done when**: `.gitignore` 明确覆盖当前项目的主要打包输出目录与文件类型。
- **Result**: 已在 `.gitignore` 顶部新增 `dist-sidecar/`、`release/`、`*.blockmap`、`latest*.yml`。

### Phase 2: 验证 Git 忽略效果

- **Goal**: 确认新增规则语法正确且不会影响保留的历史白名单发布包。
- **Files**:
  - `.gitignore`
- **Steps**:
  - [x] 检查 `.gitignore` 修改后的内容。
  - [x] 运行 Git ignore 检查，确认 `release/` 与 `dist-sidecar/` 下文件会被忽略。
  - [x] 检查当前 Git 状态，识别是否存在已跟踪的打包产物需要用户后续移出索引。
- **Done when**: Git 检查显示新增打包路径会被忽略，且没有诊断错误。
- **Result**: `git check-ignore -v` 确认 `release/`、`dist-sidecar/`、`*.blockmap`、`latest*.yml` 规则生效；IDE diagnostics 无错误。`git ls-files release dist-sidecar dist build` 仅发现已跟踪的 `dist-sidecar/.gitkeep`。

## Risks & Mitigations

| Risk                             | Impact                    | Mitigation                                                          |
| -------------------------------- | ------------------------- | ------------------------------------------------------------------- |
| 已跟踪产物不受 `.gitignore` 影响 | 修改后仍显示在 Git 变更中 | 最终总结中明确提示需要 `git rm --cached` 的路径                     |
| 误忽略需要保留的发布包           | 重要发布文件无法提交      | 保留现有 `!JimengAPI...7z` 与 `!Tapnow...html` 白名单，不删除旧规则 |
| 忽略规则过宽                     | 正常源码或配置被隐藏      | 仅新增明确的构建输出目录和 Electron Builder 辅助文件                |

## Rollback Strategy

如变更不符合预期，只需从 `.gitignore` 移除本次新增的打包产物规则；不会影响源码文件。若后续执行过 `git rm --cached`，可用 `git add` 重新加入需要跟踪的文件。

## Completion Summary

**Status**: Completed
**Phases**: 2 / 2

### Results

- `.gitignore` 已新增 `dist-sidecar/`、`release/`、`*.blockmap`、`latest*.yml`，覆盖当前桌面打包主要输出。
- 保留了原有 `*.7z`、`*.zip`、`*.exe` 规则和现有白名单规则。

### Deviations

- 无。

### Verification

- [x] `git check-ignore -v` 确认 `release/` 与 `dist-sidecar/` 下示例文件会被忽略。
- [x] `git status --short --ignored` 显示 `dist/`、`dist-sidecar/`、`release/` 为 ignored。
- [x] `ide-get_diagnostics` 对 `.gitignore` 无诊断错误。

### Follow-up (if any)

- `git ls-files release dist-sidecar dist build` 只发现 `dist-sidecar/.gitkeep` 已被跟踪；如果你希望整个 `dist-sidecar/` 完全不保留跟踪文件，可再执行 `git rm --cached dist-sidecar/.gitkeep`。
