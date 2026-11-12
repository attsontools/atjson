# AGENTS.md

JSON 桌面工具，使用同一套 Vue UI 同时构建独立 Tauri 应用和 AT Tool 签名插件。

## 技术栈

- Tauri 2、Rust 2021
- Vue 3.5、Naive UI 2.44、TypeScript 6、Vite 8
- Monaco Editor 0.55、Web Worker
- Vitest 4，不使用 jsdom
- pnpm 10.29.3

## 常用命令

```bash
pnpm test
pnpm build
pnpm build:plugin
pnpm tauri:dev
pnpm tauri:build
pnpm package:plugin
```

## 固定身份

- 对外名称：`JSON 工具`
- 仓库与包名：`atjson`
- Tauri identifier / appId：`com.attson.json`
- Release 资产前缀：`AT.JSON`
- 插件权限：只允许 `host.theme.read`
- Publisher secrets：`ATJSON_PUBLISHER_KEY_ID`、`ATJSON_PUBLISHER_PRIVATE_KEY`、`ATJSON_PUBLISHER_PUBLIC_KEY`

## 架构约束

- 独立版和插件版共享 `src/App.vue`、`src/components/json/`、`src/utils/` 和 Worker，不维护两套实现。
- 宿主差异只放在 `src/host/`，`App.vue` 和业务模块不直接调用 Plugin SDK 或 Tauri API。
- 解析、序列化、JSONPath、diff 和转换继续在 `src/workers/jsonWorker.ts` 中执行。
- Monaco 只加载 editor core、editor worker 和 JSON language worker；不要引入全部语言包。
- 工作页和输入只在运行期间保留，不新增 localStorage 业务状态或数据库。
- 转换格式固定为 JSON、YAML、TOML、CSV，不加入 XML。
- 不新增 Host API；复制使用浏览器 Clipboard API 和 textarea fallback，文件读取使用浏览器选择器和拖放。

## 开发约定

- 纯函数、composable、Host adapter 和打包脚本遵循 TDD，测试与实现 colocated 或放在 `test/`。
- 不引入 jsdom；副作用通过依赖注入测试。
- UI 使用 `src/styles/tokens.css`，组件内不写散装颜色或圆角。
- 不引入新依赖，除非已有能力无法满足。
- 不写 emoji；图标使用 SVG 或现有应用图标资产。
- commit 使用 conventional 风格；每个任务完成后立即提交，不跨任务积累。
- push、PR、合并、tag、Release、强推和破坏性 Git 操作必须获得用户明确授权。
- Publisher 私钥不得写入源码、日志、测试夹具或构建产物。

## 发布边界

- 一个 tag 构建 macOS arm64/x86_64、Linux arm64/x86_64、Windows x86_64。
- 每个目标产出一个独立安装包和一个签名 `.atpkg`，Release 必须精确包含十个资产。
- `.atpkg` 发布前必须回读验证 manifest、签名、target、文件集合和每个文件的 SHA-256。
- Root 与 Catalog 由 `attsontools/attool` 维护，本仓库只负责 JSON Publisher Release。
