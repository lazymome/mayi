# Windows 10/11 便携发布规范

本文档约束 Tapnow Studio 当前阶段的发版流程。现阶段只承诺 Windows 10/11 + Chrome/Edge 的便携 HTML 包使用场景。

## 支持范围

- Windows 10 / Windows 11。
- Chrome / Edge 当前稳定版。
- 前端以单 HTML 形式运行。
- 本地接收器可选：需要 Python 3.8+，默认端口 `9527`。

暂不承诺：

- Electron / 原生安装包。
- 自动更新器。
- Windows 服务常驻安装。
- 非 Windows 便携包兼容性验证。

## 标准命令

发布前按顺序执行：

```bash
npm run test:release:gates
npm run build
npm run release:windows
```

说明：

- `npm run test:release:gates`：运行核心 smoke / regression 检查。
- `npm run build`：生成 `dist/index.html` 与版本化 HTML。
- `npm run release:windows`：重新 build 并生成 Windows portable zip、sha256、manifest。

## 产物

产物位于 `dist/` 与 `release/`：

| 文件 | 说明 |
| --- | --- |
| `dist/tapnow-studio-v<version>.html` | 可直接双击打开的单 HTML |
| `release/tapnow-studio-windows-portable-v<version>.zip` | Windows 便携包 |
| `release/tapnow-studio-windows-portable-v<version>.zip.sha256` | SHA256 校验文件 |
| `release/tapnow-studio-windows-portable-v<version>.manifest.json` | 版本、文件名、hash、生成时间 |

`release/` 与 `dist/` 属于生成产物，默认不纳入源码提交。

## 手工验收清单

每次发布前至少完成：

1. 在 Windows 10 或 11 上解压 zip。
2. 使用 Chrome 或 Edge 打开 HTML。
3. 打开设置面板，确认模型库和 Provider 配置可读写。
4. 新建文字/图片相关节点，确认画布拖拽、缩放、连线正常。
5. 打开 Chat，确认只读 MCP 工具不会弹出确认，写入/生成工具会二次确认。
6. 可选启动本地接收器：

   ```bash
   python localserver/tapnow-server-full.py
   ```

7. 访问并确认：

   ```text
   http://127.0.0.1:9527/ping
   http://127.0.0.1:9527/status
   http://127.0.0.1:9527/mcp/status
   ```

8. 如启用 MCP 写入工具，必须确认 token、allowlist 与审计日志均符合预期。

## 变更约束

- 改动打包脚本时，必须同时更新本文件。
- 改动 zip 内目录结构时，必须更新 `scripts/package-windows-portable.cjs` 中的 `README-Windows.txt` 内容。
- 新增本地服务依赖时，必须说明 Windows 用户如何安装或降级使用。
- 新增 release gate 时，必须确保命令在 Windows PowerShell 中可运行。
