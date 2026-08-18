# Agnes API 用量仪表板

[English](README.en.md)

一个用于查看 Agnes API 用量的本地仪表板。它会读取最近三天的用量日志，并展示 Token、请求、缓存、趋势、图片生成次数和视频生成秒数。

## 功能

- 总 Token、输入 Token、输出 Token 与缓存 Token
- 分钟和小时用量趋势
- 图片生成次数与视频生成秒数
- 最近请求记录
- 点击刷新按钮后读取最新数据，前端在 5 秒后更新
- 自动选择合适的显示单位（K/M/B）

## 安装

需要 Node.js 18 或更高版本。

```bash
npm install
```

复制配置文件并填写自己的 Agnes API Token：

```powershell
Copy-Item .env.example .env
notepad .env
```

至少配置：

```ini
AGNES_API_TOKEN=your Agnes API bearer token
```

如果使用兼容的其他用量日志接口，也可以配置：

```ini
AGNES_API_LOG_URL=https://your-compatible-endpoint.example/api/log/self/star
```

## 启动

```bash
npm start
```

打开 <http://localhost:3001>，即可查看仪表板。

## 安全提示

请勿提交 `.env`、真实 Token、`data.json`、日志或本地缓存。它们已在 `.gitignore` 中排除。其他用户应复制 `.env.example` 为 `.env`，并填写自己的 Token。

## 公开仓库

<https://github.com/yeyuqiufen/agnes-api-dashboard>

## 反馈与贡献

欢迎提交 Issue，报告问题、提出建议或分享改进想法：

<https://github.com/yeyuqiufen/agnes-api-dashboard/issues>
