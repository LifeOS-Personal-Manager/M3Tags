# M3 标签生成系统

基于 `personal_tag_system_template_systematized.xlsx` 的轻量网页工具，用于生成文档 ID、标准文件名、Markdown 标签头和标签列表。

## 功能

- 领域与子领域级联选择
- 阶段、要素类型、处理状态、优先级枚举
- 自动生成 `WJ + YYYYMMDD + 两位序号` 文档 ID
- 实时生成标准文件名、YAML front matter 和标签列表
- 保存、编辑、删除、搜索历史记录
- JSON/CSV 导入导出
- Supabase 云端保存；未配置时自动使用浏览器本地保存

## 本地运行

```bash
npm install
npm run dev
```

## Supabase 配置

1. 在 Supabase SQL Editor 中执行 `supabase.schema.sql`。
2. 复制 `.env.example` 为 `.env`。
3. 填入：

```bash
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_ANON_KEY=你的 Supabase anon public key
```

未填写环境变量时，应用会使用浏览器本地存储。
