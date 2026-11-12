# JSON 工具

JSON 格式化、查询、对比与转换桌面应用，同时支持独立安装和作为 AT Tool 插件动态安装。

## 功能

- 格式化、最小化、递归键排序和虚拟树浏览
- JSONPath 查询
- JSON 对比、只看 Key、解析嵌套 JSON 字符串
- JSON、YAML、TOML、CSV 双向转换
- 浏览器式多工作页
- Monaco 编辑器与 Web Worker 大输入处理
- 深色、浅色主题

## 开发

```bash
corepack pnpm install
corepack pnpm test
corepack pnpm build
corepack pnpm build:plugin
corepack pnpm tauri:dev
```

## 双制品

- `pnpm build`：独立应用前端
- `pnpm build:plugin`：AT Tool 插件前端
- `pnpm tauri:build`：当前平台独立安装包
- `pnpm package:plugin`：使用 Publisher 配置生成并回读验证当前平台 `.atpkg`

插件身份为 `com.attson.json`，Host API 范围为 `1.0.0..1.x`，只声明 `host.theme.read`。

## 发布

`v*` tag 触发五目标构建。正式 Release 必须精确包含五个平台安装包与五个对应 `.atpkg`，资产前缀为 `AT.JSON`。
