# 修复 desktop:pack 打包问题

## Context

用户执行 `npm run desktop:pack` 时，前端构建成功但出现两个需要处理的问题：

1. `src/App.jsx` 中 `getShotPanoramaStage` 的对象字面量存在重复 `camera` / `redraw` key，Vite/esbuild 给出警告。
2. `electron-builder --dir` 在 Windows 上下载/使用 `winCodeSign-2.6.0` 缓存时失败，随后找不到 `rcedit-x64.exe` 或执行 `rcedit` 时出现 `Fatal error: Unable to commit changes`，导致 unpacked 桌面包生成中断。

目标是让本地桌面打包流程稳定完成，并消除可修复的构建警告。

## Analysis

- **Affected files**:
  - `src/App.jsx`: `getShotPanoramaStage` 当前先定义默认 `camera` / `redraw`，再展开 `shot.stage`，再重复定义 `camera` / `redraw`；需要改成没有重复 key、且保持 stage 默认值与兼容旧 `shot.cameraParams` 的合并逻辑。
  - `package.json`: 当前 `desktop:pack` 直接执行 `vite build --mode desktop && electron-builder --dir`；可考虑加入稳定的 Electron Builder 预检/缓存修复包装命令，避免损坏的 `winCodeSign` 缓存反复导致打包失败。
  - `scripts/package-desktop.ps1`: 包装脚本目前只是调用 `npm run desktop:pack`；如新增预检脚本或清理流程，需要同步使用一致入口。
- **New files**:
  - `scripts/prepare-electron-builder-cache.cjs`（候选）: 检查 Windows 下 Electron Builder 的 `winCodeSign` 缓存目录，如果 `rcedit-x64.exe` 缺失或缓存不完整，则安全清理该版本缓存，让 Electron Builder 重新下载。
- **Dependencies**:
  - 现有 `electron-builder@26.8.1` 会使用 `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`。
  - 不新增 npm 依赖，避免改变安装体积与锁文件。
- **Complexity**: medium
- **Risk areas**:
  - 清理 Electron Builder 缓存必须只删除明确损坏/不完整的 `winCodeSign-2.6.0` 目录，避免误删用户其他缓存。
  - `getShotPanoramaStage` 修改必须保留旧项目数据兼容：优先使用 `shot.stage.camera`，其次使用 `shot.cameraParams`，并保留 `shot.stage.redraw` 的已有状态。
  - `rcedit` 的 `Unable to commit changes` 也可能由杀毒软件、资源管理器或正在运行的 `Tapnow Studio.exe` 锁定导致；脚本只能处理缓存损坏问题，仍需在验证中排查文件锁。

## Phases

### Phase 1: 清理构建警告

- **Goal**: 消除 `src/App.jsx` 中重复对象 key，同时保持全景 stage 默认值行为不变。
- **Files**:
  - `src/App.jsx`
- **Steps**:
  - [ ] 重构 `getShotPanoramaStage`，用中间 `stage` 变量或单次对象合并替代重复 key。
  - [ ] 确认 `camera`、`redraw`、`backgroundId`、`captureUrl` 等字段仍有默认值。
  - [ ] 确认旧字段 `shot.cameraParams` 仍作为 camera fallback。
- **Done when**: `vite build --mode desktop` 不再报告 duplicate key 警告，且构建成功。

### Phase 2: 稳定 Electron Builder 缓存

- **Goal**: 避免损坏的 `winCodeSign` 缓存导致 `rcedit-x64.exe` 缺失。
- **Files**:
  - `scripts/prepare-electron-builder-cache.cjs`
  - `package.json`
  - `scripts/package-desktop.ps1`
- **Steps**:
  - [ ] 新增 Windows 专用预检脚本，只在 `winCodeSign-2.6.0` 缓存缺少 `rcedit-x64.exe` 时清理该损坏目录。
  - [ ] 将 `desktop:pack` / `desktop:build` 在运行 `electron-builder` 前调用预检脚本。
  - [ ] 保持非 Windows 平台 no-op，避免影响跨平台开发。
- **Done when**: 损坏缓存会被自动清理，`electron-builder --dir` 能重新下载完整缓存并继续执行。

### Phase 3: 验证打包流程

- **Goal**: 验证前端构建和 Electron unpacked 打包都能完成，且没有新的诊断错误。
- **Files**:
  - `src/App.jsx`
  - `package.json`
  - `scripts/prepare-electron-builder-cache.cjs`
- **Steps**:
  - [ ] 运行 `npm run desktop:pack` 复现完整流程。
  - [ ] 如果仍出现 `Unable to commit changes`，检查是否有正在运行的 `Tapnow Studio.exe` 或安全软件锁定 `release\win-unpacked\Tapnow Studio.exe`，必要时清理输出目录后重试。
  - [ ] 检查 IDE diagnostics，确认修改文件没有新增错误。
- **Done when**: `npm run desktop:pack` 退出码为 0，`release\win-unpacked` 正常生成，且无 duplicate key 警告/诊断错误。

## Risks & Mitigations

| Risk                       | Impact                                       | Mitigation                                                                                             |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 缓存清理误删过多           | 影响 Electron Builder 后续构建速度或其他项目 | 只针对 `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`，且仅在关键文件缺失时删除 |
| `Tapnow Studio.exe` 被占用 | `rcedit` 仍可能 `Unable to commit changes`   | 验证阶段检查/提示关闭进程，必要时删除 `release\win-unpacked` 后重试                                    |
| stage 合并逻辑变化         | 旧项目全景参数加载异常                       | 保留 `shot.stage` 优先级和 `shot.cameraParams` fallback，新增最小化回归检查                            |
| 网络下载失败               | Electron Builder 无法重新获取 `winCodeSign`  | 不隐藏错误；输出明确提示，让用户重试或手动预热缓存                                                     |

## Rollback Strategy

如变更导致问题：

1. 还原 `src/App.jsx` 中 `getShotPanoramaStage` 的修改。
2. 从 `package.json` 移除预检脚本调用，恢复直接执行 `electron-builder`。
3. 删除新增的 `scripts/prepare-electron-builder-cache.cjs`。
4. 如本地缓存被清理，Electron Builder 会在下次打包时自动重新下载；无需恢复缓存目录。

## Completion Summary

**Status**: Completed
**Phases**: 3 / 3

### Results

- 修复了 `src/App.jsx` 中 `getShotPanoramaStage` 的重复 `camera` / `redraw` key，保留了 `shot.stage` 和 `shot.cameraParams` 的兼容合并。
- 新增 `scripts/prepare-electron-builder-cache.cjs`，在 Windows 下自动清理损坏的 `winCodeSign-2.6.0` 缓存。
- 更新 `desktop:pack` 与 `desktop:build`，在 `electron-builder` 前执行缓存预检。
- `npm run desktop:pack` 现在成功完成。

### Deviations

- 无。

### Verification

- [x] Build passes
- [x] No diagnostic errors
- [x] Acceptance criteria met

### Follow-up (if any)

- 如果以后再次遇到 `Unable to commit changes`，优先检查 `Tapnow Studio.exe` 是否仍在运行或被安全软件占用。
